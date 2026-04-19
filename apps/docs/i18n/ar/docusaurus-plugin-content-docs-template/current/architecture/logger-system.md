---
id: logger-system
title: "نظام المسجل"
sidebar_label: "نظام المسجل"
sidebar_position: 44
---

# نظام المسجل

## نظرة عامة

يوفر نظام المسجل أداة تسجيل خفيفة الوزن وصديقة للبيئة لإخراج سجل متسق عبر التطبيق. وهو يدعم أربعة مستويات سجل (DEBUG، INFO، WARN، ERROR)، ومثيلات المسجل ذات نطاق السياق، والتنسيق الخاص بالبيئة - إخراج وحدة التحكم المصممة في المتصفح أثناء التطوير والإخراج العادي بتنسيق JSON في Node.js وبيئات الإنتاج.

## الهندسة المعمارية

تقوم الوحدة (`lib/logger.ts`) بتصدير عنصرين:

- **`logger`** - مثيل فردي افتراضي بدون تسمية سياق، مناسب للتسجيل للأغراض العامة.
- **`Logger`** (الفئة) - الفئة نفسها، لإنشاء مثيلات مسجل سياقي مخصصة لوحدات أو ميزات محددة.

يتبع المسجل إستراتيجية تصفية بسيطة: في الإنتاج (`NODE_ENV !== 'development'`)، يتم إصدار رسائل التحذير والخطأ فقط. في التنمية، يتم تسجيل جميع المستويات. وهذا يضمن عدم تسرب مخرجات التصحيح المطول إلى بيئات الإنتاج.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## مرجع واجهة برمجة التطبيقات

### الصادرات

#### `logger` (سينجلتون)

مثيل `Logger` تم إنشاء مثيل له مسبقًا بدون سياق. يُستخدم للتسجيل السريع وغير المحدود.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (الفئة)

##### `static create(context: string): Logger`

طريقة المصنع لإنشاء مسجل نطاق السياق. تظهر سلسلة السياق كبادئة في كافة رسائل السجل.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

يسجل رسالة على مستوى التصحيح. المنبعثة فقط في التنمية.

##### `info(message: string, data?: any): void`

يسجل رسالة إعلامية. المنبعثة فقط في التنمية.

##### `warn(message: string, data?: any): void`

يسجل رسالة تحذير. تنبعث في جميع البيئات.

##### `error(message: string, error?: any): void`

يسجل رسالة خطأ. إذا كانت المعلمة `error` عبارة عن مثيل `Error`، فسيقوم المسجل تلقائيًا باستخراج خصائص `message` و`stack` و@@TOK004@@@. تنبعث في جميع البيئات.

##### `api(method: string, url: string, data?: any): void`

طريقة ملائمة لتسجيل طلبات API. المندوبون إلى `debug()` مع البيانات المنظمة. التنمية فقط.

##### `performance(label: string, duration: number): void`

طريقة ملائمة لتسجيل مقاييس الأداء. يسجل التسمية والمدة بالمللي ثانية. التنمية فقط.

### الأنواع الداخلية

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## تفاصيل التنفيذ

** اكتشاف البيئة **: يتحقق المسجل من `process.env.NODE_ENV === 'development'` في وقت الإنشاء ويخزن النتيجة مؤقتًا. يؤدي هذا إلى تجنب عمليات البحث المتكررة عن البيئة في كل مكالمة سجل.

**تصميم المتصفح**: عند التشغيل في المتصفح (`typeof window !== 'undefined'`) في وضع التطوير، يتم تصميم رسائل السجل باستخدام توجيهات `%c` CSS:

|المستوى|اللون|
|-------|-------|
|تصحيح|`#6366f1` (نيلي)|
|معلومات|`#3b82f6` (الأزرق)|
|تحذير|`#f59e0b` (العنبر)|
|خطأ|`#ef4444` (أحمر)|

**إخراج Node.js**: في بيئات Node.js أو الإنتاج، يتم تنسيق الرسائل كسلاسل عادية مع بيانات JSON المتسلسلة (مطبوعة بشكل جميل مع مسافة بادئة بمسافتين).

**استخراج الخطأ**: تكتشف طريقة `error()` مثيلات `Error` وتستخرج `errorMessage` و`stack` و`name` في كائن بيانات منظمة لتسهيل تصحيح الأخطاء.

## التكوين

المسجل لا يتطلب أي تكوين. يتم تحديد سلوكه بالكامل بواسطة `NODE_ENV`:

|`NODE_ENV`|تصحيح|معلومات|تحذير|خطأ|
|------------|-------|------|------|-------|
|`development`|نعم|نعم|نعم|نعم|
|`production`|لا|لا|نعم|نعم|
|`test`|لا|لا|نعم|نعم|

## أمثلة الاستخدام

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## أفضل الممارسات

- قم بإنشاء أدوات تسجيل على نطاق السياق لكل وحدة نمطية أو منطقة ميزات باستخدام `Logger.create('ModuleName')` لتسهيل تصفية السجلات.
- استخدم `debug()` للتتبع التفصيلي الذي يجب ألا يظهر أبدًا في الإنتاج؛ استخدم `info()` للأحداث البارزة.
- قم دائمًا بتمرير كائنات `Error` (وليس سلاسل) إلى أسلوب `error()` بحيث يتم التقاط تتبعات المكدس تلقائيًا.
- استخدم الأسلوب `api()` لتسجيل طلب HTTP للحفاظ على بنية سجل متسقة عبر استدعاءات API.
- لا تعتمد على المسجل للمراقبة في الإنتاج؛ التكامل مع منصة المراقبة المناسبة (PostHog، Sentry) لتتبع أخطاء الإنتاج.

## الوحدات ذات الصلة

- [طبقة عميل API](/template/architecture/api-client-layer) - يستخدم المُسجل لتسجيل الطلب/الاستجابة
- [نظام إدارة التكوين](./config-manager-system) - تسجل ConfigService نتائج التحقق من الصحة عند بدء التشغيل
