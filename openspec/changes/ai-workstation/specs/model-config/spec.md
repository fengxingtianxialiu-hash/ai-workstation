## ADDED Requirements

### Requirement: Multi-model configuration
系统 SHALL 支持配置多个 AI 模型，每个模型包含名称、API 地址、API Key、模型标识、计费模式等信息。

#### Scenario: Add new model
- **WHEN** 用户填写模型信息（名称、API 地址、Key、模型标识、模式）并保存
- **THEN** 系统将模型配置存入 localStorage 并在模型列表中显示

#### Scenario: Edit model configuration
- **WHEN** 用户修改已有模型的配置
- **THEN** 系统更新对应模型的配置信息

#### Scenario: Delete model
- **WHEN** 用户删除一个模型
- **THEN** 系统移除该模型配置，使用该模型的 Agent 回退到全局默认

### Requirement: Token and Coding Plan mode support
系统 SHALL 同时支持 Token 模式（按 token 计费，标准 OpenAI 格式）和 Coding Plan 模式（火山方舟、阿里云 Plan 等自定义格式）。

#### Scenario: Token mode request
- **WHEN** 用户选择 Token 模式的模型进行对话
- **THEN** 系统按标准 OpenAI 兼容格式构造请求发送到 CF Worker

#### Scenario: Coding Plan mode request
- **WHEN** 用户选择 Coding Plan 模式的模型进行对话
- **THEN** 系统按该平台的特定格式构造请求，CF Worker 负责协议转换

### Requirement: Three-level model switching
系统 SHALL 支持三级模型优先级：全局默认 → Agent 覆盖 → 会话临时切换。

#### Scenario: Global default model
- **WHEN** Agent 无独立模型绑定且会话无临时切换
- **THEN** 使用全局默认模型

#### Scenario: Agent model override
- **WHEN** Agent 绑定了特定模型
- **THEN** 该 Agent 的对话使用绑定模型，优先级高于全局默认

#### Scenario: Session temporary switch
- **WHEN** 用户在对话中临时切换模型
- **THEN** 仅当前会话使用新模型，不影响 Agent 配置和全局默认

### Requirement: One-click unify models
系统 SHALL 提供"一键统一"功能，将所有 Agent 的模型绑定清除，统一使用全局默认模型。

#### Scenario: Unify all agents to default model
- **WHEN** 用户在设置页点击"将所有 Agent 统一为此模型"
- **THEN** 系统清除所有 Agent 的独立模型绑定，全部回退到当前全局默认模型
