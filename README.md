# AI 工作站

一个功能完整的 AI 对话工作台，支持多模型对话、文档生成、图片生成、联网搜索等功能。

## ✨ 功能特性

### 核心功能
- 💬 **多模型对话**：支持 OpenAI、DeepSeek、火山方舟、阿里云等多种模型
- 🤖 **Agent 对话**：选择 Agent 自动注入系统提示词，支持绑定独立模型
-  **多智能体协作**：支持流水线（顺序执行）和主从模式（指挥官分配任务），多 Agent 协同完成复杂任务，实时展示执行进度，支持查看完整中间结果并单独下载每个步骤的 Word 文档
- 📝 **文档生成**：一键生成 Word、PPT、PDF、Excel 文档
- 🎨 **图片生成**：支持 AI 绘图功能
- 🌐 **联网搜索**：实时搜索最新信息
-  **响应式设计**：完美适配手机、平板、电脑

### 高级功能
- 🤖 **Agent 管理**：自定义 AI 助手角色，对话中一键切换
- 👥 **协作团队管理**：创建流水线/主从团队，编排 Agent 执行顺序，支持导入导出
- 📋 **提示词库**：管理和复用提示词模板
-  **数据备份**：支持数据导出和恢复（含 Agent 和团队配置）
-  **主题切换**：日间/夜间模式
- 📊 **批量管理**：批量删除历史对话

##  快速部署

### 方案一：Cloudflare Workers + GitHub Pages（推荐）

完全免费，无需服务器，全球 CDN 加速。

```bash
# 1. 部署 Worker
npm install -g wrangler
wrangler login
cd proxy && wrangler deploy

# 2. 更新 .env 文件
VITE_PROXY_URL=https://ai-workstation-proxy.your-subdomain.workers.dev/proxy

# 3. 部署到 GitHub Pages
npm run deploy:pages
```

详细步骤查看：[QUICK_START.md](./QUICK_START.md)

### 方案二：本地运行

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 启动代理服务器
node proxy/server.js

# 3. 启动前端（新终端）
npm run dev
```

访问：http://localhost:5173/ai-workstation/

##  文档

- [快速开始](./QUICK_START.md) - 5 分钟部署指南
- [部署文档](./DEPLOY.md) - 完整部署说明
- [Worker 部署](./proxy/DEPLOY.md) - Cloudflare Workers 配置

##  技术栈

- **前端**：Vue 3 + TypeScript + Vite
- **状态管理**：Pinia
- **路由**：Vue Router
- **存储**：IndexedDB + localStorage
- **代理**：Cloudflare Workers / Express
- **文档生成**：docx、pptxgenjs、jspdf、xlsx

## 📱 截图

（待添加）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

##  致谢

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [GitHub Pages](https://pages.github.com/)
- [Vue.js](https://vuejs.org/)
