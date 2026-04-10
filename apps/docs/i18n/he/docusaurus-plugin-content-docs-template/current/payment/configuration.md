---
id: configuration
title: תצורת תשלום
sidebar_label: מדריך הגדרות
sidebar_position: 6
description: מדריך מקיף להגדרת ספקי תשלום (Stripe, LemonSqueezy, Polar, Solidgate) עם תמיכה במטבעות מרובים
keywords: [תשלום, תצורה, stripe, lemonsqueezy, polar, solidgate, מטבעות מרובים]
---

# תצורת תשלום

מדריך זה מסביר כיצד להגדיר את ספקי התשלום השונים הנתמכים על ידי היישום.

## תוכן עניינים

- [סקירה כללית](#overview)
- [ספקים נתמכים](#supported-providers)
- [תצורה משותפת](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [מטבעות מרובים](#multi-currency)
- [תקופות ניסיון ועמלות הגדרה](#trials-and-setup-fees)
- [בחירת ספק](#provider-selection)
- [פתרון בעיות](#troubleshooting)

---

## סקירה כללית

היישום תומך במספר ספקי תשלום עבור מנויים:

| ספק          | סוג     | מטבעות מרובים | תקופות ניסיון |
|-------------|---------|---------------|---------------|
| Stripe      | מנוי    | ✅ כן         | ✅ כן         |
| LemonSqueezy | מנוי   | ✅ כן         | ✅ כן         |
| Polar       | מנוי    | ❌ לא         | ❌ לא         |
| Solidgate   | מנוי    | ⚠️ חלקי      | ❌ לא         |

### תוכניות זמינות

- **חינמי** - ללא תשלום, פונקציות בסיסיות
- **סטנדרטי** - תוכנית בינונית עם נראות רבה יותר
- **פרמיום** - תוכנית מלאה עם כל הפונקציות

---

## ספקים נתמכים

### ארכיטקטורה

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # ייצואים
│       ├── types.ts              # סוגים משותפים
│       ├── stripe.config.ts      # תצורת Stripe רב-מטבע
│       ├── lemonsqueezy.config.ts # תצורת LemonSqueezy רב-מטבע
│       └── solidgate.config.ts   # תצורת Solidgate (בפיתוח)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (בפיתוח)
└── utils/
    └── payment-provider.ts       # בחירת ספק
```

---

## תצורה משותפת

### מחירים מוצגים (לממשק המשתמש)

משתנים אלה מגדירים את המחירים המוצגים בממשק המשתמש:

```bash
# מחירים בדולרים (או המטבע הראשי) - לתצוגה בלבד
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### תקופות ניסיון (trial)

```bash
# מזהי סכומי ניסיון (עמלות ראשוניות במהלך תקופת הניסיון)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# הפעלה/השבתה של תקופות ניסיון עם סכום מורשה
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### דרישות מוקדמות

1. יצירת חשבון ב-[Stripe Dashboard](https://dashboard.stripe.com)
2. שליפת מפתחות API (הגדרות → מפתחות API)
3. הגדרת webhook

### משתני סביבה בסיסיים

```bash
# ============================================
# STRIPE - תצורה בסיסית
# ============================================

# מפתחות API (נדרש)
STRIPE_SECRET_KEY=sk_live_xxx           # מפתח סודי (שרת)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # מפתח פרסום
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # מפתח פרסום (לקוח)

# Webhook (נדרש לאירועים)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### תצורת מוצר (Legacy - USD בלבד)

```bash
# מחירים פשוטים (לתאימות לאחור, USD בלבד)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### תצורה רב-מטבע (מומלצת)

#### תוכנית סטנדרטית

```bash
# ============================================
# STRIPE תוכנית סטנדרטית
# ============================================

NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# מחירים חודשיים לפי מטבע
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# מחירים שנתיים לפי מטבע
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# עמלות הגדרה / סכומי ניסיון לפי מטבע
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### תוכנית פרמיום

```bash
# ============================================
# STRIPE תוכנית פרמיום
# ============================================

NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### יצירת מחירים ב-Stripe

1. עבור אל **מוצרים** → צור מוצר
2. הוסף מחירים לכל מטבע:
   - לחץ על "הוסף מחיר נוסף"
   - בחר מטבע (EUR, GBP, CAD)
   - הגדר את הסכום המקביל
3. העתק כל `price_xxx` למשתנים המתאימים

### Stripe Webhook

הגדר webhook ב-Stripe Dashboard:

- **כתובת URL**: `https://הדומיין-שלך.com/api/stripe/webhook`
- **אירועים להאזנה**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### דרישות מוקדמות

1. יצירת חשבון ב-[LemonSqueezy](https://lemonsqueezy.com)
2. יצירת חנות
3. יצירת מוצרים וגרסאות

### משתני סביבה

```bash
# ============================================
# LEMONSQUEEZY - תצורה בסיסית
# ============================================

LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://הדומיין-שלך.com/api/lemonsqueezy/webhook
LEMONSQUEEZY_TEST_MODE=false
```

### תצורת גרסאות (Legacy)

```bash
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### תצורה רב-מטבע

```bash
# תוכנית סטנדרטית
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx

# תוכנית פרמיום
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### דרישות מוקדמות

1. יצירת חשבון ב-[Polar](https://polar.sh)
2. יצירת ארגון
3. יצירת תוכניות מנוי

### משתני סביבה

```bash
# ============================================
# POLAR - תצורה
# ============================================

POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx
POLAR_WEBHOOK_SECRET=xxx
POLAR_SANDBOX=true
POLAR_API_URL=https://api.polar.sh
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning בפיתוח
אינטגרציית Solidgate נמצאת כרגע בפיתוח. ייתכן שחלק מהתכונות עדיין אינן פועלות במלואן.
:::

### משתני סביבה

```bash
# ============================================
# SOLIDGATE - תצורה (בפיתוח)
# ============================================

SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx
SOLIDGATE_WEBHOOK_SECRET=xxx
SOLIDGATE_ENVIRONMENT=test

NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### מגבלות נוכחיות

| תכונה          | סטטוס        | הערות                        |
|----------------|--------------|------------------------------|
| תשלומים בסיסיים | ✅ מיושם    | תשלומים חד-פעמיים ומנוי      |
| מטבעות מרובים  | ⚠️ חלקי     | USD בלבד כרגע               |
| תקופות ניסיון  | ❌ עדיין לא | מתוכנן לגרסה עתידית          |
| Webhooks       | ⚠️ חלקי     | אירועים בסיסיים בלבד         |
| החזרים         | ❌ עדיין לא | מתוכנן לגרסה עתידית          |

---

## מטבעות מרובים

### מטבעות נתמכים

| קוד  | מטבע          | סמל  |
|------|--------------|------|
| USD  | דולר אמריקאי  | $    |
| EUR  | אירו          | €    |
| GBP  | לירה שטרלינג  | £    |
| CAD  | דולר קנדי     | CA$  |

### כיצד זה עובד

1. מטבע המשתמש מזוהה אוטומטית (גיאולוקציה, העדפות)
2. המערכת בוחרת `price_id` המתאים למטבע
3. אם המטבע אינו מוגדר, חוזרים ל-USD

### דוגמה לשימוש

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      הירשם ב-{priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## תקופות ניסיון ועמלות הגדרה

### מושג

- **תקופת ניסיון**: תקופת בדיקה חינמית או מוזלת
- **עמלת הגדרה**: עמלות ראשוניות בתחילת תקופת הניסיון

### תצורה

```bash
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### חשוב: עקביות מטבע

:::caution
כל המחירים בהפעלת תשלום חייבים להיות באותו מטבע.
:::

```bash
# ❌ שגוי: עמלת הגדרה ב-USD + מחיר ראשי ב-GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx

# ✅ נכון: שניהם ב-GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
```

---

## בחירת ספק

### עדיפות

1. **ספק שנבחר על ידי המשתמש** (הגדרות)
2. **ספק ברירת מחדל** (תצורה)
3. **גיבוי**: Stripe

### תצורת ספק ברירת מחדל

```typescript
pricing: {
  provider: PaymentProvider.STRIPE  // או LEMONSQUEEZY, POLAR
}
```

### דוגמה לשימוש

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## פתרון בעיות

### שגיאה: התנגשות מטבעות

```
Error: This price has currency=gbp, but other items use currency=usd
```

**סיבה**: המחיר הראשי ועמלת ההגדרה במטבעות שונים.

**פתרון**: צור עמלות הגדרה לכל מטבע נתמך.

### שגיאה: מזהה מחיר לא תקין

```
Error: Invalid price ID
```

**סיבה**: `price_id` אינו קיים או אינו מוגדר.

**פתרון**: ודא שמשתנה הסביבה מכיל מזהה תקין.

### Webhook אינו מקבל אירועים

1. בדוק את כתובת URL של webhook בלוח הבקרה של הספק
2. אשר שה-`WEBHOOK_SECRET` נכון
3. בדוק עם כלי הניפוי של הספק

### מחירים אינם מוצגים כראוי

1. בדוק `NEXT_PUBLIC_PRODUCT_PRICE_*` לערכים מוצגים
2. אשר שערכי `price_id` מתאימים למטבעות הנכונים
3. הפעל מחדש את שרת הפיתוח לאחר שינויים בקבצי `.env`
