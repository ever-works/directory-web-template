---
id: payment-config
title: "הגדרת תשלומים"
sidebar_label: "תשלומים"
sidebar_position: 12
---

# הגדרת תשלומים

התבנית תומכת במספר ספקי תשלום ובתהליכי חיוב גמישים. מדריך זה מכסה כל קבוע, ספירה ואפשרות תצורה הקשורים לתשלומים.

## קבועי תשלומים

כל ספירות וסוגי התשלומים המרכזיים מוגדרים בקובץ `lib/constants/payment.ts`. קובץ זה נשמר בכוונה נפרד ממודול התצורה הראשי כדי שניתן יהיה לייבא אותו בסקריפטים הפועלים מחוץ לסביבת הריצה של Next.js (מיגרציות, נתוני זרע, כלי CLI).

### PaymentFlow

קובע מתי נגבה התשלום ביחס לתהליך ההגשה.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| ערך | תיאור |
|-----|-------|
| `pay_at_start` | המשתמש משלם לפני ההגשה; הפריט מתפרסם מיד |
| `pay_at_end` | המשתמש מגיש תחילה; התשלום נגבה לאחר אישור מנהל |

### PaymentStatus

עוקב אחר מצב ניסיון תשלום.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

אפשרויות תדירות חיוב.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

רמות מנוי זמינות.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

שערי תשלום נתמכים.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## סכמת הגדרת תשלומים

מוגדרת ב-`lib/config/schemas/payment.schema.ts` ומאומתת בזמן האתחול עם Zod.

### תמחור מוצרים (ערכי תצוגה)

```typescript
pricing: {
  free: number;       // ברירת מחדל: 0
  standard: number;   // ברירת מחדל: 10
  premium: number;    // ברירת מחדל: 20
}
```

| משתנה סביבה | שדה | ברירת מחדל |
|------------|-----|------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### הגדרת תקופת ניסיון

| משתנה סביבה | שדה | תיאור |
|------------|-----|-------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | מזהה מחיר לניסיון סטנדרטי |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | מזהה מחיר לניסיון פרמיום |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | הפעלת סכומי ניסיון (`true`/`false`) |

## הגדרת ספק שירות

### Stripe

מופעל אוטומטית כאשר קיימים גם `secretKey` וגם `publishableKey`.

| משתנה סביבה | נדרש | תיאור |
|------------|------|-------|
| `STRIPE_SECRET_KEY` | כן | מפתח API בצד השרת |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | כן | מפתח ציבורי בצד הלקוח |
| `STRIPE_WEBHOOK_SECRET` | מומלץ | אימות חתימת Webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | לא | מזהה מחיר לתוכנית חינמית |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | לא | מזהה מחיר לתוכנית סטנדרטית |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | לא | מזהה מחיר לתוכנית פרמיום |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | לא | הגדר `true` לשליפת מחירים מ-Stripe API |

### LemonSqueezy

מופעל אוטומטית כאשר קיימים גם `apiKey` וגם `storeId`.

| משתנה סביבה | נדרש | תיאור |
|------------|------|-------|
| `LEMONSQUEEZY_API_KEY` | כן | מפתח API מלוח הבקרה של LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | כן | מזהה החנות שלך |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | מומלץ | אימות חתימת Webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | לא | דריסת כתובת URL של נקודת הקצה של Webhook |
| `LEMONSQUEEZY_TEST_MODE` | לא | הגדר `true` למצב בדיקה |
| `LEMONSQUEEZY_VARIANT_ID` | לא | מזהה גרסה ברירת מחדל |

### Polar

מופעל אוטומטית כאשר קיימים גם `accessToken` וגם `organizationId`.

| משתנה סביבה | נדרש | תיאור |
|------------|------|-------|
| `POLAR_ACCESS_TOKEN` | כן | אסימון גישה ל-API |
| `POLAR_ORGANIZATION_ID` | כן | מזהה ארגון |
| `POLAR_WEBHOOK_SECRET` | מומלץ | אימות חתימת Webhook |
| `POLAR_SANDBOX` | לא | הגדר `false` לסביבת ייצור (ברירת מחדל: `true`) |
| `POLAR_API_URL` | לא | דריסת כתובת URL הבסיסית של API |

### Solidgate

דורש הגדרה ידנית של משתני סביבה.

| משתנה סביבה | נדרש | תיאור |
|------------|------|-------|
| `SOLIDGATE_API_KEY` | כן | מפתח API |
| `SOLIDGATE_SECRET_KEY` | כן | מפתח סודי לחתימה |
| `SOLIDGATE_WEBHOOK_SECRET` | כן | אימות Webhook |
| `SOLIDGATE_MERCHANT_ID` | כן | מזהה סוחר |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | לא | מפתח בצד הלקוח |

## חיוב רב-מטבעי

כל ספק תומך בתמחור לפי מטבע דרך מודולי הגדרת החיוב ב-`lib/config/billing/`.

### סוגי הגדרת חיוב

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // מזהה מחיר/גרסה לחיוב חודשי
  yearly?: string;    // מזהה מחיר/גרסה לחיוב שנתי
  setupFee?: string;  // מזהה מחיר אופציונלי לדמי הקמה
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // קוד ISO 4217 (לדוגמה 'USD')
  symbol?: string;    // סמל תצוגה (לדוגמה '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### מטבעות נתמכים

מערך `SUPPORTED_CURRENCIES` ב-`lib/config/billing/types.ts` מפרט את כל 32 קודי ISO 4217 המתקבלים על ידי המערכת (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF ועוד).

### פונקציות פתרון מחירים

כל ספק מייצא פונקציית הגדרת מחירים:

| ספק | פונקציה | מקור |
|-----|---------|------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

כל הפונקציות נסוגות ל-USD אם המטבע המבוקש אינו מוגדר.

## הגדרת תהליך תשלום

מוגדרת ב-`lib/config/payment-flows.ts`, מערך `PAYMENT_FLOWS` מגדיר את שתי אפשרויות תהליך התשלום עם מאפייני ה-UI שלהן:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // שם אייקון Lucide
  color: string;           // מחלקות גרדיאנט Tailwind
  features: string[];      // נקודות תכונות
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // תווית תג אופציונלית
  isDefault?: boolean;     // האם זהו תהליך ברירת המחדל
}
```

פונקציות עזר:
- `getDefaultPaymentFlow()` -- מחזיר את ערך `PaymentFlow` ברירת המחדל
- `getPaymentFlowConfig(flowId)` -- מחזיר את `PaymentFlowConfig` עבור תהליך נתון

## מנהל ספקי תשלום

מחלקת `PaymentProviderManager` ב-`lib/payment/config/payment-provider-manager.ts` מספקת גישה יחידנית למופעי הספקים:

```typescript
// קבל ספק ספציפי
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// או השתמש בפונקציה הגנרית
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## דפים קשורים

- [סוגי תשלומים](../types/payment-types.md) -- הגדרות סוג לפעולות תשלום
- [סוגי מנויים](../types/subscription-types.md) -- סוגי מחזור חיי מנוי
- [מדריך סביבה](./environment-reference.md) -- רשימה מלאה של משתני סביבה
