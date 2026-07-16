## Why

当前 Agent 系统缺乏外部知识接入能力，无法利用药典、法规等专业文档辅助回答。药学场景需要高度准确的信息溯源，纯 LLM 生成存在编造风险。知识库功能通过 RAG（检索增强生成）机制，让 Agent 能够检索并引用权威文档，提升回答准确性和可信度。

## What Changes

- 新增知识库管理模块，支持创建知识库、上传文档（.txt/.md）、文档分块存储
- 新增结构化索引机制，按文档目录/章节建立层级索引，支持快速定位
- 新增全文检索引擎，支持关键词匹配和相关度排序
- 新增 Agent 与知识库绑定功能，Agent 可关联多个知识库
- 新增对话页知识库选择器，支持动态添加/移除知识库
- 新增检索结果自动注入机制，用户提问时自动检索并注入相关上下文
- 新增来源溯源展示，AI 回答底部显示参考的知识库条目
- 新增条目原文查看和下载功能

## Capabilities

### New Capabilities

- `knowledge-base-management`: 知识库 CRUD、文档上传、分块存储、索引构建
- `knowledge-retrieval`: 全文检索、相关度排序、结果注入
- `agent-knowledge-binding`: Agent 绑定知识库、对话自动加载
- `chat-knowledge-integration`: 对话页知识库选择、检索进度展示、来源溯源

### Modified Capabilities

- `agent-management`: 新增知识库绑定配置项
- `ai-chat`: 新增知识库检索注入逻辑、来源展示 UI

## Impact

- **前端**: 新增知识库管理页面、检索引擎、对话页知识库 UI
- **存储**: IndexedDB 新增知识库相关表（documents、chunks、indexes）
- **依赖**: 新增 flexsearch（全文检索）、pdfjs-dist（PDF 解析，可选）
- **Agent 系统**: Agent 类型新增 knowledgeBaseIds 字段
- **对话系统**: 消息流新增知识库检索步骤、来源元数据
