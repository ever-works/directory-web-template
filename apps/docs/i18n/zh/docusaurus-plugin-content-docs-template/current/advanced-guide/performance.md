---
id: performance
title: 性能优化
sidebar_label: 表现
sidebar_position: 5
---

# 性能优化

本指南涵盖了 Ever Works 模板中内置的性能优化以及随着应用程序的增长保持快速加载时间的技术。

## Next.js 配置

该模板的0包括几个以性能为中心的设置：

### 独立输出

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

0 输出模式创建一个独立的构建，其中仅包含运行应用程序所需的文件。这可以减少生产中的容器大小和启动时间。

### 包导入优化

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

此设置启用桶文件重包的树摇动。捆绑包中只包含实际使用的组件，而不是导入整个 0 或 1 库。

### Webpack 观察优化

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

0 目录（基于 Git 的 CMS，包含 220 多个 Markdown 文件）被排除在开发中的 webpack 文件观察器之外。这可以防止内容文件更改时不必要的重建，并显着减少开发过程中的 CPU 使用率。

### 抑制警告

CI 和 Vercel 环境中会抑制详细基础设施日志记录：

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## 图像优化

### 远程模式

该模板使用0动态生成允许的远程图像模式。这确保了来自配置的 CDN 和外部源的图像通过 Next.js 的内置图像管道进行优化。

### SVG 处理

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

SVG 图像是允许的，但使用严格的内容安全策略进行沙箱处理，以禁用脚本执行。这允许 SVG 徽标和图标，同时通过 SVG 注入防止 XSS。

### 图像最佳实践

|技术|实施 |影响 |
|---|---|---|
|使用 0 |内置延迟加载组件 |自动 WebP/AVIF，响应式尺寸 |
|设置显式尺寸 | 12 道具 |防止累积布局偏移 (CLS) |
| LCP 使用3 4 英雄形象 |预加载最大的内容绘画图像 |
|使用 5 道具 | 6 |防止下载超大图像 |
|模糊占位符 | 78 |提高感知加载速度 |

## 缓存策略

### HTTP 标头

该模板在 9 中设置与缓存相关的标头：

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

全局启用 DNS 预取，以减少外部资源的 DNS 查找延迟。

### 静态生成

该模板使用大量超时来生成静态页面：

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

This accommodates pages that fetch data from external APIs or the Git-based CMS during build time.

### ETag 配置

```typescript
generateEtags: false,
```

ETag 在 Next.js 级别被禁用，因为 CDN/反向代理（Vercel Edge Network 或 Cloudflare）可以更有效地处理缓存验证。

### Application-Level Caching

分析后台处理器定期预热缓存：

|缓存类型|刷新间隔|数据|
|---|---|---|
|用户增长趋势| 10 分钟 | 6、12、24 个月的每月用户增长 |
|活动动态| 5 分钟 | Activity data for 7, 14, 30 day windows |
|热门商品排名 | 15 分钟 |前 10、20、50 项 |
|最近的活动 | 2 分钟 |最新 10 和 20 条活动条目 |
|绩效指标| 30 秒 |查询性能统计|
|缓存清理| 1小时|过期缓存条目删除 |

## 延迟加载

### 组件级延迟加载

对于初始渲染时不需要的重型组件使用0：

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### 路由级代码分割

Next.js App Router 按路由自动进行代码分割。 0 中的每个页面都有自己的捆绑包，因此用户只需下载当前页面所需的 JavaScript。

### 后台作业中的动态导入

该模板在作业回调中使用动态导入来防止 webpack 将仅服务器模块拉入客户端包中：

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## 捆绑包大小优化

### 分析捆绑包

运行以下命令来检查包的组成：

```bash
ANALYZE=true pnpm build
```

如果配置了 0，则会生成一个交互式树形图，显示哪些模块影响包大小。

### 常见优化技术

|技术|示例|储蓄|
|---|---|---|
|桶文件优化| 1在配置中|防止导入整个图标/UI 库 |
|仅服务器模块 | 2在lib文件中|防止意外的客户端捆绑 |
|动态导入| 3 |推迟加载直到需要为止 |
|外部封装| 4 |从 webpack 捆绑中排除 |

5 配置尤其重要：

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

这些包被排除在 webpack 捆绑之外，并在运行时本地加载，从而减少了构建时间并避免了与本机模块的兼容性问题。

## Lighthouse 优化技巧

### 核心 Web Vitals 目标

|公制|目标|关键因素|
|---|---|---|
| **LCP**（最大内容涂料）| < 2.5 秒 |图片优化、优先加载、服务器响应时间|
| **FID**（首次输入延迟）| < 100 毫秒 |代码分割，最小化主线程阻塞 |
| **CLS**（累积布局偏移）| < 0.1 |显式图像尺寸、字体加载策略|
| **TTFB**（第一个字节的时间）| < 800 毫秒 | CDN缓存、边缘函数、数据库查询优化|

### 实用清单

1. **图像**：将 0 与显式 1 、 2 和 3 属性一起使用。用 4 标记首屏图像。
2. **字体**：使用5通过6自行托管字体并预加载关键字体文件。
3. **JavaScript**：查看7 并添加使用桶文件的任何大型库。
4. **CSS**：模板使用 Tailwind CSS，该 CSS 已在生产版本中清除。避免导入未使用的 CSS 模块。
5. **第三方脚本**：使用 8 和 9 推迟非关键脚本。
6. **服务器组件**：默认为 React 服务器组件 (RSC)，并且仅在需要交互性时使用 10。

### 奔跑的灯塔

该模板包括11 配置。运行自动化 Lighthouse 测试：

```bash
npx lhci autorun --config=lighthouse-test.json
```

或者使用 Chrome DevTools Lighthouse 面板进行手动审核。

## 数据库查询性能

### 连接池

使用连接池以避免每个请求打开新的数据库连接。有关配置详细信息，请参阅[扩展指南](/deployment/scaling)。

### 查询优化

- 使用存储库模式 (0) 集中和优化查询。
- 分析存储库包括具有可配置 TTL 的内置缓存层。
- 通过性能指标后台作业监控慢速查询。

### 索引策略

查看 1 现有索引。添加索引：
- 2 子句中使用的列
- 外键列
- 3 子句中使用的列
- 用于多列查找的复合索引

## 监控性能

### 哨兵集成

该模板集成了 Sentry，用于 4 中的性能监控：

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

生产中的迹线采样率为 10%，开发中的迹线采样率为 100%。根据您的流量和哨兵计划限制调整 0。

### 自定义性能标记

使用 Web Performance API 进行自定义计时：

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## 总结

|面积 |内置优化 |附加步骤 |
|---|---|---|
|图片 |自动WebP/AVIF、SVG沙箱|添加0到LCP图像，使用1 |
| JavaScript |包优化、代码分割 |将库添加到2 |
|缓存 |后台缓存预热、DNS 预取 |配置CDN缓存规则 |
|数据库|连接池、存储库模式|添加索引，监控慢查询 |
|构建 |独立输出，外部包|启用捆绑分析器 |
|监控| Sentry 跟踪、性能指标作业 |设置指标降级警报 |
