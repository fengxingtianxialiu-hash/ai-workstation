# 快速开始

## 5 分钟部署到互联网

### 第一步：部署 Cloudflare Worker（2 分钟）

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录
wrangler login

# 3. 部署
cd proxy
wrangler deploy
```

复制显示的 Worker URL，类似：
```
https://ai-workstation-proxy.xxxxx.workers.dev
```

### 第二步：更新前端配置（1 分钟）

修改 `.env` 文件：

```env
VITE_PROXY_URL=https://ai-workstation-proxy.xxxxx.workers.dev/proxy
```

把 `xxxxx` 替换为你的 Worker 子域名。

### 第三步：部署到 GitHub Pages（2 分钟）

```bash
# 1. 创建 GitHub 仓库
# 2. 推送代码
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/ai-workstation.git
git push -u origin main

# 3. 部署
npm run deploy:pages
```

### 完成！

访问：`https://your-username.github.io/ai-workstation/`

---

## 本地开发

```bash
# 终端 1：启动代理服务器
node proxy/server.js

# 终端 2：启动前端
npm run dev
```

访问：`http://localhost:5173/ai-workstation/`

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run deploy:worker` | 部署 Worker |
| `npm run deploy:pages` | 部署到 GitHub Pages |
| `npm run deploy` | 一键部署全部 |

---

## 需要帮助？

查看完整文档：[DEPLOY.md](./DEPLOY.md)
