---
id: ssl-domains
title: "SSL 与自定义域名"
sidebar_label: "SSL 与域名"
sidebar_position: 2
---

# SSL 与自定义域名

本指南涵盖 Ever Works Template 的自定义域名配置、SSL 证书管理、DNS 配置以及多域名支持。该模板内置生产安全头，并针对 Vercel 部署进行了优化，支持自动 HTTPS，同时也支持具有手动 SSL 配置的自托管环境。

## 内置安全头

该模板在 `next.config.ts` 中配置了一套全面的安全头，这些头会自动应用于每个路由。这些头强制执行 HTTPS、防止常见的 Web 攻击并控制资源加载。

### 完整头配置

来自 `next.config.ts` 的完整头块：

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### 头说明

| 头 | 值 | 用途 |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | 防止 MIME 类型嗅探攻击 |
| `X-Frame-Options` | `DENY` | 通过阻止 iframe 嵌入防止点击劫持 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 控制共享的 referrer 信息量 |
| `X-DNS-Prefetch-Control` | `on` | 启用 DNS 预取以加快加载速度 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 强制所有子域名使用 HTTPS 2 年 |
| `Content-Security-Policy` | 见上文 | 限制浏览器可以加载的资源 |

### HSTS 详情

Strict-Transport-Security 头使用最大推荐配置：

- **max-age=63072000** – 浏览器记住使用 HTTPS 2 年
- **includeSubDomains** – 所有子域名也必须使用 HTTPS
- **preload** – 可提交到浏览器 HSTS 预加载列表

:::caution
一旦启用带 preload 的 HSTS 并将您的域名提交到预加载列表，将非常难以撤销。在启用 preload 之前，请确保 SSL 证书已正确配置并设置为自动续期。
:::

### 内容安全策略说明

| 指令 | 值 | 效果 |
|-----------|-------|--------|
| `default-src` | `'self'` | 默认只加载来自同源的资源 |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | 同源脚本、内联脚本和 LemonSqueezy 支付 SDK |
| `style-src` | `'self' 'unsafe-inline'` | 同源样式加上内联样式（CSS-in-JS 必需） |
| `img-src` | `'self' data: https:` | 同源图片、data URI 和任何 HTTPS 来源 |
| `font-src` | `'self'` | 仅同源字体 |
| `connect-src` | `'self' https:` | 对同源和任何 HTTPS 端点的 API 调用 |
| `frame-ancestors` | `'none'` | 防止页面被嵌入框架 |

## 自定义域名配置

### 域名配置的环境变量

配置自定义域名时，在部署环境中更新这些变量：

```bash
# 应用程序 URL – 用于 OAuth 回调、规范 URL、hreflang、站点地图
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cookie 域名 – 必须与您的域名匹配才能使会话 Cookie 正常工作
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# 身份验证 URL – NextAuth 用于回调
NEXTAUTH_URL=https://yourdomain.com
```

`NEXT_PUBLIC_APP_URL` 变量在 `scripts/check-env.js` 中被声明为关键变量：

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel：自动 SSL

在 Vercel 上部署时，SSL 证书通过 Let's Encrypt 自动颁发和续期。该流程不需要手动配置：

1. 在 Vercel 项目仪表板的设置 → 域名中**添加域名**
2. **配置 DNS** 指向 Vercel（见下方 DNS 配置）
3. **验证** – DNS 解析后 Vercel 自动颁发证书

Vercel 支持：

- 自动颁发 Let's Encrypt 证书
- 子域名通配符证书
- 证书过期前自动续期
- HTTP 到 HTTPS 重定向（自动）

### DNS 配置

**根域名**（如 `example.com`）：

```
类型：A
名称：@
值：76.76.21.21
```

**www 子域名**（如 `www.example.com`）：

```
类型：CNAME
名称：www
值：cname.vercel-dns.com
```

设置记录后**验证 DNS**：

```bash
# 检查 A 记录
dig yourdomain.com A +short

# 检查 CNAME 记录
dig www.yourdomain.com CNAME +short

# 从多个位置检查传播
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

DNS 传播最多可能需要 48 小时，但大多数更改会在几分钟内生效。

### 自托管：Nginx 与 Let's Encrypt

对于 Nginx 后面的自托管部署，在代理层配置 SSL 终止：

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

安装并配置 Certbot 进行自动证书管理：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取并安装证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 验证自动续期
sudo certbot renew --dry-run
```

## OAuth 回调 URL

切换到自定义域名时，更新每个 OAuth 提供商控制台中的回调 URL：

| 提供商 | 回调 URL |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

该模板在启动时自动验证 OAuth 配置。来自 `auth.config.ts`：

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... 其他提供商
    });
  } catch (error) {
    // 降级到仅凭据模式
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

如果某个提供商配置不正确，该模板将切换到仅凭据身份验证。

## 多域名支持

该模板通过 Next.js 图像优化配置支持多个域名：

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

`generateImageRemotePatterns()` 工具动态生成远程图像模式，允许 Next.js 优化来自已配置外部域名的图像。

## Cookie 配置

Cookie 设置必须与您的域名配置对齐：

```bash
# 开发（localhost）
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# 生产（自定义域名）
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

设置 `COOKIE_SECURE=true` 确保 Cookie 仅通过 HTTPS 连接传输。这对于防止会话劫持至关重要。环境检查脚本将 Cookie 配置验证作为安全类别的一部分。

## 故障排除

### SSL 证书未颁发

1. 验证 DNS 记录指向正确的目标
2. 禁用任何可能拦截 ACME 挑战的 DNS 代理（如 Cloudflare 代理模式）
3. 等待完整的 DNS 传播（使用上面的 `dig` 命令检查）
4. 检查平台仪表板中的特定证书错误

### 混合内容警告

启用 HTTPS 后，如果浏览器报告混合内容：

1. 确保 `NEXT_PUBLIC_APP_URL` 以 `https://` 开头
2. 验证所有外部资源 URL 使用 HTTPS
3. `img-src` 和 `connect-src` CSP 指令默认包含 `https:`

### OAuth 重定向不匹配

如果 OAuth 登录因重定向 URI 不匹配而失败：

1. 在每个 OAuth 提供商的开发者控制台中更新回调 URL
2. 确保 `NEXTAUTH_URL` 与包括协议在内的确切域名匹配
3. 重试前清除浏览器 Cookie 和会话存储

## 相关文件

| 文件 | 用途 |
|------|---------|
| `next.config.ts` | 安全头、CSP、远程图像模式 |
| `auth.config.ts` | OAuth 提供商配置和回调设置 |
| `scripts/check-env.js` | 域名配置的环境变量验证 |
| `lib/seo/hreflang.ts` | 为 i18n 生成 hreflang 替代链接 |
| `lib/utils/url-cleaner.ts` | 使用 `NEXT_PUBLIC_APP_URL` 的基础 URL 工具 |
