/**
 * Cloudflare Worker - AI API 代理层
 *
 * 功能：
 * 1. 跨域解决（CORS）
 * 2. Token 模式透传（标准 OpenAI 格式）
 * 3. Coding Plan 模式协议适配
 * 4. 统一响应格式
 * 5. 流式响应转发
 * 6. 可选 Key 解密转发
 */

export interface Env {
  // 加密密钥（可选，用于 Key 解密转发）
  ENCRYPTION_SECRET?: string;
}

interface ProxyRequest {
  /** 目标 API 地址 */
  apiUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型标识 */
  model: string;
  /** 计费模式: token | plan */
  mode: 'token' | 'plan';
  /** 平台类型: openai | volcengine | aliyun | custom */
  platform: string;
  /** 请求体 */
  body: any;
  /** 是否流式 */
  stream: boolean;
  /** 加密盐值（可选） */
  salt?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 只接受 POST
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const proxyReq: ProxyRequest = await request.json();
      return await handleProxy(proxyReq, env);
    } catch (e: any) {
      return jsonResponse({ error: e.message || 'Internal error' }, 500);
    }
  },
};

async function handleProxy(req: ProxyRequest, env: Env): Promise<Response> {
  // 1. 解析 API Key（如果加密）
  let apiKey = req.apiKey;
  if (req.salt && env.ENCRYPTION_SECRET) {
    apiKey = await decryptKey(req.apiKey, req.salt, env.ENCRYPTION_SECRET);
  }

  // 2. 根据平台构造请求
  const targetRequest = buildTargetRequest(req, apiKey);

  // 3. 发送到目标 API
  const response = await fetch(targetRequest.url, {
    method: 'POST',
    headers: targetRequest.headers,
    body: JSON.stringify(targetRequest.body),
  });

  // 4. 处理响应
  if (req.stream) {
    return handleStreamResponse(response);
  }

  const data = await response.json();
  const normalized = normalizeResponse(data, req.platform);
  return jsonResponse(normalized, response.status, CORS_HEADERS);
}

/**
 * 构造目标 API 请求
 */
function buildTargetRequest(req: ProxyRequest, apiKey: string) {
  const { platform, mode } = req;

  // Token 模式：标准 OpenAI 兼容格式
  if (mode === 'token' || platform === 'openai') {
    return {
      url: req.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: {
        model: req.model,
        messages: req.body.messages,
        stream: req.stream,
        ...req.body.extra,
      },
    };
  }

  // 火山方舟 Coding Plan 模式
  if (platform === 'volcengine') {
    return {
      url: req.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: {
        model: req.model,
        messages: req.body.messages,
        stream: req.stream,
        max_tokens: req.body.maxTokens,
        temperature: req.body.temperature,
        ...req.body.extra,
      },
    };
  }

  // 阿里云 Plan 模式
  if (platform === 'aliyun') {
    return {
      url: req.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-SSE': req.stream ? 'enable' : 'disable',
      },
      body: {
        model: req.model,
        input: {
          messages: req.body.messages,
        },
        parameters: {
          result_format: 'message',
          incremental_output: req.stream,
          ...req.body.extra,
        },
      },
    };
  }

  // 默认：透传
  return {
    url: req.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: req.body,
  };
}

/**
 * 统一响应格式
 */
function normalizeResponse(data: any, platform: string) {
  // OpenAI 格式（标准）
  if (platform === 'openai' || platform === 'volcengine') {
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
      finish_reason: data.choices?.[0]?.finish_reason || 'stop',
      raw: data,
    };
  }

  // 阿里云格式
  if (platform === 'aliyun') {
    const output = data.output || {};
    return {
      content: output.text || output.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
      finish_reason: output.finish_reason || 'stop',
      raw: data,
    };
  }

  // 未知格式，尝试通用提取
  return {
    content: data.content || data.text || data.message || JSON.stringify(data),
    usage: data.usage || null,
    finish_reason: 'stop',
    raw: data,
  };
}

/**
 * 处理流式响应
 */
function handleStreamResponse(response: Response): Response {
  if (!response.body) {
    return jsonResponse({ error: 'No response body' }, 500);
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = response.body.getReader();
  const encoder = new TextEncoder();

  // 异步读取并转发
  (async () => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
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
              await writer.write(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const json = JSON.parse(data);
              const content = extractStreamContent(json);
              if (content) {
                const chunk = {
                  content,
                  finish_reason: json.choices?.[0]?.finish_reason || null,
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              // 非 JSON 行，直接转发
              await writer.write(encoder.encode(`${line}\n`));
            }
          }
        }
      }
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * 从流式 chunk 中提取内容
 */
function extractStreamContent(json: any): string {
  // OpenAI 格式
  const delta = json.choices?.[0]?.delta;
  if (delta?.content) return delta.content;

  // 阿里云格式
  if (json.output?.text) return json.output.text;
  if (json.output?.choices?.[0]?.message?.content) {
    return json.output.choices[0].message.content;
  }

  return '';
}

/**
 * AES-GCM 解密 API Key
 */
async function decryptKey(encryptedKey: string, salt: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  // 从 secret + salt 派生密钥
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 解密
  const encrypted = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  const iv = encrypted.slice(0, 12);
  const ciphertext = encrypted.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

function jsonResponse(data: any, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}
