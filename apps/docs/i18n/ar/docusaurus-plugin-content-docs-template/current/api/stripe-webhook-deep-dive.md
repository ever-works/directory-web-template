---
id: stripe-webhook-deep-dive
title: شريط Webhook الغوص العميق
sidebar_label: خطافات الويب الشريطية
sidebar_position: 4
---

# شريط Webhook الغوص العميق

تغطي هذه الصفحة معالجة أحداث خطاف الويب والتحقق من التوقيع وأنواع الأحداث المدعومة وإشعارات البريد الإلكتروني وأنماط معالجة الأخطاء.

## نظرة عامة

تقوم نقطة نهاية خطاف الويب Stripe بمعالجة الأحداث الواردة من Stripe، والتحقق من صحتها عبر التحقق من التوقيع، وتعيينها لأنواع الأحداث الداخلية، وإرسالها إلى معالجات متخصصة. يقوم كل معالج بتحديث قاعدة البيانات عبر `WebhookSubscriptionService` ويرسل رسائل البريد الإلكتروني الخاصة بالمعاملات.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/stripe/webhook`|توقيع الشريط|معالجة أحداث خطاف الويب Stripe الواردة|

## التحقق من التوقيع

يجب أن يتضمن كل خطاف ويب وارد رأس `stripe-signature`. يتحقق الموفر من ذلك باستخدام طريقة Stripe `constructEvent`:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

إذا كان التوقيع مفقودًا، فسترجع نقطة النهاية `400`:

```json
{ "error": "No signature provided" }
```

إذا كان التوقيع غير صالح، فسيتم استدعاء `constructEvent` وترجع نقطة النهاية:

```json
{ "error": "Webhook processing failed" }
```

## تعيين نوع الحدث

يتم تعيين أنواع أحداث الشريط إلى قيم `WebhookEventType` الداخلية:

|حدث الشريط|النوع الداخلي|معالج|
|-------------|---------------|---------|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|`handleSubscriptionCreated`|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|`handleSubscriptionUpdated`|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|`handleSubscriptionCancelled`|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`handleSubscriptionPaymentSucceeded`|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|`handleSubscriptionPaymentFailed`|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|`handlePaymentSucceeded`|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|`handlePaymentFailed`|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|`handleSubscriptionTrialEnding`|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|مسجل فقط|

## تدفق معالجة Webhook

```
Stripe sends POST -> Read raw body -> Extract stripe-signature header
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (signature verification)
    -> Map event type to internal type
    -> Return { received: true, type, id, data }
  -> Switch on webhookResult.type
    -> Call appropriate handler
    -> Handler updates DB + sends email
  -> Return { received: true }
```

## معالجات الأحداث

### تم إنشاء الاشتراك

يعالج إنشاء الاشتراك الجديد:

1. التحقق مما إذا كان الاشتراك إعلانًا راعيًا (معاملة خاصة)
2. يستدعي `webhookSubscriptionService.handleSubscriptionCreated(data)` لتحديث قاعدة البيانات
3. مقتطفات من معلومات الخطة (الاسم والمبلغ وفترة الفاتورة)
4. يرسل بريدًا إلكترونيًا ترحيبيًا يتضمن تفاصيل الاشتراك وميزاته

### تم تحديث الاشتراك

يتعامل مع تغييرات الاشتراك (ترقيات الخطة، والتخفيضات، وما إلى ذلك):

1. تحديث قاعدة البيانات عبر `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. مقتطفات معلومات الخطة المحدثة
3. يرسل بريدًا إلكترونيًا لإشعار التحديث

### تم إلغاء الاشتراك

يتعامل مع إلغاء الاشتراك:

1. الشيكات لاشتراكات الإعلانات الراعي
2. تحديث قاعدة البيانات عبر `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. يرسل بريدًا إلكترونيًا للإلغاء يتضمن سبب الإلغاء وعنوان URL لإعادة التنشيط

### تم الدفع بنجاح (مرة واحدة)

يتعامل مع الدفعات الناجحة لمرة واحدة:

1. يستخرج معلومات العميل وتفاصيل الدفع
2. تنسيق المبلغ وطريقة الدفع
3. يرسل رسالة تأكيد الدفع عبر البريد الإلكتروني مع عنوان URL للإيصال

### فشل الدفع

معالجة الدفعات الفاشلة لمرة واحدة:

1. استخراج معلومات الخطأ من `last_payment_error`
2. إنشاء عناوين URL لتحديث طريقة إعادة المحاولة والدفع
3. يرسل بريدًا إلكترونيًا لإشعار فشل الدفع

### تم دفع الاشتراك بنجاح

يتعامل مع دفعات الاشتراك المتكررة الناجحة:

1. تحديث قاعدة البيانات عبر `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. يستخرج تفاصيل الفاتورة والاشتراك
3. يرسل إيصال دفع الاشتراك عبر البريد الإلكتروني

### فشل دفع الاشتراك

يعالج دفعات الاشتراك المتكررة الفاشلة:

1. تحديث قاعدة البيانات عبر `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. يرسل إشعار فشل مع إعادة المحاولة وعناوين URL لتحديث الدفع

### نهاية المحاكمة

يتعامل مع إشعارات انتهاء النسخة التجريبية لمدة 3 أيام من Stripe:

1. تحديث قاعدة البيانات عبر `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. يرسل بريدًا إلكترونيًا للتذكير بانتهاء الفترة التجريبية

## إشعارات البريد الإلكتروني

يستخدم كل معالج `paymentEmailService` لإرسال رسائل البريد الإلكتروني الخاصة بالمعاملات. يتم تحميل تكوين البريد الإلكتروني بشكل آمن عبر `getEmailConfig()`:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

|حدث|قالب البريد الإلكتروني|
|-------|---------------|
|تم إنشاء الاشتراك|`sendNewSubscriptionEmail`|
|تم تحديث الاشتراك|`sendUpdatedSubscriptionEmail`|
|تم إلغاء الاشتراك|`sendCancelledSubscriptionEmail`|
|نجح الدفع|`sendPaymentSuccessEmail`|
|فشل الدفع|`sendPaymentFailedEmail`|
|نجاح دفع الاشتراك|`sendSubscriptionPaymentSuccessEmail`|
|فشل دفع الاشتراك|`sendSubscriptionPaymentFailedEmail`|
|انتهاء المحاكمة|`sendUpdatedSubscriptionEmail`|

## التعامل مع إعلانات الراعي

يتضمن خطاف الويب معالجة خاصة لاشتراكات إعلانات الجهة الراعية. يتم تحديدها عن طريق التحقق من البيانات الوصفية:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

تؤدي أحداث إعلانات الجهة الراعية إلى:
- **التنشيط**: يؤكد الدفع ويضبط الإعلان على مراجعة المشرف المعلقة
- **الإلغاء**: إلغاء تنشيط إعلان الراعي
- **التجديد**: لتمديد تاريخ انتهاء إعلان الراعي

## ميزات الخطة

تقوم الوظيفة `getSubscriptionFeatures` بتعيين أسماء الخطط لقوائم الميزات المستخدمة في رسائل البريد الإلكتروني الترحيبية:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## معالجة الأخطاء

تتبع نقطة نهاية خطاف الويب نمطًا مرنًا:

- يتم تضمين كل معالج فردي في كتلة المحاولة/الالتقاط الخاصة به
- يتم تسجيل حالات فشل المعالج ولكنها لا تتسبب في قيام خطاف الويب بإرجاع خطأ
- تكتشف عملية المحاولة/الالتقاط الخارجية أخطاء التحقق من التوقيع والتحليل
- إرجاع `400` لجميع حالات الفشل على مستوى خطاف الويب لإخبار Stripe بعدم إعادة المحاولة عند حدوث أخطاء دائمة

```typescript
try {
  // ... signature verification and event dispatch
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|نعم|شريط مفتاح API السري|
|`STRIPE_WEBHOOK_SECRET`|نعم|سر توقيع Webhook (من Stripe Dashboard)|

لتكوين خطاف الويب في Stripe Dashboard:

1. انتقل إلى المطورين > Webhooks
2. إضافة عنوان URL لنقطة النهاية: `https://yourdomain.com/api/stripe/webhook`
3. حدد الأحداث المدرجة في جدول تعيين الأحداث أعلاه
4. انسخ سر التوقيع إلى `STRIPE_WEBHOOK_SECRET`

## الاعتبارات الأمنية

- التحقق من التوقيع إلزامي. يتم رفض الطلبات التي لا تحتوي على توقيعات صالحة
- يتم استخدام نص الطلب الأولي للتحقق من التوقيع (وليس تحليل JSON)
- لا ينبغي أبدًا الالتزام بأسرار Webhook بالتحكم في الإصدار
- لا تتطلب نقطة النهاية مصادقة الجلسة (يستدعيها Stripe مباشرة)
- يتم تطهير البيانات الحساسة في رسائل الخطأ لبيئات الإنتاج

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [الغوص العميق لاشتراك Stripe](./stripe-subscription-deep-dive.md)
- [التعمق في طرق الدفع الشريطية](./stripe- Payment-methods-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
