---
id: pricing-pages
title: תמחור ודפי תשלום
sidebar_label: דפי תמחור
sidebar_position: 19
---

# דפי תמחור ודפי תשלום

תבנית Ever Works כוללת מערכת דפי תמחור מלאה עם תמיכה בקופה מרובת ספקים (Stripe, LemonSqueezy, Polar), החלפת מרווחי חיוב, תמחור דינמי ממוצרי Stripe, עיצוב מטבעות, כרטיסי השוואת תוכניות, קטעי מודעות נותני חסות ותזרימי תשלום מוטבעים או המבוססים על הפניה מחדש.

## סקירה כללית של אדריכלות

| רכיב | נתיב | מטרה |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | תכנן תצורות, רשימות תכונות ומקבלי טקסט פעולה |
| `usePricingSection` | `hooks/use-pricing-section.ts` | מתזמר את כל מצבי התמחור, התשלום והתשלום |
| `PricingSection` | `components/pricing/pricing-section.tsx` | דף תמחור מלא ממשק המשתמש עם כרטיסי תוכנית ותזרים קופה |
| `PlanCard` | `components/pricing/plan-card.tsx` | כרטיס תצוגה של תכנית אישית |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | טופס תשלום משובץ מודאלי |
| `PaymentFlowSelectorModal` | `components/payment/` | שיטת בחירת זרימה (שלם עכשיו לעומת תשלום בסוף) |

## תצורת תוכנית

המערכת תומכת בשלוש שכבות תוכנית המוגדרות דרך `usePricingFeatures` :

| תוכנית | טקסט פעולה (מחובר) | טקסט פעולה (לא מחובר) |
|---|---|---|
| `free` | "התחל בחינם" | "שלח בחינם" |
| `standard` | "שדרוג לתקן" | "הירשם עכשיו" |
| `premium` | "Go Premium" | "הירשם עכשיו" |

### ממשק תצורת תוכנית

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### רשימות תכונות

לכל תוכנית יש רשימת תכונות מוקלדת:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| תוכנית | ספירת תכונות | תכלילים בולטים |
|---|---|---|
| חינם | 9 תכונות | שלח מוצר, תיאור בסיסי, תמונה אחת, קישור לאתר |
| סטנדרטי | 9 תכונות | כל התכונות החינמיות, תג מאומת, סקירת עדיפות, סטטיסטיקה חודשית |
| פרימיום | 11 תכונות | כל התכונות הסטנדרטיות, מיקום ממומן, עמוד הבית מוצג, גלריה ללא הגבלה |

## ה- `usePricingSection` הוק

הוק המקיף הזה מתזמר את כל ההיגיון של דף התמחור:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### מדינה

| נכס | הקלד | תיאור |
|---|---|---|
| `showSelector` | `boolean` | האם בורר תזרים התשלומים גלוי |
| `billingInterval` | `PaymentInterval` | מרווח חיוב נוכחי (חודשי/שנתי) |
| `processingPlan` | `string \| null` | מזהה התוכנית שנמצאת כעת בעיבוד |
| `selectedPlan` | `PaymentPlan \| null` | תוכנית שנבחרה כעת |
| `selectedFlow` | `PaymentFlow` | סוג זרימת תשלום (שלם עכשיו לעומת תשלום בסוף) |
| `isButton` | `boolean` | האם הזרימה שנבחרה משתמשת במצב לחצן |

### פעולות

| שיטה | תיאור |
|---|---|
| `setBillingInterval(interval)` | מעבר בין חיוב חודשי לשנתי |
| `handleSelectPlan(plan)` | בחר תוכנית והודע להורה באמצעות התקשרות חוזרת |
| `handleCheckout(plan)` | התחל קופה עבור תצורת תוכנית נתונה |
| `calculatePrice(plan)` | חשב מחיר על סמך מרווח חיוב והנחה שנתית |
| `getSavingsText(plan)` | קבל טקסט חיסכון שנתי (לדוגמה, "חסוך $24 לשנה") |
| `cancelCurrentProcess()` | בטל את התשלום בתהליך ואיפוס המצב |
| `formatPrice(amount)` | עיצוב סכום עם סמל מטבע |

### חישוב מחיר

ה-hook מחשב מחירים על סמך מרווח החיובים:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## ספקי תשלומים

המערכת תומכת בשלושה ספקי תשלום, שנבחרו לפי תצורה או העדפה לכל משתמש:

| ספק | וו קופה | תמיכה משובצת |
|---|---|---|
| פס | `useCreateCheckoutSession` | כן (SetupIntent) |
| LemonSqueezy | `useCheckoutButton` | כן (שכבת על) |
| פולאר | `usePolarCheckout` | כן (כתובת אתר משובצת) |

### בחירת ספק

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### זרימת תשלום

כאשר משתמש לוחץ על לחצן הפעולה של תוכנית:

1. ודא שהמשתמש מחובר (פתח את שיטת הכניסה אם לא)
2. בטל כל תהליך קופה קיים
3. קבע את ספק התשלום
4. קבל את מזהה המחיר המודע למטבע או מזהה הגרסה
5. פתח טופס תשלום משובץ או הפנה מחדש לקופה של ספק

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## תמחור דינמי (פס)

כאשר Stripe הוא הספק הפעיל והתמחור הדינמי מופעל, ה-hook מביא נתוני מוצרים חיים:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## תמיכה במטבעות

מערכת התמחור תומכת בתצוגה מרובת מטבעות:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

מזהי וריאנטים המודעים למטבע נפתרים באמצעות פונקציות תצורה ספציפיות לספק:

| ספק | פונקציית תצורה |
|---|---|
| LemonSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| פולאר | `getPolarPriceConfig(planName, currency, interval)` |

## טופס תשלום מודאלי

טופס התשלום המשובץ תומך בכל שלושת הספקים:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## רכיב מדור התמחור

הרכיב `PricingSection` מציג את דף התמחור המלא:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### תכונות חזותיות

| תכונה | תיאור |
|---|---|
| החלפת מרווח חיוב | מחוון מונפש בין חודשי לשנתי |
| רשת כרטיסי תוכנית | פריסה רספונסיבית של עמודה אחת (נייד) ל-3 עמודות (מחשב שולחני) |
| תג פופולרי | תוכנית סטנדרטית מסומנת כ"פופולרית" עם אפקטי זוהר |
| תגי חיסכון | כדורים ירוקים המציגים חיסכון שנתי כאשר רלוונטי |
| מדדי אמון | סמלים עבור "ללא עמלות נסתרות", "הפעלה מיידית", "תמיכה פרימיום" |
| מדור מודעות חסות | מעגלי מכ"ם מונפשים עם תמחור למיקום ממומן |
| המשך סעיף | מוצג לאחר בחירת תוכנית עם קריאה לפעולה |

### עיבוד מותנה

הרכיב מציג באופן מותנה תוכניות בתשלום על סמך זמינות התשלום:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## בינלאומי

כל המחרוזות הפונות למשתמש משתמשות ב- `next-intl` עם שני מרחבי שמות תרגום:

| מרחב שמות | שימוש |
|---|---|
| `pricing` | שמות תוכניות, תכונות, תוכן עמודים, מדור נותני חסות |
| `billing` | תוויות חודשיות/שנתיות, מצבי עיבוד, הודעות שגיאה |

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| תכונות תמחור הוק | `hooks/use-pricing-features.ts` |
| מדור תמחור וו | `hooks/use-pricing-section.ts` |
| רכיב מדור התמחור | `components/pricing/pricing-section.tsx` |
| רכיב כרטיס תוכנית | `components/pricing/plan-card.tsx` |
| טופס תשלום מודאלי | `components/payment/stripe-payment-modal.tsx` |
| קבועי תשלום | `lib/constants.ts` |
| סוג תצורת תמחור | `lib/content.ts` |
