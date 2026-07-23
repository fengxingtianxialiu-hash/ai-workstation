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

/** 获取代理地址：优先使用环境变量，开发模式下自动适配当前主机地址 */
function getProxyUrl(): string {
  const envUrl = import.meta.env.VITE_PROXY_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    // 如果是相对路径（以 / 开头），直接使用
    if (envUrl.startsWith('/')) return envUrl.trim();
    // 如果是完整 URL，直接返回
    return envUrl.trim();
  }
  // 开发模式：用当前页面主机名 + 3001 端口，兼容手机局域网访问
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:3001/proxy`;
}

const PROXY_URL = getProxyUrl();

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
 * 从原始 SSE chunk 中提取内容和思考过程（支持多平台格式）
 */
function parseRawSSEChunk(json: any): { content: string; thinking: string; done: boolean } {
  const result = { content: '', thinking: '', done: false };

  // 跳过元数据事件
  const skipTypes = [
    'response.created', 'response.in_progress', 'response.output_item.added',
    'response.output_item.done', 'response.content_part.added', 'response.content_part.done',
    'response.completed', 'response.reasoning_summary_part.added', 'response.reasoning_summary_part.done',
  ];
  if (skipTypes.includes(json.type)) return result;

  // 火山方舟 Responses API - 思考过程
  if (json.type === 'response.reasoning_summary_text.delta' && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === 'response.reasoning_summary_text.done' && json.text) {
    result.thinking = json.text;
    return result;
  }
  if (json.type === 'response.thought.delta' && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === 'response.thought.done' && json.thought) {
    result.thinking = json.thought;
    return result;
  }

  // 标准 OpenAI 格式 - 正文和思考
  const delta = json.choices?.[0]?.delta;
  if (delta?.content) {
    result.content = delta.content;
    if (json.choices[0].finish_reason) result.done = true;
    return result;
  }
  if (delta?.reasoning_content) {
    result.thinking = delta.reasoning_content;
    return result;
  }

  // 火山方舟 Responses API - 正文
  if (json.type === 'response.output_text.delta' && json.delta) {
    result.content = json.delta;
    return result;
  }
  if (json.type === 'response.output_text.done' && json.text) {
    result.content = json.text;
    return result;
  }

  // 阿里云格式
  if (json.output?.text) {
    result.content = json.output.text;
    if (json.output.finish_reason) result.done = true;
    return result;
  }
  if (json.output?.choices?.[0]?.message?.content) {
    result.content = json.output.choices[0].message.content;
    return result;
  }

  return result;
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
            const json = JSON.parse(data);
            const { content, thinking, done } = parseRawSSEChunk(json);
            if (content) callbacks.onChunk(content);
            if (thinking && callbacks.onThinkingChunk) callbacks.onThinkingChunk(thinking);
            if (done) {
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
