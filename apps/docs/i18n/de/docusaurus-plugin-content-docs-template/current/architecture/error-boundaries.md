---
id: error-boundaries
title: "Fehlergrenzen und Fehlerbehandlung"
sidebar_label: "Fehlergrenzen"
sidebar_position: 25
---

# Fehlergrenzen und Fehlerbehandlung

Die Vorlage implementiert eine mehrschichtige Fehlerbehandlungsstrategie unter Verwendung von React-Fehlergrenzen, globalen Fehleranbietern und Next.js-Fehlerkonventionen. Diese Architektur stellt sicher, dass Laufzeitfehler ordnungsgemäß erkannt, an Analytics gemeldet und Benutzern mit Wiederherstellungsoptionen angezeigt werden.

## Architekturübersicht

Das Fehlerbehandlungssystem ist in vier Schichten organisiert:

|Schicht|Datei|Umfang|
|-------|------|-------|
|Globale Fehlerseite|`app/global-error.tsx`|Fängt Fehler im Root-Layout selbst ab|
|Fehleranbieter|`components/error-provider.tsx`|Umschließt den App-Baum mit globalen JS-Fehler-Listenern|
|Fehlergrenze|`components/error-boundary.tsx`|Wiederverwendbare Komponentengrenze der React-Klasse|
|Admin-Fehlergrenze|`components/admin/admin-error-boundary.tsx`|Bereichsgrenze für Admin-Dashboard-Abschnitte|

## Globale Fehlerseite

Die Datei `app/global-error.tsx` ist eine spezielle Next.js-Konvention, die Fehler abfängt, die im Root-Layout auftreten. Da möglicherweise das Root-Layout selbst fehlgeschlagen ist, rendert diese Komponente ihre eigenen Tags `<html>` und `<body>`.

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

Wichtige Verhaltensweisen:
- Protokolliert den Fehler beim Mounten über `useEffect` in der Konsole.
- Zeigt einen Stack-Trace und einen Fehler-Digest nur im Entwicklungsmodus an
- Bietet eine Schaltfläche **Aktualisieren** (ruft `reset()` auf, um das Segment erneut zu rendern) und einen Link **Zur Startseite**
- Der `error.digest` ist ein vom Server generierter Hash, der für die Korrelation mit serverseitigen Protokollen nützlich ist

## Seite nicht gefunden

Die Datei `app/not-found.tsx` verarbeitet 404-Antworten. Es handelt sich um eine Client-Komponente, die den Next.js-Router für die Navigation verwendet.

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

Die Seite enthält einen Abschnitt mit Suchvorschlägen und einen Link zur Hilfe-/Supportseite.

## Fehlergrenzenkomponente reagieren

Die zentrale wiederverwendbare Grenze liegt bei `components/error-boundary.tsx`. Es handelt sich um eine React-Klassenkomponente (erforderlich für `componentDidCatch`), die in das Analysesystem integriert werden kann.

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

Bemerkenswerte Designentscheidungen:
- **Analytics-Integration**: Fehler werden automatisch über `analytics.captureException` gemeldet
- **Benutzerdefinierter Fallback**: Übergeben Sie eine `fallback`-Requisite, um eine benutzerdefinierte Benutzeroberfläche zu rendern, oder lassen Sie den standardmäßigen ganzseitigen Fehlerbildschirm erscheinen
- **Wiederholen mit Verzögerung**: Die 500-ms-Verzögerung beim erneuten Versuch bietet visuelles Feedback und verhindert sofortige Wiederholungsabsturzschleifen
- **Einklappbare Details**: In der Standard-Benutzeroberfläche befinden sich Fehlerdetails in einem `<details>`-Element, sodass Benutzer den Stapel überprüfen können
- **Technische Fußzeile**: Zeigt den Fehlernamen, den Zeitstempel und die aktuelle URL zum Debuggen an

## Fehleranbieter

Das `ErrorProvider` bei `components/error-provider.tsx` umschließt den gesamten Anwendungsbaum. Es fügt globale JavaScript-Fehler-Listener hinzu, die Fehler außerhalb des React-Renderzyklus abfangen.

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

Diese Komponente behandelt zwei Kategorien von Fehlern, die React-Fehlergrenzen nicht abfangen können:
- **Globale Fehler** (`window.error`): Skriptfehler, Laufzeitausnahmen außerhalb von React
- **Unbehandelte Versprechen-Ablehnungen** (`unhandledrejection`): vergessene `.catch()` Handler oder nicht erfasste `await` Fehler

## Admin-Fehlergrenze

Das Admin-Dashboard umschließt jeden Abschnitt mit einem eigenen `AdminErrorBoundary`, sodass ein Fehler in einem Widget (z. B. einem Diagramm) nicht zum Ausfall des gesamten Dashboards führt.

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

Jeder `AdminErrorBoundary` isoliert Fehler in seinem eigenen Abschnitt, sodass der Rest des Dashboards weiterarbeiten kann.

## API-Fehlerbehandlung

Serverseitige API-Routen verwenden einen standardisierten Fehlerhandler, der in `lib/api/error-handler.ts` definiert ist:

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

Eine praktische Verpackung ist ebenfalls erhältlich:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Best Practices für die Fehlerbehandlung

1. **Funktionsabschnitte** in `ErrorBoundary` Komponenten einschließen, damit ein einzelner Absturz nicht die gesamte Seite zerstört
2. **Verwenden Sie benutzerdefinierte Fallbacks** für kritische Abschnitte, in denen Sie eine kontextbezogenere Wiederherstellungsbenutzeroberfläche wünschen
3. **Nutzen Sie `withErrorHandling`** in API-Routen, um konsistente Fehlerantwortformen zu gewährleisten
4. **Niemals Stapelspuren offenlegen** in der Produktion – die Gate-Debug-Ausgaben `global-error.tsx` und `error-handler.ts` hinter `NODE_ENV`
5. **An Analyse melden** – der `ErrorBoundary` meldet sich automatisch über `analytics.captureException` an den Analysedienst.

## Dateireferenz

|Datei|Zweck|
|------|---------|
|`app/global-error.tsx`|Fehlerseite auf Root-Ebene mit vollständiger HTML-Shell|
|`app/not-found.tsx`|404 nicht gefundene Seite mit Navigationsoptionen|
|`components/error-boundary.tsx`|Wiederverwendbare React-Fehlergrenze mit Analyse|
|`components/error-provider.tsx`|Globaler JS-Fehler-Listener, der die App umschließt|
|`components/admin/admin-error-boundary.tsx`|Bereichsgrenze für Admin-Dashboard-Widgets|
|`lib/api/error-handler.ts`|Standardisierte API-Routenfehlerbehandlung|
