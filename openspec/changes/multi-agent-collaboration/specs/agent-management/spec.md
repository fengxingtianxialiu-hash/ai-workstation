## ADDED Requirements

### Requirement: Agent crew participation indicator
系统 SHALL 在 Agent 列表中显示该 Agent 参与了多少个协作团队。

#### Scenario: Show crew count on agent card
- **WHEN** 用户查看 Agent 管理页面
- **THEN** 每个 Agent 卡片显示"参与 N 个团队"的标识

#### Scenario: Agent used in crew cannot be deleted without warning
- **WHEN** 用户尝试删除一个正在被 Crew 引用的 Agent
- **THEN** 系统弹出确认对话框"该 Agent 正在 N 个协作团队中使用，删除后将影响这些团队的执行。确定要删除吗？"
