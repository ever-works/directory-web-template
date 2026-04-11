---
id: recaptcha
title: التكامل ريكابتشا
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# تكامل reCAPTCHA

يدمج القالب Google reCAPTCHA v3 لحماية الروبوتات عند المصادقة وتدفقات إرسال النماذج. ويتضمن نقطة نهاية للتحقق من جانب الخادم، وخطافات من جانب العميل لإدارة الرمز المميز، ووضع تطوير يتجاوز التحقق عندما لا يتم تكوين بيانات الاعتماد.

## نظرة عامة على الهندسة المعمارية

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## نقطة نهاية التحقق من جانب الخادم

يعالج المسار 0 عند 11 التحقق من الرمز المميز مقابل Google reCAPTCHA API:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### تفاصيل التنفيذ الرئيسية

- **التحقق من صحة الرمز المميز**: إرجاع 400 إذا لم يتم توفير رمز مميز في نص الطلب.
- **تجاوز التطوير**: عندما لا يتم تكوين المفتاح السري ويكون `NODE_ENV` هو `development` ، تقوم نقطة النهاية بإرجاع استجابة ناجحة بـ `score: 1.0` و 3 دون الاتصال بـ Google.
- **العميل الخارجي**: يستخدم التكوين المسبق 4 من 5 مع أسلوبه 6، الذي يرسل بيانات 7 إلى واجهة برمجة التطبيقات للتحقق من Google.
- **أدوات مساعدة واجهة برمجة التطبيقات**: تستخدم 8 و9 للتعامل مع الاستجابة المتسقة.
- **إعادة توجيه الاستجابة الكاملة**: إرجاع نتيجة التحقق الكاملة بما في ذلك النتيجة والإجراء واسم المضيف والطابع الزمني للتحدي ورموز الخطأ.

### تجاوز وضع التطوير

عند عدم تعيين `RECAPTCHA_SECRET_KEY` وتشغيل التطبيق في وضع التطوير، تتجاوز نقطة النهاية عملية التحقق تلقائيًا:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

في الإنتاج، يُرجع المفتاح السري المفقود خطأ 500 بدلاً من التجاوز بصمت.

## خطاف التحقق من جانب العميل

يغلف الخطاف 0 عند 1 مكالمة التحقق في طفرة React Query:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### إرجاع القيم

| عقار | اكتب | الوصف |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | وظيفة الطفرة للتحقق من الرمز المميز |
| `isVerifying` | `boolean` | ما إذا كان التحقق قيد التقدم |
| 4ـ | 5 ــ | ما إذا كان التحقق قد نجح |
| 6ـ | `Error or null` | خطأ من محاولة التحقق الأخيرة |
| 8ـ | `() => void` | إعادة تعيين حالة التحقق |

## ربط التحقق التلقائي

يؤدي الخطاف 10 إلى تشغيل التحقق من reCAPTCHA تلقائيًا عند تثبيت أحد المكونات أو عندما يصبح الشرط صحيحًا:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### مثال الاستخدام

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## تكامل واجهة برمجة تطبيقات Google

تتواصل نقطة النهاية مع واجهة برمجة تطبيقات reCAPTCHA من Google باستخدام الطريقة "0" من "1". ترسل هذه الطريقة بيانات نموذج مشفرة بعنوان URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

`externalClient` عبارة عن مثيل 1 تم تكوينه مسبقًا ومصمم لاستدعاءات واجهة برمجة التطبيقات الخارجية. تتعامل الطريقة 2 مع نوع المحتوى 3 تلقائيًا.

### تفسير النتيجة

يُرجع reCAPTCHA v3 نتيجة تتراوح بين 0.0 و1.0:

| نطاق النتيجة | التفسير | العمل النموذجي |
|-------------|--------------|----------------|
| 0.7 - 1.0 | من المحتمل الإنسان | السماح بالتقديم |
| 0.3 - 0.7 | غير مؤكد | قد يتطلب التحقق الإضافي |
| 0.0 - 0.3 | بوت محتمل | تقديم الكتلة |

## التكامل مع المصادقة

يستخدم المكون 4 التحقق من reCAPTCHA قبل إرسال بيانات الاعتماد:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## متغيرات البيئة

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

يتم الوصول إلى المفتاح السري من خلال "0" من خدمة التكوين المركزية، وليس مباشرة من "1".

## توثيق التباهي

تتضمن نقطة نهاية التحقق تعليقات توضيحية شاملة لـ Swagger/JSDoc توثق جميع مخططات الطلب والاستجابة ورموز الحالة والأمثلة. يتم تقديم ذلك من خلال نظام توثيق API المدمج في القالب.

## التنشيط المشروط

| الحالة | السلوك |
|-----------|----------|
| مجموعة المفاتيح السرية | التحقق الكامل ضد Google API |
| المفتاح السري مفقود، وضع التطوير | تجاوز تلقائي مع `success: true` |
| المفتاح السري مفقود، وضع الإنتاج | إرجاع 500 خطأ |
| لم يتم تعيين مفتاح الموقع على العميل | لم يتم تحميل البرنامج النصي، يتم إرسال النماذج دون التحقق |

## معالجة الأخطاء

تعالج نقطة النهاية ثلاث فئات من الأخطاء:

1. **أخطاء العميل (400)**: الرمز المميز مفقود أو غير صالح في نص الطلب
2. **أخطاء التكوين (500)**: المفتاح السري مفقود أثناء الإنتاج
3. **أخطاء المنبع (500)**: فشل طلب Google API أو استثناءات غير متوقعة

يتم تسجيل كافة الأخطاء في وحدة تحكم الخادم وإرجاع بنية JSON متسقة مع رسالة "3" و"4".

## مرجع الملف

| ملف | الغرض |
|------|---------|
| 5 ــ | نقطة نهاية التحقق من جانب الخادم |
| 6ـ | رد فعل طفرة التحقق من الاستعلام |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | ربط التحقق التلقائي |
| 8ـ | طريقة 9 و 10 |
| `lib/config/config-service.ts` | ‹‹١٢› |
