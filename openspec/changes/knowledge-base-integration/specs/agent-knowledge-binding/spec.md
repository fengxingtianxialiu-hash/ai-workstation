## ADDED Requirements

### Requirement: Agent 绑定知识库
系统 SHALL 允许用户在 Agent 管理页面为 Agent 绑定一个或多个知识库。

#### Scenario: 成功绑定知识库
- **WHEN** 用户在 Agent 编辑页面选择知识库并保存
- **THEN** 系统保存 Agent 与知识库的关联关系

### Requirement: Agent 解绑知识库
系统 SHALL 允许用户移除 Agent 已绑定的知识库。

#### Scenario: 成功解绑知识库
- **WHEN** 用户点击已绑定知识库的移除按钮
- **THEN** 系统移除该知识库与 Agent 的关联

### Requirement: 对话自动加载知识库
系统 SHALL 在用户选择 Agent 后自动加载该 Agent 绑定的所有知识库。

#### Scenario: 自动加载
- **WHEN** 用户在对话页选择 Agent
- **THEN** 系统自动加载该 Agent 绑定的知识库，显示在输入框上方

### Requirement: 知识库数量限制
系统 SHALL 限制单个 Agent 最多绑定 5 个知识库。

#### Scenario: 达到上限
- **WHEN** Agent 已绑定 5 个知识库，用户尝试添加更多
- **THEN** 系统提示"最多绑定 5 个知识库"并阻止添加

### Requirement: 知识库删除引用检查
系统 SHALL 在用户删除知识库时检查是否有 Agent 绑定，如有则提示用户先解绑。

#### Scenario: 删除被绑定的知识库
- **WHEN** 用户尝试删除已被 Agent 绑定的知识库
- **THEN** 系统提示"该知识库已被 X 个 Agent 绑定，请先解绑"并阻止删除
