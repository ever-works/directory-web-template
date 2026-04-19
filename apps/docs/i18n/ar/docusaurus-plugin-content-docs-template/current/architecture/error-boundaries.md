---
id: error-boundaries
title: "حدود الخطأ ومعالجة الأخطاء"
sidebar_label: "حدود الخطأ"
sidebar_position: 25
---

# حدود الخطأ ومعالجة الأخطاء

يطبق القالب إستراتيجية متعددة الطبقات لمعالجة الأخطاء باستخدام حدود خطأ React وموفري الأخطاء العالميين واصطلاحات الخطأ Next.js. تضمن هذه البنية اكتشاف أخطاء وقت التشغيل بأمان، والإبلاغ عنها للتحليلات، وتقديمها للمستخدمين مع خيارات الاسترداد.

## نظرة عامة على الهندسة المعمارية

يتم تنظيم نظام معالجة الأخطاء في أربع طبقات:

|طبقة|ملف|النطاق|
|-------|------|-------|
|صفحة الخطأ العالمية|`app/global-error.tsx`|يكتشف الأخطاء في تخطيط الجذر نفسه|
|موفر الأخطاء|`components/error-provider.tsx`|يلتف شجرة التطبيق مع مستمعي أخطاء JS العموميين|
|حدود الخطأ|`components/error-boundary.tsx`|حدود مكون فئة React القابلة لإعادة الاستخدام|
|حدود الخطأ الإداري|`components/admin/admin-error-boundary.tsx`|الحدود المحددة لأقسام لوحة تحكم المسؤول|

## صفحة الخطأ العالمية

الملف `app/global-error.tsx` عبارة عن اتفاقية Next.js خاصة تكتشف الأخطاء التي تحدث في التخطيط الجذر. نظرًا لاحتمال فشل تخطيط الجذر نفسه، يعرض هذا المكون علامات `<html>` و`<body>` الخاصة به.

```tsx
// app/global-error.tsx
'use client';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
              <p className="font-semibold text-red-600">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <Button onPress={() => reset()} variant="solid">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/" passHref>
              <Button variant="solid">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
```

السلوكيات الرئيسية:
- يقوم بتسجيل الخطأ إلى وحدة التحكم عند التحميل عبر `useEffect`
- يُظهر تتبع المكدس وملخص الأخطاء في وضع التطوير فقط
- يوفر زر **تحديث** (يستدعي `reset()` لإعادة عرض المقطع) ورابط **Go Home**
- `error.digest` عبارة عن تجزئة تم إنشاؤها بواسطة الخادم مفيدة للارتباط بالسجلات من جانب الخادم

## لم يتم العثور على الصفحة

يعالج الملف `app/not-found.tsx` 404 استجابات. وهو مكون عميل يستخدم جهاز التوجيه Next.js للتنقل.

```tsx
// app/not-found.tsx
'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center ...">
      <h1 className="text-8xl font-bold ...">404</h1>
      <h2 className="text-2xl font-semibold ...">Page Not Found</h2>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Button>
        <Button onClick={() => router.push('/')}>
          <Home className="w-4 h-4" /> Back to Home
        </Button>
      </div>
    </div>
  );
}
```

تتضمن الصفحة قسمًا لاقتراحات البحث ورابطًا إلى صفحة المساعدة/الدعم.

## رد فعل مكون الحدود الخطأ

الحدود الأساسية القابلة لإعادة الاستخدام موجودة في `components/error-boundary.tsx`. إنه مكون فئة React (مطلوب لـ `componentDidCatch`) ويتكامل مع نظام التحليلات.

```tsx
// components/error-boundary.tsx
import { analytics } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      analytics.captureException(error, {
        ...errorInfo,
        componentStack: errorInfo.componentStack,
        type: 'react-error-boundary',
      });
    }
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isRetrying: false,
      });
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (/* default error UI */);
    }
    return this.props.children;
  }
}
```

قرارات التصميم البارزة:
- **تكامل التحليلات**: يتم الإبلاغ عن الأخطاء تلقائيًا عبر `analytics.captureException`
- **احتياطي مخصص**: قم بتمرير دعامة `fallback` لتقديم واجهة مستخدم مخصصة، أو السماح لشاشة الخطأ الافتراضية بملء الصفحة بالظهور
- **إعادة المحاولة مع تأخير**: يوفر التأخير بمقدار 500 مللي ثانية عند إعادة المحاولة تعليقات مرئية ويمنع تكرار تكرار التعطل بشكل فوري
- **التفاصيل القابلة للطي**: في واجهة المستخدم الافتراضية، توجد تفاصيل الخطأ داخل عنصر `<details>` حتى يتمكن المستخدمون من فحص المكدس
- **التذييل الفني**: يعرض اسم الخطأ والطابع الزمني وعنوان URL الحالي لتصحيح الأخطاء

## موفر الأخطاء

يقوم `ErrorProvider` في `components/error-provider.tsx` بتغليف شجرة التطبيق بأكملها. إنها تضيف مستمعي أخطاء JavaScript عموميين الذين يلتقطون الأخطاء خارج دورة عرض React.

```tsx
// components/error-provider.tsx
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

يعالج هذا المكون فئتين من الأخطاء التي لا تستطيع حدود أخطاء React التقاطها:
- **الأخطاء العامة** (`window.error`): أخطاء البرنامج النصي، استثناءات وقت التشغيل خارج React
- **رفض الوعد الذي لم تتم معالجته** (`unhandledrejection`): معالجات منسية `.catch()` أو فشل `await`

## حدود الخطأ الإداري

تقوم لوحة معلومات المسؤول بتغليف كل قسم في `AdminErrorBoundary` لذا فإن الفشل في عنصر واجهة مستخدم واحد (على سبيل المثال، مخطط) لا يؤدي إلى تعطيل لوحة المعلومات بأكملها.

```tsx
// components/admin/admin-dashboard.tsx (usage pattern)
<AdminLandmark as="section" label="Dashboard Statistics">
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} isLoading={false} />
  </AdminErrorBoundary>
</AdminLandmark>

<AdminLandmark as="section" label="Analytics Overview">
  <AdminResponsiveGrid cols={2} gap="lg">
    <AdminErrorBoundary>
      <AdminActivityChart data={stats?.activityTrendData || []} />
    </AdminErrorBoundary>
    <AdminErrorBoundary>
      <AdminTopItems data={stats?.topItemsData || []} />
    </AdminErrorBoundary>
  </AdminResponsiveGrid>
</AdminLandmark>
```

يعزل كل `AdminErrorBoundary` حالات الفشل في قسم خاص به، مما يسمح لبقية لوحة المعلومات بمواصلة العمل.

## معالجة أخطاء واجهة برمجة التطبيقات

تستخدم مسارات واجهة برمجة التطبيقات (API) من جانب الخادم معالج أخطاء قياسيًا محددًا في `lib/api/error-handler.ts`:

```tsx
// lib/api/error-handler.ts
export function handleApiError(
  error: unknown,
  context = 'API'
): NextResponse<ApiErrorResponse> {
  // Log with context
  if (error instanceof Error) {
    logError(error, context);
  }

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;
    // Auto-detect error type from message content
    if (message.includes('unauthorized')) status = HttpStatus.UNAUTHORIZED;
    if (message.includes('validation'))   status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (message.includes('not found'))    status = HttpStatus.NOT_FOUND;
  }

  // Sanitize in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An unexpected error occurred';
  }

  return createApiErrorResponse(message, status, code);
}
```

يتوفر أيضًا غلاف مريح:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## أفضل الممارسات في التعامل مع الأخطاء

1. ** تغليف أقسام الميزات ** في مكونات `ErrorBoundary` بحيث لا يؤدي أي عطل واحد إلى إزالة الصفحة بأكملها
2. **استخدم العناصر الاحتياطية المخصصة** للأقسام المهمة التي تريد فيها واجهة مستخدم أكثر سياقًا للاسترداد
3. **الاستفادة من `withErrorHandling`** في مسارات واجهة برمجة التطبيقات (API) لضمان أشكال استجابة متسقة للأخطاء
4. **لا تعرض أبدًا آثار المكدس** في الإنتاج - `global-error.tsx` و`error-handler.ts` مخرجات تصحيح أخطاء البوابة خلف `NODE_ENV`
5. **إبلاغ التحليلات** - يقدم `ErrorBoundary` تقاريره تلقائيًا إلى خدمة التحليلات عبر `analytics.captureException`

## مرجع الملف

|ملف|الغرض|
|------|---------|
|`app/global-error.tsx`|صفحة خطأ على مستوى الجذر مع غلاف HTML كامل|
|`app/not-found.tsx`|404 صفحة غير موجودة مع خيارات التنقل|
|`components/error-boundary.tsx`|حدود خطأ رد الفعل القابلة لإعادة الاستخدام مع التحليلات|
|`components/error-provider.tsx`|مستمع خطأ JS العالمي يلتف حول التطبيق|
|`components/admin/admin-error-boundary.tsx`|الحدود المحددة لعناصر واجهة مستخدم لوحة تحكم المشرف|
|`lib/api/error-handler.ts`|معالجة أخطاء مسار واجهة برمجة التطبيقات الموحدة|
