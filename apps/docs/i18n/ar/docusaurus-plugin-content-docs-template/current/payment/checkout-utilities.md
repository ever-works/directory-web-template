---
id: checkout-utilities
title: "أدوات الدفع"
sidebar_label: "أدوات الدفع"
sidebar_position: 7
---

# أدوات الدفع

تُوفِّر وحدة `checkout-utils` (`lib/utils/checkout-utils.ts`) دوال مساعدة لفتح تدفقات الدفع في المتصفح. تتعامل مع حظر النوافذ المنبثقة، وإعادة التوجيه الاحتياطية، ومعالجة الأخطاء، وإنشاء معالجات نقرات قابلة لإعادة الاستخدام لأزرار الدفع.

## المفاهيم الأساسية

تحل أدوات الدفع التحديات الشائعة للمتصفح عند فتح صفحات الدفع لمزودي الخدمة:

- **حظر النوافذ المنبثقة** -- قد تحظر المتصفحات استدعاءات `window.open()`. تكتشف الأدوات ذلك وتنتقل إلى التنقل المباشر.
- **معالجة الأخطاء** -- يتم التقاط أخطاء الشبكة والأخطاء غير المتوقعة والإبلاغ عنها من خلال ردود الاتصال.
- **معالجات قابلة لإعادة الاستخدام** -- تنشئ دالة المصنع معالجات نقرات يمكن إرفاقها بأي مكون زر.

## الأنواع

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // الافتراضي: '_blank'
  windowFeatures?: string;   // الافتراضي: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // الافتراضي: true
}
```

## الدوال

### openCheckoutInNewTab

تفتح عنوان URL للدفع في علامة تبويب متصفح جديدة مع اكتشاف النوافذ المنبثقة والنقل الاحتياطي:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // فشل كل من النافذة المنبثقة وإعادة التوجيه
  console.error('تعذر فتح صفحة الدفع');
}
```

#### التنفيذ

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### تدفق السلوك

1. **حماية SSR** -- تُرجع `false` فوراً عند التشغيل على الخادم
2. **فتح نافذة منبثقة** -- تحاول `window.open()` بالميزات المحددة
3. **النافذة المنبثقة محظورة** -- إذا أعادت `window.open()` القيمة `null`، فقد تم حظر النافذة المنبثقة
4. **إعادة توجيه احتياطية** -- إذا كانت `fallbackToRedirect` تساوي `true` (افتراضياً)، فيتم تنقل الصفحة الحالية إلى عنوان URL للدفع
5. **محاولة التركيز** -- تحاول تركيز النافذة الجديدة (قد تفشل في بعض المتصفحات دون التسبب في خطأ)
6. **التقاط الأخطاء** -- أي استثناء يرجع إلى إعادة التوجيه إذا كانت مفعّلة

#### الخيارات

| الخيار | الافتراضي | الوصف |
|--------|---------|-------------|
| `url` | مطلوب | عنوان URL للدفع المراد فتحه |
| `windowName` | `'_blank'` | اسم النافذة المستهدفة |
| `windowFeatures` | `'noopener,noreferrer'` | ميزات أمان النافذة الجديدة |
| `fallbackToRedirect` | `true` | تنقل الصفحة الحالية إذا كانت النافذة المنبثقة محظورة |

### openCheckoutWithErrorHandling

غلاف حول `openCheckoutInNewTab` يضيف رد اتصال للخطأ:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // عرض الخطأ للمستخدم
  }
);
```

#### التنفيذ

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

دالة مصنع تنشئ معالج نقر لصفحة الدفع مع ردود اتصال للنجاح والخطأ والإشعار. مصممة للتمرير مباشرة إلى خصائص `onClick` للأزرار:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // عرض إشعار toast عند الفشل
  });

  return (
    <button onClick={handleCheckout}>
      اشترك الآن
    </button>
  );
}
```

#### التنفيذ

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### الخيارات

| الخيار | النوع | الوصف |
|--------|------|-------------|
| `onSuccess` | `() => void` | يُستدعى عند فتح صفحة الدفع بنجاح |
| `onError` | `(error: string) => void` | يُستدعى برسالة خطأ عند الفشل |
| `showAlert` | `boolean` | عرض إشعار toast باستخدام `sonner` عند الفشل |

## أنماط الاستخدام

### زر الدفع الأساسي

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      المتابعة إلى الدفع
    </button>
  );
}
```

### الدفع مع التحليلات

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      اختر {plan.name}
    </button>
  );
}
```

### تعطيل النقل الاحتياطي للنافذة المنبثقة

إذا أردت منع الصفحة الحالية من التنقل (مثلاً في نافذة مشروطة)، قم بتعطيل النقل الاحتياطي لإعادة التوجيه:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // عرض رسالة مضمنة بدلاً من التنقل
  setShowPopupBlockedMessage(true);
}
```

## اعتبارات الأمان

- تمنع ميزات النافذة `noopener,noreferrer` الصفحة المفتوحة من الوصول إلى `window.opener`، مما يحمي من هجمات اختطاف علامات التبويب
- يستخدم `fallbackToRedirect` تعيين `window.location.href` (وليس `window.open`) الذي لا يخضع لمانعي النوافذ المنبثقة
- تمنع حماية SSR الوصول إلى `window` أثناء التقديم من جانب الخادم

## الملفات المصدرية

| الملف | الغرض |
|------|---------|
| `lib/utils/checkout-utils.ts` | إدارة نوافذ الدفع ومعالجات النقر |
