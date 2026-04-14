---
id: error-boundaries
title: "גבולות שגיאות וטיפול בשגיאות"
sidebar_label: "גבולות שגיאה"
sidebar_position: 25
---

# גבולות שגיאות וטיפול בשגיאות

התבנית מיישמת אסטרטגיית טיפול בשגיאות רב-שכבתית באמצעות גבולות שגיאה של React, ספקי שגיאות גלובליים ומוסכמות שגיאה של Next.js. ארכיטקטורה זו מבטיחה ששגיאות זמן ריצה נתפסות בחן, מדווחות ל-Analytics ומוצגות בפני המשתמשים עם אפשרויות שחזור.

## סקירה כללית של אדריכלות

מערכת הטיפול בשגיאות מאורגנת בארבע שכבות:

|שכבה|קובץ|היקף|
|-------|------|-------|
|דף שגיאה גלובלי|`app/global-error.tsx`|תופס שגיאות בפריסת השורש עצמה|
|ספק שגיאה|`components/error-provider.tsx`|עוטף את עץ האפליקציות עם מאזיני שגיאה גלובליים של JS|
|גבול שגיאה|`components/error-boundary.tsx`|גבול רכיב מחלקת React לשימוש חוזר|
|גבול שגיאת מנהל מערכת|`components/admin/admin-error-boundary.tsx`|גבול בהיקף עבור חלקי לוח המחוונים של מנהל מערכת|

## דף שגיאה גלובלי

הקובץ `app/global-error.tsx` הוא מוסכמה מיוחדת של Next.js הלוכדת שגיאות המתרחשות בפריסת השורש. מכיוון שייתכן שפרסת השורש עצמה נכשלה, רכיב זה מעבד את התגים `<html>` ו-`<body>` משלו.

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

התנהגויות מפתח:
- רושם את השגיאה לקונסולה בהתקנה באמצעות `useEffect`
- מציג מעקב מחסנית ותקציר שגיאות במצב פיתוח בלבד
- מספק לחצן **רענן** (מתקשר ל`reset()` כדי לעבד מחדש את הקטע) וקישור **חזור הביתה**
- ה-`error.digest` הוא hash שנוצר על ידי שרת שימושי לתיאום עם יומנים בצד השרת

## עמוד לא נמצא

הקובץ `app/not-found.tsx` מטפל ב-404 תגובות. זהו רכיב לקוח המשתמש בנתב Next.js לניווט.

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

הדף כולל קטע של הצעות חיפוש וקישור לדף העזרה/תמיכה.

## רכיב גבול שגיאת תגובה

גבול הליבה לשימוש חוזר נמצא ב-`components/error-boundary.tsx`. זהו רכיב מחלקה React (נדרש עבור `componentDidCatch`) המשתלב עם מערכת הניתוח.

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

החלטות עיצוביות בולטות:
- **שילוב אנליטיקס**: שגיאות מדווחות אוטומטית באמצעות `analytics.captureException`
- **החלפה מותאמת אישית**: העבר מאפיין `fallback` כדי להציג ממשק משתמש מותאם אישית, או תן למסך השגיאה המוגדר כברירת מחדל של עמוד מלא להופיע
- **ניסיון חוזר עם השהיה**: ההשהיה של 500ms בניסיון חוזר מספק משוב חזותי ומונע לולאות התרסקות מיידיות
- **פרטים מתקפלים**: בממשק המשתמש המוגדר כברירת מחדל, פרטי השגיאה נמצאים בתוך אלמנט `<details>` כך שמשתמשים יכולים לבדוק את המחסנית
- **כותרת תחתונה טכנית**: מציגה את שם השגיאה, חותמת הזמן וכתובת האתר הנוכחית לניפוי באגים

## ספק שגיאה

ה-`ErrorProvider` בכתובת `components/error-provider.tsx` עוטפת את כל עץ היישומים. הוא מוסיף מאזיני שגיאות JavaScript גלובליים שתופסים שגיאות מחוץ למחזור הרינדור של React.

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

רכיב זה מטפל בשתי קטגוריות של שגיאות שגבולות השגיאה של React אינם יכולים לתפוס:
- **שגיאות גלובליות** (`window.error`): שגיאות סקריפט, חריגים בזמן ריצה מחוץ ל-React
- **דחיות הבטחות ללא טיפול** (`unhandledrejection`): מטפלים נשכחים של `.catch()` או כשלים של `await` שלא נתפסו

## גבול שגיאת מנהל מערכת

לוח המחוונים לניהול עוטף כל חלק ב-`AdminErrorBoundary` משלו, כך שכשל בווידג'ט אחד (למשל, תרשים) לא מוריד את לוח המחוונים כולו.

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

כל `AdminErrorBoundary` מבודד כשלים לקטע משלו, ומאפשר לשאר לוח המחוונים להמשיך לעבוד.

## טיפול בשגיאות API

נתיבי API בצד השרת משתמשים במטפל שגיאות סטנדרטי המוגדר ב-`lib/api/error-handler.ts`:

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

ניתן להשיג גם עטיפת נוחות:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## שיטות עבודה מומלצות לטיפול בשגיאות

1. **עטוף קטעי תכונות** ברכיבים `ErrorBoundary` כך שקריסה אחת לא תוריד את כל הדף
2. **השתמש בחסרונות מותאמים אישית** עבור קטעים קריטיים שבהם אתה רוצה ממשק משתמש שחזור הקשרי יותר
3. **מנף `withErrorHandling`** בנתיבי API כדי להבטיח צורות תגובה עקביות לשגיאה
4. **לעולם אל תחשוף עקבות מחסנית** במהלך הייצור -- `global-error.tsx` ו-`error-handler.ts` שניהם פלט ניפוי באגים בשער מאחורי `NODE_ENV`
5. **דווח ל-Analytics** -- ה-`ErrorBoundary` מדווח אוטומטית לשירות הניתוח באמצעות `analytics.captureException`

## הפניה לקובץ

|קובץ|מטרה|
|------|---------|
|`app/global-error.tsx`|דף שגיאה ברמת השורש עם מעטפת HTML מלאה|
|`app/not-found.tsx`|עמוד 404 לא נמצא עם אפשרויות ניווט|
|`components/error-boundary.tsx`|גבול שגיאה React לשימוש חוזר עם ניתוח|
|`components/error-provider.tsx`|מאזין שגיאה גלובלי של JS עוטף את האפליקציה|
|`components/admin/admin-error-boundary.tsx`|גבול בהיקף עבור ווידג'טים של לוח המחוונים של מנהל מערכת|
|`lib/api/error-handler.ts`|טיפול בשגיאות מסלול API סטנדרטי|
