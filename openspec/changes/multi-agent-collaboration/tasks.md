## 1. 数据模型与类型定义

- [x] 1.1 在 `src/types/model.ts` 中新增 `Crew` 类型（含 id、name、description、mode、agents、commanderId、createdAt、updatedAt）
- [x] 1.2 在 `src/types/model.ts` 中新增 `CrewStep` 类型（含 agentId、status、input、output、error）
- [x] 1.3 在 `src/types/model.ts` 中新增 `CrewResult` 类型（含 steps 数组、finalOutput、mode）
- [x] 1.4 在 `Message` 类型中新增可选字段 `crewResult?: CrewResult`
- [x] 1.5 在 `Conversation` 类型中新增可选字段 `crewId?: string`

## 2. Crew Store 实现

- [x] 2.1 创建 `src/stores/crew.ts`，实现 Crew 的 CRUD 操作（addCrew、updateCrew、removeCrew、getCrew）
- [x] 2.2 实现 Crew 数据持久化（IndexedDB 存储，key 为 `app-crews`）
- [x] 2.3 实现 `getCrewsByAgent(agentId)` 方法，查询 Agent 参与的 Crew 列表
- [x] 2.4 实现 `exportCrew(id)` 和 `exportAllCrews()` 方法
- [x] 2.5 实现 `importCrew(json)` 方法，支持导入 Crew JSON（ID 冲突时跳过）

## 3. 流水线执行引擎（阶段一）

- [x] 3.1 在 `src/utils/` 中创建 `crew-executor.ts`，实现流水线执行函数 `executePipeline(crew, userInput, callbacks)`
- [x] 3.2 实现流水线上下文传递逻辑：前一步输出注入下一步 systemPrompt 末尾
- [x] 3.3 实现上下文截断逻辑（超过 8000 字符时截断保留最近内容）
- [x] 3.4 实现执行进度回调接口（onStepStart、onStepComplete、onStepError、onStreamChunk）
- [x] 3.5 实现执行中断支持（AbortController 传递）
- [x] 3.6 实现执行前预检查：Agent 存在性、模型可用性、加密 API Key 可用性

## 4. 主从模式执行引擎（阶段二）

- [x] 4.1 实现主从模式执行函数 `executeCommander(crew, userInput, callbacks)`
- [x] 4.2 实现指挥官任务拆解调用（systemPrompt 约束输出 JSON 格式）
- [x] 4.3 实现拆解计划 JSON 解析逻辑（含解析失败回退到纯文本）
- [x] 4.4 实现子任务串行执行逻辑
- [x] 4.5 实现指挥官最终汇总调用

## 5. Crew 管理页面

- [x] 5.1 在 `AgentsPage.vue` 中新增"协作团队"Tab 切换
- [x] 5.2 实现 Crew 列表展示（卡片形式，显示名称、模式标识、Agent 数量和头像）
- [x] 5.3 实现创建 Crew 对话框（选择模式、填写名称描述、选择 Agent）
- [x] 5.4 实现校验规则：指挥官不能同时为执行者、单 Crew 最多 8 个 Agent、流水线至少 2 个 Agent、主从至少 1 个执行者
- [x] 5.5 实现流水线模式下的 Agent 排序 UI（桌面端拖拽 + 移动端上移/下移按钮）
- [x] 5.6 实现流水线中同一 Agent 重复添加时显示序号区分
- [x] 5.7 实现主从模式下的指挥官选择 UI（排除已选指挥官出现在执行者列表）
- [x] 5.8 实现 Crew 编辑和删除功能
- [x] 5.9 实现 Crew 导入功能（JSON 文件选择 + 解析 + 合并）
- [x] 5.10 在 Agent 卡片上显示"参与 N 个团队"标识
- [x] 5.11 Agent 删除时检查 Crew 引用并弹出确认对话框
- [x] 5.12 实现 Crew 管理页面的移动端响应式适配

## 6. 聊天页协作集成（阶段一：流水线）

- [x] 6.1 在 ChatPage 输入工具栏新增"协作"按钮和 Crew 选择下拉列表
- [x] 6.2 实现 Crew 选择后隐藏/禁用单 Agent 选择器
- [x] 6.3 实现 Crew 选择后自动禁用联网搜索和图片生成开关
- [x] 6.4 实现 Crew 对话创建时记录 crewId
- [x] 6.5 实现切换历史对话时恢复 Crew 选择状态
- [x] 6.6 实现协作对话标题生成规则（"Crew 名称: 用户消息前 15 字"）
- [x] 6.7 实现协作执行进度面板组件（步骤状态、Agent 信息、可折叠中间结果）
- [x] 6.8 实现流水线执行流程集成（调用 executePipeline，展示进度）
- [x] 6.9 实现协作结果存储（crewResult 字段写入消息）
- [x] 6.10 实现协作消息的展开/收起（查看中间步骤详情）
- [x] 6.11 实现执行期间输入锁定（禁用发送按钮，显示"协作执行中..."）
- [x] 6.12 实现执行中断（停止按钮终止当前步骤）
- [x] 6.13 实现执行前 Token 消耗预估提示
- [x] 6.14 实现执行后 Token 消耗汇总展示

## 7. 聊天页协作集成（阶段二：主从模式）

- [x] 7.1 实现指挥官拆解计划展示面板（JSON 解析渲染）
- [x] 7.2 实现拆解计划确认交互（用户确认后开始执行子任务）
- [x] 7.3 实现拆解计划解析失败时的纯文本回退展示
- [x] 7.4 实现主从模式执行流程集成（拆解 → 确认 → 子任务执行 → 汇总）

## 8. 错误处理与边界情况

- [x] 8.1 实现步骤失败时的"重试"和"跳过"选项
- [x] 8.2 实现执行前 Agent 存在性检查（Agent 被删除时阻止执行并提示）
- [x] 8.3 实现执行前模型可用性检查（模型被删除时阻止执行并提示）
- [x] 8.4 实现执行前加密 API Key 检查（未解密时提示用户先解锁）
- [x] 8.5 实现指挥官未绑定模型时的提示

## 9. 数据备份集成

- [x] 9.1 在全局备份（backup.ts）中包含 Crew 数据
- [x] 9.2 在数据恢复时导入 Crew 数据

## 10. 移动端适配

- [x] 10.1 Crew 选择器在移动端以底部弹出面板形式展示
- [x] 10.2 协作进度面板在移动端垂直排列，点击展开详情
- [x] 10.3 crewResult 展开面板在移动端适配全屏宽度

## 11. 文档更新

- [x] 11.1 更新 README.md 和 SUMMARY.md 添加多智能体协作功能描述
