---
id: version-sync-endpoints
title: "مرجع واجهة برمجة التطبيقات للإصدار والمزامنة"
sidebar_label: "الإصدار والمزامنة"
sidebar_position: 58
---

# مرجع واجهة برمجة التطبيقات للإصدار والمزامنة

## نظرة عامة

توفر نقاط نهاية الإصدار والمزامنة إمكانية الوصول إلى معلومات إصدار محتوى التطبيق وعناصر التحكم في مزامنة المستودع. تقرأ نقطة نهاية الإصدار بيانات تعريف Git من مستودع المحتوى، بينما تسمح نقاط نهاية المزامنة بتشغيل ومراقبة عمليات مزامنة مستودع الخلفية.

## نقاط النهاية

### الحصول على /api/version

يسترد معلومات الإصدار الشاملة من مستودع محتوى Git، بما في ذلك أحدث تفاصيل الالتزام والمؤلف والفرع والطابع الزمني للمزامنة. يحاول تلقائيًا مزامنة المستودع إذا لم يتم العثور على دليل Git (مفيد لعمليات التشغيل الباردة في Vercel).

**طلب**

لا توجد معلمات مطلوبة.

** الرد **
```typescript
{
  commit: string;       // Short commit hash (7 characters), e.g. "a1b2c3d"
  date: string;         // Commit date in ISO 8601 format
  message: string;      // Commit message
  author: string;       // Commit author name
  repository: string;   // DATA_REPOSITORY URL or "unknown"
  lastSync: string;     // Current timestamp (ISO 8601) indicating when this info was fetched
  branch?: string;      // Current Git branch (defaults to "main")
}
```

**رؤوس الاستجابة**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**مثال**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

تشغيل مزامنة الخلفية اليدوية لمستودع محتوى Git. يمنع عمليات المزامنة المتزامنة - إذا كانت المزامنة جارية بالفعل، فسيتم إرجاعها على الفور مع رسالة حالة.

**طلب**
```typescript
{
  options?: object;   // Reserved for future use (optional)
}
```

نص الطلب اختياري تمامًا.

** الرد **
```typescript
// Successful sync
{
  success: true;
  timestamp: string;    // ISO 8601 completion timestamp
  duration: number;     // Operation duration in milliseconds
  message: string;      // e.g. "Repository synchronized successfully"
  details?: string;     // e.g. "Updated 5 files, 3 commits ahead"
}

// Sync already in progress
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Sync failed (status 500)
{
  success: false;
  error: string;        // e.g. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // e.g. "Git fetch failed: network timeout"
}
```

**مثال**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Sync completed in ${result.duration}ms: ${result.message}`);
```

### الحصول على /api/version/sync

إرجاع حالة المزامنة الحالية بما في ذلك ما إذا كانت المزامنة قيد التشغيل، ومتى حدثت آخر مزامنة، ووقت تشغيل الخادم.

**طلب**

لا توجد معلمات مطلوبة.

** الرد **
```typescript
{
  syncInProgress: boolean;              // Whether a sync operation is currently running
  lastSyncTime: string | null;          // ISO 8601 timestamp of last successful sync
  timeSinceLastSync: number | null;     // Milliseconds since last sync
  timeSinceLastSyncHuman: string;       // Human-readable, e.g. "300s ago" or "never"
  uptime: number;                       // Server uptime in seconds
  timestamp: string;                    // Current server timestamp (ISO 8601)
}
```

**مثال**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('Sync is currently running...');
} else {
  console.log(`Last synced: ${status.timeSinceLastSyncHuman}`);
}
```

## المصادقة

جميع نقاط نهاية الإصدار والمزامنة **عامة** -- لا يلزم المصادقة. تم تصميم نقاط النهاية هذه لمراقبة لوحات المعلومات والأدوات الإدارية.

## ردود الأخطاء

### الحصول على /api/version

|الحالة|الكود|الوصف|
|--------|------|-------------|
| 404 |`REPOSITORY_NOT_FOUND`|لم يتم العثور على دليل Git لمستودع المحتوى|
| 404 |`NO_COMMITS`|المستودع موجود ولكنه لا يحتوي على أي التزامات|
| 500 |`GIT_ERROR`|فشل في قراءة سجل Git أو معلومات الالتزام|
| 500 |`VALIDATION_ERROR`|بيانات الالتزام تفتقد الحقول المطلوبة|
| 500 |`INTERNAL_ERROR`|خطأ غير متوقع في وقت التشغيل|

تتضمن استجابات الأخطاء نصًا منظمًا يحتوي على `error`، و`code`، و`timestamp`، وحقول `details` الاختيارية.

### POST /api/version/sync

|الحالة|الوصف|
|--------|-------------|
| 200 |اكتملت المزامنة بنجاح أو كانت قيد التقدم بالفعل|
| 500 |فشلت عملية المزامنة (بما في ذلك المدة وتفاصيل الخطأ)|

## الحد من المعدل

- **الحصول على /api/version**: تم تخزينه مؤقتًا لمدة دقيقة واحدة من جانب العميل مع إعادة التحقق من الصلاحية لمدة 5 دقائق. يتضمن رؤوس ETag وLast-Modified للطلبات المشروطة.
- **الحصول على /api/version/sync** و **POST /api/version/sync**: لا يوجد تخزين مؤقت (`Cache-Control: no-cache, no-store, must-revalidate`). يضمن منع المزامنة المتزامنة تشغيل مزامنة واحدة فقط في كل مرة.

## نقاط النهاية ذات الصلة

- [نقاط النهاية الصحية](./health-endpoints) - التحقق من صحة اتصال قاعدة البيانات
- [نقاط نهاية ميزة التكوين](./config-feature-endpoints) - علامات توفر الميزة
