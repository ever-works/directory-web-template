---
id: multi-currency
title: אינטגרציה מרובת מטבעות
sidebar_label: ריבוי מטבעות
sidebar_position: 5
---

# מדריך לשילוב רב מטבעות

מסמך זה מסביר כיצד המערכת מרובת המטבעות משולבת באפליקציה וכיצד היא פועלת מול ספקי תשלומים (Stripe, LemonSqueezy ו-Polar).

## אדריכלות

המערכת מרובת המטבעות פועלת במספר רמות:

1. **תצורת בסיס** ( `lib/types.ts` ): תצורת ברירת מחדל עם תמיכה בריבוי מטבעות
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): מעשיר את התצורה במטבע של המשתמש
3. **מוכרי תשלום**: השתמשו בתצורות ריבוי מטבעות כדי לקבל את מזהי המחיר הנכונים

## זרימת נתונים

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## קבצים ששונו

### 1. `app/[locale]/config.tsx` - משתמש ב- `useCurrencyContext()` כדי לקבל את המטבע של המשתמש
- יוצר באופן אוטומטי תצורת תמחור המבוססת על מטבע אם לא מסופקת תצורה
- משתמש ב- `getDefaultPricingConfigWithCurrency()` ליצירת תצורה של ריבוי מטבעות

### 2. `hooks/use-create-checkout.ts` - משתמש ב- `useCurrencyContext()` כדי לקבל את המטבע
- מתקשר ל- `getStripePriceConfig()` כדי לקבל את מזהה המחיר הנכון על סמך המטבע
- נופל חזרה ל- `plan.stripePriceId` אם תצורת ריבוי מטבעות אינה זמינה

### 3. `hooks/use-pricing-section.ts` - משתמש ב- `useCurrencyContext()` כדי לקבל את המטבע
- קורא `getLemonSqueezyPriceConfig()` עבור LemonSqueezy
- משתמש במזהי מחירים מבוססי מטבע בזמן התשלום

## שימוש

### למפתחים

המערכת פועלת באופן אוטומטי. אין צורך בשינויים ברכיבים קיימים.

**דוגמה לשימוש ברכיב:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### עבור הוקס לקופה

ווים לקופה משתמשים באופן אוטומטי בתצורות ריבוי מטבעות:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## תצורת משתני סביבה

כדי שהמערכת תעבוד, עליך להגדיר משתני סביבה עבור כל מטבע ב:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` משתנים
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` משתנים

**דוגמה ל-Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## מטבעות נתמכים

מטבעות נתמכים מוגדרים ב- `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (מוגדר בתצורות חיוב)
- מטבעות אחרים של ISO 4217 (חזרה לדולר ארה"ב)

## סתירה

אם מטבע אינו נתמך או אם הגדרות ריבוי מטבעות אינן זמינות:

1. המערכת משתמשת ב- `plan.stripePriceId` / `plan.lemonVariantId` (תצורה סטטית)
2. מטבע ברירת המחדל הוא דולר ארה"ב
3. סמל ברירת המחדל הוא $

## בדיקה

כדי לבדוק את המערכת מרובת המטבעות:

1. שנה את המטבע של המשתמש באמצעות `/api/user/currency` 2. ודא שמזהי המחיר משתנים בהתאם למטבע
3. בדוק את הקופה עם מטבעות שונים

## הערות חשובות

- מזהי המחירים נפתרים **בזמן התשלום**, לא בזמן התצוגה
- תצורת התמחור ב- `content/config.yml` מקבלת עדיפות על פני תצורת ברירת המחדל
- תצורות ריבוי מטבעות משמשות רק אם מוגדרים משתני סביבה

## אינטגרציה עם ספקי תשלומים

המערכת מרובת המטבעות פועלת בצורה חלקה עם כל ספקי התשלומים:

- **פס**: משתמש ב- `getStripePriceConfig()` כדי לקבל מזהי מחירים ספציפיים למטבע
- **LemonSqueezy**: משתמש ב- `getLemonSqueezyPriceConfig()` כדי לקבל מזהי וריאציות ספציפיות למטבע
- **Polar**: תומך בריבוי מטבעות באמצעות תצורת המוצר

לתצורה מפורטת ספציפית לספק, ראה:
- [תצורת פס](./streep)
- [תצורת LemonSqueezy](./lemonsqueezy)
- [תצורה קוטבית](./polar)
