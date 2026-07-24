## Why

构建一个基于 Vue 3 + Vite 的全功能 AI 工作台，部署在 GitHub Pages 上，提供对话、文件生成、Agent 管理等能力。目标是打造一个个人可用的、可跨端（H5 + 未来小程序）的 AI 工具平台，通过代理层解决跨域和协议适配问题（生产环境使用阿里云 ESA Edge Function 同域部署，本地开发使用 Node.js 代理服务器），所有数据本地存储并支持一键导出/导入。

## What Changes

- 新建 Vue 3 + Vite 项目，面向 H5 端（GitHub Pages 部署），预留小程序适配能力
- 实现 AI 对话功能：支持文字和图片输入、流式输出、Markdown 实时渲染
- 实现思考过程与结论分离显示：思考过程小字（11px）可折叠，结论正常字号
- 实现联网搜索功能：开关按钮、AI 查询重写、DuckDuckGo 优先（Bing 备用）、结果注入上下文
- 实现图片生成功能：画图开关按钮、调用图片生成 API、图片在对话中展示
- 实现文件生成引擎：AI 输出结构化 JSON，前端转换为 Excel / Word / PPT / PDF
- 实现 Agent 管理系统：多角色 Agent，不同能力配置，可绑定不同模型，数据存 localStorage 并支持导出
- 实现模型配置系统：支持多种 AI 模型（Token 模式和 Coding Plan 模式），三级模型切换（全局默认 → Agent 覆盖 → 会话临时）
- 实现提示词库：标签分类、搜索查询、变量模板、增删改查
- 实现主题引擎：CSS 变量注册表，支持日间/夜间模式切换，可扩展新主题
- 实现数据导出/导入：JSON 文件一键下载全部状态（Agent、提示词、模型配置、对话历史可选），导入时取并集
- 实现 API Key 加密：AES-GCM 加密存储，密码不持久化
- 实现代理层：解决跨域、适配 Token/Plan 协议、流式响应（生产环境 ESA 透传 + 前端解析，本地开发 Node.js 逐 chunk 解析）、联网搜索端点、图片生成端点
- 实现存储适配层：H5 用 localStorage + IndexedDB，预留小程序 uni.setStorage 接口
- 实现响应式布局：Web 端自适应，手机端良好体验

## Capabilities

### New Capabilities

- `ai-chat`: AI 对话核心功能，包括文字/图片输入、流式输出、Markdown 渲染、中途停止、思考过程显示、联网搜索、图片生成
- `file-generation`: 文件生成引擎，AI 输出结构化 JSON 转换为 Excel / Word / PPT / PDF
- `image-generation`: 图片生成能力，调用图片生成 API，开关模式控制
- `agent-management`: Agent 角色管理系统，多角色、多能力、模型绑定、数据导出
- `model-config`: 多模型配置与切换系统，支持 Token 和 Coding Plan 两种模式
- `prompt-library`: 提示词库管理，标签分类、搜索、变量模板、增删改查
- `theme-engine`: 主题引擎，CSS 变量注册表、日间/夜间模式、可扩展主题
- `data-backup`: 数据导出/导入系统，JSON 一键备份恢复，并集合并策略
- `key-encryption`: API Key 加密存储，AES-GCM 加密，密码不持久化
- `proxy-layer`: 代理层（生产环境阿里云 ESA Edge Function + 本地开发 Node.js），跨域解决、协议适配、流式响应、联网搜索、图片生成
- `storage-adapter`: 跨端存储适配层，统一接口屏蔽平台差异
- `responsive-layout`: 响应式布局系统，Web 自适应 + 手机端优化

### Modified Capabilities

（无，这是全新项目）

## Impact

- **前端框架**: Vue 3 + Vite + TypeScript，使用 Pinia 状态管理、Vue Router 路由
- **第三方库**: SheetJS (Excel)、docx.js (Word)、PptxGenJS (PPT)、jsPDF (PDF)、Web Crypto API (加密)
- **部署**: GitHub Pages (静态站点) + 阿里云 ESA Edge Function（生产环境代理层）+ Node.js 本地代理服务器（开发环境）
- **API 集成**: DeepSeek、火山方舟、阿里云、OpenAI 等主流 AI 平台 API
- **存储**: localStorage (轻量配置) + IndexedDB (大容量数据如对话历史)
- **跨端**: 当前聚焦 H5，存储层预留小程序适配接口
