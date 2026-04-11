---
id: vercel
title: Vercel 部署
sidebar_label: Vercel
sidebar_position: 3
---

# Vercel 部署

将您的 Ever Works 目录网站部署到 Vercel，实现快速全球分发。

## 前提条件

- Vercel 账户
- 包含 Ever Works 项目的 GitHub 仓库

## 快速部署

### 1. 连接仓库

1. 访问 [vercel.com](https://vercel.com)
2. 点击"New Project"
3. 导入您的 GitHub 仓库
4. 选择 `website` 文件夹作为根目录

### 2. 配置构建设置

Vercel 将自动检测 Next.js。验证以下设置：

- **Framework Preset**：Next.js
- **根目录**：`website`
- **Build Command**：`npm run build`
- **Output Directory**：`.next`

### 3. 环境变量

在 Vercel 仪表板中添加您的环境变量：

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. 部署

点击"Deploy"，Vercel 将自动构建和部署您的网站。

## 自定义域名

### 1. 添加域名

在 Vercel 项目仪表板中：
1. 转到"Settings"→"Domains"
2. 添加您的自定义域名
3. 按照 DNS 配置说明操作

### 2. SSL 证书

Vercel 会自动为所有域名提供 SSL 证书。

## 高级配置

### Vercel 配置文件

在项目根目录创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 构建优化

为 Vercel 优化您的构建：

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## 监控与分析

### Vercel Analytics

在您的项目中启用 Vercel Analytics：

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### 性能监控

监控您的部署性能：
- Core Web Vitals
- 函数执行时间
- 构建性能

## 故障排查

### 常见问题

1. **构建错误**：在 Vercel 仪表板中检查构建日志
2. **环境变量**：确保所有必需变量已设置
3. **域名问题**：验证 DNS 配置

### 调试模式

启用调试模式以获取详细日志：

```bash
# In your environment variables
DEBUG=1
```

## 下一步

- [环境变量](/docs/deployment/environment-variables) - 配置您的部署
- [监控](/docs/deployment/monitoring) - 监控您的应用程序
- [支持](/docs/advanced-guide/support) - 获取部署帮助
