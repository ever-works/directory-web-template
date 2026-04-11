---
id: promo-codes
title: מערכת קוד קידום
sidebar_label: קודי קידום
sidebar_position: 14
---

# מערכת קודי קידום

תבנית Ever Works כוללת מערכת קודי קידום מקיפה להצגת הנחות לקידום מכירות, קודי קופונים ומבצעים מיוחדים בדפי רישום הפריטים. המערכת תומכת במספר סוגי הנחות, מעקב אחר תפוגה, העתקת לוח, אינטגרציה של אנליטיקה וגרסאות ממשק משתמש רספונסיביות.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | רכיב ממשק משתמש להצגת קודי קידום |
| `usePromoCode` | `hooks/use-promo-code.ts` | הוק לניהול קוד קידום יחיד |
| `usePromoCodes` | `hooks/use-promo-code.ts` | וו לניהול מספר קודי פרומו |
| `PromoCode` סוג | `lib/content` | הגדרת סוג עבור נתוני קוד קידום |

## סוגי הנחות

המערכת תומכת בשלושה סוגי הנחות:

| הקלד | תצוגה | דוגמה |
|---|---|---|
| `percentage` | `X% OFF` | "25% הנחה" |
| `fixed` | `$X OFF` | "$10 הנחה" |
| `free_shipping` | `FREE SHIPPING` | "משלוח חינם" |

## הוק `usePromoCode` ### ממשק

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

### שימוש

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## מעקב אחר סטטיסטיקה

סטטיסטיקת ההעתקה והקליק של ה-hook, נמשכה ב- `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

הנתונים הסטטיסטיים נשמרים ומשוחזרים אוטומטית בין הפעלות:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## שילוב אנליטיקס

ה-hook יפעיל אוטומטית אירועים של Google Analytics כאשר הם זמינים:

| אירוע | קטגוריה | טריגר |
|---|---|---|
| `promo_code_copied` | `engagement` | כאשר קוד מועתק ללוח |
| `promo_code_used` | `conversion` | כאשר קוד מופעל/לוחץ |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## ניהול קודי קידום מכירות מרובים

הוו `usePromoCodes` משתרע `usePromoCode` עבור אוספים:

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### אלגוריתם ההנחה הטוב ביותר

הפונקציה `getBestDiscount()` בוחרת את ההנחה הטובה ביותר הזמינה:
1. מסננים לקודים פעילים (שפג תוקפם) בלבד
2. משווה אחוזי הנחות לפי ערך (יותר טוב יותר)
3. משווה הנחות קבועות לפי ערך (יותר טוב יותר)
4. קודי משלוח חינם נחשבים תמיד לתחרותיים

## רכיב PromoCode

ה- `PromoCodeComponent` מציג כרטיס קוד פרומו מעוצב עם שלוש גרסאות:

### גרסאות

| וריאנט | תיאור |
|---|---|
| `default` | כרטיס בגודל מלא עם תיאור, תנאים, לחצן העתקה וכפתור שימוש |
| `compact` | תג מוטבע עם קוד ואייקון העתקה |
| `featured` | ברירת מחדל משופרת עם הדגשת טבעת וצל גדול יותר |

### שימוש

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### אבזרי רכיבים

| פרופס | הקלד | ברירת מחדל | תיאור |
|---|---|---|---|
| `promoCode` | `PromoCode` | נדרש | אובייקט הנתונים של קוד ההטבה |
| `className` | `string?` | `undefined` | שיעורי CSS נוספים |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | גרסה לתצוגה |
| `showDescription` | `boolean` | `true` | הצג את תיאור הקוד |
| `showTerms` | `boolean` | `true` | הצג תנאים והגבלות |
| `onCodeCopied` | `(code: string) => void` | `undefined` | התקשרות חוזרת כאשר הקוד מועתק |

## תמיכה בלוח

פונקציית ההעתקה כוללת סתירה לדפדפנים ישנים יותר:

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## בינלאומי

הרכיב משתמש ב- `next-intl` עבור כל המחרוזות הפונות למשתמש:

| מפתח תרגום | שימוש |
|---|---|
| `common.EXPIRES` | תווית תאריך תפוגה |
| `common.EXPIRED` | טקסט התג שפג תוקפו |
| `common.PROMO_CODE` | תווית שדה קוד |
| `common.COPIED` | העתק טקסט אישור |
| `common.COPY` | העתק טקסט לחצן |
| `common.USE_CODE` | השתמש בטקסט לחצן קוד |
| `common.TERMS` | תווית תנאים |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| רכיב קוד קידום | `components/promo-code/promo-code.tsx` |
| ווי קוד קידום | `hooks/use-promo-code.ts` |
| סוג קוד קידום | `lib/content` (סוג מיוצא) |
