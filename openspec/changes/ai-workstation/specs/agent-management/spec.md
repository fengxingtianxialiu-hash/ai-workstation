## ADDED Requirements

### Requirement: Agent CRUD
系统 SHALL 支持创建、查看、编辑、删除 Agent 角色。

#### Scenario: Create agent
- **WHEN** 用户填写 Agent 名称、角色描述、系统提示词、能力配置并保存
- **THEN** 系统将 Agent 数据存入 localStorage 并在 Agent 列表中显示

#### Scenario: Edit agent
- **WHEN** 用户修改已有 Agent 的配置并保存
- **THEN** 系统更新 localStorage 中的 Agent 数据

#### Scenario: Delete agent
- **WHEN** 用户删除一个 Agent
- **THEN** 系统从 localStorage 移除该 Agent，关联的对话历史保留但标记为无 Agent

### Requirement: Agent capability configuration
系统 SHALL 支持为每个 Agent 配置不同的能力集（如代码生成、代码审查、文件导出、联网搜索、图片生成）。

#### Scenario: Configure agent capabilities
- **WHEN** 用户在 Agent 编辑页选择/取消能力项
- **THEN** 系统更新该 Agent 的能力配置，对话界面根据能力显示/隐藏对应功能按钮

### Requirement: Agent model binding
系统 SHALL 支持为每个 Agent 绑定特定的 AI 模型。

#### Scenario: Bind model to agent
- **WHEN** 用户在 Agent 配置中选择一个模型
- **THEN** 该 Agent 的对话使用绑定的模型而非全局默认模型

#### Scenario: Clear agent model binding
- **WHEN** 用户清除 Agent 的模型绑定
- **THEN** 该 Agent 回退使用全局默认模型

### Requirement: Agent data export
系统 SHALL 支持将 Agent 数据导出为 JSON 片段，可合并到全局备份文件中。

#### Scenario: Export single agent
- **WHEN** 用户导出某个 Agent
- **THEN** 系统生成该 Agent 的 JSON 数据并下载
