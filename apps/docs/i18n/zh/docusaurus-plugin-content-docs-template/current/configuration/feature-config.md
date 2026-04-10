---
id: feature-config
title: "功能配置"
sidebar_label: "功能配置"
sidebar_position: 3
---

# 功能配置

该模板使用功能标志系统，根据系统配置优雅地启用或禁用功能。这使应用程序可以在没有数据库的情况下运行（仅提供静态内容），同时随着基础设施的就绪逐步启用各项功能。

## 功能标志模块

功能标志定义在 `lib/config/feature-flags.ts` 中。

### FeatureFlags 接口

```ts
interface FeatureFlags {
  /** 用户评分和评论功能 */
  ratings: boolean;
  /** 用户对条目的评论 */
  comments: boolean;
  /** 用户收藏条目集合 */
  favorites: boolean;
  /** 管理员管理的精选条目显示 */
  featuredItems: boolean;
  /** 用户调查和反馈收集 */
  surveys: boolean;
}
```

### 标志如何确定

当前所有功能均依赖数据库可用性。配置了 `DATABASE_URL` 时，功能即启用：

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

此设计允许模板在没有任何数据库的情况下从基于 Git 的 CMS 提供内容，而依赖数据库的交互功能（评分、评论、收藏）则自动禁用。

### 工具函数

该模块提供多个辅助函数：

```ts
// 检查单个功能
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // 渲染评论组件
}

// 获取所有已启用功能
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// 例如：['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// 获取所有已禁用功能（调试时很有用）
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// 检查是否一切就绪
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('完整平台已运行');
}
```

### 完整 API 参考

| 函数 | 返回值 | 描述 |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | 所有标志作为布尔对象 |
| `isFeatureEnabled(name)` | `boolean` | 按名称检查单个功能 |
| `getEnabledFeatures()` | `string[]` | 已启用功能名称数组 |
| `getDisabledFeatures()` | `string[]` | 已禁用功能名称数组 |
| `areAllFeaturesEnabled()` | `boolean` | 所有功能均已启用时为 true |

## 功能依赖渲染

### 在服务端组件中

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### 在 API 路由中

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: '评论功能不可用' },
      { status: 503 }
    );
  }
  // 处理评论创建...
}
```

## 站点配置 (siteConfig)

除功能标志外，模板在 `lib/config.ts` 中提供了 `siteConfig` 对象，用于品牌和元数据自定义。每个值都可以通过环境变量覆盖：

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  // ...
} as const;
```

### 通过环境变量自定义

| 变量 | 默认 | 用途 |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | 元数据和 OG 图片中的站点名称 |
| `NEXT_PUBLIC_SITE_TAGLINE` | 模板默认值 | 首页标语 |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | 完整站点 URL（无尾部斜杠） |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | 相对于 `/public` 的 Logo 路径 |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Schema.org 组织名称 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 模板默认值 | SEO 元描述 |
| `NEXT_PUBLIC_SITE_KEYWORDS` | 模板默认值 | 逗号分隔的 SEO 关键词 |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | OG 图片渐变起始色 |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | OG 图片渐变结束色 |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | 页脚"由...构建"链接 |

### 验证

`validateSiteConfig()` 函数检查生产关键变量是否缺失：

```ts
import { validateSiteConfig } from '@/lib/config';

// 如果所有必需变量已设置返回 true，否则返回 false 并输出警告
const isValid = validateSiteConfig();
```

## ConfigManager（YAML 配置）

`lib/config-manager.ts` 中的 `ConfigManager` 类管理来自基于 Git 的 CMS 仓库的 `config.yml` 文件。它处理配置更改的读取、写入和提交。

### 读取配置

```ts
import { configManager } from '@/lib/config-manager';

// 获取完整配置
const config = configManager.getConfig();

// 获取特定键
const pagination = configManager.getPaginationConfig();
// 返回：{ type: 'standard' | 'infinite', itemsPerPage: 12 }
```

### 写入配置

所有写入操作会自动提交并推送到 Git 仓库：

```ts
// 更新分页
await configManager.updatePagination('infinite', 24);

// 更新任意顶层键
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });
```

### 安全性

ConfigManager 包含原型污染保护：

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

## 相关文件

| 路径 | 描述 |
|------|-------------|
| `lib/config/feature-flags.ts` | 功能标志定义和工具函数 |
| `lib/config.ts` | 客户端安全的 siteConfig 和类型重导出 |
| `lib/config-manager.ts` | 带 Git 集成的 YAML 配置读写器 |
| `lib/config/index.ts` | 配置模块的桶导出 |
| `lib/config/config-service.ts` | 服务端 ConfigService 单例 |
| `lib/config/types.ts` | 配置的 TypeScript 类型定义 |
| `.env.example` | 环境变量选项完整列表 |
