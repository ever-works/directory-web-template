---
id: sentry-logs
title: تكوين سجلات Sentry
sidebar_label: سجلات Sentry
sidebar_position: 7
---

# تكوين سجلات Sentry

يشرح هذا المستند كيفية تكوين واستخدام سجلات Sentry في مستودع Template ومستودع Ever Works.

## نظرة عامة

توفر سجلات Sentry إدارة مركزية للسجلات، مما يتيح لك التقاط السجلات وإعادة توجيهها وتحليلها في Logs Explorer الخاص بـ Sentry. عند التفعيل، يتم إعادة توجيه جميع السجلات تلقائياً إلى Sentry، مما يوفر عرضاً موحداً لسلوك التطبيق عبر بيئات مختلفة.

## الميزات

- ✅ إعادة توجيه السجلات تلقائياً إلى Sentry
- ✅ دعم جميع مستويات التسجيل (debug وinfo وwarn وerror)
- ✅ التسجيل السياقي مع الوسوم التلقائية
- ✅ تكوين خاص بالبيئة
- ✅ التسجيل المنظم مع دعم البيانات الوصفية
- ✅ التكامل مع أداة logger الموجودة

## التكوين

### متغيرات البيئة

أضف هذه المتغيرات إلى ملف `.env.local` للتطوير المحلي:

```env
# تكوين Sentry (مطلوب للسجلات)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# تفعيل Sentry أثناء التطوير (اختياري، الافتراضي فقط في الإنتاج)
SENTRY_ENABLE_DEV=true

# وضع تصحيح Sentry (اختياري)
SENTRY_DEBUG=false

# تكوين سجلات Sentry
SENTRY_LOGS_ENABLED=true  # تفعيل/تعطيل سجلات Sentry (الافتراضي: true)
SENTRY_LOGS_LEVEL=info    # الحد الأدنى لمستوى التسجيل للالتقاط (الافتراضي: info)
```

### التكوين الخاص بالبيئة

#### التطوير المحلي

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # التقاط جميع السجلات أثناء التطوير
```

#### التطوير/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # التقاط سجلات info وwarn وerror
```

#### الإنتاج

```env
SENTRY_ENABLE_DEV=false  # غير ضروري في الإنتاج
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # التقاط التحذيرات والأخطاء فقط في الإنتاج
```

## الاستخدام

### التسجيل الأساسي

تُعيد أداة logger توجيه السجلات إلى Sentry تلقائياً عند التفعيل:

```typescript
import { logger } from '@/lib/logger';

// سجل info
logger.info('User logged in', { userId: '12345' });

// سجل تحذير
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// سجل خطأ
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// سجل debug (في التطوير فقط)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### التسجيل السياقي

أنشئ logger بسياق محدد لتنظيم أفضل:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### مستويات التسجيل

تدعم أداة logger أربعة مستويات تسجيل، يتم تعيينها تلقائياً إلى مستويات خطورة Sentry:

| مستوى Logger | مستوى Sentry | الوصف |
|-------------|-------------|--------|
| `DEBUG` | `debug` | معلومات تفصيلية لتصحيح الأخطاء (التطوير فقط) |
| `INFO` | `info` | رسائل معلوماتية عامة |
| `WARN` | `warning` | رسائل تحذيرية لمشاكل محتملة |
| `ERROR` | `error` | رسائل خطأ عند الإخفاقات |

## كيف يعمل

### التهيئة

سجلات Sentry مُفعَّلة في كل من إدارة العميل وإدارة الخادم:

1. **جانب الخادم** (`instrumentation.ts`): يُهيئ Sentry لوقت تشغيل Node.js
2. **جانب العميل** (`instrumentation-client.ts`): يُهيئ Sentry لوقت تشغيل المتصفح

يتضمن كلا التكوينين:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### إعادة توجيه السجلات

تقوم أداة logger (`lib/logger.ts`) تلقائياً بـ:
1. التحقق مما إذا كانت سجلات Sentry مُفعَّلة
2. تنسيق إدخالات السجل بالسياق والبيانات الوصفية
3. إعادة توجيه السجلات إلى Sentry باستخدام `Sentry.captureMessage()` مع الوسوم والمستويات المناسبة
4. التحويل بأناقة إلى الوضع الاحتياطي إذا لم يكن Sentry متاحاً

### بنية السجل

يتضمن كل إدخال سجل مُرسَل إلى Sentry:
- **الرسالة**: رسالة السجل مع بادئة سياق اختيارية
- **المستوى**: مستوى الخطورة (debug وinfo وwarning وerror)
- **الوسوم**:
  - `logLevel`: مستوى السجل الأصلي
  - `logType`: دائماً `application_log`
  - `context`: معرف سياق اختياري
- **البيانات الإضافية**:
  - `data`: أي بيانات إضافية مُقدَّمة
  - `timestamp`: طابع زمني بصيغة ISO

## عرض السجلات في Sentry

### Logs Explorer

1. انتقل إلى مشروع Sentry الخاص بك
2. اذهب إلى **Logs** ← **Logs Explorer**
3. استخدم الفلاتر للعثور على سجلات محددة:
   - التصفية حسب وسم `logLevel` (debug وinfo وwarn وerror)
   - التصفية حسب وسم `context` لعرض السجلات من وحدات معينة
   - التصفية حسب `logType:application_log` لعرض سجلات التطبيق فقط

### استعلامات السجلات

نماذج استعلامات في Logs Explorer الخاص بـ Sentry:

```
# جميع سجلات الأخطاء
logLevel:error

# السجلات من سياق محدد
context:PaymentService

# جميع سجلات التطبيق
logType:application_log

# الأخطاء من نطاق زمني محدد
logLevel:error timestamp:>2024-01-01
```

## التكامل مع حزمة المراقبة

إذا كنت تستخدم الحزمة `@ever-works/monitoring`، فتأكد من تكوينها للعمل مع سجلات Sentry:

1. يجب أن تُهيئ حزمة المراقبة Sentry مع تفعيل السجلات
2. ستُعيد أداة logger في هذا القالب توجيه السجلات إلى Sentry تلقائياً
3. يعمل كلا النظامين معاً لتوفير مراقبة شاملة

## استكشاف الأخطاء وإصلاحها

### السجلات لا تظهر في Sentry

1. **التحقق من تكوين DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   تأكد من تعيين DSN بشكل صحيح وإمكانية الوصول إليه.

2. **التحقق من تفعيل السجلات**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   يجب أن يكون `true` لإعادة توجيه السجلات.

3. **التحقق من تهيئة Sentry**
   - تحقق من أن `SENTRY_ENABLED` صحيح
   - افحص وحدة تحكم المتصفح بحثاً عن أخطاء التهيئة
   - تأكد من تعيين `_experiments.enableLogs` على `true`

4. **التحقق من تصفية مستوى التسجيل**
   - تأكد من أن مستوى التسجيل يفي بعتبة `SENTRY_LOGS_LEVEL`
   - يتم التقاط سجلات Debug فقط إذا تم تعيين المستوى على `debug`

### اعتبارات الأداء

- يتم إرسال السجلات بشكل غير متزامن ولن تُعرقل التطبيق
- في الإنتاج، فكر في تعيين `SENTRY_LOGS_LEVEL=warn` لتقليل حجم السجلات
- يتعامل Sentry تلقائياً مع تحديد المعدل والتجميع

### تعطيل السجلات

لتعطيل سجلات Sentry دون تعطيل Sentry بالكامل:

```env
SENTRY_LOGS_ENABLED=false
```

ستستمر أداة logger في العمل بشكل طبيعي، لكن لن يتم إعادة توجيه السجلات إلى Sentry.

## أفضل الممارسات

1. **استخدام مستويات التسجيل المناسبة**
   - استخدم `debug` للحصول على معلومات تفصيلية أثناء التطوير
   - استخدم `info` للتدفق العام للتطبيق
   - استخدم `warn` للمشاكل المحتملة التي لا تُعطل الوظائف
   - استخدم `error` للأخطاء والاستثناءات الفعلية

2. **تضمين السياق**
   - استخدم loggers السياقية لتنظيم أفضل
   - تضمين البيانات الوصفية المناسبة في بيانات السجل

3. **تجنب البيانات الحساسة**
   - لا تُسجّل كلمات المرور أو الرموز أو البيانات الشخصية أبداً
   - تنظيف البيانات قبل التسجيل

4. **تكوين الإنتاج**
   - تعيين `SENTRY_LOGS_LEVEL=warn` في الإنتاج
   - مراقبة استخدام حصة Sentry
   - مراجعة السجلات بانتظام بحثاً عن الأنماط

## قائمة تحقق للتحقق من الصحة

- [ ] DSN الخاص بـ Sentry مُكوَّن بشكل صحيح
- [ ] تم تعيين `SENTRY_LOGS_ENABLED=true`
- [ ] تظهر السجلات في Logs Explorer الخاص بـ Sentry
- [ ] تم تعيين مستويات السجلات بشكل صحيح (info وwarn وerror وdebug)
- [ ] وسوم السياق مرئية في Sentry
- [ ] تعمل السجلات محلياً وفي بيئات النشر
- [ ] يستطيع فريق QA رؤية السجلات وتصفيتها في Logs Explorer الخاص بـ Sentry

## موارد إضافية

- [وثائق سجلات Sentry](https://docs.sentry.io/product/logs/)
- [تكامل Sentry مع Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [دليل Logs Explorer الخاص بـ Sentry](https://docs.sentry.io/product/logs/explorer/)
