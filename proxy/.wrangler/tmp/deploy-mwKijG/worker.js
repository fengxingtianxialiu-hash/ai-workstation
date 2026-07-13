var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key"
};
var worker_default = {
  async fetch(request, env, ctx2) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS, status: 204 });
    }
    const url = new URL(request.url);
    const pathname = url.pathname;
    try {
      if (pathname === "/proxy") {
        return await handleProxy(request);
      } else if (pathname === "/search") {
        return await handleSearch(request);
      } else if (pathname === "/image-gen") {
        return await handleImageGen(request);
      }
      return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
    } catch (error) {
      console.error("Worker error:", error.message);
      return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }
};
async function handleProxy(request) {
  const body = await request.json();
  const { apiUrl, apiKey, model, mode, platform, stream, body: requestBody } = body;
  console.log("=== Proxy Request ===");
  console.log("apiUrl:", apiUrl);
  console.log("model:", model);
  console.log("platform:", platform);
  console.log("stream:", stream);
  if (!apiUrl || !apiKey) {
    return new Response(JSON.stringify({ error: "Missing apiUrl or apiKey" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  const targetRequest = buildTargetRequest({ apiUrl, apiKey, model, mode, platform, stream, body: requestBody });
  console.log("Target URL:", targetRequest.url);
  const response = await fetch(targetRequest.url, {
    method: "POST",
    headers: targetRequest.headers,
    body: JSON.stringify(targetRequest.body)
  });
  console.log("Response status:", response.status);
  if (stream) {
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    ctx.passThroughOnException();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data2 = line.slice(6).trim();
              if (data2 === "[DONE]") {
                await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const json = JSON.parse(data2);
                console.log("Stream chunk:", JSON.stringify(json).slice(0, 200));
                const { content, thinking } = extractStreamContent(json);
                if (content || thinking) {
                  const chunk = {
                    content: content || "",
                    thinking: thinking || "",
                    finish_reason: json.choices?.[0]?.finish_reason || null
                  };
                  await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}

`));
                }
              } catch {
                await writer.write(new TextEncoder().encode(`${line}
`));
              }
            }
          }
        }
        await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Stream error:", error.message);
      } finally {
        await writer.close();
      }
    })();
    return new Response(readable, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  }
  const data = await response.json();
  console.log("Non-stream response:", JSON.stringify(data).slice(0, 500));
  const normalized = normalizeResponse(data, platform);
  return new Response(JSON.stringify(normalized), {
    status: response.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
__name(handleProxy, "handleProxy");
async function handleSearch(request) {
  const body = await request.json();
  const { query } = body;
  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  console.log("=== Web Search ===");
  console.log("query:", query);
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&setlang=zh-Hans&cc=CN`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
  });
  if (!response.ok) {
    return new Response(JSON.stringify({ error: `Search failed: HTTP ${response.status}` }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  const html = await response.text();
  const results = parseBingResults(html);
  console.log(`Found ${results.length} results`);
  return new Response(JSON.stringify({ query, results }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
__name(handleSearch, "handleSearch");
async function handleImageGen(request) {
  const body = await request.json();
  const { apiUrl, apiKey, model, prompt, size } = body;
  console.log("=== Image Generation ===");
  console.log("apiUrl:", apiUrl);
  console.log("model:", model);
  console.log("prompt:", prompt);
  if (!apiUrl || !apiKey || !prompt) {
    return new Response(JSON.stringify({ error: "Missing apiUrl, apiKey or prompt" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  let imageUrl = apiUrl;
  if (imageUrl.includes("/responses")) {
    imageUrl = imageUrl.replace("/responses", "/images/generations");
  } else if (imageUrl.includes("/chat/completions")) {
    imageUrl = imageUrl.replace("/chat/completions", "/images/generations");
  } else if (!imageUrl.includes("/images/generations")) {
    imageUrl = imageUrl.replace(/\/(responses|chat\/completions)$/, "") + "/images/generations";
  }
  console.log("Image API URL:", imageUrl);
  const response = await fetch(imageUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: size || "1024x1024",
      response_format: "url"
    })
  });
  console.log("Image API response status:", response.status);
  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: errorText }), {
      status: response.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  const data = await response.json();
  const images = (data.data || []).map((item) => item.url || item.b64_json).filter(Boolean);
  return new Response(JSON.stringify({ images }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
__name(handleImageGen, "handleImageGen");
function buildTargetRequest({ apiUrl, apiKey, model, mode, platform, stream, body }) {
  if (apiUrl.includes("/responses")) {
    const input = body.messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));
    return {
      url: apiUrl,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: {
        model,
        stream,
        input,
        ...body.extra
      }
    };
  }
  return {
    url: apiUrl,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: {
      model,
      messages: body.messages,
      stream,
      ...body.extra
    }
  };
}
__name(buildTargetRequest, "buildTargetRequest");
function normalizeResponse(data, platform) {
  if (platform === "openai" || platform === "volcengine" || platform === "deepseek") {
    let content = data.choices?.[0]?.message?.content || "";
    if (!content && Array.isArray(data.output)) {
      const msgItem = data.output.find((item) => item.type === "message");
      if (msgItem?.content?.[0]?.text) {
        content = msgItem.content[0].text;
      }
    }
    return {
      content,
      usage: data.usage || null,
      finish_reason: data.choices?.[0]?.finish_reason || "stop",
      raw: data
    };
  }
  if (platform === "aliyun") {
    const output = data.output || {};
    return {
      content: output.text || output.choices?.[0]?.message?.content || "",
      usage: data.usage || null,
      finish_reason: output.finish_reason || "stop",
      raw: data
    };
  }
  return {
    content: data.content || data.text || data.message || JSON.stringify(data),
    usage: data.usage || null,
    finish_reason: "stop",
    raw: data
  };
}
__name(normalizeResponse, "normalizeResponse");
function extractStreamContent(json) {
  const result = { content: "", thinking: "" };
  const skipTypes = [
    "response.created",
    "response.in_progress",
    "response.output_item.added",
    "response.output_item.done",
    "response.content_part.added",
    "response.content_part.done",
    "response.completed",
    "response.reasoning_summary_part.added",
    "response.reasoning_summary_part.done"
  ];
  if (skipTypes.includes(json.type)) return result;
  if (json.type === "response.reasoning_summary_text.delta" && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === "response.reasoning_summary_text.done" && json.text) {
    result.thinking = json.text;
    return result;
  }
  if (json.type === "response.thought.delta" && json.delta) {
    result.thinking = json.delta;
    return result;
  }
  if (json.type === "response.thought.done" && json.thought) {
    result.thinking = json.thought;
    return result;
  }
  const delta = json.choices?.[0]?.delta;
  if (delta?.content) {
    result.content = delta.content;
    return result;
  }
  if (delta?.reasoning_content) {
    result.thinking = delta.reasoning_content;
    return result;
  }
  if (json.type === "response.output_text.delta" && json.delta) {
    result.content = json.delta;
    return result;
  }
  if (json.type === "response.output_text.done" && json.text) {
    result.content = json.text;
    return result;
  }
  if (json.output?.text) {
    result.content = json.output.text;
    return result;
  }
  if (json.output?.choices?.[0]?.message?.content) {
    result.content = json.output.choices[0].message.content;
    return result;
  }
  if (!json.type) {
    if (json.content) result.content = json.content;
    if (json.text) result.content = json.text;
    if (json.delta) result.content = json.delta;
  }
  return result;
}
__name(extractStreamContent, "extractStreamContent");
function parseBingResults(html) {
  const results = [];
  const blockRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/g;
  let match;
  let count = 0;
  while ((match = blockRegex.exec(html)) !== null && count < 8) {
    const block = match[1];
    const h2Match = block.match(/<h2[^>]*>\s*<a[^>]*href="(https?:[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!h2Match) continue;
    const url = h2Match[1];
    const title = h2Match[2].replace(/<[^>]*>/g, "").trim();
    let snippet = "";
    const captionMatch = block.match(/class="b_caption"[^>]*>([\s\S]*?)<\/div>/i);
    if (captionMatch) {
      const pMatch = captionMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) snippet = pMatch[1].replace(/<[^>]*>/g, "").trim();
    }
    if (!snippet) {
      const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pMatch) snippet = pMatch[1].replace(/<[^>]*>/g, "").trim();
    }
    if (title && url && !url.includes("bing.com/aclk") && !url.includes("go.microsoft.com")) {
      results.push({ title, url, snippet });
      count++;
    }
  }
  return results;
}
__name(parseBingResults, "parseBingResults");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
