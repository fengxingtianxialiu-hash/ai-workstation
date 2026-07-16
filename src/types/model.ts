/**
 * 模型配置类型定义
 */
export interface ModelConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  /** 图片生成模型（可选，为空则使用 model 字段） */
  imageModel?: string;
  /** 计费模式: token | plan */
  mode: 'token' | 'plan';
  /** 平台类型 */
  platform: 'openai' | 'volcengine' | 'aliyun' | 'deepseek' | 'custom';
  /** 是否加密存储 Key */
  encrypted: boolean;
  /** 加密盐值 */
  salt?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Agent 类型定义
 */
export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  description?: string;
  systemPrompt?: string;
  capabilities?: string[];
  /** 绑定的模型 ID（为空则使用全局默认） */
  model?: string;
  /** 绑定的知识库 ID 列表 */
  knowledgeBaseIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 提示词类型定义
 */
export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  isFavorite?: boolean;
  useCount?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 协作团队类型定义
 */
export interface Crew {
  id: string;
  name: string;
  description?: string;
  /** 协作模式：pipeline（流水线）| commander（主从） */
  mode: 'pipeline' | 'commander';
  /** 参与的 Agent ID 列表（按顺序） */
  agents: string[];
  /** 指挥官 Agent ID（仅 commander 模式） */
  commanderId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 协作执行单步记录
 */
export interface CrewStep {
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input?: string;
  output?: string;
  error?: string;
}

/**
 * 协作执行结果
 */
export interface CrewResult {
  /** 各步骤执行记录 */
  steps: CrewStep[];
  /** 最终输出内容 */
  finalOutput: string;
  /** 执行模式 */
  mode: 'pipeline' | 'commander';
  /** 拆解计划（仅 commander 模式） */
  plan?: string;
}

/**
 * 对话会话
 */
export interface Conversation {
  id: string;
  title: string;
  agentId?: string;
  /** 关联的协作团队 ID */
  crewId?: string;
  /** 会话临时覆盖的模型 ID */
  modelId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 消息
 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 思考过程 */
  thinking?: string;
  /** 图片附件（base64） */
  images?: string[];
  /** 生成的文件 */
  files?: GeneratedFile[];
  /** 生成的图片 */
  generatedImages?: string[];
  /** 协作执行结果 */
  crewResult?: CrewResult;
  /** 知识库来源 */
  knowledgeSources?: KnowledgeSource[];
  timestamp?: number;
  createdAt?: number;
}

export interface GeneratedFile {
  name: string;
  type: 'excel' | 'word' | 'ppt' | 'pdf';
  data: string;
}

/**
 * 知识库类型定义
 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  /** 文档数量 */
  documentCount: number;
  /** 总块数 */
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 知识库文档
 */
export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  /** 原始内容 */
  content: string;
  /** 文档来源（如文件名） */
  source?: string;
  /** 块数量 */
  chunkCount: number;
  /** 文档结构（标题层级） */
  structure?: DocumentStructure;
  createdAt: number;
  updatedAt: number;
}

/**
 * 文档结构（标题层级）
 */
export interface DocumentStructure {
  headings: HeadingNode[];
}

export interface HeadingNode {
  level: number;
  text: string;
  position: number;
  children?: HeadingNode[];
}

/**
 * 知识库块（分块后的内容单元）
 */
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  /** 块标题（所属章节/条目名） */
  title: string;
  /** 块内容 */
  content: string;
  /** 摘要（预生成，用于检索注入） */
  summary?: string;
  /** 关键词标签 */
  keywords?: string[];
  /** 在文档中的位置（字符偏移） */
  position: number;
  /** 块编号 */
  index: number;
  createdAt: number;
}

/**
 * 知识库检索结果
 */
export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  /** 相关度分数（0-1） */
  score: number;
  /** 所属文档标题 */
  documentTitle: string;
  /** 所属知识库名称 */
  knowledgeBaseName: string;
}

/**
 * 消息中的知识库来源
 */
export interface KnowledgeSource {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  /** 章节/条目标题 */
  sectionTitle: string;
}
