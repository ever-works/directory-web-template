---
id: seo
title: תצורת SEO
sidebar_label: SEO
sidebar_position: 8
---

# תצורת SEO

התבנית Ever Works מספקת תמיכה מקיפה ב-SEO כולל נתונים מובנים JSON-LD, תגי hreflang לתוכן רב לשוני, מטא נתונים של OpenGraph, מפות אתר אוטומטיות ותצורת robots.txt.

## נתונים מובנים של JSON-LD

ממוקמים ב- `lib/seo/schema.ts` , כלי הסכימה מייצרים נתונים מובנים של Schema.org עבור סוגי תוכן שונים.

### סכימת מוצר

בשימוש בדפי פרטי פריט:

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

מייצר:
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

### סכימת ארגון

משמש לזהות מותג כלל-אתר בדף הבית ובדפים אודות.

### סוגי סכימה אחרים

המודול מספק גנרטורים עבור:
- **אתר** -- מטא נתונים ברמת האתר עם פעולת חיפוש
- **BreadcrumbList** -- פירורי לחם ניווט
- **דף שאלות נפוצות** -- קטעי שאלות נפוצות עם צמדי שאלות/תשובות
- **ItemList** - דפי רישום קטגוריות ואוסף

## תגי Hreflang

ממוקמת ב- `lib/seo/hreflang.ts` , כלי השירות hreflang מייצר קישורים חלופיים לשפה עבור מנועי חיפוש.

### מקומות נתמכים

התבנית תומכת ב-20+ מקומות:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### יצירת כתובת URL

כלי השירות hreflang עוקב אחר דפוס הקידומת המקומי "לפי הצורך":
- מיקום ברירת המחדל ( `en` ) משתמש בנתיב הבסיס: `https://example.com/page` - אזורים אחרים משתמשים בנתיבים עם קידומת: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### מיפוי מיקום ל-Hreflang

כל אזור ממפה לערך ה-ISO 639-1 hreflang שלו. רובם משתמשים באותו קוד, אך חלקם דורשים טיפול מיוחד עבור גרסאות אזוריות.

## מטא נתונים של רישום

ממוקם ב- `lib/seo/listing-metadata.ts` , מודול זה יוצר מטא נתונים עבור דפי רישום כולל דפי קטגוריות, תוצאות חיפוש ותצוגות מסוננות עם תבניות כותרת מתאימות, תיאורים וכתובות URL קנוניות.

## כרטיסי OpenGraph וטוויטר

התבנית מייצרת מטא נתונים של OpenGraph ו-Twitter Card באמצעות Next.js Metadata API ברכיבי עמוד:

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

## מפת אתר

ממוקם ב- `app/sitemap.ts` , מפת האתר נוצרת אוטומטית באמצעות תמיכת מפת אתר מובנית של Next.js:

- **דפים סטטיים** -- בית, אודות, תמחור, יצירת קשר
- **דפים דינמיים** -- כל הפריטים שפורסמו, הקטגוריות, האוספים
- **כתובות אתרים מקומיות** - כל דף יוצר ערכים עבור כל האזורים הפעילים
- **עדיפות ותדירות** - מוגדר לפי סוג עמוד

## Robots.txt

ממוקמת ב- `app/robots.ts` , תצורת הרובוטים:

- מאפשר את כל הסורקים כברירת מחדל
- מצביע על כתובת האתר של מפת האתר
- אופציונלי חוסם נתיבי אדמין ו-API מיצירת אינדקס
- ניתן להגדרה באמצעות סביבה להבדלים בין הבמה/הפקה

## שיטות עבודה מומלצות

1. **כל דף צריך לכלול מטא נתונים ייחודיים** -- השתמש ב- `generateMetadata()` ברכיבי עמוד
2. **כלול JSON-LD בדפי פירוט** -- סכימת מוצר לפריטים, ארגון עבור דף הבית
3. **הגדר כתובות URL קנוניות** -- מנע תוכן כפול בגרסאות מקומיות
4. **השתמש בכלי השירות hreflang** -- מבטיח שמנועי החיפוש משרתים את גרסת השפה הנכונה
5. **שמור תיאורים מתחת ל-160 תווים** -- אופטימלי עבור קטעי תוצאות חיפוש
