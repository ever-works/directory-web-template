---
id: troubleshooting
title: 故障排除指南
sidebar_label: 故障排除
sidebar_position: 7
---

# 故障排除指南

本指南涵盖了 Ever Works 模板的常见错误、调试技术、日志解释和环境问题。问题按类别进行组织，包括症状、原因和解决方案。

## 构建问题

### 构建期间未找到模块

**症状**：构建失败，并出现 0 或类似的 Node.js 本机模块错误。

**原因**：Webpack 尝试为客户端捆绑包捆绑仅服务器模块。

**解决方案**：验证模块是否列在 1 和 2 中：

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

如果您添加了新的仅服务器依赖项，请将其添加到此数组中。

### 静态页面生成超时

**症状**：在静态生成期间构建失败并显示 0。

**原因**：构建期间获取外部数据的页面超出超时。

**解决方案**：模板设置了3分钟超时：

```typescript
staticPageGenerationTimeout: 180,
```

对于需要更多时间的页面，请增加此值。或者，将慢速页面切换为动态渲染：

```typescript
export const dynamic = 'force-dynamic';
```

### 构建期间缺少内容目录

**症状**：构建失败，因为0不存在。

**原因**：基于Git的CMS内容尚未克隆。 1 脚本在2 和3 挂钩期间运行。

**解决方案**：

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### 来自 Supabase、bcryptjs、postgres、stripe 的 Webpack 警告

**症状**：构建会产生有关这些包的警告，但会成功完成。

**原因**：来自引用 Node.js API 的包的已知警告在浏览器中不可用。

**解决方案**： 这些已在 0 中被抑制：

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

无需采取任何措施——警告不会影响构建输出。

### JavaScript 堆内存不足

**症状**：构建崩溃并出现 0。

**解决方案**：构建脚本已分配 8 GB：

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

如果构建仍然耗尽内存，请检查：

- 生成过多的静态页面（减少构建时构建的页面）
- 大型依赖项未正确进行树摇动
- 构建时脚本中的内存泄漏

## 数据库问题

### 连接到 PostgreSQL 被拒绝

**症状**：应用程序失败，并显示 011 或 2。

**诊断步骤**：

1. 验证4中的3：
    ````bash
    节点-e“require（'dotenv'）.config（{path：'.env.local'}）;console.log（process.env.DATABASE_URL？'设置'：'丢失'）”
    ````
2. 直接测试连接：5
3. 检查 PostgreSQL 是否正在运行：6

**常见原因和修复**：

|原因 |修复 |
| ---------------------- | ----------------------------------------------------------- |
| PostgreSQL 未运行 |启动服务 |
|端口错误 |验证连接字符串中的端口 |
|缺少数据库| 7 |
|验证失败 |检查 8 | 中的用户名/密码
|需要 SSL |将 9 添加到连接字符串 |

### 迁移失败

**症状**：10 因架构或 SQL 错误而失败。

**解决方案**：使用详细的 CLI 迁移工具进行调试：

```bash
pnpm db:migrate:cli
```

这表明：

1.当前迁移状态（已应用的迁移列表）
2. 详细的迁移执行输出
3. 迁移后的架构验证

如果迁移已损坏，请检查 Drizzle 跟踪表：

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### 检测中数据库初始化失败

**症状**：控制台在启动时显示0。

**原因**：1 挂钩在启动时运行迁移和播种。失败表示数据库连接或架构问题。

**环境行为**：

|环境 |关于失败|
| ----------- | -------------------------------------- |
|生产|抛出错误，部署服务 503 |
|发展|记录警告，应用程序启动进行调试 |
|预览 |记录警告，应用程序启动进行调试 |

从2：

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### 种子停留在“播种”状态

**症状**：应用程序重复记录0。

**原因**：之前的种子操作在未更新状态的情况下崩溃了。

**解决方案**：初始化代码在 5 分钟后自动处理过时的种子：

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

要立即解决，请手动更新种子状态：

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

然后重新启动应用程序。

## 身份验证问题

### AUTH_SECRET 未设置

**症状**：应用程序因0 或会话错误而崩溃。

**解决方案**：

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### OAuth 回调 URL 不匹配

**症状**：OAuth 登录重定向到带有 0 的错误页面。

**解决方案**：OAuth 提供商控制台中的回调 URL 必须完全匹配：

|供应商|回调网址 |
| -------- | --------------------------------------------------- |
|谷歌 | 1 |
| GitHub | 2 |
|脸书 | 3 |
|推特 | 4 |

对于本地开发，请使用5。

### OAuth 提供商未出现

**症状**：仅显示凭据登录，缺少 OAuth 按钮。

**原因**：如果配置失败，OAuth 提供程序将回退到禁用状态。从6：

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**解决方案**：检查是否为每个提供商都设置了01。环境检查脚本验证 OAuth 对：

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### 会话意外过期

**常见原因**：

|原因 |解决方案 |
| ---------------------- | ---------------------------------------------------------------- |
| 0 已更改 |更改机密会使所有会话失效 |
| Cookie 域不匹配 |设置 1 以匹配您的部署域 |
| HTTPS 不匹配 |设置 2 进行本地 HTTP 开发 |

## 部署问题

### Vercel 构建失败，但本地构建成功

**清单**：

1. 在 Vercel 仪表板中设置所有必需的环境变量
2. 可从 Vercel 网络访问3
3. Node.js版本兼容（需要20.19.0或更高版本）
4.内容目录存在（CI自动创建4）
5.内存分配充足

### Vercel cron 作业未执行

**症状**：5 中的预定端点不运行。

**诊断步骤**：

1. 验证 `vercel.json` 是否位于项目根目录中且路径正确：
    ```json
    { “路径”：“/api/cron/sync”， “时间表”：“0 3 * * *” }
    ````
2.确认Vercel计划支持cron（专业版或企业版）
3. 在 Cron Jobs 选项卡下检查 Vercel Dashboard 的执行日志
4. 手动测试端点：7

### Vercel 上的构建时迁移失败

**症状**：构建日志显示8。

**行为**：9 脚本处理不同的场景：

- **生产**：所有失败都会导致构建失败
- **预览时出现连接错误**：构建继续，但出现警告
- **预览时出现身份验证错误**：构建失败（配置错误）

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

要完全跳过构建时迁移：

```bash
SKIP_BUILD_MIGRATIONS=true
```

## 国际化问题

### 显示翻译键而不是文本

**症状**：页面显示0而不是“欢迎”。

**解决方案**：

1. 验证翻译文件是否存在：1
2. 检查密钥路径是否与2中使用的命名空间匹配
3. 后备系统使用 `deepmerge` 将语言环境消息与英语默认值合并：

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

如果语言环境文件中缺少某个键，则英语后备版本应提供该键。

### Locale routing returns 404

**症状**：像0 这样的 URL 返回 404 页面。

**解决方案**：验证区域设置是否位于 2 的 1 数组中：

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

并验证0中的路由配置：

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## 日志解读

### 日志前缀

|前缀 |来源 |地点 |
| ------------------- | ----------------------------------- | -------------------------- |
| 0 |应用程序启动（DB init、Sentry）| 1 |
| 2 |数据库迁移执行| 3 |
| 4 |数据库初始化和播种 | 5 |
| 6 |构建时迁移脚本 | 7 |
| 8 |根布局数据获取错误 | 9 |

### 哨兵错误标签

来自检测的哨兵错误包括以下用于过滤的标签：

|标签 |价值观 |
| ------------- | ---------------------------------------------------- |
| 10 | 11 |
| 12 | 13 |
| 14 | 15、16 或 17 |

## 诊断命令

|任务|命令 |
| ------------------------ | ----------------------------------- |
|检查 TypeScript 错误 | 18 |
|运行 linter | 19 |
|验证环境 | 20 |
|快速环境检查 | 21 |
|测试数据库连接 | 22 |
|查看迁移状态 | 23 |
|生成新的迁移 | 24 |
|应用待处理的迁移 | 25 |
|种子数据库| 26 |
|清理构建缓存 | 27 |
|全面重建 | 28 |
|重置数据库 | 29 |

## 获取帮助

1. 搜索[GitHub问题](https://github.com/ever-works/directory-web-template/issues)
2. 查看 30 文件以获取 AI 辅助开发指南
3. 检查 Sentry 仪表板以获取错误详细信息（如果已配置）
4. 对于安全问题，请私信发送电子邮件至 security@ever.co
