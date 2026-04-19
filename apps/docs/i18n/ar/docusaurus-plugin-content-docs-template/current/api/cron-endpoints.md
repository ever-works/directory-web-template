---
id: cron-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات Cron Job
sidebar_label: نقاط النهاية كرون
sidebar_position: 6
---

# نقاط نهاية واجهة برمجة تطبيقات Cron Job

يتضمن القالب ثلاث نقاط نهاية لمهمة cron تعمل على فترات زمنية مجدولة عبر Vercel Cron. تتعامل نقاط النهاية هذه مع مزامنة المحتوى وتذكيرات الاشتراك ومعالجة انتهاء صلاحية الاشتراك.

## تكوين كرون

يتم تعريف جداول Cron في `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## مزامنة المحتوى (`/api/cron/sync`)

|الطريقة|المسار|الجدول الزمني|الوصف|
|--------|------|----------|-------------|
|`GET`|`/api/cron/sync`|يوميًا الساعة 3:00 صباحًا بالتوقيت العالمي المنسق|مزامنة مستودع المحتوى المستند إلى Git|

### ماذا يفعل

تسحب مهمة المزامنة cron أحدث محتوى من مستودع بيانات Git الذي تم تكوينه (`DATA_REPOSITORY`) وتقوم بتحديث ذاكرة التخزين المؤقت للمحتوى المحلي. يضمن هذا أن يعكس التطبيق أي تغييرات تم إجراؤها مباشرة على مستودع المحتوى (على سبيل المثال، عبر دمج GitHub PR).

### عملية المزامنة

```
1. Verify CRON_SECRET authorization
2. Check if sync is already in progress (mutex lock)
3. Pull latest changes from remote Git repository
4. Parse and validate updated YAML content files
5. Update local content cache
6. Return sync result with duration
```

### السلوكيات الرئيسية

- **قفل Mutex**: يمكن تشغيل مزامنة واحدة فقط في كل مرة. يتم رفض الطلبات المتزامنة برسالة الحالة
- **المهلة**: عمليات المزامنة لها مهلة مدتها 5 دقائق لمنع العمليات الهاربة
- **منطق إعادة المحاولة**: أعد محاولة عمليات المزامنة الفاشلة حتى 3 مرات
- **وضع التطوير**: يمكن تعطيل المزامنة التلقائية عبر `DISABLE_AUTO_SYNC=true` متغير البيئة

### الاستجابة

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## تذكيرات الاشتراك (`/api/cron/subscription-reminders`)

|الطريقة|المسار|الجدول الزمني|الوصف|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-reminders`|يوميًا الساعة 9:00 صباحًا بالتوقيت العالمي الموحد|إرسال تذكيرات تجديد الاشتراك|

### ماذا يفعل

الاستعلام عن الاشتراكات التي تقترب من تاريخ تجديدها وإرسال تذكيرات عبر البريد الإلكتروني إلى المشتركين. ويساعد هذا في تقليل التغيير غير الطوعي عن طريق تنبيه المستخدمين قبل معالجة دفعاتهم.

### منطق التذكير

```
1. Verify CRON_SECRET authorization
2. Query subscriptions renewing within reminder window
3. Filter out already-notified subscriptions
4. Send reminder emails via email notification service
5. Mark subscriptions as notified
6. Return count of reminders sent
```

### تذكير ويندوز

نوافذ التذكير النموذجية:
- **7 أيام قبل التجديد**: التذكير الأول
- **قبل يوم واحد من التجديد**: التذكير الأخير

### الاستجابة

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## انتهاء الاشتراك (`/api/cron/subscription-expiration`)

|الطريقة|المسار|الجدول الزمني|الوصف|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-expiration`|يوميًا عند منتصف الليل بالتوقيت العالمي المنسق|معالجة الاشتراكات منتهية الصلاحية|

### ماذا يفعل

يحدد الاشتراكات بعد تاريخ انتهاء صلاحيتها ويحدث حالتها. يعالج هذا الاشتراكات التي تم إلغاؤها ولكن كان هناك وقت متبقي، بالإضافة إلى الاشتراكات التي فشل تجديدها.

### عملية انتهاء الصلاحية

```
1. Verify CRON_SECRET authorization
2. Query subscriptions with expiration date in the past
3. Update subscription status to 'expired'
4. Revoke associated access/permissions
5. Send expiration notification emails
6. Log expiration events for audit trail
7. Return count of processed expirations
```

### الاستجابة

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## وظائف الخلفية (`/api/cron/jobs`)

يقوم الملف `background-jobs-init.ts` الموجود في دليل وظائف cron بتهيئة معالجة المهام في الخلفية. يؤدي هذا إلى إعداد أي مهام متكررة تحتاج إلى التشغيل خلال وقت تشغيل التطبيق.

## الأمن

### التحقق من CRON_SECRET

تتحقق جميع نقاط النهاية cron من `CRON_SECRET` رأس أو معلمة استعلام لمنع التنفيذ غير المصرح به:

```typescript
// Typical cron authorization check
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### ترخيص فيرسيل كرون

عند نشرها على Vercel، يتم استدعاء مهام cron تلقائيًا بواسطة برنامج جدولة cron الخاص بـ Vercel باستخدام الرأس المناسب `CRON_SECRET`. تم تكوين السر في لوحة معلومات Vercel ضمن إعدادات المشروع.

|متغير البيئة|الوصف|
|---------------------|-------------|
|`CRON_SECRET`|السر المشترك لترخيص وظيفة cron|

### التنفيذ اليدوي

يمكن تشغيل نقاط نهاية Cron يدويًا لتصحيح الأخطاء عن طريق تضمين `CRON_SECRET` في رأس التفويض:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## المراقبة

### حالة المزامنة

يمكن مراقبة حالة مهمة المزامنة cron عبر:
- `/api/version/sync` - إرجاع وقت المزامنة الأخيرة والنتيجة
- سجلات الخادم - يتم تسجيل عمليات المزامنة باستخدام البادئة `[SYNC_MANAGER]`

### معالجة الأخطاء

تنفذ جميع وظائف cron معالجة شاملة للأخطاء:
- يتم تسجيل العمليات الفاشلة مع تفاصيل الخطأ الكاملة
- لا يمنع الفشل الجزئي معالجة العناصر المتبقية
- يتم تضمين أعداد الأخطاء في الاستجابة للمراقبة
- تؤدي حالات الفشل الفادحة إلى حدوث أخطاء في وحدة التحكم لتنبيهات تجميع السجل

## مرجع الجدول الزمني

|تعبير كرون|معنى|
|----------------|---------|
| `0 3 * * *` |كل يوم الساعة 3:00 صباحًا بالتوقيت العالمي المنسق|
| `0 9 * * *` |كل يوم الساعة 9:00 صباحًا بالتوقيت العالمي المنسق|
| `0 0 * * *` |كل يوم عند منتصف الليل بالتوقيت العالمي المنسق|

جميع الأوقات بالتوقيت العالمي المنسق. ضع في اعتبارك توزيع المنطقة الزمنية لقاعدة المستخدمين عند تعديل هذه الجداول.
