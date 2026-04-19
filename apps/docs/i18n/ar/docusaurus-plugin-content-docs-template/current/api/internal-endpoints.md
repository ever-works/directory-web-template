---
id: internal-endpoints
title: "نقاط النهاية الداخلية والنظام"
sidebar_label: "الداخلية والنظام"
sidebar_position: 17
---

# نقاط النهاية الداخلية والنظام

توفر نقاط النهاية هذه عمليات على مستوى النظام: تهيئة قاعدة البيانات، وتكوين علامة الميزة، وفحوصات السلامة، ومعلومات الإصدار، ومزامنة المستودع. يتم استخدام معظمها بواسطة النظام الأساسي نفسه وليس بواسطة المستخدمين النهائيين.

**الملفات المصدرية:**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## ملخص نقطة النهاية

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|احصل على|`/api/internal/db-init`|ديف فقط|تشغيل تهيئة قاعدة البيانات|
|احصل على|`/api/config/features`|لا شيء|احصل على إشارات توفر الميزة|
|احصل على|`/api/health/database`|لا شيء|فحص صحة قاعدة البيانات|
|احصل على|`/api/version`|لا شيء|الحصول على معلومات إصدار التطبيق|
|احصل على|`/api/version/sync`|لا شيء|الحصول على حالة المزامنة|
|بريد|`/api/version/sync`|لا شيء|تشغيل مزامنة المستودع اليدوي|

---

## GET `/api/internal/db-init`

Triggers automatic database migration and seeding if the database is not yet initialized.

### Security

This endpoint is **only available in development mode**. In production, it returns 403:

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Runtime Configuration

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Response: 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Response: 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## احصل على `/api/config/features`

إرجاع علامات توفر الميزات الحالية بناءً على تكوين النظام (توفر قاعدة البيانات بشكل أساسي). هذه **نقطة نهاية عامة** تستخدمها الواجهة الأمامية للتعامل مع الميزات المفقودة بأمان.

### الرد: 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### الاستجابة: 200 (لا توجد قاعدة بيانات)

عندما لا يتم تكوين قاعدة البيانات، يتم تعطيل كافة الميزات:

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### التخزين المؤقت

يتم تخزين الاستجابات الناجحة مؤقتًا لمدة 5 دقائق مع إعادة التحقق من الصلاحية:

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

تستخدم استجابات الخطأ `Cache-Control: no-cache`.

### سلوك الخطأ

في حالة حدوث خطأ، تقوم نقطة النهاية بإرجاع جميع الميزات على أنها معطلة (بحالة 500) لضمان تدهور الواجهة الأمامية بشكل جيد.

---

## GET `/api/health/database`

A lightweight health check that tests the database connection by executing `SELECT 1`.

### Response: 200 (Healthy)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Response: 500 (Unhealthy)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Use Cases

- Kubernetes/Docker liveness and readiness probes
- Monitoring dashboards
- Deployment verification scripts
- Load balancer health checks

---

## احصل على `/api/version`

يسترد معلومات الإصدار الشاملة من مستودع محتوى Git، بما في ذلك أحدث تفاصيل الالتزام ومعلومات المؤلف والفرع وحالة المزامنة.

### كيف يعمل

1. التحقق من وجود دليل Git في مسار المحتوى
2. إذا كان الدليل `.git` مفقودًا، فسيحاول المزامنة (مفيد لعمليات التشغيل الباردة على Vercel)
3. يقرأ الالتزام الأخير باستخدام `isomorphic-git`
4. إرجاع معلومات الإصدار المنسق مع رؤوس التخزين المؤقت

### الرد: 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### رؤوس الاستجابة

|رأس|القيمة|الوصف|
|--------|-------|-------------|
|`Cache-Control`|`public, max-age=60, stale-while-revalidate=300`|ذاكرة التخزين المؤقت للعميل لمدة دقيقة واحدة|
|`ETag`|`"a1b2c3d-1705312200000"`|بناءً على تجزئة الالتزام|
|`Last-Modified`|`Mon, 15 Jan 2024 10:30:00 GMT`|ارتكاب الطابع الزمني|

### ردود الأخطاء

تشتمل جميع الأخطاء على تنسيق منظم مع رمز الخطأ:

|الحالة|الكود|الحالة|
|--------|------|-----------|
| 404 |`REPOSITORY_NOT_FOUND`|دليل Git غير موجود|
| 404 |`NO_COMMITS`|المستودع ليس لديه أي التزامات|
| 500 |`GIT_ERROR`|فشل في قراءة معلومات الالتزام|
| 500 |`VALIDATION_ERROR`|بيانات الالتزام تفتقد الحقول المطلوبة|
| 500 |`INTERNAL_ERROR`|خطأ غير متوقع|

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Returns the current synchronization status including whether a sync is in progress, when the last sync occurred, and server uptime.

### Response: 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Response: 200 (Never Synced)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## نشر `/api/version/sync`

يقوم يدويًا بتشغيل مزامنة الخلفية لمستودع محتوى Git. يمنع عمليات المزامنة المتزامنة (إذا كانت المزامنة قيد التشغيل بالفعل، فإنها تُرجع النجاح برسالة إعلامية).

### هيئة الطلب

اختياري. محفوظة للاستخدام المستقبلي:

```json
{}
```

### الاستجابة: 200 (اكتملت المزامنة)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### الرد: 200 (قيد التقدم بالفعل)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### الرد: 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

تشتمل استجابات GET وPOST على `Cache-Control: no-cache, no-store, must-revalidate` لمنع حالة المزامنة التي لا معنى لها.

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/internal/db-init/route.ts` | Database initialization endpoint |
| `template/app/api/config/features/route.ts` | Feature flags endpoint |
| `template/app/api/health/database/route.ts` | Database health check |
| `template/app/api/version/route.ts` | Version info endpoint |
| `template/app/api/version/sync/route.ts` | Sync trigger and status |
| `template/lib/db/initialize.ts` | Database initialization logic |
| `template/lib/config/feature-flags.ts` | Feature flag resolution |
| `template/lib/services/sync-service.ts` | Repository sync service |
| `template/lib/lib.ts` | Content path and filesystem utilities |
