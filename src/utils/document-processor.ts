/**
 * 文档处理引擎
 * 处理文档上传的完整流程：解析 → 分块 → 生成摘要 → 构建索引
 */
import { parseDocumentStructure, chunkDocument, extractKeywords } from './document-parser';
import { buildIndex } from './knowledge-search';
import { sendChat } from './api-client';
import type { KnowledgeChunk, KnowledgeDocument, ModelConfig } from '@/types/model';

export interface DocumentProcessCallbacks {
  onProgress: (stage: string, percent: number) => void;
  onChunkComplete: (index: number, total: number) => void;
}

/**
 * 处理文档上传
 * 完整流程：解析 → 分块 → 生成摘要 → 构建索引
 */
export async function processDocument(
  content: string,
  title: string,
  knowledgeBaseId: string,
  documentId: string,
  modelConfig: ModelConfig | null,
  callbacks: DocumentProcessCallbacks
): Promise<{ chunks: KnowledgeChunk[]; chunkCount: number }> {
  const totalSteps = 4;
  let currentStep = 0;

  // Step 1: 解析文档结构
  currentStep++;
  callbacks.onProgress('解析文档结构...', (currentStep / totalSteps) * 100);
  const structure = parseDocumentStructure(content);

  // Step 2: 分块
  currentStep++;
  callbacks.onProgress('分块处理...', (currentStep / totalSteps) * 100);
  const chunkResults = chunkDocument(content, structure);

  // Step 3: 生成摘要和关键词
  currentStep++;
  callbacks.onProgress('生成摘要...', (currentStep / totalSteps) * 100);
  const chunks: KnowledgeChunk[] = [];

  for (let i = 0; i < chunkResults.length; i++) {
    const cr = chunkResults[i];
    const keywords = extractKeywords(cr.content);

    let summary: string | undefined;
    if (modelConfig) {
      try {
        summary = await generateChunkSummary(cr.content, cr.title, modelConfig);
      } catch {
        // 摘要生成失败，降级使用原文前 200 字
        summary = cr.content.slice(0, 200);
      }
    } else {
      // 无模型配置，降级使用原文前 200 字
      summary = cr.content.slice(0, 200);
    }

    const chunk: KnowledgeChunk = {
      documentId,
      knowledgeBaseId,
      title: cr.title,
      content: cr.content,
      summary,
      keywords,
      position: cr.position,
      index: cr.index,
      createdAt: Date.now(),
    };

    chunks.push(chunk);
    callbacks.onChunkComplete(i + 1, chunkResults.length);
  }

  // Step 4: 构建索引（在调用方完成，因为需要 store 数据）
  currentStep++;
  callbacks.onProgress('完成', 100);

  return { chunks, chunkCount: chunks.length };
}

/**
 * 为块生成摘要
 */
async function generateChunkSummary(
  content: string,
  title: string,
  modelConfig: ModelConfig
): Promise<string> {
  const prompt = `请为以下文档段落生成一个简洁的摘要（50-150字），保留关键信息（如药名、剂量、用法等）。

段落标题：${title}
段落内容：${content.slice(0, 1000)}

请直接输出摘要，不要加前缀。`;

  const response = await sendChat(
    [
      { role: 'system', content: '你是一个专业的文档摘要生成器。' },
      { role: 'user', content: prompt },
    ],
    {
      apiUrl: modelConfig.apiUrl,
      apiKey: modelConfig.apiKey,
      model: modelConfig.model,
      mode: modelConfig.mode,
      platform: modelConfig.platform,
      salt: modelConfig.salt,
    }
  );

  return response.content.trim().slice(0, 300);
}
