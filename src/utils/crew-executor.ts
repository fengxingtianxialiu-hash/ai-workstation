/**
 * 协作执行引擎
 * 实现流水线（Pipeline）和主从（Commander）模式的执行逻辑
 */

import { sendChat } from '@/utils/api-client';
import type { Crew, CrewStep, CrewResult } from '@/types/model';
import type { Agent, ModelConfig } from '@/types/model';

/** 上下文截断阈值（字符数） */
const CONTEXT_MAX_LENGTH = 8000;

/** 执行进度回调 */
export interface CrewExecutorCallbacks {
  onStepStart: (stepIndex: number, agent: Agent) => void;
  onStepComplete: (stepIndex: number, output: string) => void;
  onStepError: (stepIndex: number, error: string) => void;
  onStreamChunk?: (stepIndex: number, chunk: string) => void;
}

/** 预检查结果 */
export interface PreCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * 执行前预检查
 * 检查 Agent 存在性、模型可用性、加密 API Key 可用性
 */
export function preCheckCrew(
  crew: Crew,
  agents: Agent[],
  models: ModelConfig[],
  getDecryptedKey?: (modelId: string) => Promise<string>
): PreCheckResult {
  const errors: string[] = [];

  // 获取所有涉及的 Agent ID
  const agentIds = new Set<string>(crew.agents);
  if (crew.commanderId) agentIds.add(crew.commanderId);

  // 检查 Agent 存在性
  for (const agentId of agentIds) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      errors.push(`Agent (ID: ${agentId}) 已被删除，请重新配置团队`);
    }
  }

  // 检查模型可用性
  for (const agentId of agentIds) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) continue;

    const modelId = agent.model;
    if (modelId) {
      const model = models.find(m => m.id === modelId);
      if (!model) {
        errors.push(`Agent "${agent.name}" 绑定的模型不可用`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * 获取 Agent 对应的模型配置
 */
function getAgentModel(
  agent: Agent,
  models: ModelConfig[],
  defaultModel: ModelConfig | null
): ModelConfig | null {
  if (agent.model) {
    return models.find(m => m.id === agent.model) || defaultModel;
  }
  return defaultModel;
}

/**
 * 截断上下文，保留最近的内容
 */
function truncateContext(context: string, maxLength: number = CONTEXT_MAX_LENGTH): string {
  if (context.length <= maxLength) return context;
  return '...(前序内容已截断)\n' + context.slice(context.length - maxLength);
}

/**
 * 执行流水线
 */
export async function executePipeline(
  crew: Crew,
  userInput: string,
  agents: Agent[],
  models: ModelConfig[],
  defaultModel: ModelConfig | null,
  callbacks: CrewExecutorCallbacks,
  signal?: AbortSignal
): Promise<CrewResult> {
  const steps: CrewStep[] = crew.agents.map(agentId => ({
    agentId,
    status: 'pending' as const,
  }));

  let previousOutput = '';

  for (let i = 0; i < crew.agents.length; i++) {
    // 检查是否被中断
    if (signal?.aborted) {
      for (let j = i; j < steps.length; j++) {
        steps[j].status = 'cancelled';
      }
      break;
    }

    const agentId = crew.agents[i];
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      steps[i].status = 'failed';
      steps[i].error = `Agent 不存在`;
      callbacks.onStepError(i, 'Agent 不存在');
      continue;
    }

    const model = getAgentModel(agent, models, defaultModel);
    if (!model) {
      steps[i].status = 'failed';
      steps[i].error = '模型不可用';
      callbacks.onStepError(i, '模型不可用');
      continue;
    }

    steps[i].status = 'running';
    callbacks.onStepStart(i, agent);

    try {
      // 构建消息
      const messages = [];

      // 注入系统提示词
      let systemPrompt = agent.systemPrompt || `你是一个${agent.role || 'AI助手'}。`;

      // 注入前序步骤结果
      if (previousOutput) {
        const truncatedContext = truncateContext(previousOutput);
        systemPrompt += `\n\n---\n前序步骤结果：\n${truncatedContext}`;
      }

      messages.push({ role: 'system' as const, content: systemPrompt });
      messages.push({ role: 'user' as const, content: userInput });

      steps[i].input = userInput;

      // 调用 API
      const result = await sendChat(messages, {
        apiUrl: model.apiUrl,
        apiKey: model.apiKey,
        model: model.model,
        mode: model.mode,
        platform: model.platform,
        salt: model.salt,
      });

      steps[i].status = 'completed';
      steps[i].output = result.content;
      previousOutput += `\n\n[步骤 ${i + 1} - ${agent.name}]\n${result.content}`;
      callbacks.onStepComplete(i, result.content);
    } catch (error: any) {
      steps[i].status = 'failed';
      steps[i].error = error.message || '执行失败';
      callbacks.onStepError(i, error.message || '执行失败');
    }
  }

  // 最终输出为最后一个成功步骤的结果
  const lastCompletedStep = [...steps].reverse().find(s => s.status === 'completed');
  const finalOutput = lastCompletedStep?.output || '流水线执行完成，但无有效输出';

  return {
    steps,
    finalOutput,
    mode: 'pipeline',
  };
}

/**
 * 执行主从模式
 */
export async function executeCommander(
  crew: Crew,
  userInput: string,
  agents: Agent[],
  models: ModelConfig[],
  defaultModel: ModelConfig | null,
  callbacks: CrewExecutorCallbacks,
  signal?: AbortSignal
): Promise<CrewResult> {
  const commander = agents.find(a => a.id === crew.commanderId);
  if (!commander) {
    throw new Error('指挥官 Agent 不存在');
  }

  const commanderModel = getAgentModel(commander, models, defaultModel);
  if (!commanderModel) {
    throw new Error('指挥官模型不可用');
  }

  // 第一步：指挥官拆解任务
  const decomposePrompt = `你是一个任务规划专家。请将以下任务拆解为子任务，并分配给合适的执行者。

可用执行者：
${crew.agents.map(agentId => {
  const agent = agents.find(a => a.id === agentId);
  return agent ? `- ${agent.name} (ID: ${agent.id}): ${agent.role || '通用助手'}` : '';
}).filter(Boolean).join('\n')}

用户任务：${userInput}

请以 JSON 格式输出拆解计划，格式如下：
{
  "subtasks": [
    {
      "description": "子任务描述",
      "agentId": "分配的 Agent ID",
      "expectedOutput": "预期输出描述"
    }
  ]
}

只输出 JSON，不要其他内容。`;

  const decomposeMessages = [
    { role: 'system' as const, content: commander.systemPrompt || '你是一个任务规划专家。' },
    { role: 'user' as const, content: decomposePrompt },
  ];

  let plan: { subtasks: { description: string; agentId: string; expectedOutput: string }[] } | null = null;
  let planText = '';

  try {
    const result = await sendChat(decomposeMessages, {
      apiUrl: commanderModel.apiUrl,
      apiKey: commanderModel.apiKey,
      model: commanderModel.model,
      mode: commanderModel.mode,
      platform: commanderModel.platform,
      salt: commanderModel.salt,
    });

    planText = result.content;

    // 尝试解析 JSON
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 解析失败，plan 保持 null
    }
  } catch (error: any) {
    throw new Error(`任务拆解失败: ${error.message}`);
  }

  // 如果解析失败，回退到简单模式
  if (!plan || !plan.subtasks || plan.subtasks.length === 0) {
    // 回退：直接让指挥官完成任务
    const fallbackMessages = [
      { role: 'system' as const, content: commander.systemPrompt || `你是一个${commander.role || 'AI助手'}。` },
      { role: 'user' as const, content: userInput },
    ];

    const result = await sendChat(fallbackMessages, {
      apiUrl: commanderModel.apiUrl,
      apiKey: commanderModel.apiKey,
      model: commanderModel.model,
      mode: commanderModel.mode,
      platform: commanderModel.platform,
      salt: commanderModel.salt,
    });

    return {
      steps: [{ agentId: commander.id, status: 'completed', input: userInput, output: result.content }],
      finalOutput: result.content,
      mode: 'commander',
      plan: planText || '（拆解计划解析失败，已回退到直接执行）',
    };
  }

  // 第二步：执行子任务
  const steps: CrewStep[] = plan.subtasks.map(subtask => ({
    agentId: subtask.agentId,
    status: 'pending' as const,
  }));

  const subtaskOutputs: string[] = [];

  for (let i = 0; i < plan.subtasks.length; i++) {
    if (signal?.aborted) {
      for (let j = i; j < steps.length; j++) {
        steps[j].status = 'cancelled';
      }
      break;
    }

    const subtask = plan.subtasks[i];
    const agent = agents.find(a => a.id === subtask.agentId);
    if (!agent) {
      steps[i].status = 'failed';
      steps[i].error = `执行者 Agent 不存在`;
      callbacks.onStepError(i, '执行者 Agent 不存在');
      continue;
    }

    const model = getAgentModel(agent, models, defaultModel);
    if (!model) {
      steps[i].status = 'failed';
      steps[i].error = '模型不可用';
      callbacks.onStepError(i, '模型不可用');
      continue;
    }

    steps[i].status = 'running';
    callbacks.onStepStart(i, agent);

    try {
      let systemPrompt = agent.systemPrompt || `你是一个${agent.role || 'AI助手'}。`;

      // 注入前序子任务结果
      if (subtaskOutputs.length > 0) {
        const context = subtaskOutputs.join('\n\n');
        systemPrompt += `\n\n---\n前序子任务结果：\n${truncateContext(context)}`;
      }

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: subtask.description },
      ];

      steps[i].input = subtask.description;

      const result = await sendChat(messages, {
        apiUrl: model.apiUrl,
        apiKey: model.apiKey,
        model: model.model,
        mode: model.mode,
        platform: model.platform,
        salt: model.salt,
      });

      steps[i].status = 'completed';
      steps[i].output = result.content;
      subtaskOutputs.push(`[子任务 ${i + 1} - ${agent.name}]\n${result.content}`);
      callbacks.onStepComplete(i, result.content);
    } catch (error: any) {
      steps[i].status = 'failed';
      steps[i].error = error.message || '执行失败';
      callbacks.onStepError(i, error.message || '执行失败');
    }
  }

  // 第三步：指挥官汇总
  const summaryPrompt = `请根据以下子任务的执行结果，汇总生成最终输出。

原始任务：${userInput}

子任务执行结果：
${subtaskOutputs.join('\n\n')}

请整合以上内容，生成完整、连贯的最终结果。`;

  const summaryMessages = [
    { role: 'system' as const, content: commander.systemPrompt || '你是一个任务汇总专家。' },
    { role: 'user' as const, content: summaryPrompt },
  ];

  let finalOutput = '';
  try {
    const result = await sendChat(summaryMessages, {
      apiUrl: commanderModel.apiUrl,
      apiKey: commanderModel.apiKey,
      model: commanderModel.model,
      mode: commanderModel.mode,
      platform: commanderModel.platform,
      salt: commanderModel.salt,
    });
    finalOutput = result.content;
  } catch {
    // 汇总失败时，拼接所有子任务结果
    finalOutput = subtaskOutputs.join('\n\n');
  }

  return {
    steps,
    finalOutput,
    mode: 'commander',
    plan: planText,
  };
}
