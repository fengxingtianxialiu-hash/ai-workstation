## ADDED Requirements

### Requirement: Text input and sending
系统 SHALL 提供文字输入框，用户可输入文字并发送给 AI 模型。输入框 SHALL 支持多行输入、回车发送、Shift+回车换行。

#### Scenario: Send text message
- **WHEN** 用户在输入框中输入文字并按下回车或点击发送按钮
- **THEN** 系统将消息发送到当前 Agent 绑定的模型，并在对话区域显示用户消息和 AI 回复

#### Scenario: Empty input prevention
- **WHEN** 输入框为空或只有空白字符时用户尝试发送
- **THEN** 系统不发送消息，输入框保持焦点

### Requirement: Image input
系统 SHALL 支持用户上传图片，图片经压缩后以 base64 格式发送给 AI 模型进行分析。

#### Scenario: Upload and compress image
- **WHEN** 用户选择一张图片上传
- **THEN** 系统将图片压缩至长边不超过 1280px、质量 0.7-0.8、单张不超过 500KB，然后发送

#### Scenario: Multiple image upload
- **WHEN** 用户一次选择超过 5 张图片
- **THEN** 系统提示用户单次最多上传 5 张，超出部分不处理

#### Scenario: Image preview before sending
- **WHEN** 用户选择图片后
- **THEN** 系统在输入区域上方显示压缩后的图片预览，用户可删除或确认发送

### Requirement: Streaming output
系统 SHALL 通过 fetch + ReadableStream 实现流式输出，AI 回复逐字显示。生产环境代理层直接透传原始 SSE 流，前端自行解析多平台 SSE 格式（火山方舟 Responses API、标准 OpenAI、阿里云等）。

#### Scenario: Stream response display
- **WHEN** AI 模型开始返回流式响应
- **THEN** 系统逐字渲染回复内容，显示输入中光标动画，消息区域自动滚动到底部

#### Scenario: Stop generation
- **WHEN** 用户在 AI 回复过程中点击停止按钮
- **THEN** 系统终止当前请求，已接收的内容保留显示

### Requirement: Thinking process display
系统 SHALL 区分显示 AI 的思考过程和最终答案。思考过程 SHALL 以小字显示且支持折叠，答案部分保持正常字号。

#### Scenario: Display thinking process
- **WHEN** AI 模型返回包含思考过程的内容
- **THEN** 系统在消息气泡中显示可折叠的思考过程区域，使用小字号（11px）和浅灰色文字

#### Scenario: Toggle thinking visibility
- **WHEN** 用户点击思考过程区域的折叠按钮
- **THEN** 系统展开或收起思考过程内容

### Requirement: Web search integration
系统 SHALL 支持联网搜索功能，在发送消息前自动搜索网络信息并注入上下文。

#### Scenario: Enable web search
- **WHEN** 用户点击联网搜索开关按钮
- **THEN** 系统开启联网搜索模式，后续发送消息时自动触发搜索

#### Scenario: Query rewriting
- **WHEN** 用户发送消息且联网搜索已开启
- **THEN** 系统先用 AI 从用户消息中提取搜索关键词，再用关键词调用搜索引擎

#### Scenario: Search results injection
- **WHEN** 联网搜索返回结果
- **THEN** 系统将搜索结果作为上下文注入到用户消息中，AI 基于搜索结果回答

#### Scenario: Search status display
- **WHEN** 联网搜索进行中
- **THEN** 系统显示搜索状态提示（"正在分析问题..."、"正在搜索: xxx"）

### Requirement: Image generation
系统 SHALL 支持调用图片生成 API，根据用户文字描述生成图片并在对话中展示。

#### Scenario: Enable image generation mode
- **WHEN** 用户点击画图开关按钮
- **THEN** 系统开启图片生成模式，后续发送消息时调用图片生成 API

#### Scenario: Generate image from text prompt
- **WHEN** 用户输入图片描述并发送
- **THEN** 系统将描述发送到图片生成 API，获取图片 URL 并在对话中展示

#### Scenario: Image display in chat
- **WHEN** 图片生成成功
- **THEN** 系统在对话气泡中展示生成的图片

#### Scenario: Image generation failure
- **WHEN** 图片生成 API 返回错误
- **THEN** 系统显示错误提示

### Requirement: Markdown rendering
系统 SHALL 实时渲染 AI 回复中的 Markdown 内容，包括代码块、表格、列表、加粗等。

#### Scenario: Code block rendering
- **WHEN** AI 回复包含代码块（```语言名 ... ```）
- **THEN** 系统渲染为带语法高亮的代码块，并提供一键复制按钮

#### Scenario: Table rendering
- **WHEN** AI 回复包含 Markdown 表格
- **THEN** 系统渲染为格式化的 HTML 表格

### Requirement: Conversation management
系统 SHALL 支持多会话管理，用户可创建新会话、切换会话、删除会话。

#### Scenario: Create new conversation
- **WHEN** 用户点击新建会话按钮
- **THEN** 系统创建一个新的空会话，使用当前 Agent 的默认配置

#### Scenario: Switch conversation
- **WHEN** 用户在会话列表中选择一个会话
- **THEN** 系统加载该会话的历史消息并显示

#### Scenario: Delete conversation
- **WHEN** 用户删除一个会话
- **THEN** 系统从 IndexedDB 中移除该会话的所有数据，并切换到相邻会话

### Requirement: Message actions
系统 SHALL 对每条 AI 回复提供操作按钮：复制、重新生成。

#### Scenario: Copy AI response
- **WHEN** 用户点击 AI 回复的复制按钮
- **THEN** 系统将回复的 Markdown 原文复制到剪贴板

#### Scenario: Regenerate response
- **WHEN** 用户点击重新生成按钮
- **THEN** 系统重新发送上一条用户消息，替换当前 AI 回复
