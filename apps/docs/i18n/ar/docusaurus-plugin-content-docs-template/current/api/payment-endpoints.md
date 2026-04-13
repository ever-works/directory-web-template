---
id: payment-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات الدفع
sidebar_label: نقاط نهاية الدفع
sidebar_position: 3
---

# نقاط نهاية واجهة برمجة تطبيقات الدفع

يدعم القالب أربعة موفري خدمات دفع: **Stripe** و**Lemon Squeezy** و**Polar** و**Solidgate**. يمتلك كل مزود مجموعته الخاصة من مسارات واجهة برمجة التطبيقات (API) الخاصة بالخروج وإدارة الاشتراكات ومعالجة خطاف الويب. توفر مجموعة `/api/payment` العامة استعلامات اشتراك مستقلة عن الموفر.

## شريط (`/api/stripe`)

يعد Stripe هو التكامل الأكثر اكتمالاً للميزات مع 17 معالج مسار يغطي الخروج والاشتراكات وطرق الدفع وأغراض الإعداد والمنتجات.

### الخروج

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/stripe/checkout`|إنشاء جلسة الخروج الشريطية|

### الاشتراكات

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/stripe/subscription`|احصل على الاشتراك النشط للمستخدم الحالي|
|`POST`|`/api/stripe/subscription`|إنشاء اشتراك جديد|
|`GET`|`/api/stripe/subscriptions`|سرد كافة اشتراكات المستخدم|
|`POST`|`/api/stripe/subscription/[subscriptionId]/cancel`|إلغاء الاشتراك|
|`POST`|`/api/stripe/subscription/[subscriptionId]/reactivate`|إعادة تنشيط الاشتراك الملغى|
|`POST`|`/api/stripe/subscription/[subscriptionId]/update`|تحديث الاشتراك (تغيير الخطة)|
|`POST`|`/api/stripe/subscription/portal`|قم بإنشاء جلسة بوابة عملاء Stripe|

### طرق الدفع

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|قائمة طرق الدفع المحفوظة|
|`POST`|`/api/stripe/payment-methods/create`|أضف طريقة دفع جديدة|
|`PUT`|`/api/stripe/payment-methods/update`|تحديث طريقة الدفع الافتراضية|
|`DELETE`|`/api/stripe/payment-methods/delete`|قم بإزالة طريقة الدفع|
|`GET`|`/api/stripe/payment-methods/[id]`|احصل على تفاصيل طريقة الدفع|

### نوايا الإعداد

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/stripe/setup-intent`|قم بإنشاء نية الإعداد لحفظ طريقة الدفع|
|`GET`|`/api/stripe/setup-intent/[id]`|احصل على حالة نية الإعداد|

### نوايا الدفع

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/stripe/payment-intent`|قم بإنشاء نية الدفع لمرة واحدة|

### المنتجات

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/stripe/products`|قائمة المنتجات / الأسعار الشريطية المتاحة|

### خطاف ويب

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/stripe/webhook`|معالج أحداث خطاف الويب الشريطي|

يعالج معالج Stripe webhook أحداثًا مثل:
- `checkout.session.completed` - إكمال عملية الدفع
- `customer.subscription.created` - اشتراك جديد
- `customer.subscription.updated` - تغييرات الاشتراك
- `customer.subscription.deleted` - إلغاء الاشتراك
- `invoice.payment_succeeded` - تم الدفع بنجاح
- `invoice.payment_failed` - فشل الدفع

## عصير ليمون (`/api/lemonsqueezy`)

يوفر Lemon Squeezy نموذج اشتراك أبسط مع 7 نقاط نهاية.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|إنشاء الخروج ليمون Squeezy|
|`GET`|`/api/lemonsqueezy/list`|قائمة اشتراكات المستخدم|
|`POST`|`/api/lemonsqueezy/cancel`|إلغاء الاشتراك|
|`POST`|`/api/lemonsqueezy/reactivate`|إعادة تنشيط الاشتراك الملغى|
|`POST`|`/api/lemonsqueezy/update`|تحديث تفاصيل الاشتراك|
|`POST`|`/api/lemonsqueezy/update-plan`|تغيير خطة الاشتراك|
|`POST`|`/api/lemonsqueezy/webhook`|معالج webhook لعصر الليمون|

### أحداث الويب هوك

عمليات خطاف الويب Lemon Squeezy:
- `subscription_created` - اشتراك جديد
- `subscription_updated` - تغييرات الخطة
- `subscription_cancelled` - الإلغاء
- `subscription_payment_success` - تأكيد الدفع
- `subscription_payment_failed` - فشل الدفع

## قطبي (`/api/polar`)

يوفر Polar 5 نقاط نهاية لإدارة الدفع والاشتراك.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/polar/checkout`|إنشاء جلسة الخروج القطبية|
|`POST`|`/api/polar/subscription/[subscriptionId]/cancel`|إلغاء الاشتراك|
|`POST`|`/api/polar/subscription/[subscriptionId]/reactivate`|إعادة تنشيط الاشتراك|
|`POST`|`/api/polar/subscription/portal`|الوصول إلى بوابة الاشتراك|
|`POST`|`/api/polar/webhook`|معالج خطاف الويب القطبي|

## سوليدجايت (`/api/solidgate`)

Solidgate هو الحد الأدنى من التكامل مع نقطتي نهاية.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`POST`|`/api/solidgate/checkout`|إنشاء الخروج Solidgate|
|`POST`|`/api/solidgate/webhook`|معالج خطاف الويب Solidgate|

## الدفع العام (`/api/payment`)

نقاط نهاية الدفع غير المحددة للموفر لإدارة الاشتراكات بغض النظر عن موفر الدفع الأساسي.

|الطريقة|المسار|الوصف|
|--------|------|-------------|
|`GET`|`/api/payment/[subscriptionId]`|احصل على تفاصيل الاشتراك عن طريق المعرف|
|`GET`|`/api/payment/account`|الحصول على حساب الدفع للمستخدم الحالي|
|`GET`|`/api/payment/account/[userId]`|الحصول على حساب الدفع لمستخدم محدد (المسؤول)|

## أمان الويب

تنفذ جميع نقاط نهاية خطاف الويب التحقق من التوقيع الخاص بالموفر:

### شريط

تتحقق خطافات الويب الشريطية من رأس `stripe-signature` باستخدام متغير البيئة `STRIPE_WEBHOOK_SECRET` وطريقة `stripe.webhooks.constructEvent()`.

### عصارة ليمون

تتحقق خطافات الويب Lemon Squeezy من العنوان `x-signature` باستخدام HMAC-SHA256 مع `LEMONSQUEEZY_WEBHOOK_SECRET`.

### القطبية

تتحقق خطافات الويب القطبية من توقيعات الطلب باستخدام `POLAR_WEBHOOK_SECRET`.

### سوليدجيت

تستخدم خطافات الويب Solidgate التحقق من التوقيع المدمج في SDK الخاص بها باستخدام `SOLIDGATE_SECRET_KEY`.

## متغيرات البيئة

### شريط

|متغير|الوصف|
|----------|-------------|
|`STRIPE_SECRET_KEY`|شريط مفتاح API السري|
|`STRIPE_PUBLISHABLE_KEY`|مفتاح شريطي قابل للنشر (من جانب العميل)|
|`STRIPE_WEBHOOK_SECRET`|سر توقيع Webhook|

### عصارة ليمون

|متغير|الوصف|
|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|مفتاح Lemon Squeezy API|
|`LEMONSQUEEZY_STORE_ID`|معرف المتجر|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|سر توقيع Webhook|

### القطبية

|متغير|الوصف|
|----------|-------------|
|`POLAR_ACCESS_TOKEN`|رمز وصول Polar API|
|`POLAR_WEBHOOK_SECRET`|سر توقيع Webhook|
|`POLAR_ORGANIZATION_ID`|معرف المنظمة|

### سوليدجيت

|متغير|الوصف|
|----------|-------------|
|`SOLIDGATE_MERCHANT_ID`|معرف التاجر|
|`SOLIDGATE_SECRET_KEY`|مفتاح API السري|

## متطلبات المصادقة

|نوع نقطة النهاية|المصادقة مطلوبة|
|--------------|---------------|
|إنشاء الخروج|نعم (مستخدم مصادق عليه)|
|إدارة الاشتراك|نعم (مالك الاشتراك)|
|إدارة طريقة الدفع|نعم (عميل الشريط)|
|قائمة المنتجات|عامة (منتجات Stripe)|
|معالجات Webhook|التحقق من التوقيع (بدون جلسة)|
|استعلامات الدفع العامة|نعم (مالك الحساب أو المسؤول)|
