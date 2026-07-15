## ADDED Requirements

### Requirement: Crew selection in chat
系统 SHALL 在聊天页输入区域提供协作团队选择器，用户可选择使用某个 Crew 发起协作对话。

#### Scenario: Select crew for collaboration
- **WHEN** 用户点击输入工具栏的"协作"按钮
- **THEN** 系统展示 Crew 选择下拉列表，分为"流水线"和"主从"两组显示

#### Scenario: Crew active indicator
- **WHEN** 用户选择了某个 Crew
- **THEN** 协作按钮显示为激活状态，展示 Crew 名称和模式标识

#### Scenario: Clear crew selection
- **WHEN** 用户选择"默认对话"选项
- **THEN** 系统清除 Crew 选择，回到普通单 Agent 对话模式

#### Requirement: Crew and agent mutual exclusion
- **WHEN** 用户已选择某个 Crew
- **THEN** 单 Agent 选择器自动隐藏或禁用，避免冲突

### Requirement: Crew and auxiliary mode exclusion
系统 SHALL 在协作模式下禁用冲突的辅助功能。

#### Scenario: Disable web search in crew mode
- **WHEN** 用户选择了 Crew 进入协作模式
- **THEN** 联网搜索开关自动禁用并显示为灰色，提示"协作模式下不支持联网搜索"

#### Scenario: Disable image generation in crew mode
- **WHEN** 用户选择了 Crew 进入协作模式
- **THEN** 图片生成开关自动禁用并显示为灰色，提示"协作模式下不支持图片生成"

#### Scenario: Keep image upload in crew mode
- **WHEN** 用户选择了 Crew 进入协作模式
- **THEN** 图片上传按钮保持可用，上传的图片作为第一个 Agent 的输入

### Requirement: Crew conversation binding
系统 SHALL 将协作对话与 Crew 关联，切换历史对话时恢复对应的 Crew。

#### Scenario: Create crew conversation
- **WHEN** 用户在选择了 Crew 的状态下发送消息
- **THEN** 系统创建对话时记录 crewId，后续该对话始终使用同一 Crew

#### Scenario: Restore crew on conversation switch
- **WHEN** 用户切换到历史对话且该对话关联了 Crew
- **THEN** 系统自动恢复 Crew 选择状态

### Requirement: Crew conversation title generation
系统 SHALL 为协作对话生成有意义的标题。

#### Scenario: Crew conversation auto title
- **WHEN** 用户在选择了 Crew 的状态下发送第一条消息
- **THEN** 系统使用"Crew 名称 + 用户消息前 15 字"作为对话标题（如"深度分析团队: AI 发展趋势"）

#### Scenario: Crew conversation title fallback
- **WHEN** Crew 名称为空或用户消息为空
- **THEN** 系统回退使用用户消息前 20 字作为标题（与普通对话一致）

### Requirement: Crew execution visualization
系统 SHALL 在协作执行过程中在对话区域展示结构化的执行进度。

#### Scenario: Pipeline progress panel
- **WHEN** 流水线正在执行
- **THEN** 系统在消息列表底部展示进度面板，包含每个步骤的 Agent 信息、状态图标和可折叠的中间结果

#### Scenario: Commander progress panel
- **WHEN** 主从模式正在执行
- **THEN** 系统先展示指挥官的拆解计划面板，然后逐步展示每个子任务的执行进度

#### Scenario: Expand step details
- **WHEN** 用户点击某个已完成步骤的展开按钮
- **THEN** 系统展示该步骤的完整输入和输出内容

### Requirement: Crew mobile responsive
系统 SHALL 在移动端提供协作功能的响应式交互。

#### Scenario: Mobile crew picker
- **WHEN** 用户在移动端点击协作按钮
- **THEN** Crew 选择器以底部弹出面板形式展示，而非下拉列表

#### Scenario: Mobile progress panel
- **WHEN** 协作在移动端执行中
- **THEN** 进度面板垂直排列，每个步骤占一行，点击可展开详情

#### Scenario: Mobile crew dialog
- **WHEN** 用户在移动端查看协作执行结果
- **THEN** crewResult 展开面板适配全屏宽度，内容可滚动
