---
id: webhook-api-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات Webhook
sidebar_label: خطافات الويب
sidebar_position: 27
---

# نقاط نهاية واجهة برمجة تطبيقات Webhook

يدعم القالب معالجات خطاف الدفع عبر الويب لأربعة موفرين: Stripe وLemonSqueezy وPolar وSolidgate. تقوم كل نقطة نهاية لخطاف الويب بمعالجة الأحداث الواردة من مزود الدفع الخاص بها، والتعامل مع إدارة دورة حياة الاشتراك، وإشعارات الدفع، وتسليم البريد الإلكتروني. تتحقق جميع نقاط النهاية من توقيعات الطلب للأمان.

## نظرة عامة

|نقطة النهاية|مزود|رأس التوقيع|الوصف|
|---|---|---|---|
|`/api/stripe/webhook`|شريط|`stripe-signature`|معالجة أحداث الدفع والاشتراك في Stripe|
|`/api/lemonsqueezy/webhook`|ليمونسكويزي|`x-signature`|معالجة أحداث الدفع LemonSqueezy|
|`/api/polar/webhook`|القطبية|`webhook-signature`|معالجة أحداث الدفع القطبية|
|`/api/solidgate/webhook`|سوليدجيت|`x-signature`|معالجة أحداث الدفع Solidgate|

تقبل جميع نقاط نهاية خطاف الويب طلبات POST فقط وترجع `{"received": true}` عند النجاح.

## العمارة المشتركة

تتبع جميع معالجات webhook الأربعة نفس النمط العام:

1. قراءة نص الطلب الأولي كنص (مطلوب للتحقق من التوقيع)
2. استخراج التوقيع من الرؤوس الخاصة بالموفر
3. قم بتمرير النص والتوقيع إلى طريقة `handleWebhook()` الخاصة بالموفر للتحقق والتحليل
4. قم بتوجيه الحدث الذي تم تحليله إلى المعالج المناسب استنادًا إلى `WebhookEventType`
5. تنفيذ منطق الأعمال (تحديثات قاعدة البيانات وإشعارات البريد الإلكتروني)
6. ارجع `{"received": true}` للإقرار بخطاف الويب

### أنواع الأحداث الشائعة

يقوم التعداد `WebhookEventType` من `lib/payment/types/payment-types` بتوحيد الأحداث عبر الموفرين:

|نوع الحدث|الوصف|
|---|---|
|`SUBSCRIPTION_CREATED`|تم تفعيل الاشتراك الجديد|
|`SUBSCRIPTION_UPDATED`|تم تغيير خطة الاشتراك أو التفاصيل|
|`SUBSCRIPTION_CANCELLED`|تم إلغاء الاشتراك|
|`PAYMENT_SUCCEEDED`|اكتمل الدفع لمرة واحدة|
|`PAYMENT_FAILED`|فشلت محاولة الدفع|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|اكتمل دفع الاشتراك المتكرر|
|`SUBSCRIPTION_PAYMENT_FAILED`|فشل دفع الاشتراك المتكرر|
|`SUBSCRIPTION_TRIAL_ENDING`|الفترة التجريبية على وشك الانتهاء|
|`REFUND_SUCCEEDED`|تمت معالجة عملية رد الأموال|
|`BILLING_PORTAL_SESSION_UPDATED`|تم تغيير جلسة بوابة الفوترة (Stripe فقط)|

## شريط ويب هوك

```
POST /api/stripe/webhook
```

يعالج أحداث خطاف الويب Stripe مع التحقق من التوقيع عبر رأس `stripe-signature`. هذا هو معالج خطاف الويب الأكثر اكتمالاً من حيث الميزات، بما في ذلك إشعارات البريد الإلكتروني لجميع أنواع الأحداث ومعالجة اشتراكات الإعلانات الراعية.

**العنوان المطلوب:**

|رأس|الوصف|
|---|---|
|`stripe-signature`|توقيع خطاف الويب الشريطي (تنسيق `t=...,v1=...`)|

** الأحداث المدعومة: **

|حدث الشريط|النوع المعين|الإجراءات|
|---|---|---|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|تحديث قاعدة البيانات، بريد إلكتروني ترحيبي|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|تحديث قاعدة البيانات، تحديث البريد الإلكتروني|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|تحديث قاعدة البيانات، البريد الإلكتروني للإلغاء|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|تحديث قاعدة البيانات، استلام البريد الإلكتروني|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|تحديث قاعدة البيانات، أعد محاولة البريد الإلكتروني|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|تأكيد البريد الإلكتروني|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|البريد الإلكتروني للإخطار بالفشل|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|انتهاء النسخة التجريبية من البريد الإلكتروني|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|التسجيل فقط|

** التعامل مع إعلانات الراعي: **

تكتشف خطافات الويب الشريطية اشتراكات إعلانات الجهات الراعية عبر `metadata.type === "sponsor_ad"` في بيانات الاشتراك. عند اكتشافها، تقوم معالجات مخصصة بتنشيط أو إلغاء أو تجديد إعلانات الجهات الراعية بدلاً من معالجة الاشتراكات العادية.

** ردود الأخطاء: **

|الحالة|الحالة|
|---|---|
| 400 |رأس `stripe-signature` مفقود|
| 400 |لم تتم معالجة الرد التلقائي على الويب (توقيع غير صالح)|
| 400 |فشلت معالجة الرد التلقائي على الويب|

**المصدر:** `template/app/api/stripe/webhook/route.ts`

## LemonSqueezy Webhook

```
POST /api/lemonsqueezy/webhook
```

يعالج أحداث خطاف الويب LemonSqueezy مع التحقق من التوقيع عبر رأس `x-signature`. يستخدم وظيفة تعيين الأحداث لترجمة أسماء الأحداث الخاصة بـ LemonSqueezy إلى `WebhookEventType` العامة.

**العنوان المطلوب:**

|رأس|الوصف|
|---|---|
|`x-signature`|توقيع الويب هوك LemonSqueezy|

**تخطيط الأحداث:**

|حدث ليمونسكويزي|النوع المعين|
|---|---|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

** التعامل مع إعلانات الراعي: **

يستخدم LemonSqueezy `custom_data.type === "sponsor_ad"` أو `meta.custom_data.type === "sponsor_ad"` لتحديد اشتراكات الإعلانات الراعية.

**المصدر:** `template/app/api/lemonsqueezy/webhook/route.ts`

## خطاف الويب القطبي

```
POST /api/polar/webhook
```

يعالج أحداث Polar webhook من خلال التحقق من التوقيع متعدد الرؤوس. يستخدم Polar ثلاثة رؤوس للتحقق من الأمان ويقوم بتفويض توجيه الأحداث إلى وحدة توجيه منفصلة.

** العناوين المطلوبة: **

|رأس|الوصف|
|---|---|
|`webhook-signature`|توقيع HMAC SHA256 (تنسيق `v1,<hex_signature>`)|
|`webhook-timestamp`|الطابع الزمني لنظام Unix لحدث webhook|
|`webhook-id`|المعرف الفريد لتسليم الرد التلقائي على الويب|

** الأحداث المدعومة: **

|الحدث القطبي|الوصف|
|---|---|
|`checkout.succeeded`|اكتمل الخروج|
|`checkout.failed`|فشل الخروج|
|`subscription.created`|تم إنشاء الاشتراك|
|`subscription.updated`|تم تحديث الاشتراك|
|`subscription.canceled`|تم إلغاء الاشتراك|
|`invoice.paid`|اكتمل دفع الفاتورة|
|`invoice.payment_failed`|فشل دفع الفاتورة|

** المعالجة: **

على عكس الموفرين الآخرين، يستخدم معالج خطاف الويب الخاص بـ Polar وظيفة `routeWebhookEvent()` منفصلة من وحدة `router` وأداة مساعدة `validateWebhookPayload()` للتحقق من صحة بنية الحمولة قبل التحقق من التوقيع.

**المصدر:** `template/app/api/polar/webhook/route.ts`

## سوليدجيت ويب هوك

```
POST /api/solidgate/webhook
```

يعالج أحداث Solidgate webhook مع التحقق من التوقيع. يتضمن حماية من العجز في الذاكرة لمنع المعالجة المكررة لنفس حدث webhook.

**العنوان المطلوب:**

|رأس|الوصف|
|---|---|
|`x-signature` أو `solidgate-signature`|توقيع Solidgate Webhook|

**العجز:**

يحتفظ المعالج بذاكرة `Set` لمعرفات خطاف الويب المعالجة. تقوم خطافات الويب المكررة بإرجاع `{"received": true}` دون إعادة المعالجة. تنتهي معرفات Webhook من ذاكرة التخزين المؤقت بعد 24 ساعة.

**ملاحظة:** لا تستمر ذاكرة التخزين المؤقت في الذاكرة عبر استدعاءات الوظائف بدون خادم. في بيئات الإنتاج التي لا تحتوي على خادم، يجب استبدال ذلك بـ Redis أو حل مدعوم بقاعدة البيانات.

** الأحداث المدعومة: **

يقبل المعالج كلاً من الثوابت العامة `WebhookEventType` وأسماء الأحداث المستندة إلى السلسلة (على سبيل المثال، `WebhookEventType.PAYMENT_SUCCEEDED` و`"payment_succeeded"`).

|حدث|الإجراءات|
|---|---|
|`payment_succeeded`|سجل الدفع|
|`payment_failed`|سجل الفشل|
|`subscription_created`|إنشاء الاشتراك|
|`subscription_updated`|تحديث الاشتراك|
|`subscription_cancelled`|إلغاء الاشتراك|
|`subscription_payment_succeeded`|تسجيل دفع الاشتراك|
|`subscription_payment_failed`|سجل فشل دفع الاشتراك|
|`subscription_trial_ending`|التعامل مع نهاية المحاكمة|
|`refund_processed`|سجل استرداد|

**الحصول على نقطة النهاية:**

يكشف Solidgate أيضًا عن معالج GET الذي يُرجع رسالة إعلامية حول نقطة نهاية webhook:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**المصدر:** `template/app/api/solidgate/webhook/route.ts`

## إشعارات البريد الإلكتروني

يرسل معالج Stripe webhook إشعارات البريد الإلكتروني الأكثر شمولاً. يقوم جميع الموفرين بتفويض `WebhookSubscriptionService` لعمليات قاعدة البيانات، لكن قوالب البريد الإلكتروني تختلف حسب الموفر.

|نوع البريد الإلكتروني|الزناد|
|---|---|
|مرحبا / اشتراك جديد|تم إنشاء الاشتراك|
|تحديث الاشتراك|تغيرت خطة الاشتراك|
|تأكيد الإلغاء|تم إلغاء الاشتراك|
|إيصال الدفع|نجح الاشتراك أو الدفع لمرة واحدة|
|فشل الدفع / أعد المحاولة|فشلت محاولة الدفع|
|نهاية المحاكمة|الفترة التجريبية على وشك الانتهاء|

يتم تحميل تكوين البريد الإلكتروني من `lib/config/server-config` عبر `getEmailConfig()` ويتضمن اسم الشركة وعنوان URL للشركة وعنوان البريد الإلكتروني للدعم.

## تفاصيل التنفيذ الرئيسية

- **التحقق من التوقيع:** يتحقق جميع مقدمي الخدمة من التوقيعات على الويب قبل معالجة الأحداث. التوقيعات غير الصالحة تؤدي إلى 400 استجابة.
- **تحليل النص الأولي:** تقوم خطافات الويب بقراءة نص الطلب كنص باستخدام `request.text()` بدلاً من `request.json()` لأن التحقق من التوقيع يتطلب الحمولة الأولية غير المعدلة.
- **WebhookSubscriptionService:** تعالج فئة `WebhookSubscriptionService` المشتركة عمليات قاعدة البيانات لأحداث دورة حياة الاشتراك عبر جميع الموفرين.
- ** اكتشاف إعلانات الجهات الراعية: ** تكتشف خطافات الويب Stripe و LemonSqueezy اشتراكات إعلانات الجهات الراعية عبر البيانات الوصفية وتوجيهها إلى معالجات منفصلة لتنشيط الإعلانات وإلغائها وتجديدها.
- **معالجة الأخطاء بطريقة أنيقة:** يتم اكتشاف حالات فشل إرسال البريد الإلكتروني وتسجيلها، ولكنها لا تتسبب في قيام خطاف الويب بإرجاع خطأ. يقوم خطاف الويب دائمًا بتأكيد الاستلام لمنع إعادة محاولة الموفر.
