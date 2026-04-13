---
id: user-endpoints
title: نقاط نهاية المستخدم
sidebar_label: المستخدم
sidebar_position: 21
---

# نقاط نهاية المستخدم

توفر واجهة برمجة تطبيقات المستخدم نقاط نهاية لإدارة تفضيلات المستخدم المصادق عليها وتفاصيل الاشتراك وسجل الدفع وإعدادات موقع الملف الشخصي. تتطلب كافة نقاط النهاية المصادقة المستندة إلى الجلسة.

## نظرة عامة

|نقطة النهاية|الطريقة|مصادقة|الوصف|
|---|---|---|---|
|`/api/user/currency`|احصل على|عام|كشف عملة المستخدم من الرؤوس|
|`/api/user/currency`|وضع|المستخدم|تحديث تفضيلات العملة|
|`/api/user/payments`|احصل على|المستخدم|احصل على سجل الدفع من Stripe|
|`/api/user/plan-status`|احصل على|المستخدم|احصل على حالة الخطة مع معلومات انتهاء الصلاحية|
|`/api/user/subscription`|احصل على|المستخدم|الحصول على تفاصيل الاشتراك|
|`/api/user/profile/location`|احصل على|المستخدم|الحصول على إعدادات الموقع المحفوظة|
|`/api/user/profile/location`|التصحيح|المستخدم|تحديث إعدادات الموقع|

## كشف العملة والتفضيلات

### كشف العملة

```
GET /api/user/currency
```

يكتشف عملة المستخدم بناءً على رؤوس HTTP من موفري CDN/الوكيل. تستخدم نقطة النهاية هذه تدهورًا سلسًا - فهي تُرجع دائمًا 200 موافق مع رمز عملة صالح، وتعود إلى الدولار الأمريكي في حالة فشل الاكتشاف. لا يلزم المصادقة.

**معلمات الاستعلام:**

|المعلمة|اكتب|الافتراضي|الوصف|
|---|---|---|---|
|`provider`|سلسلة|`"smart"`|مزود الكشف: `"cloudflare"`، `"vercel"`، `"cloudfront"`، `"fastly"`، `"generic"`، `"auto"`، `"smart"`|

**رد النجاح (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

|الميدان|اكتب|الوصف|
|---|---|---|
|`currency`|سلسلة|رمز العملة ISO 4217 (3 أحرف)، الافتراضي هو `"USD"`|
|`country`|سلسلة أو فارغة|رمز البلد ISO 3166-1 alpha-2، يكون فارغًا في حالة فشل الاكتشاف|
|`detected`|منطقية|ما إذا كان الكشف قد نجح أم أن القيمة هي خيار احتياطي|

عند فشل الكشف، ستظل الاستجابة ترجع 200 مع `"USD"` و`detected: false`.

**المصدر:** `template/app/api/user/currency/route.ts`

### تحديث تفضيلات العملة

```
PUT /api/user/currency
```

يقوم بتحديث العملة والبلد المفضلين للمستخدم المصادق عليه. تم التحقق من صحتها باستخدام Zod مع قائمة `SUPPORTED_CURRENCIES` من `lib/config/billing`.

**المصادقة:** مطلوب

**نص الطلب:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|---|---|---|---|
|`currency`|سلسلة|نعم|رمز العملة ISO 4217 (3 أحرف بالضبط، أحرف كبيرة)|
|`country`|سلسلة أو فارغة|لا|رمز البلد ISO 3166-1 alpha-2 (حرفين بالضبط)|

**رد النجاح (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

|الحالة|الحالة|
|---|---|
| 400 |JSON غير صالح، أو رمز العملة غير مدعوم، أو تنسيق البلد غير صالح|
| 401 |لم تتم مصادقة المستخدم|
| 500 |فشل في الاستمرار في التحديث|

**المصدر:** `template/app/api/user/currency/route.ts`

## تاريخ الدفع

### احصل على سجل الدفع

```
GET /api/user/payments
```

يسترد سجل الدفع الكامل للمستخدم المصادق عليه من Stripe. جلب الفواتير والاشتراكات، وإثرائها بالبيانات التعريفية للخطة، وإرجاع قائمة مرتبة من سجلات الدفع.

**المصادقة:** مطلوب

**رد النجاح (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

تفاصيل المعالجة الرئيسية:

- يقوم بالتصفية فقط لفواتير `"paid"` و`"open"`
- تحويل المبالغ من السنتات إلى وحدات العملة الرئيسية (القسمة على 100)
- فرز حسب التاريخ، الأحدث أولاً
- حالة الخرائط إلى القيم التي يمكن للإنسان قراءتها: `"Paid"`، `"Pending"`، `"Draft"`، `"Unknown"`
- يُرجع مصفوفة فارغة `[]` في حالة عدم وجود عميل Stripe

**المصدر:** `template/app/api/user/payments/route.ts`

## حالة الخطة

### احصل على حالة الخطة

```
GET /api/user/plan-status
```

إرجاع معلومات حالة الخطة الشاملة بما في ذلك تفاصيل انتهاء الصلاحية. يتم استخدامه بواسطة الواجهة الأمامية لعرض تحذيرات الخطة وميزات البوابة خلف عمليات فحص الخطة.

**المصادقة:** مطلوب

**رد النجاح (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

|الميدان|اكتب|الوصف|
|---|---|---|
|`planId`|سلسلة|خطة المستخدم المشتركة: `"free"`، `"standard"`، `"premium"`|
|`effectivePlan`|سلسلة|الخطة التي يمكن للمستخدم الوصول إليها فعليًا (قد تختلف إذا انتهت صلاحيتها)|
|`isExpired`|منطقية|ما إذا كان الاشتراك قد انتهت صلاحيته|
|`expiresAt`|سلسلة أو فارغة|تاريخ انتهاء الصلاحية بتنسيق ISO|
|`daysUntilExpiration`|عدد صحيح أو فارغ|الأيام المتبقية على انتهاء الصلاحية (سلبية إذا انتهت صلاحيتها بالفعل)|
|`isInWarningPeriod`|منطقية|صحيح إذا انتهى الاشتراك خلال 7 أيام|
|`canAccessPlanFeatures`|منطقية|ما إذا كان يمكن للمستخدم الوصول إلى ميزات خطته|
|`warningMessage`|سلسلة أو فارغة|رسالة تحذيرية تواجه المستخدم إن أمكن|
|`status`|سلسلة أو فارغة|حالة الاشتراك الخام|

يستخدم `subscriptionService.getUserPlanWithExpiration()` من `lib/services/subscription.service`.

**المصدر:** `template/app/api/user/plan-status/route.ts`

## تفاصيل الاشتراك

### الحصول على حالة الاشتراك

```
GET /api/user/subscription
```

يسترد معلومات الاشتراك التفصيلية من Stripe بما في ذلك الاشتراك النشط الحالي وسجل الاشتراك الكامل.

**المصادقة:** مطلوب

**استجابة النجاح (200)--الاشتراك النشط:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

يتم تحديد الاشتراكات النشطة بواسطة `status === "active"` أو `status === "trialing"`. قد تتضمن إدخالات السجل `cancelledAt` و`cancelReason` للاشتراكات الملغاة.

**المصدر:** `template/app/api/user/subscription/route.ts`

## موقع الملف الشخصي

### احصل على إعدادات الموقع

```
GET /api/user/profile/location
```

إرجاع الموقع الافتراضي المحفوظ وتفضيلات الخصوصية للمستخدم الذي تمت مصادقته.

**المصادقة:** مطلوب (ملف تعريف العميل)

**رد النجاح (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**المصدر:** `template/app/api/user/profile/location/route.ts`

### تحديث إعدادات الموقع

```
PATCH /api/user/profile/location
```

يقوم بتحديث الموقع الافتراضي للمستخدم الذي تمت مصادقته وتفضيلات الخصوصية. تم التحقق من صحته باستخدام `updateLocationSchema` من `lib/validations/user-location`.

**نص الطلب:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|---|---|---|---|
|`defaultLatitude`|رقم أو فارغة|لا|إحداثيات خط العرض|
|`defaultLongitude`|رقم أو فارغة|لا|إحداثيات خط الطول|
|`defaultCity`|سلسلة أو فارغة|لا|اسم المدينة|
|`defaultCountry`|سلسلة أو فارغة|لا|رمز البلد|
|`locationPrivacy`|سلسلة|لا|مستوى الخصوصية: `"private"`، `"city"`، `"exact"`|

ويجب توفير كل من خط العرض وخط الطول معًا.

**المصدر:** `template/app/api/user/profile/location/route.ts`
