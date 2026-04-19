---
id: error-boundaries
title: "Границы ошибок и обработка ошибок"
sidebar_label: "Границы ошибок"
sidebar_position: 25
---

# Границы ошибок и обработка ошибок

Шаблон реализует многоуровневую стратегию обработки ошибок с использованием границ ошибок React, глобальных поставщиков ошибок и соглашений об ошибках Next.js. Эта архитектура гарантирует, что ошибки выполнения будут корректно обнаруживаться, сообщаться аналитике и предоставляться пользователям с вариантами восстановления.

## Обзор архитектуры

Система обработки ошибок разделена на четыре уровня:

|Слой|Файл|Область применения|
|-------|------|-------|
|Страница глобальных ошибок|`app/global-error.tsx`|Отлавливает ошибки в самом корневом макете|
|Ошибка поставщика|`components/error-provider.tsx`|Обертывает дерево приложения глобальными прослушивателями ошибок JS.|
|Граница ошибки|`components/error-boundary.tsx`|Многоразовая граница компонента класса React|
|Граница ошибки администратора|`components/admin/admin-error-boundary.tsx`|Граница области действия разделов панели администратора|

## Страница глобальных ошибок

Файл `app/global-error.tsx` — это специальное соглашение Next.js, которое фиксирует ошибки, возникающие в корневом макете. Поскольку сам корневой макет мог оказаться неудачным, этот компонент отображает свои собственные теги `<html>` и `<body>`.

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

Ключевые модели поведения:
- Регистрирует ошибку на консоли при монтировании через `useEffect`.
- Показывает трассировку стека и дайджест ошибок только в режиме разработки.
- Предоставляет кнопку **Обновить** (вызывает `reset()` для повторной визуализации сегмента) и ссылку **Перейти домой**.
- `error.digest` — это генерируемый сервером хэш, полезный для корреляции с журналами на стороне сервера.

## Страница не найдена

Файл `app/not-found.tsx` обрабатывает 404 ответа. Это клиентский компонент, который использует маршрутизатор Next.js для навигации.

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

На странице есть раздел предложений по поиску и ссылка на страницу помощи/поддержки.

## Граничный компонент ошибки React

Основная многоразовая граница находится по адресу `components/error-boundary.tsx`. Это компонент класса React (необходим для `componentDidCatch`), который интегрируется с системой аналитики.

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

Примечательные дизайнерские решения:
- **Интеграция с аналитикой**: об ошибках автоматически сообщается через `analytics.captureException`.
- **Пользовательский резервный вариант**: передайте свойство `fallback` для отрисовки пользовательского пользовательского интерфейса или позвольте появиться полностраничному экрану ошибок по умолчанию.
- **Повторить попытку с задержкой**: задержка в 500 мс при повторной попытке обеспечивает визуальную обратную связь и предотвращает мгновенные повторные сбои.
- **Свертываемые сведения**: в пользовательском интерфейсе по умолчанию сведения об ошибках находятся внутри элемента `<details>`, чтобы пользователи могли проверять стек.
- **Технический нижний колонтитул**: показывает имя ошибки, метку времени и текущий URL-адрес для отладки.

## Ошибка поставщика

`ErrorProvider` в `components/error-provider.tsx` оборачивает все дерево приложения. Он добавляет глобальные прослушиватели ошибок JavaScript, которые улавливают ошибки вне цикла рендеринга React.

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

Этот компонент обрабатывает две категории ошибок, которые границы ошибок React не могут уловить:
- **Глобальные ошибки** (`window.error`): ошибки скрипта, исключения во время выполнения вне React.
- **Необработанные отклонения обещаний** (`unhandledrejection`): забытые обработчики `.catch()` или необнаруженные сбои `await`

## Граница ошибки администратора

Панель администратора оборачивает каждый раздел в отдельный `AdminErrorBoundary`, поэтому сбой в одном виджете (например, диаграмме) не приведет к отключению всей панели управления.

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

Каждый `AdminErrorBoundary` изолирует сбои в своем собственном разделе, позволяя остальной части информационной панели продолжать работу.

## Обработка ошибок API

Маршруты API на стороне сервера используют стандартный обработчик ошибок, определенный в `lib/api/error-handler.ts`:

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

Также доступна удобная упаковка:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Лучшие практики обработки ошибок

1. **Оберните разделы функций** в компоненты `ErrorBoundary`, чтобы при одном сбое не отключалась вся страница.
2. **Используйте собственные резервные варианты** для критических разделов, где вам нужен более контекстуальный пользовательский интерфейс восстановления.
3. **Используйте `withErrorHandling`** в маршрутах API, чтобы гарантировать согласованность форм ответов об ошибках.
4. **Никогда не раскрывайте трассировку стека** в рабочей среде — оба `global-error.tsx` и `error-handler.ts` пропускают выходные данные отладки за `NODE_ENV`
5. **Отчет в службу аналитики** — `ErrorBoundary` автоматически передает отчет в службу аналитики через `analytics.captureException`

## Ссылка на файл

|Файл|Цель|
|------|---------|
|`app/global-error.tsx`|Страница ошибок корневого уровня с полной HTML-оболочкой|
|`app/not-found.tsx`|Страница 404 не найдена с опциями навигации|
|`components/error-boundary.tsx`|Многоразовая граница ошибок React с аналитикой|
|`components/error-provider.tsx`|Глобальный прослушиватель ошибок JS, обертывающий приложение|
|`components/admin/admin-error-boundary.tsx`|Граница области действия виджетов панели администратора|
|`lib/api/error-handler.ts`|Стандартизированная обработка ошибок маршрута API|
