## ADDED Requirements

### Requirement: Cross-origin resolution
代理层 SHALL 作为中间层转发前端请求到各 AI 平台 API，解决浏览器跨域限制。生产环境使用阿里云 ESA Edge Function（与前端同域部署，无需 CORS），本地开发使用 Node.js 代理服务器。

#### Scenario: Proxy request to AI API
- **WHEN** 前端发送对话请求到代理层
- **THEN** 代理层将请求转发到目标 AI 平台 API，并将响应返回给前端

### Requirement: Protocol adaptation
代理层 SHALL 支持 Token 模式和 Coding Plan 模式的协议适配。

#### Scenario: Token mode passthrough
- **WHEN** 请求标记为 Token 模式
- **THEN** 代理层按标准 OpenAI 兼容格式转发请求

#### Scenario: Coding Plan mode adaptation
- **WHEN** 请求标记为 Coding Plan 模式（如火山方舟 Responses API）
- **THEN** 代理层根据 URL 路径判断（`/responses` 为 Responses API 格式，其余为标准 `chat/completions` 格式），做相应转发

### Requirement: Unified response format
代理层 SHALL 将各平台的不同响应格式统一为标准格式返回给前端。

#### Scenario: Normalize response
- **WHEN** 不同 AI 平台返回不同格式的响应
- **THEN** 代理层统一转换为前端约定的标准格式（包含 content、usage、finish_reason 等字段）

### Requirement: Streaming passthrough
生产环境（ESA Edge Function）SHALL 直接透传原始 SSE 流给前端，不做逐 chunk 解析，以降低边缘节点 CPU 消耗。本地开发（Node.js）SHALL 从流式响应中提取正文内容和思考过程，分别返回给前端。

#### Scenario: ESA direct passthrough
- **WHEN** 收到流式响应（生产环境）
- **THEN** 代理层直接将原始 SSE 流透传给前端，前端自行解析各平台 SSE 事件

#### Scenario: Node.js content extraction
- **WHEN** 收到流式响应（本地开发）
- **THEN** 代理服务器识别思考过程事件和正文事件，分别提取并返回

### Requirement: Web search endpoint
代理层 SHALL 提供 `/search` 端点，支持联网搜索功能。

#### Scenario: DuckDuckGo search (ESA)
- **WHEN** 前端发送搜索请求到 `/search`（生产环境）
- **THEN** 代理层优先调用 DuckDuckGo HTML 版搜索（对边缘节点更友好），无结果时回退到 Bing 搜索，解析 HTML 结果并返回结构化的搜索结果（标题、链接、摘要）

#### Scenario: Bing search (Node.js)
- **WHEN** 前端发送搜索请求到 `/search`（本地开发）
- **THEN** 代理服务器调用 Bing 搜索，解析 HTML 结果并返回结构化的搜索结果（标题、链接、摘要）

### Requirement: Image generation endpoint
代理层 SHALL 提供 `/image-gen` 端点，支持图片生成功能。

#### Scenario: Generate image
- **WHEN** 前端发送图片生成请求到 `/image-gen`
- **THEN** 代理层调用图片生成 API（使用专用模型如 `doubao-pro-3_0`），返回生成的图片 URL

### Requirement: Optional key decryption in Worker
代理层 SHALL 支持接收加密的 API Key，在服务器端解密后转发，避免明文 Key 在网络传输。

#### Scenario: Encrypted key forwarding
- **WHEN** 前端发送加密的 API Key 和加密盐值到代理层
- **THEN** 代理层使用盐值解密 Key，用明文 Key 调用 AI API，不将明文 Key 返回前端
