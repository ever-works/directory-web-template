---
id: seo
title: 搜索引擎优化配置
sidebar_label: 搜索引擎优化
sidebar_position: 8
---

# 搜索引擎优化配置

Ever Works 模板提供全面的 SEO 支持，包括 JSON-LD 结构化数据、多语言内容的 hreflang 标签、OpenGraph 元数据、自动化站点地图和 robots.txt 配置。

## JSON-LD 结构化数据

模式实用程序位于0，为各种内容类型生成 Schema.org 结构化数据。

### 产品架构

用于商品详细信息页面：

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

生成：
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### 组织架构

用于主页和关于页面上的站点范围品牌标识。

### 其他模式类型

该模块提供的生成器用于：
- **网站** -- 具有搜索操作的站点级元数据
- **BreadcrumbList** -- 导航面包屑
- **FAQPage** -- 带有问题/答案对的常见问题解答部分
- **ItemList** -- 类别和集合列表页面

## Hreflang标签

hreflang 实用程序位于0，为搜索引擎生成语言备用链接。

### 支持的区域设置

该模板支持 20 多个语言环境：

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### URL生成

hreflang 实用程序遵循“按需”区域设置前缀模式：
- 默认区域设置 (0) 使用根路径：1
- 其他语言环境使用前缀路径：2

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### 语言环境到 Hreflang 映射

每个区域设置都映射到其 ISO 639-1 hreflang 值。大多数使用相同的代码，但有些需要针对区域变体进行特殊处理。

## 列出元数据

该模块位于0，为列表页面生成元数据，包括类别页面、搜索结果和带有适当标题模板、描述和规范 URL 的过滤视图。

## OpenGraph 和 Twitter 卡

该模板通过页面组件中的 Next.js Metadata API 生成 OpenGraph 和 Twitter Card 元数据：

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

## 网站地图

站点地图位于0，是使用 Next.js 内置站点地图支持自动生成的：

- **静态页面** -- 主页、关于、定价、联系方式
- **动态页面** -- 所有已发布的项目、类别、集合
- **本地化 URL** -- 每个页面都会生成所有活动区域设置的条目
- **优先级和频率** -- 按页面类型配置

## 机器人.txt

位于1处，机器人配置：

- 默认允许所有爬虫
- 指向站点地图 URL
- 可选择阻止管理和 API 路由建立索引
- 可通过环境进行配置以适应暂存/生产差异

## 最佳实践

1. **每个页面都应该有唯一的元数据** -- 在页面组件中使用2
2. **在详细信息页面上包含 JSON-LD** -- 项目的产品架构、主页的组织
3. **设置规范 URL** -- 防止跨本地化版本重复内容
4. **使用 hreflang 实用程序** -- 确保搜索引擎提供正确的语言版本
5. **将描述保持在 160 个字符以下** -- 最适合搜索结果片段
