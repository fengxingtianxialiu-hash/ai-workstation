## ADDED Requirements

### Requirement: Crew CRUD
系统 SHALL 支持创建、查看、编辑、删除协作团队（Crew）。每个 Crew 包含名称、描述、协作模式（pipeline / commander）、关联的 Agent 列表。

#### Scenario: Create pipeline crew
- **WHEN** 用户选择"流水线"模式，填写团队名称和描述，按顺序添加多个 Agent 并保存
- **THEN** 系统将 Crew 数据存入 IndexedDB，mode 为 `pipeline`，agents 按用户指定顺序排列

#### Scenario: Create commander crew
- **WHEN** 用户选择"主从"模式，指定一个指挥官 Agent 和多个执行者 Agent，填写名称和描述并保存
- **THEN** 系统将 Crew 数据存入 IndexedDB，mode 为 `commander`，commanderId 为指挥官 ID，agents 为执行者列表

#### Scenario: Edit crew
- **WHEN** 用户修改 Crew 的配置（名称、Agent 列表、顺序等）并保存
- **THEN** 系统更新 IndexedDB 中的 Crew 数据

#### Scenario: Delete crew
- **WHEN** 用户删除一个 Crew
- **THEN** 系统从 IndexedDB 移除该 Crew，已产生的协作执行记录保留

### Requirement: Pipeline agent ordering
系统 SHALL 支持在流水线模式下拖拽调整 Agent 的执行顺序。

#### Scenario: Reorder agents in pipeline
- **WHEN** 用户在流水线编辑界面拖拽 Agent 卡片改变顺序
- **THEN** 系统更新 Agent 的执行顺序并保存

#### Scenario: Minimum agents for pipeline
- **WHEN** 用户尝试保存流水线但 Agent 数量少于 2 个
- **THEN** 系统提示"流水线至少需要 2 个 Agent"，阻止保存

### Requirement: Commander role assignment
系统 SHALL 支持在主从模式下为指挥官和每个执行者配置角色说明。

#### Scenario: Assign commander
- **WHEN** 用户在主从模式下从 Agent 列表中选择一个作为指挥官
- **THEN** 系统将该 Agent 设为 commanderId，其余为执行者

#### Scenario: Commander model recommendation
- **WHEN** 用户选择的指挥官 Agent 未绑定模型或绑定的模型为低能力模型
- **THEN** 系统显示提示"指挥官建议使用高能力模型以获得更好的任务拆解效果"

### Requirement: Crew list display
系统 SHALL 在 Agent 管理页面提供"协作团队"Tab，展示所有 Crew 列表。

#### Scenario: View crew list
- **WHEN** 用户进入 Agent 管理页面并切换到"协作团队"Tab
- **THEN** 系统展示所有 Crew 卡片，每个卡片显示名称、模式标识、包含的 Agent 数量和成员头像

#### Scenario: Empty crew list
- **WHEN** 用户没有任何 Crew
- **THEN** 系统显示空状态提示"还没有协作团队，创建一个开始使用"

### Requirement: Crew data export
系统 SHALL 支持将 Crew 配置导出为 JSON，并在数据备份中包含 Crew 数据。

#### Scenario: Export crew
- **WHEN** 用户导出某个 Crew
- **THEN** 系统生成该 Crew 的 JSON 数据并下载

#### Scenario: Crew in global backup
- **WHEN** 用户执行全局数据备份
- **THEN** 备份数据中包含所有 Crew 配置

### Requirement: Crew data import
系统 SHALL 支持导入 Crew 配置 JSON 文件，与现有数据合并。

#### Scenario: Import crew from JSON
- **WHEN** 用户导入一个 Crew JSON 文件
- **THEN** 系统解析文件并创建新的 Crew，若 ID 已存在则跳过并提示

#### Scenario: Import invalid crew file
- **WHEN** 用户导入格式错误的文件
- **THEN** 系统提示"文件格式错误，请选择有效的 Crew 配置文件"

## ADDED Requirements

### Requirement: Crew validation rules
系统 SHALL 在创建和编辑 Crew 时执行以下校验规则。

#### Scenario: Commander cannot be executor
- **WHEN** 用户在主从模式下尝试将指挥官 Agent 同时加入执行者列表
- **THEN** 系统提示"指挥官不能同时作为执行者"，阻止添加

#### Scenario: Duplicate agent in pipeline allowed with sequence
- **WHEN** 用户在流水线中添加同一个 Agent 多次
- **THEN** 系统允许添加，但在 UI 中显示序号区分（如"研究员 #1"、"研究员 #2"）

#### Scenario: Maximum agents per crew
- **WHEN** 用户尝试在一个 Crew 中添加超过 8 个 Agent
- **THEN** 系统提示"单个团队最多支持 8 个 Agent"，阻止添加

#### Scenario: Commander crew minimum executors
- **WHEN** 用户尝试保存主从团队但执行者数量少于 1 个
- **THEN** 系统提示"主从团队至少需要 1 个执行者"，阻止保存

### Requirement: Crew mobile responsive
系统 SHALL 在移动端提供 Crew 管理的响应式交互。

#### Scenario: Mobile crew creation
- **WHEN** 用户在移动端创建或编辑 Crew
- **THEN** 对话框适配全屏展示，Agent 选择使用列表滚动而非拖拽

#### Scenario: Mobile pipeline ordering
- **WHEN** 用户在移动端编辑流水线的 Agent 顺序
- **THEN** 系统提供上移/下移按钮替代拖拽排序
