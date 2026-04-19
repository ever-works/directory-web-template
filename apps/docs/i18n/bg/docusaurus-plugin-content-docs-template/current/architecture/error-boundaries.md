---
id: error-boundaries
title: "Граници на грешките и обработка на грешки"
sidebar_label: "Граници на грешките"
sidebar_position: 25
---

# Граници на грешките и обработка на грешки

Шаблонът прилага многопластова стратегия за обработка на грешки, използвайки граници на грешките на React, глобални доставчици на грешки и конвенции за грешки на Next.js. Тази архитектура гарантира, че грешките по време на изпълнение се улавят елегантно, докладват се на анализаторите и се представят на потребителите с опции за възстановяване.

## Преглед на архитектурата

Системата за обработка на грешки е организирана в четири слоя:

|Слой|Файл|Обхват|
|-------|------|-------|
|Страница с глобални грешки|`app/global-error.tsx`|Улавя грешки в самото основно оформление|
|Доставчик на грешки|`components/error-provider.tsx`|Обгръща дървото на приложенията с глобални слушатели на JS грешки|
|Граница на грешката|`components/error-boundary.tsx`|Граница на компонент на React клас за многократна употреба|
|Граница на грешка на администратора|`components/admin/admin-error-boundary.tsx`|Граница с обхват за секции на администраторското табло|

## Страница с глобални грешки

Файлът `app/global-error.tsx` е специална Next.js конвенция, която улавя грешки, възникващи в основното оформление. Тъй като самото основно оформление може да е неуспешно, този компонент изобразява свои собствени тагове `<html>` и `<body>`.

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

Ключови поведения:
- Записва грешката в конзолата при монтиране чрез `useEffect`
- Показва проследяване на стека и дайджест на грешки само в режим на разработка
- Осигурява бутон **Опресняване** (извиква `reset()` за повторно изобразяване на сегмента) и връзка **Начало**
- `error.digest` е хеш, генериран от сървъра, полезен за корелиране с регистрационни файлове от страна на сървъра

## Не е намерена страница

Файлът `app/not-found.tsx` обработва 404 отговора. Това е клиентски компонент, който използва маршрутизатора Next.js за навигация.

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

Страницата включва раздел с предложения за търсене и връзка към страницата за помощ/поддръжка.

## Реагиране на граничен компонент на грешка

Основната граница за многократна употреба живее на `components/error-boundary.tsx`. Това е компонент от клас React (необходим за `componentDidCatch`), който се интегрира със системата за анализ.

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

Забележителни дизайнерски решения:
- **Интегриране на анализи**: грешките се докладват автоматично чрез `analytics.captureException`
- **Персонализиран резервен вариант**: подайте `fallback` проп, за да изобразите персонализиран потребителски интерфейс, или оставете стандартния екран за грешка на цяла страница да се появи
- **Повторен опит със закъснение**: забавянето от 500 ms при повторен опит осигурява визуална обратна връзка и предотвратява незабавни повторни сривове
- **Сгъваеми подробности**: в потребителския интерфейс по подразбиране подробностите за грешката са вътре в елемент `<details>`, така че потребителите да могат да проверяват стека
- **Технически долен колонтитул**: показва името на грешката, времето и текущия URL адрес за отстраняване на грешки

## Доставчик на грешки

`ErrorProvider` на `components/error-provider.tsx` обвива цялото дърво на приложението. Той добавя глобални слушатели на грешки в JavaScript, които улавят грешки извън цикъла на рендиране на React.

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

Този компонент обработва две категории грешки, които границите на грешките на React не могат да уловят:
- **Глобални грешки** (`window.error`): грешки в скрипта, изключения по време на изпълнение извън React
- **Необработени отхвърляния на обещания** (`unhandledrejection`): забравени `.catch()` манипулатори или неуловени `await` грешки

## Граница на грешка на администратора

Администраторското табло обгръща всяка секция в свой собствен `AdminErrorBoundary`, така че повреда в един уиджет (напр. диаграма) не сваля цялото табло.

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

Всеки `AdminErrorBoundary` изолира грешките в своя собствена секция, позволявайки на останалата част от таблото да продължи да работи.

## API обработка на грешки

API маршрутите от страна на сървъра използват стандартизиран манипулатор на грешки, дефиниран в `lib/api/error-handler.ts`:

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

Предлага се и удобна опаковка:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Най-добри практики за обработка на грешки

1. **Обвийте секции с функции** в компоненти `ErrorBoundary`, така че един срив да не свали цялата страница
2. **Използвайте персонализирани резервни варианти** за критични секции, където искате по-контекстуален потребителски интерфейс за възстановяване
3. **Използвайте `withErrorHandling`** в маршрутите на API, за да гарантирате последователни форми на отговор на грешка
4. **Никога не излагайте следи на стека** в производството -- `global-error.tsx` и `error-handler.ts` и двата изхода за отстраняване на грешки зад `NODE_ENV`
5. **Докладвайте до анализите** -- `ErrorBoundary` автоматично докладва до услугата за анализ чрез `analytics.captureException`

## Референтен файл

|Файл|Цел|
|------|---------|
|`app/global-error.tsx`|Страница за грешка на основно ниво с пълна HTML обвивка|
|`app/not-found.tsx`|404 не е намерена страница с опции за навигация|
|`components/error-boundary.tsx`|Граница на грешката на React за многократна употреба с анализи|
|`components/error-provider.tsx`|Глобален слушател на JS грешка, обвиващ приложението|
|`components/admin/admin-error-boundary.tsx`|Граница с обхват за уиджети на таблото за управление на администратора|
|`lib/api/error-handler.ts`|Стандартизирано обработване на грешки в маршрута на API|
