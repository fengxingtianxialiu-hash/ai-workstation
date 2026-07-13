# Cloudflare Workers 部署指南

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 部署 Worker

```bash
cd proxy
wrangler deploy
```

部署成功后会显示 Worker 的 URL，类似：
```
https://ai-workstation-proxy.your-subdomain.workers.dev
```

### 4. 更新前端配置

修改项目根目录的 `.env` 文件：

```env
VITE_PROXY_URL=https://ai-workstation-proxy.your-subdomain.workers.dev/proxy
```

将 `your-subdomain` 替换为你的 Cloudflare 子域名。

### 5. 重新构建前端

```bash
npm run build
```

## 本地测试

```bash
cd proxy
wrangler dev
```

这会启动本地开发服务器，默认在 `http://localhost:8787`

## 自定义域名（可选）

1. 在 Cloudflare 控制台添加你的域名
2. 在 `wrangler.toml` 中配置路由：
   ```toml
   routes = [
     { pattern = "proxy.your-domain.com", custom_domain = true }
   ]
   ```
3. 重新部署：
   ```bash
   wrangler deploy
   ```

## 前端部署到 GitHub Pages

### 1. 安装 gh-pages

```bash
npm install -D gh-pages
```

### 2. 在 package.json 添加脚本

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### 3. 部署

```bash
npm run deploy
```

访问地址：`https://your-username.github.io/ai-workstation/`

## 注意事项

1. **Cloudflare Workers 免费额度**：
   - 每天 10 万次请求
   - 每次请求最多 10ms CPU 时间
   - 对于个人使用完全足够

2. **流式响应**：
   - Worker 支持 SSE 流式响应
   - 但需要注意超时限制（免费计划最长 30 秒）

3. **CORS**：
   - Worker 已配置 CORS 头
   - 可以从任何域名访问

4. **安全性**：
   - API Key 由前端传入，Worker 不存储
   - 建议在生产环境添加认证机制
