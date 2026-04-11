---
id: security
title: تصلب الأمن
sidebar_label: حماية
sidebar_position: 6
---

#تشديد أمني

يتضمن قالب Ever Works طبقات متعددة من الأمان بشكل افتراضي. يوثق هذا الدليل وسائل الحماية المضمنة ويقدم توصيات لتعزيز عملية نشر الإنتاج لديك.

## رؤوس الأمان

يقوم القالب بتكوين رؤوس الأمان عالميًا في `next.config.ts` لجميع المسارات:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: "..." },
      ],
    },
  ];
},
```

### انهيار الرأس

| رأس | القيمة | الغرض |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | يمنع هجمات الاستنشاق من نوع MIME |
| `X-Frame-Options` | `DENY` | يمنع تضمين الموقع في إطارات iframe (حماية من عمليات النقر) |
| 4ـ | 5 ــ | حدود معلومات المُحيل المرسلة إلى مصادر خارجية |
| 6ـ | `on` | تمكين الجلب المسبق لـ DNS للأداء |
| 8ـ | `max-age=63072000; includeSubDomains; preload` | يفرض HTTPS لمدة عامين تقريبًا، ويغطي جميع النطاقات الفرعية، وهو مؤهل لقائمة التحميل المسبق لـ HSTS |
| `Content-Security-Policy` | انظر أدناه | يقيد مصادر تحميل الموارد |

### سياسة أمان المحتوى

تم تكوين CSP على النحو التالي:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https:;
frame-ancestors 'none';
```

| توجيه | القيمة | ملاحظات |
|---|---|---|
| `default-src` | `'self'` | السماح فقط للموارد من نفس الأصل بشكل افتراضي |
| `script-src` | `'self' 'unsafe-inline'` + عصارة ليمون | مطلوبة للبرامج النصية المضمنة وأداة الدفع |
| 4ـ | 5 ــ | مطلوبة لـ CSS-in-JS وTailwind |
| 6ـ | `'self' data: https:` | يسمح بالصور من نفس المصدر ومعرِّفات URI للبيانات وأي مصدر HTTPS |
| 8ـ | `'self'` | الخطوط المستضافة ذاتيًا فقط |
| `connect-src` | `'self' https:` | تستدعي واجهة برمجة التطبيقات (API) نفس الأصل وأي نقطة نهاية HTTPS |
| ‹‹١٢› | 13 ــ | يمنع التضمين في أي إطار iframe (أي ما يعادل `X-Frame-Options: DENY` ) |

### أمان الصور بتنسيق SVG

تتلقى صور SVG وضع حماية إضافيًا:

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

يتم تقديم ملفات SVG كمرفقات مع تعطيل البرامج النصية بالكامل ووضعها في وضع الحماية، مما يمنع هجمات XSS المستندة إلى SVG.

### تصلب إضافي

0 معطل:

```typescript
poweredByHeader: false,
```

يؤدي هذا إلى إزالة الرأس `X-Powered-By: Next.js` ، مما يمنع أخذ بصمات التقنية.

## أمان المصادقة

### تكامل NextAuth.js

يستخدم القالب NextAuth.js (Auth.js) للمصادقة. تشمل ميزات الأمان الرئيسية ما يلي:

- ** جلسات JWT أو قاعدة البيانات ** مع استراتيجية جلسة قابلة للتكوين
- **حماية CSRF** في جميع عمليات إرسال النماذج
- ** تكوين آمن لملفات تعريف الارتباط ** مع العلامات 1 , 2 , و 3
- **التحقق من صحة الإدخال** باستخدام مخططات Zod في جميع إجراءات النموذج

### الإجراءات التي تم التحقق منها

تتم حماية إجراءات الخادم باستخدام أغلفة الإجراءات التي تم التحقق من صحتها والمحددة في 4:

```typescript
// Validate input with Zod before processing
export function validatedAction<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData);
  };
}

// Validate input AND require authentication
export function validatedActionWithUser<S extends z.ZodType, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<T> => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("User is not authenticated");
    }
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.issues[0].message } as T;
    }
    return action(result.data, formData, session.user);
  };
}
```

**استخدم دائمًا `validatedActionWithUser` ** للعمليات المصادق عليها. وهذا يضمن حدوث التحقق من صحة الإدخال والتحقق من الجلسة قبل تنفيذ أي منطق عمل.

## إنفاذ RBAC

يتضمن القالب نظامًا كاملاً للتحكم في الوصول على أساس الدور في 1.

### تنسيق الإذن

تتبع الأذونات النمط 2:

```
items:read, items:create, items:update, items:delete
users:read, users:create, users:assignRoles
analytics:read, analytics:export
system:settings
```

### وظائف التحقق من الأذونات

| وظيفة | الغرض | مثال |
|---|---|---|
| `hasPermission` | تحقق من إذن واحد | `hasPermission(user, 'items:create')` |
| `hasAnyPermission` | تحقق مما إذا كان لدى المستخدم واحد على الأقل | `hasAnyPermission(user, ['items:review', 'items:approve'])` |
| 4ـ | تحقق مما إذا كان المستخدم قد قام بإدراج كافة | 5 ــ |
| 6ـ | التحقق من خلال سلاسل الموارد + الإجراء | `hasResourcePermission(user, 'items', 'delete')` |
| 8ـ | تحقق من إنشاء/تحديث/حذف | `canManageResource(user, 'categories')` |
| `canReviewItems` | تحقق من أذونات مراجعة العنصر | `canReviewItems(user)` |
| ‹‹١٢› | تحقق من أذونات إدارة المستخدم | 13 ــ |
| 14 ــ | تحقق من أذونات إدارة الأدوار | `canManageRoles(user)` |
| 16 ــ | تحقق من الوصول إلى التحليلات | `canViewAnalytics(user)` |
| 18 ــ | تحقق من دور المشرف المتميز أو جميع الأذونات | 19 ــ |

### استخدام الأذونات في مسارات API

```typescript
import { hasPermission, UserPermissions } from '@/lib/middleware/permission-check';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userPerms: UserPermissions = {
    userId: session.user.id,
    roles: session.user.roles,
    permissions: session.user.permissions,
  };

  if (!hasPermission(userPerms, 'items:create')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with authorized logic
}
```

### كشف المشرف الفائق

تستخدم الوظيفة `isSuperAdmin` أسلوبًا مزدوجًا لتحقيق أقصى قدر من الأمان:

1. **التحقق من الدور**: للتحقق مما إذا كان المستخدم لديه الدور 1
2. **الإذن الاحتياطي**: التحقق من أن المستخدم يمتلك كل إذن نظام محدد

وهذا يضمن عدم إمكانية منح أي مجموعة أذونات جزئية حق وصول المشرف المتميز عن طريق الخطأ.

## الحد من المعدل

### حماية طريق API

تنفيذ تحديد المعدل لمسارات واجهة برمجة التطبيقات العامة لمنع إساءة الاستخدام:

```typescript
// Example using a simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

بالنسبة لعمليات نشر الإنتاج، فكر في استخدام:
- ** Vercel Edge Middleware ** مع حد للمعدل 0
- **Upstash Redis** لتحديد المعدل الموزع عبر المثيلات التي لا تحتوي على خادم
- **حد معدل Cloudflare** في طبقة CDN

### حماية نقطة نهاية كرون

يجب أن تتحقق نقاط نهاية Cron API من السر المشترك لمنع الاستدعاء غير المصرح به:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Execute cron job
}
```

يتم تعيين `CRON_SECRET` عبر متغيرات البيئة ويتم تكوينه أثناء النشر (راجع سير عمل نشر Vercel الخاص بخط أنابيب CI/CD).

## التحقق من صحة الإدخال

### التحقق من صحة مخطط Zod

يجب التحقق من صحة جميع مدخلات النماذج وحمولات واجهة برمجة التطبيقات (API) باستخدام مخططات Zod:

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  url: z.string().url(),
  categoryId: z.string().uuid(),
});
```

### منع حقن SQL

يستخدم القالب Drizzle ORM لجميع استعلامات قاعدة البيانات، والذي يقوم بتحديد معلمات جميع القيم تلقائيًا. لا تقم أبدًا بإنشاء سلاسل SQL خام بإدخال المستخدم.

### منع XSS

- يتم عرض مكونات الخادم على الخادم ولا تعرض HTML الخام للعميل.
- يجب أن يتم الهروب من كل المحتوى الذي أنشأه المستخدم باستخدام الهروب المدمج في React (يهرب JSX من السلاسل تلقائيًا).
- يقوم رأس CSP بحظر البرامج النصية المضمنة من مصادر غير موثوقة.

## أمان البيئة المتغيرة

### الأسرار المطلوبة

| متغير | الغرض | جيل |
|---|---|---|
| `AUTH_SECRET` | يوقع رموز JWT وملفات تعريف الارتباط للجلسة | `openssl rand -base64 32` |
| `COOKIE_SECRET` | تشفير قيم ملفات تعريف الارتباط | `openssl rand -base64 32` |
| 4ـ | يصادق على طلبات نقطة النهاية cron | 5 ــ |
| 6ـ | سلسلة اتصال قاعدة البيانات | مقدمة من مضيف قاعدة البيانات |

### أفضل الممارسات

1. **لا تلتزم أبدًا بالأسرار** للتحكم في الإصدار. استخدم `.env.local` للتطوير وأسرار مستوى النظام الأساسي للإنتاج.
2. **قم بتدوير الأسرار بانتظام**، خاصة رقم 8 و9.
3. **استخدم أسرارًا منفصلة لكل بيئة** -- لا تشارك أسرار الإنتاج مع التدريج أو التطوير.
4. **الحد من الوصول** إلى متغيرات بيئة الإنتاج باستخدام RBAC الخاص بالنظام الأساسي الخاص بك (أدوار فريق Vercel، وقواعد حماية بيئة GitHub).

## قائمة التحقق الأمنية للإنتاج

| الفئة | العنصر | الحالة |
|---|---|---|
| **العناوين** | كافة رؤوس الأمان التي تم تكوينها في `next.config.ts` | مدمج |
| **العناوين** | `poweredByHeader` معطل | مدمج |
| **العناوين** | تم تمكين التحميل المسبق لـ HSTS بعمر أقصى يبلغ عامين | مدمج |
| **المصادقة** | `AUTH_SECRET` هي قيمة عشوائية قوية | دليل |
| **المصادقة** | تستخدم ملفات تعريف الارتباط للجلسة 13، 14، 15 | مدمج |
| **المصادقة** | تستخدم كافة إجراءات الخادم `validatedActionWithUser` | مراجعة |
| **RBAC** | تم التحقق من الأذونات على كل طريق محمي | مراجعة |
| **RBAC** | يتطلب وصول المشرف المتميز تعيين دور صريح | مدمج |
| **الإدخال** | التحقق من صحة Zod على جميع مدخلات النموذج وحمولات API | مراجعة |
| **الإدخال** | لا توجد استعلامات SQL أولية (Drizzle ORM فقط) | مراجعة |
| **كرون** | التحقق من نقاط النهاية كرون `CRON_SECRET` | مراجعة |
| **أسرار** | جميع الأسرار متداولة وبيئة محددة | دليل |
| **CSP** | تمت مراجعة سياسة أمان المحتوى لنطاقات الإنتاج | دليل |
| **ديبز** | يتم تشغيل تحليل CodeQL أسبوعيًا على قاعدة التعليمات البرمجية | مدمج |
| **ديبز** | التبعيات المدققة ( `pnpm audit` ) | دليل |

## الإبلاغ عن المشكلات الأمنية

إذا اكتشفت ثغرة أمنية، فأبلغ عنها على انفراد:

- **البريد الإلكتروني**:security@ever.co
- **لا** تفتح مشكلة عامة على GitHub بسبب الثغرات الأمنية.
- تضمين خطوات الاستنساخ وتقييم الأثر عندما يكون ذلك ممكنا.
