---
id: promo-codes
title: نظام الرمز الترويجي
sidebar_label: الرموز الترويجية
sidebar_position: 14
---

# نظام الرمز الترويجي

يشتمل قالب Ever Works على نظام رموز ترويجية شامل لعرض الخصومات الترويجية ورموز القسيمة والعروض الخاصة على صفحات قائمة العناصر. يدعم النظام أنواع خصم متعددة، وتتبع انتهاء الصلاحية، ونسخ الحافظة، وتكامل التحليلات، ومتغيرات واجهة المستخدم سريعة الاستجابة.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | مكون واجهة المستخدم لعرض الرموز الترويجية |
| `usePromoCode` | `hooks/use-promo-code.ts` | ربط لإدارة الرمز الترويجي الفردي |
| 4ـ | 5 ــ | ربط لإدارة الرموز الترويجية المتعددة |
| 6ـ النوع | `lib/content` | تعريف النوع لبيانات الرمز الترويجي |

## أنواع الخصم

يدعم النظام ثلاثة أنواع من الخصم:

| اكتب | عرض | مثال |
|---|---|---|
| 8ـ | `X% OFF` | "خصم 25%" |
| `fixed` | `$X OFF` | "خصم 10 دولارات" |
| ‹‹١٢› | 13 ــ | "الشحن مجاني" |

## الخطاف 14

### الواجهة

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

### الاستخدام

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

## تتبع الإحصائيات

يقوم مسار الخطاف بنسخ وإحصائيات النقر، ويستمر في `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

يتم حفظ الإحصائيات واستعادتها تلقائيًا عبر الجلسات:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## التكامل التحليلي

يقوم الخطاف بتشغيل أحداث Google Analytics تلقائيًا عندما تكون متاحة:

| الحدث | الفئة | الزناد |
|---|---|---|
| `promo_code_copied` | `engagement` | عندما يتم نسخ رمز إلى الحافظة |
| `promo_code_used` | `conversion` | عند تفعيل/النقر على رمز |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## إدارة الرموز الترويجية المتعددة

الخطاف 0 يمتد 1 للمجموعات:

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

### أفضل خوارزمية الخصم

تحدد الوظيفة `getBestDiscount()` أفضل خصم متاح:
1. يقوم بالتصفية للرموز النشطة (غير منتهية الصلاحية) فقط
2. يقارن نسبة الخصومات حسب القيمة (الأعلى هو الأفضل)
3. مقارنة الخصومات الثابتة حسب القيمة (الأعلى هو الأفضل)
4. تعتبر رموز الشحن المجاني تنافسية دائمًا

## مكون الرمز الترويجي

يعرض `PromoCodeComponent` بطاقة رمز ترويجي مصممة بثلاثة أشكال مختلفة:

### المتغيرات

| البديل | الوصف |
|---|---|
| `default` | بطاقة كاملة الحجم تحتوي على الوصف والمصطلحات وزر النسخ وزر الاستخدام |
| `compact` | شارة مضمنة مع رمز وأيقونة نسخة |
| 4ـ | افتراضي محسّن مع تسليط الضوء على الحلقة والظل الأكبر |

### الاستخدام

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

### الدعائم المكونة

| الدعامة | اكتب | الافتراضي | الوصف |
|---|---|---|---|
| `promoCode` | `PromoCode` | مطلوب | كائن بيانات الرمز الترويجي |
| `className` | `string?` | 4ـ | فئات CSS إضافية |
| 5 ــ | 6ـ | `"default"` | متغير العرض |
| 8ـ | `boolean` | `true` | أظهر وصف الكود |
| `showTerms` | ‹‹١٢› | 13 ــ | عرض الشروط والأحكام |
| 14 ــ | `(code: string) => void` | 16 ــ | رد الاتصال عند نسخ الكود |

## دعم الحافظة

تتضمن وظيفة النسخ خيارًا احتياطيًا للمتصفحات الأقدم:

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

## التدويل

يستخدم المكون `next-intl` لجميع السلاسل التي تواجه المستخدم:

| مفتاح الترجمة | الاستخدام |
|---|---|
| `common.EXPIRES` | تسمية تاريخ انتهاء الصلاحية |
| `common.EXPIRED` | نص الشارة منتهي الصلاحية |
| `common.PROMO_CODE` | تسمية حقل الرمز |
| 4ـ | انسخ نص التأكيد |
| 5 ــ | نسخ نص الزر |
| 6ـ | استخدم نص زر الكود |
| `common.TERMS` | تسمية المصطلحات |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| مكون الرمز الترويجي | 8ـ |
| خطاف الرمز الترويجي | `hooks/use-promo-code.ts` |
| نوع الرمز الترويجي | `lib/content` (النوع المصدر) |
