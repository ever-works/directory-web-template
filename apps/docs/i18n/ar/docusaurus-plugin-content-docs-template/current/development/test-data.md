---
id: test-data
title: بيانات الاختبار والنماذج
sidebar_label: بيانات الاختبار
sidebar_position: 6
---

# بيانات الاختبار والنماذج

تعتمد اختبارات E2E في قالب Ever Works على بيانات اختبار ثابتة تُدار عبر ثوابت TypeScript ونماذج المصادقة وسكريبتات Seed.

## ثوابت `TEST_DATA`

تُعرَّف بيانات الاختبار الأساسية في `apps/web-e2e/fixtures/test-data.ts`:

```typescript
export const TEST_DATA = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User',
  },
  client: {
    email: 'client@example.com',
    password: 'Client123!',
    name: 'Client User',
  },
  company: {
    name: 'Test Company',
    slug: 'test-company',
    description: 'A test company for E2E testing',
  },
  // ... etc.
};
```

## مصفوفة `PUBLIC_ROUTES`

المسارات المتاحة للعموم دون مصادقة:

```typescript
export const PUBLIC_ROUTES = [
  '/',
  '/en',
  '/en/about',
  '/en/contact',
  '/en/companies',
  '/en/blog',
  // ... etc.
];
```

## نماذج المصادقة

يستخدم Playwright ملفات الجلسة المحفوظة لتجاوز واجهة تسجيل الدخول في الاختبارات التي تتطلب مصادقة.

### `admin.json`

يُحفظ في `apps/web-e2e/fixtures/admin.json` بعد تشغيل الإعداد العام:

```json
{
  "cookies": [
    {
      "name": "authjs.session-token",
      "value": "...",
      "domain": "localhost",
      "path": "/",
      "httpOnly": true,
      "secure": false
    }
  ],
  "origins": []
}
```

### `client.json`

مشابه لـ `admin.json` لكنه يخص جلسة مستخدم بدور عميل.

## ملء قاعدة البيانات للاختبار

قبل اختبارات E2E، يجب تشغيل سكريبت Seed للتأكد من وجود بيانات الاختبار:

```bash
cd apps/web
pnpm run db:seed
```

يُنشئ سكريبت Seed `scripts/seed.ts`:

- **مستخدمو الإدارة**: حسابات بصلاحية وصول كاملة لاختبار الميزات الإدارية
- **مستخدمو العملاء**: حسابات اعتيادية لاختبار سير عمل المستخدم
- **شركات نموذجية**: قوائم الدليل مع ملفات تعريفية كاملة
- **الفئات**: هيكل التصنيف
- **محتوى نموذجي**: مقالات المدونة والتعليقات والمراجعات

## وضع العرض التوضيحي

عند تعيين `DEMO_MODE=true`، يملأ التطبيق البيانات الأولية إذا كانت قاعدة البيانات فارغة:

```bash
DEMO_MODE=true pnpm run dev
```

مفيد للمعاينات والعروض التوضيحية دون الحاجة إلى تشغيل Seed يدويًا.

## استراتيجيات اتساق البيانات

| البيئة         | الاستراتيجية                             | الأمر                |
|----------------|------------------------------------------|----------------------|
| التطوير        | Seed يدوي + قاعدة بيانات محلية           | `pnpm db:seed`       |
| الاختبار       | Seed تلقائي في CI قبل الاختبارات         | ضبط CI/CD            |
| الإنتاج        | ترحيلات فقط — لا Seed عشوائي             | `pnpm db:migrate`    |

## أفضل الممارسات

1. **لا تعتمد أبدًا على ترتيب تنفيذ الاختبارات** — يجب أن يعمل كل اختبار باستقلالية
2. **استخدم نماذج المصادقة** — أسرع من تسجيل الدخول عبر واجهة المستخدم في كل اختبار
3. **نظِّف بعد انتهائك** — يجب أن تُنظِّف الاختبارات التي تُنشئ بيانات بعد تشغيلها
4. **ثوابت بدلًا من نصوص مضمنة** — أدِر بيانات الاختبار مركزيًا في `TEST_DATA`
5. **عزل بيئة الاختبار** — استخدم قاعدة بيانات أو مخطط مستقل للاختبارات

## متغيرات بيئة الاختبار

```bash
# تُعيَّن في apps/web-e2e/.env أو apps/web/.env.test
DATABASE_URL=file:./test.db           # قاعدة بيانات اختبار معزولة
BASE_URL=http://localhost:3000         # العنوان الأساسي للاختبارات
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=Admin123!
```

## الملفات ذات الصلة

- `apps/web-e2e/fixtures/test-data.ts` — ثوابت بيانات الاختبار المركزية
- `apps/web-e2e/global-setup.ts` — إعداد الجلسة قبل جميع الاختبارات
- `apps/web-e2e/global-teardown.ts` — التنظيف بعد جميع الاختبارات
- `apps/web/scripts/seed.ts` — سكريبت Seed لقاعدة البيانات
- `apps/web/scripts/clean-database.js` — سكريبت إعادة تعيين قاعدة البيانات
