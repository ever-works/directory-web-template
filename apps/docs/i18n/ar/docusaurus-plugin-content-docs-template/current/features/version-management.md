---
id: version-management
title: إدارة الإصدار
sidebar_label: إدارة الإصدار
sidebar_position: 15
---

#إدارة الإصدارات

يتضمن قالب Ever Works نظام إدارة الإصدار الذي يتتبع إصدار مخزن البيانات، ويعرض معلومات الإصدار للمسؤولين، ويوفر اكتشافًا تلقائيًا للمزامنة. يراقب هذا النظام مستودع محتوى CMS المستند إلى Git ويقدم تفاصيل الإصدار من خلال مكونات واجهة المستخدم القابلة للتكوين.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | ربط React Query لجلب بيانات الإصدار من API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | ربط الأداة المساعدة لإدارة ذاكرة التخزين المؤقت |
| 4ـ | 5 ــ | مكون عرض الإصدار القابل للتكوين |
| 6ـ | `components/version/version-tooltip.tsx` | تلميح أداة التحويم يعرض معلومات الإصدار التفصيلية |
| 8ـ | `app/api/version/route.ts` | نقطة نهاية API تُرجع بيانات الإصدار الحالي |

## بنية بيانات معلومات الإصدار

يتتبع نظام الإصدار البيانات التالية من مستودع المحتوى:

| المجال | اكتب | الوصف |
|---|---|---|
| `commit` | `string` | تجزئة الالتزام القصير لإصدار البيانات الحالي |
| ‹‹١٢› | 13 ــ | سلسلة تاريخ ISO للالتزام |
| 14 ــ | `string` | ارتكاب اسم المؤلف |
| 16 ــ | `string` | رسالة الالتزام |
| 18 ــ | 19 ــ | عنوان URL للمستودع |
| 20 ــ | ‹٢١› | الطابع الزمني لآخر مزامنة للبيانات |

## الخطاف 22

### الواجهة

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### الاستخدام

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### استراتيجية التخزين المؤقت

| الإعداد | القيمة | الوصف |
|---|---|---|
| `staleTime` | 5 دقائق | تعتبر البيانات حديثة لمدة 5 دقائق |
| `gcTime` | 30 دقيقة | جمع القمامة بعد 30 دقيقة |
| `refetchOnWindowFocus` | `false` | لا يوجد إعادة الجلب على مفتاح علامة التبويب |
| 4ـ | 5 ــ | إعادة الجلب عند إعادة الاتصال بالشبكة |
| 6ـ | `false` | تخطي الإعادة إذا كانت ذاكرة التخزين المؤقت تحتوي على بيانات |

### منطق إعادة المحاولة

ينفذ الخطاف إعادة المحاولة الذكية مع التراجع الأسي:

- عدم إعادة المحاولة عند حدوث أخطاء العميل (رموز الحالة 4xx)
- إعادة محاولة أخطاء الشبكة والخادم حتى مرتين
- يستخدم التراجع الأسي: 8

## مكون عرض الإصدار

يدعم المكون 9 ثلاثة أشكال مرئية:

### المتغير المضمن (افتراضي)

شاشة مضمنة مدمجة تعرض تجزئة الالتزام والوقت النسبي:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### متغير الشارة

شارة على شكل حبة دواء بخلفية متدرجة:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### البديل التفصيلي

بطاقة تحتوي على معلومات الإصدار الكامل:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

يظهر البديل التفصيلي:
- ارتكاب التجزئة والوقت النسبي
- اسم المؤلف
- رسالة الالتزام (السطر الأول، مقتبس)
- الطابع الزمني لآخر تحديث (عندما يكون `showDetails` صحيحًا)
- الطابع الزمني الأخير للمزامنة
- اسم المستودع

### الدعائم

| الدعامة | اكتب | الافتراضي | الوصف |
|---|---|---|---|
| `className` | `string` | `""` | فئات CSS إضافية |
| 4ـ | 5 ــ | 6ـ | أسلوب العرض |
| `showDetails` | 8ـ | `false` | عرض التفاصيل الموسعة (المتغير التفصيلي فقط) |
| `refreshInterval` | `number` | ١٢- (٥ دقائق) | الفاصل الزمني للتحديث التلقائي بالمللي ثانية |

### التحكم في الوصول

يحترم المكون أدوار المستخدم:
- **المستخدمون العاديون**: يتم إخفاء المكون عندما تكون معلومات الإصدار غير متاحة
- **مستخدمو المطورين/المسؤولين**: تظهر حالة الخطأ مع رسالة "الإصدار غير متوفر".

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## تلميح الإصدار

يغلف الرمز `VersionTooltip` أي عنصر باستخدام تلميح أدوات التمرير الذي يعرض معلومات الإصدار التفصيلية:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### ميزات تلميح الأدوات

| ميزة | الوصف |
|---|---|
| عرض متأخر | تأخير قابل للتكوين قبل ظهور تلميح الأداة (الافتراضي: 300 مللي ثانية) |
| إخفاء سريع | تأخير بمقدار 100 مللي ثانية عند ترك الماوس للتفاعل السلس |
| تلميح الأداة | يظل تلميح الأداة مرئيًا عند المرور فوقه |
| دعم لوحة المفاتيح | مفتاح الهروب يرفض تلميح الأداة |
| إمكانية الوصول | سمات ARIA ( `role="tooltip"` , `aria-describedby` ) |
| انحطاط رشيق | إرجاع الأطفال بدون تلميح الأدوات عندما تكون البيانات غير متوفرة |

### الدعائم

| الدعامة | اكتب | الافتراضي | الوصف |
|---|---|---|---|
| `children` | `ReactNode` | مطلوب | عنصر الزناد |
| 4ـ | 5 ــ | 6ـ | فئات CSS إضافية |
| `disabled` | 8ـ | `false` | تعطيل تلميح الأدوات بالكامل |
| `delay` | `number` | ‹‹١٢› | إظهار التأخير بالمللي ثانية |

## أدوات ذاكرة التخزين المؤقت

يوفر الخطاف 13 وظائف إدارة ذاكرة التخزين المؤقت:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## تنسيق التاريخ

يشتمل المكون 0 على أدوات مساعدة لتنسيق التاريخ المحفوظة:

| وظيفة | إخراج المثال |
|---|---|
| `formatDate` | "15 يناير 2025 الساعة 02:30 مساءً" |
| `getRelativeTime` | "الآن"، "منذ 3 ساعات"، "منذ يومين"، "15 يناير" |
| `getRepositoryName` | "يعمل دائمًا/بيانات تتبع الوقت الرائعة" |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| ربط معلومات الإصدار | 4ـ |
| عرض النسخة | 5 ــ |
| تلميح الإصدار | 6ـ |
| مسار API الإصدار | `app/api/version/route.ts` |
