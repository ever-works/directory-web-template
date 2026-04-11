---
id: social-sharing
title: שיתוף חברתי
sidebar_label: שיתוף חברתי
sidebar_position: 22
---

# שיתוף חברתי

התבנית מספקת יכולות שיתוף חברתי באמצעות רכיב כפתור שיתוף ייעודי, יצירת תמונה של Open Graph, סימון נתונים מובנה וכלי עזר למטא נתונים של SEO. יחד, תכונות אלו מבטיחות שקישורים משותפים מציגים תצוגות מקדימות עשירות בפלטפורמות חברתיות.

## סקירה כללית של אדריכלות

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

## רכיב כפתור שתף

ה- `ShareButton` ב- `components/item-detail/share-button.tsx` מספק תפריט נפתח עם אפשרויות שיתוף עבור X (טוויטר), פייסבוק, LinkedIn ועותק של הלוח:

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

### שתף פורמטים של כתובות אתרים

| פלטפורמה | דפוס כתובת אתר |
|--------|----------------|
| X (טוויטר) | `https://twitter.com/intent/tweet?url=...&text=...` |
| פייסבוק | `https://www.facebook.com/sharer/sharer.php?u=...` |
| לינקדאין | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| העתק קישור | משתמש ב- `navigator.clipboard.writeText()` |

### תכונות ממשק משתמש
- בנוי על **Radix UI DropdownMenu** עבור ניווט נגיש במקלדת
- **מצב טעינת העתקה**: מציג ספינר במהלך עיכוב הכתיבה של הלוח
- **התראות טוסט**: משוב הצלחה/שגיאה דרך `sonner` - **תמיכה במצב כהה**: כל הסגנונות כוללים גרסאות כהות
- **i18n**: כל התוויות משתמשות בתרגומים של `next-intl` ## פתח את יצירת תמונה של גרף

הקובץ `app/opengraph-image.tsx` יוצר תמונות OG דינמיות באמצעות Next.js `ImageResponse` :

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

תמונת OG מוגשת אוטומטית ב- `/opengraph-image.png` ומתייחסת אליו באמצעות מטא נתונים של Next.js.

## יצירת מטא נתונים של SEO

כלי השירות `lib/seo/listing-metadata.ts` מייצר אובייקטים שלמים Next.js `Metadata` כולל Open Graph ותגיות כרטיסי טוויטר:

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

## נתונים מובנים (JSON-LD)

מודול `lib/seo/schema.ts` יוצר נתונים מובנים של Schema.org לתוצאות חיפוש עשירות:

### סכימת ארגון

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

### סכימת מוצר

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

### סכימת אתר עם פעולת חיפוש

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

### סכימת פירורי לחם

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

## Hreflang חלופי

מודול `lib/seo/hreflang.ts` יוצר קישורי שפה חלופיים עבור SEO בינלאומי:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## שימוש בדפי פרטי פריט

כפתור השיתוף משמש בדפי פרטי פריט לצד המטא נתונים שנוצרו:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `components/item-detail/share-button.tsx` | רכיב הנפתח של נתח חברתי |
| `app/opengraph-image.tsx` | יצירת תמונות OG דינמיות |
| `lib/seo/schema.ts` | מחוללי נתונים מובנים JSON-LD |
| `lib/seo/listing-metadata.ts` | יצירת מטא נתונים של Next.js |
| `lib/seo/hreflang.ts` | קישורים חלופיים Hreflang |
| `lib/config/client.ts` | תצורת האתר (כתובות אתרים חברתיות, מיתוג) |
