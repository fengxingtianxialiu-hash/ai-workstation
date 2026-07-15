## Why

当前项目的 Agent 系统是单智能体模式——一个 Agent 独立完成任务，无法协作。对于复杂任务（如深度分析报告、多角度方案评审），单 Agent 往往力不从心。引入多智能体协作能力，让用户可以编排多个 Agent 协同工作，能显著提升系统处理复杂任务的能力，也是 AI 工作台从"工具"进化为"团队协作平台"的关键一步。

## What Changes

### 阶段一：顺序流水线（Pipeline）
- 新增"协作流程"概念：用户将多个 Agent 组合为顺序执行的流水线
- 前一个 Agent 的输出自动作为下一个 Agent 的输入上下文
- 聊天页支持选择协作流程，展示每个步骤的执行进度和中间结果
- 最终汇总输出给用户

### 阶段二：主从模式（Commander）
- 新增"团队"概念：一个指挥官 Agent + 多个执行者 Agent
- 指挥官自动拆解用户任务为子任务，分配给执行者
- 支持串行执行子任务，指挥官最终汇总审校
- 聊天页展示任务拆解计划、执行进度、最终结果

## Capabilities

### New Capabilities
- `crew-management`: 协作团队管理（流水线定义、团队定义、CRUD 操作）
- `crew-execution`: 协作执行引擎（流水线串行执行、主从模式任务拆解与汇总、进度展示）

### Modified Capabilities
- `agent-management`: Agent 需要支持被引用到协作团队中，新增"参与协作"标识
- `ai-chat`: 聊天页新增协作模式入口，支持选择团队/流水线发起协作对话，展示多步骤执行过程

## Impact

- **新增数据模型**：Crew（统一团队定义，含 mode 区分 pipeline/commander）、CrewStep（单步执行记录）、CrewResult（协作执行结果，含 steps 数组和 finalOutput）
- **新增 Store**：crew store 管理协作团队数据
- **新增页面/组件**：Agent 管理页扩展"协作团队"Tab、协作执行进度组件
- **修改 ChatPage**：新增协作模式选择器、多步骤执行 UI、中间结果展示
- **修改 api-client**：新增协作执行相关的 API 调用逻辑（本质是多次串行 sendChat）
- **修改类型定义**：Message 新增 crewResult 字段、Conversation 新增 crewId 字段
- **存储层**：协作团队配置持久化到 IndexedDB
- **无破坏性变更**：现有单 Agent 对话功能完全保留，协作模式作为可选扩展
