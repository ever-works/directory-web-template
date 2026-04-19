---
id: query-client-system
title: "نظام عميل الاستعلام"
sidebar_label: "نظام عميل الاستعلام"
sidebar_position: 43
---

# نظام عميل الاستعلام

## نظرة عامة

يوفر نظام Query Client تكوينًا مركزيًا لـ TanStack React Query للتطبيق. وهو يتألف من وحدتين: مصنع عميل الاستعلام للأغراض العامة (`lib/query-client.ts`) الذي يتعامل مع إدارة الخادم/العميل الفردي، والتكوين المحسن للفوترة (`lib/react-query-config.ts`) مع مصانع مفاتيح الاستعلام، واستراتيجيات الجلب المسبق، وأدوات مساعدة لإبطال ذاكرة التخزين المؤقت.

## الهندسة المعمارية

يحتوي النظام على نقطتي دخول تخدم اهتمامات مختلفة:

- **`lib/query-client.ts`** - عميل الاستعلام الأساسي المستخدم عبر التطبيق. فهو ينشئ مثيلات منفصلة لبيئات الخادم والعميل، مما يضمن أن العرض من جانب الخادم لا يشارك الحالة بين الطلبات بينما يعيد المتصفح استخدام مثيل واحد.
- **`lib/react-query-config.ts`** - عميل استعلام متخصص تم تكوينه لإدارة الفواتير والاشتراكات. فهو يضيف مصانع رئيسية للاستعلام، واستراتيجيات الجلب المسبق، وأدوات مساعدة لإبطال ذاكرة التخزين المؤقت مصممة خصيصًا للبيانات المتعلقة بالدفع.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## مرجع واجهة برمجة التطبيقات

### الصادرات من `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

وظيفة المصنع التي تقوم بإنشاء `QueryClient` جديد بالإعدادات الافتراضية التالية:

|الخيار|القيمة|الغرض|
|--------|-------|---------|
|`staleTime`|5 دقائق|تعتبر البيانات جديدة|
|`gcTime`|10 دقائق|الاحتفاظ بذاكرة التخزين المؤقت بعد الاستخدام الأخير|
|`refetchOnWindowFocus`|`false`|منع إعادة الجلب المفرط|
|`refetchOnMount`|`false`|تخطي إعادة الجلب إذا كانت البيانات حديثة|
|`refetchOnReconnect`|`true`|الجلب عند استرداد الشبكة|
|`retry`|ما يصل إلى 2 محاولات|إعادة المحاولة البسيطة لجميع الأخطاء|
|`retryDelay`|التراجع الأسي، بحد أقصى 30 ثانية|`1000 * 2^attempt`|
|طفرة `retry`| 1 |أعد محاولة الطفرات مرة واحدة|
|طفرة `onError`|نخب + console.error|إشعار الخطأ العالمي|

#### `getQueryClient(): QueryClient`

إرجاع المثيل `QueryClient` المناسب. على الخادم، يقوم بإنشاء مثيل جديد لكل مكالمة (بدون حالة مشتركة). على العميل، تقوم بإرجاع مثيل مفرد (تم إنشاؤه مرة واحدة وإعادة استخدامه).

### الصادرات من `lib/react-query-config.ts`

#### `queryClient: QueryClient`

مثيل `QueryClient` تم تكوينه مسبقًا وتم تحسينه لعمليات الفوترة. الاختلافات الرئيسية عن العميل العام:

- `refetchOnWindowFocus: true` - يضمن أن حالة الاشتراك محدثة دائمًا
- `refetchOnMount: true` - يعيد البيانات القديمة عند تركيب المكون
- إعادة المحاولة تتخطى أخطاء 4xx و401 (لا تتم إعادة محاولة أخطاء العميل/المصادقة)
- يتضمن التراجع الأسي الارتعاش (85-115% من التأخير الأساسي)
- `notifyOnChangeProps` تم ضبطه على `['data', 'error', 'isLoading', 'isFetching']` لإعادة العرض الأمثل

#### `queryKeys`

مصنع مفاتيح الاستعلام الهرمي لإدارة ذاكرة التخزين المؤقت بشكل متسق:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

وظائف الجلب المسبق المعدة مسبقًا لأنماط التنقل الشائعة:

- `prefetchStrategies.billing()` - جلب بيانات الاشتراك والدفع مسبقًا
- `prefetchStrategies.userProfile()` - جلب بيانات ملف تعريف المستخدم مسبقًا

#### `cacheUtils`

المرافق لإدارة ذاكرة التخزين المؤقت:

- `cacheUtils.invalidateBilling()` - يبطل كافة استعلامات الفواتير
- `cacheUtils.invalidateSubscription()` - يبطل استعلام الاشتراك
- `cacheUtils.invalidatePayments()` - يبطل استعلام الدفعات
- `cacheUtils.removeBilling()` - إزالة كافة بيانات الفواتير من ذاكرة التخزين المؤقت
- `cacheUtils.resetCache()` - مسح ذاكرة التخزين المؤقت للاستعلام بالكامل

## تفاصيل التنفيذ

**تقسيم الخادم/العميل**: `getQueryClient()` يستخدم علامة TanStack `isServer` لتحديد البيئة. تكون مثيلات الخادم سريعة الزوال (جديدة لكل طلب) لمنع تسرب البيانات بين المستخدمين. يتم تخزين مفردة المتصفح في متغير على مستوى الوحدة النمطية.

**استراتيجية معالجة الأخطاء**: يستخدم العميل العام `toast.error()` من Sonner لأخطاء الطفرات، مما يوفر تعليقات فورية للمستخدم. يتخطى عميل الفوترة عمليات إعادة المحاولة عند حدوث أخطاء 4xx نظرًا لأنها تشير إلى مشكلات من جانب العميل لن يتم حلها من خلال إعادة المحاولة.

**إعادة المحاولة مع عدم الاستقرار**: يضيف عميل الفوترة عدم الاستقرار العشوائي (85-115% من التأخير الأساسي) إلى التراجع المتسارع لمنع مشاكل القطيع المدوية عندما يعيد العديد من العملاء المحاولة في وقت واحد بعد انقطاع الخدمة.

## التكوين

ليست هناك حاجة لملفات التكوين الإضافية. تم تكوين كلا العميلين بالكامل في التعليمات البرمجية. لضبط الإعدادات الافتراضية، قم بتعديل `defaultOptions` في وظائف المصنع المعنية.

## أمثلة الاستخدام

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## أفضل الممارسات

- استخدم `getQueryClient()` من `lib/query-client.ts` لجميع عمليات جلب البيانات العامة؛ استخدم العميل الخاص بالفوترة فقط للميزات المتعلقة بالدفع.
- استخدم دائمًا المصانع `queryKeys` لتناسق مفتاح ذاكرة التخزين المؤقت؛ لا تستخدم مطلقًا مصفوفات المفاتيح للاستعلام عن الكود الثابت.
- اتصل بـ `cacheUtils.invalidateBilling()` بعد أي طفرة تؤدي إلى تغيير حالة الاشتراك أو الدفع.
- استخدم `prefetchStrategies` عند التمرير أو التحميل المسبق للمسار لتحسين الأداء المتصور.
- تجنب استدعاء `cacheUtils.resetCache()` في الإنتاج ما لم يكن ذلك ضروريًا للغاية، لأنه يتجاهل كافة البيانات المخزنة مؤقتًا.

## الوحدات ذات الصلة

- [طبقة عميل واجهة برمجة التطبيقات](/template/architecture/api-client-layer) - تجعل استدعاءات واجهة برمجة التطبيقات تستهلكها وظائف الاستعلام
- [نظام الحراس](./guards-system-deep-dive) - التحكم في الوصول المستند إلى الخطة والذي قد يعتمد على بيانات الاشتراك
