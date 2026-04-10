---
id: checkout-utilities
title: "כלי תשלום"
sidebar_label: "כלי תשלום"
sidebar_position: 7
---

# כלי תשלום

מודול `checkout-utils` (`lib/utils/checkout-utils.ts`) מספק פונקציות עזר לפתיחת תהליכי תשלום בדפדפן. הוא מטפל בחסימת חלונות קופצים, הפניות חלופיות, טיפול בשגיאות, ויוצר מטפלי לחיצה לשימוש חוזר עבור כפתורי תשלום.

## מושגי ליבה

כלי התשלום פותרים אתגרים נפוצים של דפדפן בעת פתיחת דפי תשלום של ספקי תשלום:

- **חסימת חלונות קופצים** -- דפדפנים עשויים לחסום קריאות `window.open()`. הכלים מזהים זאת ונופלים לניווט ישיר.
- **טיפול בשגיאות** -- כשלי רשת ושגיאות בלתי צפויות נתפסות ומדווחות דרך callbacks.
- **מטפלים לשימוש חוזר** -- פונקציית מפעל יוצרת מטפלי לחיצה שניתן לצרף לכל רכיב כפתור.

## סוגים

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // ברירת מחדל: '_blank'
  windowFeatures?: string;   // ברירת מחדל: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // ברירת מחדל: true
}
```

## פונקציות

### openCheckoutInNewTab

פותח כתובת URL לתשלום בלשונית דפדפן חדשה עם זיהוי חלונות קופצים וחלופה:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // גם החלון הקופץ וגם ההפניה נכשלו
  console.error('לא ניתן לפתוח את הצ\'ק-אאוט');
}
```

#### מימוש

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

#### זרימת התנהגות

1. **הגנת SSR** -- מחזיר `false` מיידית בעת הרצה על השרת
2. **פתיחת חלון קופץ** -- מנסה `window.open()` עם המאפיינים שצוינו
3. **חלון קופץ נחסם** -- אם `window.open()` מחזיר `null`, החלון הקופץ נחסם
4. **הפניה חלופית** -- אם `fallbackToRedirect` הוא `true` (ברירת מחדל), מנווט את הדף הנוכחי לכתובת URL לתשלום
5. **ניסיון מיקוד** -- מנסה למקד את החלון החדש (עשוי להיכשל בחלק מהדפדפנים ללא גרימת שגיאה)
6. **תפיסת שגיאות** -- כל חריגה חוזרת להפניה אם מופעלת

#### אפשרויות

| אפשרות | ברירת מחדל | תיאור |
|--------|---------|-------------|
| `url` | נדרש | כתובת URL לתשלום לפתיחה |
| `windowName` | `'_blank'` | שם חלון היעד |
| `windowFeatures` | `'noopener,noreferrer'` | מאפייני אבטחה לחלון החדש |
| `fallbackToRedirect` | `true` | נווט דף נוכחי אם החלון הקופץ נחסם |

### openCheckoutWithErrorHandling

עטיפה סביב `openCheckoutInNewTab` שמוסיפה callback לשגיאה:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // הצגת שגיאה למשתמש
  }
);
```

#### מימוש

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

פונקציית מפעל שיוצרת מטפל לחיצה לתשלום עם callbacks להצלחה, שגיאה ו-toast. מתוכננת להעברה ישירה לאפייני `onClick` של כפתורים:

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
    showAlert: true, // הצגת התראת toast בכישלון
  });

  return (
    <button onClick={handleCheckout}>
      הירשם עכשיו
    </button>
  );
}
```

#### מימוש

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

#### אפשרויות

| אפשרות | סוג | תיאור |
|--------|------|-------------|
| `onSuccess` | `() => void` | נקרא כאשר התשלום נפתח בהצלחה |
| `onError` | `(error: string) => void` | נקרא עם הודעת שגיאה בכישלון |
| `showAlert` | `boolean` | הצגת התראת toast באמצעות `sonner` בכישלון |

## תבניות שימוש

### כפתור תשלום בסיסי

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      המשך לתשלום
    </button>
  );
}
```

### תשלום עם אנליטיקס

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
      בחר {plan.name}
    </button>
  );
}
```

### השבתת חלופת החלון הקופץ

אם ברצונך למנוע מהדף הנוכחי לנווט (למשל בחלון מודאלי), השבת את חלופת ההפניה:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // הצג הודעה מוטמעת במקום לנווט
  setShowPopupBlockedMessage(true);
}
```

## שיקולי אבטחה

- מאפייני החלון `noopener,noreferrer` מונעים מהדף הפתוח לגשת ל-`window.opener`, מגנים מפני התקפות tabnapping
- `fallbackToRedirect` משתמש בהקצאת `window.location.href` (לא `window.open`) שאינה כפופה לחוסמי חלונות קופצים
- הגנת SSR מונעת גישה ל-`window` במהלך רינדור בצד השרת

## קבצי מקור

| קובץ | מטרה |
|------|---------|
| `lib/utils/checkout-utils.ts` | ניהול חלונות תשלום ומטפלי לחיצה |
