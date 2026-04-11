---
id: social-sharing
title: المشاركة الاجتماعية
sidebar_label: المشاركة الاجتماعية
sidebar_position: 22
---

# المشاركة الاجتماعية

يوفر القالب إمكانيات المشاركة الاجتماعية من خلال مكون زر مشاركة مخصص، وإنشاء صور Open Graph، وترميز البيانات المنظمة، وأدوات مساعدة للبيانات الوصفية لتحسين محركات البحث. تضمن هذه الميزات معًا أن الروابط المشتركة تقدم معاينات غنية عبر الأنظمة الأساسية الاجتماعية.

## نظرة عامة على الهندسة المعمارية

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

## مشاركة مكون الزر

يوفر `ShareButton` في `components/item-detail/share-button.tsx` قائمة منسدلة تحتوي على خيارات مشاركة لـ X (Twitter)، وFacebook، وLinkedIn، ونسخة الحافظة:

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

### مشاركة تنسيقات URL

| منصة | نمط عنوان URL |
|----------|------------|
| إكس (تويتر) | `https://twitter.com/intent/tweet?url=...&text=...` |
| فيسبوك | `https://www.facebook.com/sharer/sharer.php?u=...` |
| لينكدين | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| نسخ الرابط | الاستخدامات ← 3 |

### ميزات واجهة المستخدم
- مبني على **Radix UI DropdownMenu** لسهولة الوصول إلى لوحة المفاتيح
- **حالة تحميل النسخ**: تظهر أداة دوارة أثناء تأخير الكتابة في الحافظة
- **إشعارات التوست**: تعليقات النجاح/الخطأ عبر `sonner` - **دعم الوضع الداكن**: تتضمن جميع الأنماط متغيرات داكنة
- **i18n**: تستخدم كافة التصنيفات ترجمات `next-intl` ## فتح إنشاء صور الرسم البياني

يقوم الملف 6 بإنشاء صور OG ديناميكية باستخدام Next.js 7:

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

يتم عرض صورة OG تلقائيًا على `/opengraph-image.png` ويتم الرجوع إليها بواسطة البيانات التعريفية Next.js.

## إنشاء البيانات الوصفية لكبار المسئولين الاقتصاديين

تقوم الأداة المساعدة 1 بإنشاء كائنات Next.js 2 كاملة بما في ذلك علامات بطاقة Open Graph وTwitter:

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

## البيانات المنظمة (JSON-LD)

تقوم الوحدة `lib/seo/schema.ts` بإنشاء بيانات Schema.org المنظمة لنتائج البحث الغنية:

### مخطط المنظمة

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

### مخطط المنتج

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

### مخطط موقع الويب مع إجراء البحث

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

### مخطط مسار التنقل

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

## بدائل هريفلانج

تقوم الوحدة `lib/seo/hreflang.ts` بإنشاء روابط لغة بديلة لتحسين محركات البحث الدولية:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## الاستخدام في صفحات تفاصيل العنصر

يتم استخدام زر المشاركة في صفحات تفاصيل العنصر إلى جانب البيانات التعريفية التي تم إنشاؤها:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## مرجع الملف

| ملف | الغرض |
|------|---------|
| `components/item-detail/share-button.tsx` | مكون القائمة المنسدلة للمشاركة الاجتماعية |
| `app/opengraph-image.tsx` | توليد صور OG الديناميكية |
| `lib/seo/schema.ts` | مولدات البيانات المنظمة JSON-LD |
| `lib/seo/listing-metadata.ts` | Next.js توليد البيانات الوصفية |
| 4ـ | Hreflang روابط بديلة |
| 5 ــ | تكوين الموقع (عناوين URL الاجتماعية، والعلامات التجارية) |
