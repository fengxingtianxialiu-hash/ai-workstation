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
 * 对话会话
 */
export interface Conversation {
  id: string;
  title: string;
  agentId?: string;
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
  timestamp?: number;
  createdAt?: number;
}

export interface GeneratedFile {
  name: string;
  type: 'excel' | 'word' | 'ppt' | 'pdf';
  data: string;
}
