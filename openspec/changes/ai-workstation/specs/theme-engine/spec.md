## ADDED Requirements

### Requirement: CSS variable-based theme system
系统 SHALL 使用 CSS 自定义属性（CSS Variables）实现主题系统，通过注册表模式管理主题。

#### Scenario: Theme registration
- **WHEN** 系统初始化时注册主题
- **THEN** 每个主题以一组 CSS 变量值注册到主题注册表中

#### Scenario: Runtime theme switch
- **WHEN** 用户切换主题
- **THEN** 系统替换根元素的 CSS 变量值，界面即时更新，无需刷新页面

### Requirement: Day/Night mode
系统 SHALL 内置日间模式和夜间模式，支持一键切换。

#### Scenario: Switch to night mode
- **WHEN** 用户点击切换到夜间模式
- **THEN** 系统应用夜间主题的 CSS 变量值（深色背景、浅色文字）

#### Scenario: Switch to day mode
- **WHEN** 用户点击切换到日间模式
- **THEN** 系统应用日间主题的 CSS 变量值（浅色背景、深色文字）

#### Scenario: Persist theme preference
- **WHEN** 用户切换主题后关闭页面再打开
- **THEN** 系统自动恢复上次选择的主题

### Requirement: Theme extensibility
系统 SHALL 支持后续轻松添加新主题，只需注册一组新的 CSS 变量值。

#### Scenario: Add new theme
- **WHEN** 开发者在主题注册表中添加一组新的 CSS 变量
- **THEN** 新主题自动出现在主题切换列表中，用户可选择使用
