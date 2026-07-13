/**
 * AI API 客户端
 * 通过 CF Worker 代理发送请求
 */

export interface ModelConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  imageModel?: string;
  mode: 'token' | 'plan';
  platform: string;
  salt?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onThinkingChunk: (content: string) => void;
  onDone: (usage?: any) => void;
  onError: (error: Error) => void;
}

/** CF Worker 代理地址 */
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'https://ai-workstation-proxy.maynico.workers.dev/proxy';

/** 本地搜索代理地址 */
const SEARCH_URL = PROXY_URL.replace('/proxy', '/search');

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * 联网搜索
 */
export async function webSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`搜索失败: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * 查询重写：用 AI 从用户消息中提取搜索关键词
 */
export async function rewriteQuery(
  userMessage: string,
  modelConfig: ModelConfig
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个搜索关键词提取器。用户会给你一段对话消息，你需要从中提取出适合搜索引擎搜索的关键词。只返回搜索关键词，不要返回任何其他内容。例如：用户说"天津后天天气怎么样"，你返回"天津天气预报"。',
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const result = await sendChat(messages, modelConfig);
  const query = result.content.trim();
  // 限制查询长度，避免过长查询
  return query.length > 100 ? query.slice(0, 100) : query;
}

/**
 * 图片生成
 */
export async function generateImage(
  prompt: string,
  modelConfig: ModelConfig,
  size: string = '1024x1024'
): Promise<string[]> {
  const IMAGE_GEN_URL = PROXY_URL.replace('/proxy', '/image-gen');
  
  const response = await fetch(IMAGE_GEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiUrl: modelConfig.apiUrl,
      apiKey: modelConfig.apiKey,
      model: modelConfig.imageModel || modelConfig.model,
      prompt,
      size,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Image generation failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.images || [];
}

/**
 * 发送流式对话请求
 */
export async function sendChatStream(
  messages: ChatMessage[],
  modelConfig: ModelConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const body = {
    apiUrl: modelConfig.apiUrl,
    apiKey: modelConfig.apiKey,
    model: modelConfig.model,
    mode: modelConfig.mode,
    platform: modelConfig.platform,
    salt: modelConfig.salt,
    stream: true,
    body: {
      messages,
      extra: {},
    },
  };

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            callbacks.onDone();
            return;
          }
          try {
            const chunk = JSON.parse(data);
            if (chunk.content) {
              callbacks.onChunk(chunk.content);
            }
            if (chunk.thinking && callbacks.onThinkingChunk) {
              callbacks.onThinkingChunk(chunk.thinking);
            }
            if (chunk.finish_reason) {
              callbacks.onDone();
              return;
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    }

    callbacks.onDone();
  } catch (e: any) {
    if (e.name === 'AbortError') return;
    callbacks.onError(e);
  }
}

/**
 * 发送非流式对话请求
 */
export async function sendChat(
  messages: ChatMessage[],
  modelConfig: ModelConfig
): Promise<{ content: string; usage?: any }> {
  const body = {
    apiUrl: modelConfig.apiUrl,
    apiKey: modelConfig.apiKey,
    model: modelConfig.model,
    mode: modelConfig.mode,
    platform: modelConfig.platform,
    salt: modelConfig.salt,
    stream: false,
    body: {
      messages,
      extra: {},
    },
  };

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content || '',
    usage: data.usage,
  };
}
