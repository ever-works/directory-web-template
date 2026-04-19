---
id: error-boundaries
title: "Confini degli errori e gestione degli errori"
sidebar_label: "Confini di errore"
sidebar_position: 25
---

# Confini degli errori e gestione degli errori

Il modello implementa una strategia di gestione degli errori a più livelli utilizzando i limiti degli errori React, i provider di errori globali e le convenzioni di errore Next.js. Questa architettura garantisce che gli errori di runtime vengano rilevati con garbo, segnalati all'analisi e presentati agli utenti con opzioni di ripristino.

## Panoramica dell'architettura

Il sistema di gestione degli errori è organizzato in quattro livelli:

|Strato|Archivio|Ambito|
|-------|------|-------|
|Pagina di errore globale|`app/global-error.tsx`|Rileva gli errori nel layout root stesso|
|Fornitore di errori|`components/error-provider.tsx`|Avvolge l'albero delle app con listener di errori JS globali|
|Confine di errore|`components/error-boundary.tsx`|Confine del componente della classe React riutilizzabile|
|Limite di errore dell'amministratore|`components/admin/admin-error-boundary.tsx`|Limite ambito per le sezioni del dashboard di amministrazione|

## Pagina di errore globale

Il file `app/global-error.tsx` è una speciale convenzione Next.js che rileva gli errori che si verificano nel layout root. Poiché il layout root stesso potrebbe non essere riuscito, questo componente esegue il rendering dei propri tag `<html>` e `<body>`.

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

Comportamenti chiave:
- Registra l'errore sulla console durante il montaggio tramite `useEffect`
- Mostra l'analisi dello stack e il digest degli errori solo in modalità di sviluppo
- Fornisce un pulsante **Aggiorna** (chiama `reset()` per eseguire nuovamente il rendering del segmento) e un collegamento **Vai a casa**
- `error.digest` è un hash generato dal server utile per la correlazione con i log lato server

## Pagina non trovata

Il file `app/not-found.tsx` gestisce 404 risposte. È un componente client che utilizza il router Next.js per la navigazione.

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

La pagina include una sezione di suggerimenti per la ricerca e un collegamento alla pagina di aiuto/supporto.

## Componente limite errore reazione

Il confine riutilizzabile principale si trova in `components/error-boundary.tsx`. È un componente della classe React (richiesto per `componentDidCatch`) che si integra con il sistema di analisi.

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

Notevoli decisioni di progettazione:
- **Integrazione di Analytics**: gli errori vengono segnalati automaticamente tramite `analytics.captureException`
- **Falback personalizzato**: passa una prop `fallback` per eseguire il rendering di un'interfaccia utente personalizzata o lascia che venga visualizzata la schermata di errore predefinita a pagina intera
- **Riprova con ritardo**: il ritardo di 500 ms al tentativo fornisce un feedback visivo e previene cicli di re-crash istantanei
- **Dettagli comprimibili**: nell'interfaccia utente predefinita, i dettagli dell'errore si trovano all'interno di un elemento `<details>` in modo che gli utenti possano controllare lo stack
- **Piè di pagina tecnico**: mostra il nome dell'errore, il timestamp e l'URL corrente per il debug

## Fornitore di errori

`ErrorProvider` in `components/error-provider.tsx` racchiude l'intero albero dell'applicazione. Aggiunge ascoltatori di errori JavaScript globali che rilevano errori al di fuori del ciclo di rendering di React.

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

Questo componente gestisce due categorie di errori che i limiti di errore di React non possono rilevare:
- **Errori globali** (`window.error`): errori di script, eccezioni di runtime all'esterno di React
- **Rifiuti di promesse non gestiti** (`unhandledrejection`): gestori `.catch()` dimenticati o errori `await` non rilevati

## Limite di errore dell'amministratore

Il dashboard di amministrazione racchiude ciascuna sezione nel proprio `AdminErrorBoundary` in modo che un errore in un widget (ad esempio un grafico) non distrugga l'intero dashboard.

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

Ciascun `AdminErrorBoundary` isola gli errori nella propria sezione, consentendo al resto del dashboard di continuare a funzionare.

## Gestione degli errori API

I percorsi API lato server utilizzano un gestore errori standardizzato definito in `lib/api/error-handler.ts`:

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

È disponibile anche un involucro conveniente:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Best practice per la gestione degli errori

1. **Racchiude le sezioni delle funzionalità** nei componenti `ErrorBoundary` in modo che un singolo arresto anomalo non rovini l'intera pagina
2. **Utilizza fallback personalizzati** per le sezioni critiche in cui desideri un'interfaccia utente di ripristino più contestuale
3. **Sfrutta `withErrorHandling`** nei percorsi API per garantire forme di risposta agli errori coerenti
4. **Non esporre mai le analisi dello stack** in produzione: `global-error.tsx` e `error-handler.ts` eseguono entrambi il gate dell'output di debug dietro `NODE_ENV`
5. **Segnala all'analisi** -- `ErrorBoundary` segnala automaticamente al servizio di analisi tramite `analytics.captureException`

## Riferimento al file

|Archivio|Scopo|
|------|---------|
|`app/global-error.tsx`|Pagina di errore a livello di root con shell HTML completa|
|`app/not-found.tsx`|Pagina 404 non trovata con opzioni di navigazione|
|`components/error-boundary.tsx`|Riutilizzabile Reagisci al limite di errore con l'analisi|
|`components/error-provider.tsx`|Listener di errori JS globali che eseguono il wrapping dell'app|
|`components/admin/admin-error-boundary.tsx`|Limite ambito per i widget del dashboard di amministrazione|
|`lib/api/error-handler.ts`|Gestione standardizzata degli errori del percorso API|
