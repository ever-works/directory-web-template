---
id: error-boundaries
title: "Foutgrenzen en foutafhandeling"
sidebar_label: "Foutgrenzen"
sidebar_position: 25
---

# Foutgrenzen en foutafhandeling

De sjabloon implementeert een meerlaagse foutafhandelingsstrategie met behulp van React-foutgrenzen, globale foutproviders en Next.js-foutconventies. Deze architectuur zorgt ervoor dat runtime-fouten op een correcte manier worden opgespoord, aan analyses worden gerapporteerd en aan gebruikers worden gepresenteerd met herstelopties.

## Architectuuroverzicht

Het foutafhandelingssysteem is georganiseerd in vier lagen:

|Laag|Bestand|Reikwijdte|
|-------|------|-------|
|Algemene foutpagina|`app/global-error.tsx`|Vangt fouten op in de hoofdindeling zelf|
|Foutprovider|`components/error-provider.tsx`|Omhult de app-structuur met globale JS-foutlisteners|
|Foutgrens|`components/error-boundary.tsx`|Herbruikbare React-klassecomponentgrens|
|Grens voor beheerdersfout|`components/admin/admin-error-boundary.tsx`|Bereikgrens voor beheerdersdashboardsecties|

## Algemene foutpagina

Het bestand `app/global-error.tsx` is een speciale Next.js-conventie die fouten opspoort die optreden in de hoofdindeling. Omdat de hoofdindeling zelf mogelijk is mislukt, geeft deze component zijn eigen tags `<html>` en `<body>` weer.

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

Belangrijkste gedragingen:
- Registreert de fout op de console tijdens het mounten via `useEffect`
- Toont alleen een stacktracering en foutensamenvatting in de ontwikkelingsmodus
- Biedt een knop **Vernieuwen** (roept `reset()` aan om het segment opnieuw weer te geven) en een link **Naar huis**
- De `error.digest` is een door de server gegenereerde hash die handig is voor het correleren met logboeken op de server

## Niet gevonden pagina

Het bestand `app/not-found.tsx` verwerkt 404 reacties. Het is een clientcomponent die de Next.js-router gebruikt voor navigatie.

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

De pagina bevat een gedeelte met zoeksuggesties en een link naar de help-/ondersteuningspagina.

## Reageerfoutgrenscomponent

De herbruikbare kerngrens bevindt zich op `components/error-boundary.tsx`. Het is een React-klassecomponent (vereist voor `componentDidCatch`) die kan worden geïntegreerd met het analysesysteem.

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

Opmerkelijke ontwerpbeslissingen:
- **Analytics-integratie**: fouten worden automatisch gerapporteerd via `analytics.captureException`
- **Aangepaste fallback**: geef een `fallback` prop door om een aangepaste gebruikersinterface weer te geven, of laat het standaardfoutscherm op volledige pagina verschijnen
- **Opnieuw proberen met vertraging**: de vertraging van 500 ms bij nieuwe pogingen biedt visuele feedback en voorkomt onmiddellijke herhalings-crashloops
- **Opvouwbare details**: in de standaardgebruikersinterface bevinden foutdetails zich in een `<details>`-element, zodat gebruikers de stapel kunnen inspecteren
- **Technische voettekst**: toont de foutnaam, tijdstempel en huidige URL voor foutopsporing

## Foutprovider

De `ErrorProvider` bij `components/error-provider.tsx` omvat de volledige applicatiestructuur. Het voegt globale JavaScript-foutlisteners toe die fouten buiten de React-rendercyclus opvangen.

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

Deze component verwerkt twee categorieën fouten die React-foutgrenzen niet kunnen opvangen:
- **Algemene fouten** (`window.error`): scriptfouten, runtime-uitzonderingen buiten React
- **Niet-afgehandelde afwijzingen van beloftes** (`unhandledrejection`): vergeten `.catch()`-handlers of niet-betrapte `await`-fouten

## Grens voor beheerdersfout

Het beheerdersdashboard verpakt elke sectie in een eigen `AdminErrorBoundary`, zodat een fout in één widget (bijvoorbeeld een diagram) niet het hele dashboard offline haalt.

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

Elke `AdminErrorBoundary` isoleert fouten in zijn eigen sectie, waardoor de rest van het dashboard kan blijven werken.

## API-foutafhandeling

API-routes aan de serverzijde gebruiken een gestandaardiseerde foutafhandelaar gedefinieerd in `lib/api/error-handler.ts`:

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

Er is ook een gemaksverpakking verkrijgbaar:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Beste praktijken voor foutafhandeling

1. **Verpak functiesecties** in `ErrorBoundary` componenten, zodat een enkele crash niet de hele pagina verwijdert
2. **Gebruik aangepaste fallbacks** voor kritieke secties waar u een meer contextuele herstelinterface wilt
3. **Maak gebruik van `withErrorHandling`** in API-routes om consistente foutresponsvormen te garanderen
4. **Leg nooit stacktraces bloot** in productie - de `global-error.tsx` en `error-handler.ts` beide poortdebug-uitvoer achter `NODE_ENV`
5. **Rapporteren aan Analytics** -- de `ErrorBoundary` rapporteert automatisch aan de analyseservice via `analytics.captureException`

## Bestandsreferentie

|Bestand|Doel|
|------|---------|
|`app/global-error.tsx`|Foutpagina op rootniveau met volledige HTML-shell|
|`app/not-found.tsx`|404 niet gevonden pagina met navigatieopties|
|`components/error-boundary.tsx`|Herbruikbaar Reageer op foutgrens met analyses|
|`components/error-provider.tsx`|Globale JS-foutlistener die de app inpakt|
|`components/admin/admin-error-boundary.tsx`|Bereikgrens voor beheerdersdashboardwidgets|
|`lib/api/error-handler.ts`|Gestandaardiseerde afhandeling van API-routefouten|
