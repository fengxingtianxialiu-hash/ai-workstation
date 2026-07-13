## ADDED Requirements

### Requirement: One-click export all data
系统 SHALL 支持将所有应用数据导出为 JSON 文件。

#### Scenario: Export all data
- **WHEN** 用户点击"一键备份"按钮
- **THEN** 系统将 Agent 数据、提示词、模型配置、设置信息打包为 JSON 文件并触发下载

#### Scenario: Export with optional conversation history
- **WHEN** 用户在导出时勾选"包含对话历史"
- **THEN** 导出的 JSON 文件中包含 IndexedDB 中的对话历史数据

#### Scenario: Export without conversation history
- **WHEN** 用户未勾选"包含对话历史"
- **THEN** 导出的 JSON 文件不包含对话历史，文件体积较小

### Requirement: Import and merge data
系统 SHALL 支持从 JSON 备份文件导入数据，与本地数据取并集。

#### Scenario: Import backup file
- **WHEN** 用户上传一个备份 JSON 文件
- **THEN** 系统解析文件，将数据与本地存储取并集合并

#### Scenario: Merge strategy - union
- **WHEN** 本地有数据 A、B、C，文件有数据 B、C、D
- **THEN** 合并后本地包含 A、B、C、D

#### Scenario: Merge conflict resolution
- **WHEN** 同一条数据在本地和文件中都存在但内容不同
- **THEN** 以文件中的数据为准覆盖本地数据

#### Scenario: Import completion
- **WHEN** 数据导入合并完成
- **THEN** 系统提示导入成功，界面刷新显示最新数据
