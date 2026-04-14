---
id: error-boundaries
title: "Limites d’erreur et gestion des erreurs"
sidebar_label: "Limites d’erreur"
sidebar_position: 25
---

# Limites d’erreur et gestion des erreurs

Le modèle implémente une stratégie de gestion des erreurs à plusieurs niveaux utilisant les limites d'erreur React, les fournisseurs d'erreurs globaux et les conventions d'erreur Next.js. Cette architecture garantit que les erreurs d'exécution sont détectées correctement, signalées aux analyses et présentées aux utilisateurs avec des options de récupération.

## Présentation de l'architecture

Le système de gestion des erreurs est organisé en quatre couches :

|Couche|Fichier|Portée|
|-------|------|-------|
|Page d'erreur globale|`app/global-error.tsx`|Détecte les erreurs dans la disposition racine elle-même|
|Fournisseur d'erreur|`components/error-provider.tsx`|Encapsule l'arborescence des applications avec des écouteurs d'erreur JS globaux|
|Limite d'erreur|`components/error-boundary.tsx`|Limite du composant de classe React réutilisable|
|Limite d’erreur d’administration|`components/admin/admin-error-boundary.tsx`|Limite de portée pour les sections du tableau de bord d'administration|

## Page d'erreur globale

Le fichier `app/global-error.tsx` est une convention Next.js spéciale qui détecte les erreurs se produisant dans la disposition racine. Étant donné que la mise en page racine elle-même a peut-être échoué, ce composant restitue ses propres balises `<html>` et `<body>`.

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

Comportements clés :
- Enregistre l'erreur sur la console lors du montage via `useEffect`
- Affiche une trace de pile et un résumé des erreurs en mode développement uniquement
- Fournit un bouton **Actualiser** (appelle `reset()` pour restituer le segment) et un lien **Go Home**
- Le `error.digest` est un hachage généré par le serveur, utile pour la corrélation avec les journaux côté serveur.

## Page introuvable

Le fichier `app/not-found.tsx` gère 404 réponses. Il s'agit d'un composant client qui utilise le routeur Next.js pour la navigation.

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

La page comprend une section de suggestions de recherche et un lien vers la page d'aide/support.

## Composant de limite d'erreur de réaction

La limite principale réutilisable se trouve à `components/error-boundary.tsx`. Il s'agit d'un composant de classe React (obligatoire pour `componentDidCatch`) qui s'intègre au système d'analyse.

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

Décisions de conception notables :
- **Intégration Analytics** : les erreurs sont automatiquement signalées via `analytics.captureException`
- **Retour personnalisé** : transmettez un accessoire `fallback` pour afficher une interface utilisateur personnalisée, ou laissez l'écran d'erreur pleine page par défaut apparaître
- **Réessayez avec délai** : le délai de 500 ms lors d'une nouvelle tentative fournit un retour visuel et évite les boucles de re-crash instantané.
- **Détails pliables** : dans l'interface utilisateur par défaut, les détails de l'erreur se trouvent dans un élément `<details>` afin que les utilisateurs puissent inspecter la pile.
- **Pied de page technique** : affiche le nom de l'erreur, l'horodatage et l'URL actuelle pour le débogage

## Fournisseur d'erreur

Le `ErrorProvider` à `components/error-provider.tsx` enveloppe l'intégralité de l'arborescence des applications. Il ajoute des écouteurs d'erreurs JavaScript globaux qui détectent les erreurs en dehors du cycle de rendu React.

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

Ce composant gère deux catégories d'erreurs que les limites d'erreur de React ne peuvent pas détecter :
- **Erreurs globales** (`window.error`) : erreurs de script, exceptions d'exécution en dehors de React
- **Rejets de promesses non gérés** (`unhandledrejection`) : gestionnaires `.catch()` oubliés ou échecs `await` non détectés

## Limite d’erreur d’administration

Le tableau de bord d'administration enveloppe chaque section dans son propre `AdminErrorBoundary` afin qu'une panne dans un widget (par exemple, un graphique) ne supprime pas l'intégralité du tableau de bord.

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

Chaque `AdminErrorBoundary` isole les échecs dans sa propre section, permettant au reste du tableau de bord de continuer à fonctionner.

## Gestion des erreurs API

Les routes API côté serveur utilisent un gestionnaire d'erreurs standardisé défini dans `lib/api/error-handler.ts` :

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

Un emballage pratique est également disponible :

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Meilleures pratiques de gestion des erreurs

1. **Envelopper les sections de fonctionnalités** dans les composants `ErrorBoundary` afin qu'un seul crash ne supprime pas la page entière
2. **Utilisez des solutions de secours personnalisées** pour les sections critiques pour lesquelles vous souhaitez une interface utilisateur de récupération plus contextuelle
3. **Exploitez `withErrorHandling`** dans les routes API pour garantir des formes de réponse d'erreur cohérentes
4. **N'exposez jamais les traces de pile** en production - les `global-error.tsx` et `error-handler.ts` les deux sorties de débogage de porte derrière `NODE_ENV`
5. **Rapport à Analytics** -- le `ErrorBoundary` rapporte automatiquement au service d'analyse via `analytics.captureException`

## Référence du fichier

|Fichier|Objectif|
|------|---------|
|`app/global-error.tsx`|Page d'erreur au niveau racine avec shell HTML complet|
|`app/not-found.tsx`|404 page introuvable avec options de navigation|
|`components/error-boundary.tsx`|Limite d'erreur React réutilisable avec l'analyse|
|`components/error-provider.tsx`|Écouteur d'erreurs JS global encapsulant l'application|
|`components/admin/admin-error-boundary.tsx`|Limite de portée pour les widgets du tableau de bord d'administration|
|`lib/api/error-handler.ts`|Gestion standardisée des erreurs de route API|
