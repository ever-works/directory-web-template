---
id: recaptcha-endpoints
title: "مرجع واجهة برمجة تطبيقات ReCAPTCHA"
sidebar_label: "اختبار كابتشا"
sidebar_position: 57
---

# مرجع واجهة برمجة تطبيقات ReCAPTCHA

## نظرة عامة

توفر نقطة نهاية ReCAPTCHA التحقق من جانب الخادم لرموز Google ReCAPTCHA v3 المميزة. وهو يعمل بمثابة وكيل آمن بين العميل وواجهة برمجة تطبيقات التحقق من Google، مع الاحتفاظ بالمفتاح السري من جانب الخادم. في وضع التطوير، يمكن تجاوز التحقق عندما لا يتم تكوين المفتاح السري.

## نقاط النهاية

### POST /api/verify-recaptcha

التحقق من رمز Google ReCAPTCHA v3 من خلال الاتصال بنقطة نهاية واجهة برمجة التطبيقات `siteverify` الخاصة بـ Google. إرجاع نتيجة التحقق بما في ذلك نتيجة الروبوت/الإنسان.

**طلب**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

** الرد **
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**مثال**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### سلوك وضع التطوير

عندما لا يتم تكوين `RECAPTCHA_SECRET_KEY` ويكون `NODE_ENV` هو `"development"`، تتجاوز نقطة النهاية التحقق من Google وترجع:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

يتم تسجيل تحذير على وحدة التحكم يشير إلى أنه تم تجاوز عملية التحقق.

## المصادقة

نقطة النهاية هذه **عامة** -- لا يلزم المصادقة. لقد تم تصميمه ليتم استدعاؤه من تدفقات تقديم النماذج من جانب العميل قبل أو أثناء معالجة النموذج.

## ردود الأخطاء

|الحالة|الوصف|
|--------|-------------|
| 400 |مفقود أو فارغ `token` في نص الطلب|
| 500 |لم يتم تكوين `RECAPTCHA_SECRET_KEY` (الإنتاج فقط)، أو فشل طلب Google API، أو حدث خطأ غير متوقع في وقت التشغيل|

## الحد من المعدل

لا يتم تطبيق أي قيود على معدل مستوى التطبيق. لدى ReCAPTCHA API من Google حدود المعدلات الخاصة بها. تستخدم نقطة النهاية تنسيق `application/x-www-form-urlencoded` عند الاتصال بواجهة برمجة تطبيقات Google.

## نقاط النهاية ذات الصلة

هذه نقطة نهاية أمنية مستقلة. يتم استدعاؤه عادةً قبل تقديم النماذج أو الإجراءات الحساسة خلال التطبيق.
