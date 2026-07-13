/**
 * AI API 本地代理服务器
 * 替代 Cloudflare Worker，解决跨域问题
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));

// CORS 中间件 - 确保所有响应都带 CORS 头
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  });
  next();
});

// 处理 CORS 预检
app.options('*', (req, res) => {
  res.status(204).end();
});

/**
 * 代理请求
 */
app.post('/proxy', async (req, res) => {
  try {
    const { apiUrl, apiKey, model, mode, platform, stream, body } = req.body;

    console.log('=== Proxy Request ===');
    console.log('apiUrl:', apiUrl);
    console.log('model:', model);
    console.log('mode:', mode);
    console.log('platform:', platform);
    console.log('stream:', stream);
    console.log('body:', JSON.stringify(body, null, 2));

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: 'Missing apiUrl or apiKey' });
    }

    // 构造目标请求
    const targetRequest = buildTargetRequest({ apiUrl, apiKey, model, mode, platform, stream, body });

    console.log('Target URL:', targetRequest.url);
    console.log('Target headers:', JSON.stringify(targetRequest.headers));
    console.log('Target body:', JSON.stringify(targetRequest.body, null, 2));

    // 发送到目标 API
    const response = await fetch(targetRequest.url, {
      method: 'POST',
      headers: targetRequest.headers,
      body: JSON.stringify(targetRequest.body),
    });

    console.log('Response status:', response.status);

    // 流式响应
    if (stream) {
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Stream error response:', errorText);
        return res.status(response.status).json({ error: errorText });
      }

      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      res.on('close', () => reader.cancel());

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
              res.write('data: [DONE]\n\n');
              continue;
            }
            try {
              const json = JSON.parse(data);
              console.log('Stream chunk:', JSON.stringify(json).slice(0, 200));
              const { content, thinking } = extractStreamContent(json);
              if (content || thinking) {
                const chunk = {
                  content: content || '',
                  thinking: thinking || '',
                  finish_reason: json.choices?.[0]?.finish_reason || null,
                };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            } catch {
              res.write(`${line}\n`);
            }
          }
        }
      }

      res.end();
      return;
    }

    // 非流式响应
    const data = await response.json();
    console.log('Non-stream response:', JSON.stringify(data, null, 2));
    const normalized = normalizeResponse(data, platform);
    res.status(response.status).json(normalized);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

/**
 * 构造目标 API 请求
 */
function buildTargetRequest({ apiUrl, apiKey, model, mode, platform, stream, body }) {
  // 火山方舟 Responses API 格式
  if (apiUrl.includes('/responses')) {
    // content 直接是字符串，不要用数组格式
    const input = body.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    return {
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: {
        model,
        stream,
        input,
        ...body.extra,
      },
    };
  }

  // 标准 OpenAI 兼容格式（chat/completions）
  return {
    url: apiUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: {
      model,
      messages: body.messages,
      stream,
      ...body.extra,
    },
  };
}

/**
 * 统一响应格式
 */
function normalizeResponse(data, platform) {
  if (platform === 'openai' || platform === 'volcengine' || platform === 'deepseek') {
    // OpenAI chat/completions 格式
    let content = data.choices?.[0]?.message?.content || '';

    // Responses API 格式：output 数组中找 type=message 的项
    if (!content && Array.isArray(data.output)) {
      const msgItem = data.output.find(item => item.type === 'message');
      if (msgItem?.content?.[0]?.text) {
        content = msgItem.content[0].text;
      }
    }

    return {
      content,
      usage: data.usage || null,
      finish_reason: data.choices?.[0]?.finish_reason || 'stop',
      raw: data,
    };
  }

  if (platform === 'aliyun') {
    const output = data.output || {};
    return {
      content: output.text || output.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
      finish_reason: output.finish_reason || 'stop',
      raw: data,
    };
  }

  return {
    content: data.content || data.text || data.message || JSON.stringify(data),
    usage: data.usage || null,
    finish_reason: 'stop',
    raw: data,
  };
}

/**
 * 从流式 chunk 中提取内容和思考过程
 */
function extractStreamContent(json) {
  const result = { content: '', thinking: '' };

  // 跳过非内容事件（状态变更、元数据等）
  const skipTypes = [
    'response.created', 'response.in_progress', 'response.output_item.added',
    'response.output_item.done', 'response.content_part.added', 'response.content_part.done',
    'response.completed', 'response.reasoning_summary_part.added', 'response.reasoning_summary_part.done',
  ];
  if (skipTypes.includes(json.type)) return result;

  // 火山方舟 / Responses API 思考过程（reasoning summary）
  if (json.type === 'response.reasoning_summary_text.delta' && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === 'response.reasoning_summary_text.done' && json.text) {
    result.thinking = json.text;
    return result;
  }
  // 兼容旧版 thought 格式
  if (json.type === 'response.thought.delta' && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === 'response.thought.done' && json.thought) {
    result.thinking = json.thought;
    return result;
  }

  // OpenAI chat/completions 格式
  const delta = json.choices?.[0]?.delta;
  if (delta?.content) {
    result.content = delta.content;
    return result;
  }
  // 兼容 delta.reasoning_content（部分模型把思考放在这里）
  if (delta?.reasoning_content) {
    result.thinking = delta.reasoning_content;
    return result;
  }

  // OpenAI Responses API 正文格式
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
    return result;
  }
  if (json.output?.choices?.[0]?.message?.content) {
    result.content = json.output.choices[0].message.content;
    return result;
  }

  // 通用尝试（仅对无明显 type 的事件）
  if (!json.type) {
    if (json.content) result.content = json.content;
    if (json.text) result.content = json.text;
    if (json.delta) result.content = json.delta;
  }

  return result;
}

/**
 * 联网搜索接口
 * 使用 Bing 搜索，无需 API Key
 */
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    console.log('=== Web Search ===');
    console.log('query:', query);

    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&setlang=zh-Hans&cc=CN`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.error('Search HTTP error:', response.status);
      return res.status(502).json({ error: `Search failed: HTTP ${response.status}` });
    }

    const html = await response.text();
    console.log('Search HTML length:', html.length);
    const results = parseBingResults(html);

    console.log(`Found ${results.length} results`);
    res.json({ query, results });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message || 'Search error' });
  }
});

/**
 * 解析 Bing HTML 搜索结果
 */
function parseBingResults(html) {
  const results = [];

  // Bing 结果块在 <li class="b_algo"> 中
  const blockRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  let count = 0;

  while ((match = blockRegex.exec(html)) !== null && count < 8) {
    const block = match[1];

    // 提取标题和链接：优先从 <h2> 内的 <a> 标签提取
    const h2Match = block.match(/<h2[^>]*>\s*<a[^>]*href="(https?:[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!h2Match) continue;

    const url = h2Match[1];
    const title = h2Match[2].replace(/<[^>]*>/g, '').trim();

    // 提取摘要：从 b_caption 下的 p 标签提取
    let snippet = '';
    const captionMatch = block.match(/class="b_caption"[^>]*>([\s\S]*?)<\/div>/i);
    if (captionMatch) {
      const pMatch = captionMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) snippet = pMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    // 备用：直接找 <p>
    if (!snippet) {
      const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) snippet = pMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // 过滤广告链接
    if (title && url && !url.includes('bing.com/aclk') && !url.includes('go.microsoft.com')) {
      results.push({ title, url, snippet });
      count++;
    }
  }

  return results;
}

/**
 * 图片生成代理接口
 */
app.post('/image-gen', async (req, res) => {
  try {
    const { apiUrl, apiKey, model, prompt, size, mode } = req.body;

    console.log('=== Image Generation ===');
    console.log('apiUrl:', apiUrl);
    console.log('model:', model);
    console.log('prompt:', prompt);

    if (!apiUrl || !apiKey || !prompt) {
      return res.status(400).json({ error: 'Missing apiUrl, apiKey or prompt' });
    }

    // 从对话 API URL 推导图片生成 URL
    // /responses -> /images/generations
    // /chat/completions -> /images/generations
    let imageUrl = apiUrl;
    if (imageUrl.includes('/responses')) {
      imageUrl = imageUrl.replace('/responses', '/images/generations');
    } else if (imageUrl.includes('/chat/completions')) {
      imageUrl = imageUrl.replace('/chat/completions', '/images/generations');
    } else if (!imageUrl.includes('/images/generations')) {
      imageUrl = imageUrl.replace(/\/(responses|chat\/completions)$/, '') + '/images/generations';
    }

    // 使用前端传入的模型名称
    const imageModel = model;

    console.log('Image API URL:', imageUrl);
    console.log('Image model:', imageModel);

    const response = await fetch(imageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        n: 1,
        size: size || '1024x1024',
        response_format: 'url',
      }),
    });

    console.log('Image API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log('Image generation response:', JSON.stringify(data).slice(0, 500));

    // 统一返回格式
    const images = (data.data || []).map(item => item.url || item.b64_json).filter(Boolean);

    res.json({ images });
  } catch (error) {
    console.error('Image generation error:', error.message);
    res.status(500).json({ error: error.message || 'Image generation error' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Proxy Server running at http://localhost:${PORT}`);
  console.log(`Proxy endpoint: http://localhost:${PORT}/proxy`);
  console.log(`Search endpoint: http://localhost:${PORT}/search`);
  console.log(`Image gen endpoint: http://localhost:${PORT}/image-gen`);
});
