## ADDED Requirements

### Requirement: Pipeline execution
系统 SHALL 按用户定义的 Agent 顺序串行执行流水线。每个步骤使用对应 Agent 的 systemPrompt 和绑定模型，前一步骤的输出作为下一步骤的输入上下文。

#### Scenario: Execute pipeline with 3 agents
- **WHEN** 用户选择一个包含 3 个 Agent 的流水线并输入任务
- **THEN** 系统依次调用 Agent 1 → Agent 2 → Agent 3，每步将前一步的输出追加到当前步骤的上下文中

#### Scenario: Pipeline step context injection
- **WHEN** 流水线执行到第 N 步（N > 1）
- **THEN** 系统将前 N-1 步的输出以"前序步骤结果"的形式注入到当前步骤的 systemPrompt 末尾

#### Scenario: Pipeline context truncation
- **WHEN** 前序步骤的累计输出超过 8000 字符
- **THEN** 系统对传递的上下文进行截断，保留最近的输出内容，确保不超出 Token 限制

### Requirement: Commander execution
系统 SHALL 在主从模式下，先调用指挥官 Agent 拆解任务为子任务列表，再依次调用执行者完成子任务，最后由指挥官汇总。

#### Scenario: Commander task decomposition
- **WHEN** 用户选择一个主从团队并输入任务
- **THEN** 系统先调用指挥官 Agent，指挥官输出结构化的子任务计划（包含每个子任务的描述、分配的执行者 Agent ID）

#### Scenario: Commander plan review
- **WHEN** 指挥官完成任务拆解
- **THEN** 系统在对话中展示拆解计划，用户确认后系统开始执行子任务

#### Scenario: Commander subtask execution
- **WHEN** 拆解计划确认后
- **THEN** 系统按顺序调用各执行者 Agent 完成子任务，每个子任务使用对应 Agent 的 systemPrompt

#### Scenario: Commander final summary
- **WHEN** 所有子任务执行完成
- **THEN** 系统将所有子任务的结果传递给指挥官 Agent，指挥官输出最终汇总结果

### Requirement: Execution progress display
系统 SHALL 在协作执行过程中实时展示每个步骤的执行状态。

#### Scenario: Step status display
- **WHEN** 协作正在执行
- **THEN** 系统在对话区域展示步骤进度面板，每个步骤显示：Agent 头像/名称、状态标识（等待中/执行中/已完成/失败）、执行结果摘要

#### Scenario: Streaming step output
- **WHEN** 某个步骤正在执行且使用流式输出
- **THEN** 系统实时展示该步骤的输出内容，其他步骤保持等待状态

#### Scenario: Execution cancellation
- **WHEN** 用户在协作执行过程中点击停止按钮
- **THEN** 系统终止当前步骤的执行，已完成的步骤结果保留，未执行的步骤标记为"已取消"

### Requirement: Execution error handling
系统 SHALL 在单个步骤执行失败时提供错误处理和恢复能力。

#### Scenario: Step execution failure
- **WHEN** 某个步骤的 API 调用返回错误
- **THEN** 系统在该步骤显示错误信息，提供"重试此步骤"和"跳过此步骤"选项

#### Scenario: Pipeline failure abort
- **WHEN** 用户选择跳过某步骤或重试失败
- **THEN** 系统根据情况继续执行后续步骤或终止整个协作流程

### Requirement: Execution result storage
系统 SHALL 将协作执行结果存储到对话消息中。

#### Scenario: Store pipeline result
- **WHEN** 流水线执行完成
- **THEN** 系统将最终步骤的输出作为 assistant 消息存储，消息的 `crewResult` 字段包含所有步骤的中间结果

#### Scenario: Store commander result
- **WHEN** 主从模式执行完成
- **THEN** 系统将指挥官的汇总结果作为 assistant 消息存储，消息的 `crewResult` 字段包含拆解计划、各子任务结果和最终汇总

#### Scenario: View crew execution history
- **WHEN** 用户查看包含 `crewResult` 的消息
- **THEN** 系统默认展示最终结果，用户可展开查看每个步骤的详细输出

### Requirement: Pre-execution validation
系统 SHALL 在协作执行前进行预检查，确保所有条件满足。

#### Scenario: Agent existence check
- **WHEN** 用户发起协作执行
- **THEN** 系统检查 Crew 中所有 Agent 是否存在，若不存在则提示"Crew 中的某些 Agent 已被删除，请重新配置"并阻止执行

#### Scenario: Encrypted API key check
- **WHEN** 用户发起协作执行且涉及的模型启用了加密
- **THEN** 系统检查所有相关模型的 API Key 是否已解密，若未解密则提示"请先在设置中解锁加密模型"并阻止执行

#### Scenario: Model availability check
- **WHEN** 用户发起协作执行且某个 Agent 绑定的模型已被删除
- **THEN** 系统提示"Agent [名称] 绑定的模型不可用"并阻止执行

### Requirement: Commander decomposition format
系统 SHALL 约束指挥官输出固定格式的拆解计划，便于前端解析和渲染。

#### Scenario: Commander outputs JSON plan
- **WHEN** 指挥官完成任务拆解
- **THEN** 系统通过 systemPrompt 约束指挥官输出 JSON 格式，包含 `subtasks` 数组，每个子任务含 `description`、`agentId`、`expectedOutput` 字段

#### Scenario: Parse commander plan
- **WHEN** 指挥官返回拆解结果
- **THEN** 系统解析 JSON 生成执行计划面板，展示每个子任务的描述、分配的执行者、预期输出

#### Scenario: Fallback on parse failure
- **WHEN** 指挥官返回的内容无法解析为 JSON
- **THEN** 系统将原始内容作为纯文本展示，并提示"拆解计划格式异常，请检查指挥官模型配置"，用户可手动确认后继续执行

### Requirement: Token consumption display
系统 SHALL 在协作执行前后展示 Token 消耗信息。

#### Scenario: Pre-execution token estimate
- **WHEN** 用户准备发起协作执行
- **THEN** 系统根据 Crew 步骤数量和用户输入长度展示预估 Token 消耗提示（如"预计消耗约 N Token"）

#### Scenario: Post-execution token summary
- **WHEN** 协作执行完成
- **THEN** 系统在结果面板底部展示实际 Token 消耗汇总（各步骤消耗之和）

### Requirement: Execution input lock
系统 SHALL 在协作执行期间锁定输入，防止并发操作。

#### Scenario: Disable send during execution
- **WHEN** 协作正在执行中
- **THEN** 系统禁用发送按钮，输入区域显示"协作执行中..."提示

#### Scenario: Allow stop during execution
- **WHEN** 协作正在执行中
- **THEN** 停止按钮保持可用，用户可中断当前执行
