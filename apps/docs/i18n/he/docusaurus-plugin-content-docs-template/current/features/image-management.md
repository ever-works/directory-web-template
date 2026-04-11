---
id: image-management
title: ניהול תמונה
sidebar_label: ניהול תמונה
sidebar_position: 21
---

# ניהול תמונות

תבנית Ever Works כוללת מערכת ניהול תחום תמונה השולטת באילו מארחי תמונות חיצוניים מותרים לאופטימיזציה של Next.js Image. המערכת מחזיקה רשימות דומיינים שנאספו עבור ספקי תמונות ושירותי אייקונים נפוצים, מספקת ניהול דומיינים בזמן ריצה, אימות כתובות אתרים ויוצרת `remotePatterns` תצורה עבור `next.config.js` .

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | רשימות ליבה של דומיינים, יצירת דפוסים וכלי עזר לאימות |
| `useImageDomains` | `hooks/use-image-domains.ts` | React Hook לניהול דומיינים בזמן ריצה |
| `useImageValidation` | `hooks/use-image-domains.ts` | React Hook לאימות כתובות אתרים של תמונות מול דומיינים מותרים |

## דומיינים מוגדרים מראש

המערכת נשלחת עם שתי רשימות דומיינים שנאספו:

### דומיינים נפוצים של תמונה

אלו הם שירותי אירוח תמונות סטנדרטיים המשמשים עבור אווטרים ותמונות תוכן של משתמשים:

| דומיין | מטרה |
|---|---|
| `lh3.googleusercontent.com` | תמונות פרופיל משתמש בגוגל |
| `avatars.githubusercontent.com` | אווטרים של משתמש GitHub |
| `platform-lookaside.fbsbx.com` | תמונות פרופיל בפייסבוק |
| `pbs.twimg.com` | תמונות פרופיל של Twitter/X |
| `images.unsplash.com` | Unsplash מאגר צילומים |

### אייקון דומיינים

שירותי אייקונים ונכסי עיצוב ייעודיים:

| דומיין | מטרה |
|---|---|
| `flaticon.com` | סמלי Flaticon |
| `iconify.design` | Iconify ספריית סמלים |
| `icons8.com` | נכסי אייקונים8 |
| `feathericons.com` | סט אייקוני נוצה |
| `heroicons.com` | ספריית הרויקונים |
| `tabler-icons.io` | סמלי טבלר |

## Next.js Remote Patterns

הפונקציה `generateImageRemotePatterns` יוצרת את מערך `remotePatterns` עבור תצורת התמונה Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### תבניות שנוצרו

הפונקציה מייצרת שני סוגים של תבניות:

1. **דפוסים ספציפיים** עם שמות נתיבים מוגבלים עבור שירותים ידועים:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **דפוסי תווים כלליים** ​​עבור תת-דומיינים של כל הדומיינים הרשומים:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## אימות דומיין

### `isAllowedImageDomain` בודק אם שם המארח של כתובת אתר נמצא ברשימת הדומיינים המותרים:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

הפונקציה מבצעת שלוש רמות התאמה:

| בדוק | תיאור |
|---|---|
| התאמה מדויקת | שם מארח מתאים בדיוק לדומיין בכל אחת מהרשימות |
| התאמת תת-דומיין | שם מארח מסתיים ב- `.{domain}` עבור כל דומיין רשום |
| מעבר ללא HTTP | כתובות URL ללא קידומת `http://` או `https://` עוברות תמיד |

### `isValidImageUrl` מאמת אם מחרוזת היא כתובת אתר תמונה חוקית מבחינה מבנית:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` מזהה כתובות אתרים שסביר להניח שאינן קישורי תמונה ישירים:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| כלל זיהוי | תיאור |
|---|---|
| כתובות אתרים של דפי Flaticon | כתובות URL עם נתיב `/icone-gratuite/` ב-flaticon.com |
| פרמטרים להפניה מחדש | כתובות אתרים המכילות `related_id=` או `origin=` פרמטרים של שאילתה |
| הרחבת תמונה חסרה | כתובות אתרים ללא `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` או `.ico` |

### `shouldShowFallback` קובע אם להציג סמל חזרה במקום תמונה:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## ניהול דומיינים בזמן ריצה

### הוספת דומיינים

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

הפונקציה אימפוטנטית -- הוספת דומיין שכבר רשום אינו משפיע.

### הסרת דומיינים

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### קבלת כל הדומיינים

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

מחזירה עותקים של מערכי התחום, מונעת מוטציה חיצונית.

## ה- `useImageDomains` הוק

וו React לניהול תחומי תמונה עם סנכרון מצב:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### Hook API

| שיטה | פרמטרים | תיאור |
|---|---|---|
| `domains` | -- | מצב נוכחי: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | הוסף דומיין ומצב רענון |
| `removeDomain` | `(domain: string)` | הסר דומיין (מנרמל קלט) ומצב רענון |
| `checkDomain` | `(url: string)` | בדוק אם הדומיין של כתובת אתר מותר |

שיטת `removeDomain` מנרמלת את הקלט על ידי חיתוך רווח לבן, אותיות קטנות והסרת קידומות תווים כלליים ( `*.` ).

## הוק `useImageValidation` וו קל משקל לאימות כתובות אתרים של תמונות מול רשימת הדומיינים המותרים:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### תוצאות אימות

| תרחיש | `isValid` | `error` |
|---|---|---|
| כתובת אתר שאינה HTTP (נתיב יחסי) | `true` | -- |
| דומיין מותר | `true` | -- |
| דומיין אסור | `false` | "דומיין אינו מותר. הוסף את `hostname` לתצורת דומיינים של תמונה." |
| פורמט לא חוקי של כתובת אתר | `false` | "פורמט לא חוקי של כתובת אתר" |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| כלי עזר לדומיינים של תמונה | `lib/utils/image-domains.ts` |
| Image Domains Hook | `hooks/use-image-domains.ts` |
| וו אימות תמונה | `hooks/use-image-domains.ts` |
