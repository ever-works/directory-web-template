---
id: social-sharing
title: 社交分享
sidebar_label: 社交分享
sidebar_position: 22
---

# 社交分享

该模板通过专用的共享按钮组件、开放图谱图像生成、结构化数据标记和 SEO 元数据实用程序提供社交共享功能。这些功能共同确保共享链接在社交平台上呈现丰富的预览。

## 架构概述

```
components/item-detail/
  share-button.tsx              -- Share dropdown component

app/
  opengraph-image.tsx           -- Dynamic OG image generation

lib/seo/
  schema.ts                     -- JSON-LD structured data
  listing-metadata.ts           -- Next.js Metadata generation
  hreflang.ts                   -- Hreflang alternate links
```

## 分享按钮组件

10 提供了一个下拉菜单，其中包含 X (Twitter)、Facebook、LinkedIn 和剪贴板副本的共享选项：

```tsx
// components/item-detail/share-button.tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

export const ShareButton = ({ url, title }: { url: string; title: string }) => {
  const [isCopying, setIsCopying] = useState(false);
  const t = useTranslations("common");

  const handleShare = async (type: string) => {
    try {
      switch (type) {
        case "copy":
          setIsCopying(true);
          await navigator.clipboard.writeText(url);
          await new Promise(resolve => setTimeout(resolve, 500));
          toast.success(t("LINK_COPIED"));
          setIsCopying(false);
          break;
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            "_blank"
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
      }
    } catch (error) {
      toast.error(t("SHARE_ERROR"));
      setIsCopying(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="...">
          {/* Share icon */}
          <span>{t("SHARE")}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => handleShare("copy")}>
            Copy Link
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("twitter")}>
            X
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("facebook")}>
            Facebook
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("linkedin")}>
            LinkedIn
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
```

### 分享 URL 格式

|平台| URL 模式 |
|----------|-------------|
| X（推特）| 0 |
|脸书 | 1 |
|领英 | 2 |
|复制链接 |用途 3 |

### 用户界面功能
- 基于 **Radix UI DropdownMenu** 构建，以实现可访问的键盘导航
- **复制加载状态**：在剪贴板写入延迟期间显示旋转器
- **Toast通知**：通过4反馈成功/错误
- **深色模式支持**：所有样式都包含深色变体
- **i18n**：所有标签均使用 5 翻译

## 开放图图像生成

6 文件使用 Next.js 7 生成动态 OG 图像：

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const gradient = `linear-gradient(135deg, ${siteConfig.ogImage.gradientStart} 0%, ${siteConfig.ogImage.gradientEnd} 100%)`;

  return new ImageResponse(
    (
      <div style={{ background: gradient, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '80px' }}>
        <div style={{ fontSize: 96, fontWeight: 'bold', color: 'white' }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, color: '#e0e0e0', textAlign: 'center' }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

OG 图像自动在 0 处提供并由 Next.js 元数据引用。

## SEO 元数据生成

1 实用程序生成完整的 Next.js 2 对象，包括 Open Graph 和 Twitter 卡标签：

```tsx
// lib/seo/listing-metadata.ts
export function generateListingMetadata({
  title,
  description,
  path,
  locale,
  itemCount,
  keywords,
  imageUrl,
}: ListingMetadataOptions): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;
  const canonicalUrl = `${appUrl}${localePath}${path}`;

  return {
    title: fullTitle,
    description: metaDescription,
    keywords: keywords?.join(', '),
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      type: 'website',
      siteName: siteConfig.name,
      url: canonicalUrl,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: metaDescription,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(path),
    },
  };
}
```

## 结构化数据 (JSON-LD)

0 模块生成 Schema.org 结构化数据以获取丰富的搜索结果：

### 组织架构

```tsx
export function generateOrganizationSchema() {
  const sameAs = [
    siteConfig.social.github,
    siteConfig.social.x,
    siteConfig.social.linkedin,
    siteConfig.social.facebook,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.brandName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    sameAs,
  };
}
```

### 产品架构

```tsx
export function generateProductSchema(input: ProductSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    category: input.category,
    brand: input.brandName
      ? { '@type': 'Brand', name: input.brandName }
      : undefined,
  };
}
```

### 带有搜索操作的网站架构

```tsx
export function generateWebSiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: `${siteConfig.url}${localePrefix}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}${localePrefix}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

### 面包屑模式

```tsx
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## 赫夫朗替补

0 模块为国际 SEO 生成备用语言链接：

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## 项目详细信息页面中的用法

共享按钮与生成的元数据一起用在项目详细信息页面上：

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## 文件参考

|文件|目的|
|------|---------|
| 0 |社交分享下拉组件 |
| 1 |动态 OG 图像生成 |
| 2 | JSON-LD 结构化数据生成器 |
| 3 | Next.js 元数据生成 |
| 4 | Hreflang 备用链接 |
| 5 |站点配置（社交 URL、品牌）|
