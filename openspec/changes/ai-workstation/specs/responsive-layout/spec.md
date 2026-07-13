## ADDED Requirements

### Requirement: Web responsive layout
系统 SHALL 在 Web 端实现响应式布局，适配桌面和移动端浏览器。

#### Scenario: Desktop layout
- **WHEN** 用户在桌面浏览器（宽度 > 768px）访问
- **THEN** 系统显示侧边栏导航 + 主内容区的双栏布局

#### Scenario: Mobile layout
- **WHEN** 用户在手机浏览器（宽度 <= 768px）访问
- **THEN** 系统显示底部标签栏导航 + 全屏内容区的单栏布局

### Requirement: Adaptive chat interface
对话界面 SHALL 根据屏幕宽度自适应布局。

#### Scenario: Chat on desktop
- **WHEN** 桌面端进入对话页面
- **THEN** 消息气泡最大宽度 800px 居中显示，输入框固定在底部

#### Scenario: Chat on mobile
- **WHEN** 手机端进入对话页面
- **THEN** 消息气泡占满屏幕宽度（减去边距），输入框固定底部，虚拟键盘弹出时自动上推

### Requirement: Modern Chinese-aesthetic UI style
系统 SHALL 采用现代化、清爽、高颜值的 UI 设计风格，符合中国用户审美。

#### Scenario: Visual style
- **WHEN** 用户打开应用
- **THEN** 界面呈现圆角卡片、柔和阴影、舒适间距、精致图标的现代设计风格
