---
id: breadcrumbs
title: ניווט פירורי לחם
sidebar_label: פירורי לחם
sidebar_position: 26
---

# ניווט בפירורי לחם

התבנית מספקת מערכת ניווט לפיורי לחם עם רכיבי ממשק משתמש ניתנים לשימוש חוזר, פירורי לחם ספציפיים לדף ותמיכה בבינאום. פירורי לחם משפרים גם את הניווט של המשתמש וגם את SEO על ידי הצגת היררכיית הדפים הנוכחית.

## סקירה כללית של אדריכלות

פירורי לחם מיושמים בשלוש רמות:

| שכבה | קובץ | מטרה |
|-------|------|--------|
| **ממשק משתמש חוזר** | `components/ui/breadcrumb.tsx` | רכיב פרורי לחם גנרי המקבל מערך של פריטים |
| **פרטי פריט** | `components/item-detail/breadcrumb.tsx` | פירור לחם ספציפי לפריט עם מודעות לקטגוריות |
| **אוספים** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | עמוד אוספים breadcrumb עם i18n |

## רכיב פירורי לחם לשימוש חוזר

רכיב פירורי הלחם הבסיסי חי ב- `components/ui/breadcrumb.tsx` ומקבל מערך מודפס של פריטי פירורי לחם.

### ממשק BreadcrumbItem

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

לכל פריט יש `label` להצגה ו- `href` אופציונלי לקישור. הפריט האחרון במערך מוצג אוטומטית כטקסט רגיל (העמוד הנוכחי) במקום כקישור.

### אבזרי לחם

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **פריטים** - מערך של מקטעי פירורי לחם להצגה אחרי הקישור 'בית'
- **homeLabel** -- תווית עבור קישור הבית (ברירת המחדל היא `'Home'` )
- **className** - מחלקות CSS נוספות להחלה על אלמנט ה-nav

### שימוש בסיסי

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### התנהגות עיבוד

הרכיב מעבד אלמנט `nav` נגיש עם רשימה מסודרת:

1. **קישור הבית** -- תמיד מוצג ראשון עם סמל בית SVG והטקסט `homeLabel` 2. **פריטי ביניים** - מוצגים כאלמנטים `Link` הניתנים ללחיצה (מ- `next/link` ) עם מפרידי שברונים
3. **פריט אחרון** - מוצג כרגיל `span` עם `aria-current="page"` עבור נגישות

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## פרטי פריט פירורי לחם

הרכיב `ItemBreadcrumb` ב- `components/item-detail/breadcrumb.tsx` תוכנן במיוחד עבור דפי פרטי פריט. זה משתלב אוטומטית עם מערכת הקטגוריות.

### אביזרים

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### ניווט מודע לקטגוריה

פירור הלחם של הפריט משתמש ב- `useCategoriesEnabled` וו כדי להציג באופן מותנה את פלח הקטגוריה. כאשר קטגוריות מופעלות, פירור הלחם מציג:

**בית** > **שם הקטגוריה** > **שם הפריט**

כאשר הקטגוריות מושבתות, זה מפשט ל:

**בית** > **שם הפריט**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### דור שבלולים

הרכיב מעבד מזהי קטגוריות באמצעות כלי השירות `slugify` כדי ליצור נתיבים בטוחים בכתובת URL:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

קישורי קטגוריות עוקבים אחר הדפוס `/categories/{encoded-slug}` .

### חיתוך טקסט

שם הפריט נחתך לרוחב מקסימלי של 200px באמצעות מחלקות `truncate max-w-[200px]` Tailwind, ומונעים משמות פריטים ארוכים לשבור את הפריסה.

## אוספים פירורי לחם

הרכיב `CollectionsBreadcrumb` ב- `app/[locale]/collections/components/collections-breadcrumb.tsx` מדגים את התבנית המודעת ל-i18n.

### בינלאומי

רכיב זה משתמש ב- `next-intl` לתרגום תוויות פירורי הלחם:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

מפתחות תרגום מוגדרים בספרייה `messages/` עבור כל אזור נתמך.

## סטיילינג ומצב כהה

כל רכיבי פירורי הלחם תומכים במצב כהה דרך מחלקות הקידומת `dark:` של Tailwind:

| אלמנט | מצב אור | מצב כהה |
|--------|--------|--------|
| טקסט | `text-black` | `dark:text-white` |
| קישורים | `text-gray-800` | `dark:text-white/50` |
| סמלי שברון | `text-dark--theme-800` | `dark:text-white/50` |
| מצב ריחוף | `hover:text-gray-900` | `dark:hover:text-white` |

מעברים מוחלים עם `transition-colors duration-300` לאפקטים חלקים של ריחוף.

## נגישות

רכיבי פירורי הלחם פועלים בהתאם לשיטות המומלצות לניווט בפירורי לחם של WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** באלמנט `nav` מזהה את ציון הדרך
- ** `aria-current="page"` ** בפריט פירורי הלחם האחרון מסמן את העמוד הנוכחי
- ** `aria-hidden="true"` ** בסמלי SVG דקורטיביים (בית ושברון) מסתיר אותם מקוראי מסך
- **HTML סמנטי** משתמש במבנה `nav > ol > li` עבור מתאר נכון של המסמך

## הוספת פירורי לחם מותאמים אישית

כדי ליצור פירור לחם חדש עבור דף ספציפי, השתמש ברכיב `Breadcrumb` הניתן לשימוש חוזר:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

עבור דפים שצריכים תוויות מתורגמות, עטפו את הרכיב והעבירו מחרוזות מתורגמות:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## קבצים קשורים

| קובץ | תיאור |
|------|-------------|
| `components/ui/breadcrumb.tsx` | רכיב פירורי לחם גנרי לשימוש חוזר |
| `components/item-detail/breadcrumb.tsx` | דף פירוט פריט לחם |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | עמוד אוספים breadcrumb |
| `hooks/use-categories-enabled.ts` | חבר כדי לבדוק אם תכונת הקטגוריות פעילה |
| `lib/utils/slug.ts` | כלי עזר לייצור שבלולים ( `slugify` , `deslugify` ) |
