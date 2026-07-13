## ADDED Requirements

### Requirement: Cross-origin resolution
Node.js 代理服务器 SHALL 作为代理层转发前端请求到各 AI 平台 API，解决浏览器跨域限制。

#### Scenario: Proxy request to AI API
- **WHEN** 前端发送对话请求到代理服务器
- **THEN** 代理服务器将请求转发到目标 AI 平台 API，并将响应返回给前端

### Requirement: Protocol adaptation
代理服务器 SHALL 支持 Token 模式和 Coding Plan 模式的协议适配。

#### Scenario: Token mode passthrough
- **WHEN** 请求标记为 Token 模式
- **THEN** 代理服务器按标准 OpenAI 兼容格式转发请求

#### Scenario: Coding Plan mode adaptation
- **WHEN** 请求标记为 Coding Plan 模式（如火山方舟、阿里云 Plan）
- **THEN** 代理服务器将请求转换为目标平台的特定格式后转发

### Requirement: Unified response format
代理服务器 SHALL 将各平台的不同响应格式统一为标准格式返回给前端。

#### Scenario: Normalize response
- **WHEN** 不同 AI 平台返回不同格式的响应
- **THEN** 代理服务器统一转换为前端约定的标准格式（包含 content、usage、finish_reason 等字段）

### Requirement: Streaming content extraction
代理服务器 SHALL 从各平台的流式响应中提取正文内容和思考过程，分别返回给前端。

#### Scenario: Extract thinking and content
- **WHEN** 收到流式响应 chunk
- **THEN** 代理服务器识别思考过程事件（如 `response.reasoning_summary_text.delta`）和正文事件（如 `response.output_text.delta`），分别提取并返回

### Requirement: Web search endpoint
代理服务器 SHALL 提供 `/search` 端点，支持联网搜索功能。

#### Scenario: Bing search
- **WHEN** 前端发送搜索请求到 `/search`
- **THEN** 代理服务器调用 Bing 搜索，解析 HTML 结果并返回结构化的搜索结果（标题、链接、摘要）

### Requirement: Image generation endpoint
代理服务器 SHALL 提供 `/image-gen` 端点，支持图片生成功能。

#### Scenario: Generate image
- **WHEN** 前端发送图片生成请求到 `/image-gen`
- **THEN** 代理服务器调用图片生成 API（使用专用模型如 `doubao-pro-3_0`），返回生成的图片 URL

### Requirement: Optional key decryption in Worker
代理服务器 SHALL 支持接收加密的 API Key，在服务器端解密后转发，避免明文 Key 在网络传输。

#### Scenario: Encrypted key forwarding
- **WHEN** 前端发送加密的 API Key 和加密盐值到代理服务器
- **THEN** 代理服务器使用盐值解密 Key，用明文 Key 调用 AI API，不将明文 Key 返回前端
