# AI 工作站部署指南

## 方案一：Cloudflare Workers + GitHub Pages（推荐）

### 优势
- **完全免费**：Cloudflare Workers 每天 10 万次请求，GitHub Pages 无限流量
- **无需服务器**：全部托管在云平台
- **全球 CDN**：访问速度快
- **自动 HTTPS**：无需配置证书

### 部署步骤

#### 1. 部署 Cloudflare Worker（代理服务器）

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署 Worker
cd proxy
wrangler deploy
```

部署成功后会显示 Worker URL，类似：
```
https://ai-workstation-proxy.your-subdomain.workers.dev
```

#### 2. 更新前端配置

修改 `.env` 文件：

```env
VITE_PROXY_URL=https://ai-workstation-proxy.your-subdomain.workers.dev/proxy
```

#### 3. 部署到 GitHub Pages

```bash
# 安装 gh-pages（已安装）
npm install -D gh-pages --legacy-peer-deps

# 部署
npm run deploy:pages
```

访问地址：`https://your-username.github.io/ai-workstation/`

#### 4. 一键部署（Worker + Pages）

```bash
npm run deploy
```

---

## 方案二：仅使用 Cloudflare Workers

如果你不想用 GitHub Pages，可以把前端也部署到 Workers：

### 1. 构建前端

```bash
npm run build
```

### 2. 创建 Pages 项目

在 Cloudflare 控制台：
1. 进入 Workers & Pages
2. 点击 "Create" → "Pages"
3. 选择 "Upload assets"
4. 上传 `dist` 文件夹的内容

### 3. 配置代理

在 Pages 项目中添加 `_routes.json`：

```json
{
  "version": 1,
  "include": ["/proxy/*", "/search/*", "/image-gen/*"],
  "exclude": []
}
```

---

## 方案三：自定义域名

### 1. 在 Cloudflare 添加域名

1. 登录 Cloudflare 控制台
2. 添加你的域名（如 `your-domain.com`）
3. 按照提示修改 DNS 服务器

### 2. 配置 Worker 路由

修改 `proxy/wrangler.toml`：

```toml
name = "ai-workstation-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

routes = [
  { pattern = "proxy.your-domain.com", custom_domain = true }
]
```

### 3. 重新部署

```bash
cd proxy
wrangler deploy
```

### 4. 更新前端配置

```env
VITE_PROXY_URL=https://proxy.your-domain.com/proxy
```

---

## 本地开发

### 启动本地代理服务器

```bash
node proxy/server.js
```

### 启动前端开发服务器

```bash
npm run dev
```

### 本地测试 Worker

```bash
cd proxy
wrangler dev
```

---

## 注意事项

### Cloudflare Workers 限制（免费计划）

| 项目 | 限制 |
|------|------|
| 请求数 | 每天 10 万次 |
| CPU 时间 | 每次请求 10ms |
| 超时时间 | 30 秒 |
| 请求体大小 | 100MB |
| 响应体大小 | 100MB |

对于个人使用完全足够。

### GitHub Pages 限制

- 仓库大小 < 1GB
- 每月流量 100GB
- 每小时构建 10 次

### 安全性建议

1. **API Key 保护**：当前 API Key 由前端传入，Worker 不存储
2. **添加认证**：生产环境建议在 Worker 添加简单的 token 验证
3. **速率限制**：可以配置 Cloudflare 的速率限制规则

---

## 故障排查

### Worker 部署失败

```bash
# 检查 Wrangler 版本
wrangler --version

# 重新登录
wrangler login

# 查看日志
wrangler tail
```

### 前端访问 404

1. 检查 `.env` 中的 `VITE_PROXY_URL` 是否正确
2. 检查 GitHub Pages 是否启用
3. 检查仓库设置中的 Pages 配置

### 跨域问题

Worker 已配置 CORS 头，如果还有问题：
1. 检查 Worker 是否部署成功
2. 检查浏览器控制台的错误信息
3. 清除浏览器缓存后重试

---

## 成本估算

| 服务 | 费用 |
|------|------|
| Cloudflare Workers | 免费（每天 10 万次请求） |
| GitHub Pages | 免费 |
| 域名（可选） | ~$10/年 |

**总计：$0/月**（使用默认域名）
