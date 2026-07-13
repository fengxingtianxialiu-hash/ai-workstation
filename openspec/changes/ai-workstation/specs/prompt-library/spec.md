## ADDED Requirements

### Requirement: Prompt CRUD
系统 SHALL 支持提示词的创建、查看、编辑、删除。

#### Scenario: Create prompt
- **WHEN** 用户填写标题、内容、标签并保存
- **THEN** 系统将提示词存入 localStorage 并在列表中显示

#### Scenario: Edit prompt
- **WHEN** 用户修改提示词内容并保存
- **THEN** 系统更新提示词数据，updatedAt 时间戳刷新

#### Scenario: Delete prompt
- **WHEN** 用户删除一条提示词
- **THEN** 系统从 localStorage 移除该提示词

### Requirement: Tag-based classification
系统 SHALL 支持为提示词打多个标签，通过标签进行分类筛选。

#### Scenario: Assign tags to prompt
- **WHEN** 用户在创建/编辑提示词时选择或输入标签
- **THEN** 系统将标签关联到该提示词，标签栏显示所有已用标签

#### Scenario: Filter by tags
- **WHEN** 用户在标签栏点击一个或多个标签
- **THEN** 列表仅显示包含所选标签的提示词（多标签为 AND 关系）

### Requirement: Search functionality
系统 SHALL 支持对提示词标题、内容、标签进行全文搜索。

#### Scenario: Search prompts
- **WHEN** 用户在搜索框输入关键词
- **THEN** 系统实时过滤列表，显示标题、内容或标签中包含关键词的提示词

#### Scenario: Combined search and tag filter
- **WHEN** 用户同时使用搜索框和标签筛选
- **THEN** 系统返回同时满足搜索关键词和标签条件的提示词

### Requirement: Variable template
系统 SHALL 支持在提示词内容中使用 `{{变量名}}` 占位符，使用时弹出填写表单。

#### Scenario: Use prompt with variables
- **WHEN** 用户点击一个包含 `{{变量}}` 的提示词的使用按钮
- **THEN** 系统弹出变量填写表单，用户填写后系统将变量替换到提示词中并发送到当前对话

#### Scenario: Prompt without variables
- **WHEN** 用户点击一个不含变量的提示词的使用按钮
- **THEN** 系统直接将提示词内容发送到当前对话

### Requirement: Usage statistics and sorting
系统 SHALL 记录每条提示词的使用次数，支持按使用次数排序。

#### Scenario: Sort by usage count
- **WHEN** 用户选择"使用最多"排序
- **THEN** 列表按使用次数降序排列

#### Scenario: Increment usage count
- **WHEN** 用户使用一条提示词发送到对话
- **THEN** 该提示词的 useCount 加 1
