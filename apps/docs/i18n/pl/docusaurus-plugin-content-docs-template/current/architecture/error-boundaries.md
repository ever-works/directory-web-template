---
id: error-boundaries
title: "Granice błędów i obsługa błędów"
sidebar_label: "Granice błędów"
sidebar_position: 25
---

# Granice błędów i obsługa błędów

Szablon implementuje wielowarstwową strategię obsługi błędów przy użyciu granic błędów React, globalnych dostawców błędów i konwencji błędów Next.js. Taka architektura zapewnia sprawne wychwytywanie błędów środowiska wykonawczego, raportowanie do analityki i prezentowanie użytkownikom opcji odzyskiwania.

## Przegląd architektury

System obsługi błędów jest podzielony na cztery warstwy:

|Warstwa|Plik|Zakres|
|-------|------|-------|
|Globalna strona błędów|`app/global-error.tsx`|Wychwytuje błędy w samym układzie głównym|
|Dostawca błędów|`components/error-provider.tsx`|Opakowuje drzewo aplikacji globalnymi detektorami błędów JS|
|Granica błędu|`components/error-boundary.tsx`|Granica komponentu klasy React do wielokrotnego użytku|
|Granica błędu administratora|`components/admin/admin-error-boundary.tsx`|Granica zakresu dla sekcji pulpitu nawigacyjnego administratora|

## Globalna strona błędu

Plik `app/global-error.tsx` to specjalna konwencja Next.js, która wychwytuje błędy występujące w układzie głównym. Ponieważ sam układ główny mógł zawieść, komponent ten renderuje własne znaczniki `<html>` i `<body>`.

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

Kluczowe zachowania:
- Rejestruje błąd w konsoli podczas montażu poprzez `useEffect`
- Pokazuje ślad stosu i podsumowanie błędów tylko w trybie programistycznym
- Udostępnia przycisk **Odśwież** (wywołuje `reset()` w celu ponownego wyrenderowania segmentu) i łącze **Przejdź do strony głównej**
- `error.digest` to skrót generowany przez serwer, przydatny do korelacji z dziennikami po stronie serwera

## Nie znaleziono strony

Plik `app/not-found.tsx` obsługuje 404 odpowiedzi. Jest to komponent klienta, który do nawigacji wykorzystuje router Next.js.

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

Strona zawiera sekcję sugestii wyszukiwania i łącze do strony pomocy/wsparcia.

## Reaguj na błąd komponentu granicznego

Główna granica wielokrotnego użytku znajduje się w `components/error-boundary.tsx`. Jest to komponent klasy React (wymagany dla `componentDidCatch`), który integruje się z systemem analitycznym.

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

Godne uwagi decyzje projektowe:
- **Integracja z analityką**: błędy są automatycznie zgłaszane za pośrednictwem `analytics.captureException`
- **Niestandardowe rozwiązanie awaryjne**: przekaż element `fallback`, aby wyrenderować niestandardowy interfejs użytkownika lub pozwól, aby pojawił się domyślny, pełnostronicowy ekran błędu
- **Ponów próbę z opóźnieniem**: opóźnienie 500 ms przy ponownej próbie zapewnia wizualną informację zwrotną i zapobiega natychmiastowym ponownym awariom
- **Szczegóły zwijane**: w domyślnym interfejsie użytkownika szczegóły błędu znajdują się w elemencie `<details>`, dzięki czemu użytkownicy mogą sprawdzić stos
- **Stopka techniczna**: pokazuje nazwę błędu, sygnaturę czasową i bieżący adres URL do debugowania

## Dostawca błędów

`ErrorProvider` w `components/error-provider.tsx` otacza całe drzewo aplikacji. Dodaje globalne detektory błędów JavaScript, które wychwytują błędy poza cyklem renderowania React.

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

Ten komponent obsługuje dwie kategorie błędów, których granice błędów React nie są w stanie przechwycić:
- **Błędy globalne** (`window.error`): błędy skryptu, wyjątki wykonawcze poza React
- **Nieobsługiwane odrzucenia obietnic** (`unhandledrejection`): zapomniane `.catch()` procedury obsługi lub nieprzechwycone awarie `await`

## Granica błędu administratora

Panel administratora otacza każdą sekcję własnym `AdminErrorBoundary`, więc awaria jednego widżetu (np. wykresu) nie powoduje zniszczenia całego dashboardu.

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

Każdy `AdminErrorBoundary` izoluje awarie w swojej własnej sekcji, umożliwiając dalszą pracę reszty pulpitu nawigacyjnego.

## Obsługa błędów API

Trasy API po stronie serwera korzystają ze standardowej procedury obsługi błędów zdefiniowanej w `lib/api/error-handler.ts`:

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

Dostępne jest również wygodne opakowanie:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Najlepsze praktyki dotyczące obsługi błędów

1. **Zawijaj sekcje funkcji** w komponentach `ErrorBoundary`, aby pojedyncza awaria nie spowodowała zniszczenia całej strony
2. **Użyj niestandardowych rozwiązań awaryjnych** w krytycznych sekcjach, w których potrzebujesz bardziej kontekstowego interfejsu odzyskiwania
3. **Wykorzystaj `withErrorHandling`** w trasach API, aby zagwarantować spójne kształty reakcji na błędy
4. **Nigdy nie ujawniaj śladów stosu** w produkcji — `global-error.tsx` i `error-handler.ts` wyniki debugowania obu bramek za `NODE_ENV`
5. **Zgłoś do analityki** — `ErrorBoundary` automatycznie zgłasza się do usługi analitycznej za pośrednictwem `analytics.captureException`

## Odniesienie do pliku

|Plik|Cel|
|------|---------|
|`app/global-error.tsx`|Strona błędu na poziomie głównym z pełną powłoką HTML|
|`app/not-found.tsx`|Nie znaleziono strony 404 z opcjami nawigacji|
|`components/error-boundary.tsx`|Wielokrotnego użytku Reaguj na granicę błędów za pomocą analiz|
|`components/error-provider.tsx`|Globalny odbiornik błędów JS pakujący aplikację|
|`components/admin/admin-error-boundary.tsx`|Granica zakresu dla widżetów panelu administracyjnego|
|`lib/api/error-handler.ts`|Standaryzowana obsługa błędów trasy API|
