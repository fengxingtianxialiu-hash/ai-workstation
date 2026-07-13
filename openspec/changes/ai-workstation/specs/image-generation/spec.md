## ADDED Requirements

### Requirement: Image generation via AI API
系统 SHALL 支持调用图片生成 API，根据用户文字描述生成图片。

#### Scenario: Enable image generation mode
- **WHEN** 用户点击输入框上方的「🎨 画图」开关按钮
- **THEN** 系统开启图片生成模式，按钮高亮显示，后续发送消息时调用图片生成 API 而非普通对话

#### Scenario: Generate image from text prompt
- **WHEN** 用户在画图模式下输入图片描述并发送
- **THEN** 系统将描述发送到代理服务器的 `/image-gen` 端点，代理服务器调用图片生成专用模型（如 `doubao-pro-3_0`）生成图片

#### Scenario: Image display in chat
- **WHEN** 图片生成成功
- **THEN** 系统在对话气泡中展示生成的图片，用户可查看

#### Scenario: Image generation failure
- **WHEN** 图片生成 API 返回错误（如模型不支持、额度不足等）
- **THEN** 系统显示错误提示（Toast 通知），告知用户失败原因

#### Scenario: Disable image generation mode
- **WHEN** 用户再次点击「 画图」按钮
- **THEN** 系统关闭图片生成模式，后续发送消息恢复普通对话

### Requirement: Image generation API integration
代理服务器 SHALL 提供 `/image-gen` 端点，自动推导图片生成 API URL 并使用专用模型。

#### Scenario: URL derivation
- **WHEN** 收到图片生成请求
- **THEN** 代理服务器从对话 API URL 推导图片生成 URL（`/responses` → `/images/generations`）

#### Scenario: Model selection
- **WHEN** 调用图片生成 API
- **THEN** 代理服务器使用图片生成专用模型（`doubao-pro-3_0`），而非文本对话模型
