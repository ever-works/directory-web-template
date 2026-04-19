---
id: query-client-system
title: "Requête du système client"
sidebar_label: "Requête du système client"
sidebar_position: 43
---

# Requête du système client

## Aperçu

Le système client de requête fournit une configuration centralisée de TanStack React Query pour l'application. Il se compose de deux modules : une fabrique de clients de requêtes à usage général (`lib/query-client.ts`) qui gère la gestion des singletons serveur/client, et une configuration optimisée pour la facturation (`lib/react-query-config.ts`) avec des fabriques de clés de requête, des stratégies de prélecture et des utilitaires d'invalidation du cache.

## Architecture

Le système dispose de deux points d’entrée répondant à des préoccupations différentes :

- **`lib/query-client.ts`** -- Client de requête principal utilisé dans l'application. Il crée des instances distinctes pour les environnements serveur et client, garantissant que le rendu côté serveur ne partage pas l'état entre les requêtes tandis que le navigateur réutilise une seule instance.
- **`lib/react-query-config.ts`** -- Un client de requête spécialisé configuré pour la gestion de la facturation et des abonnements. Il ajoute des usines de clés de requête, des stratégies de prélecture et des utilitaires d'invalidation de cache adaptés aux données liées aux paiements.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## Référence API

### Exportations depuis `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Fonction d'usine qui crée un nouveau `QueryClient` avec les valeurs par défaut suivantes :

|Options|Valeur|Objectif|
|--------|-------|---------|
|`staleTime`|5 minutes|Données considérées comme fraîches|
|`gcTime`|10 minutes|Rétention du cache après la dernière utilisation|
|`refetchOnWindowFocus`|`false`|Empêcher les récupérations excessives|
|`refetchOnMount`|`false`|Ignorer la récupération si les données sont récentes|
|`refetchOnReconnect`|`true`|Récupérer lors de la récupération du réseau|
|`retry`|Jusqu'à 2 tentatives|Nouvelle tentative simple pour toutes les erreurs|
|`retryDelay`|Retard exponentiel, maximum 30 s|`1000 * 2^attempt`|
|Mutation `retry`| 1 |Réessayez les mutations une fois|
|Mutation `onError`|Toast + console.erreur|Notification d'erreur globale|

#### `getQueryClient(): QueryClient`

Renvoie l'instance `QueryClient` appropriée. Sur le serveur, il crée une nouvelle instance par appel (pas d'état partagé). Sur le client, il renvoie une instance singleton (créée une fois et réutilisée).

### Exportations depuis `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Une instance `QueryClient` préconfigurée optimisée pour les opérations de facturation. Principales différences par rapport au client général :

- `refetchOnWindowFocus: true` -- Garantit que le statut de l'abonnement est toujours à jour
- `refetchOnMount: true` -- Récupère les données obsolètes lors du montage du composant
- La nouvelle tentative ignore les erreurs 4xx et 401 (les erreurs client/authentification ne sont pas réessayées)
- L'intervalle exponentiel inclut la gigue (85 à 115 % du délai de base)
- `notifyOnChangeProps` défini sur `['data', 'error', 'isLoading', 'isFetching']` pour des rendus optimisés

#### `queryKeys`

Fabrique de clés de requête hiérarchique pour une gestion cohérente du cache :

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

Fonctions de prélecture prédéfinies pour les modèles de navigation courants :

- `prefetchStrategies.billing()` -- Pré-récupère les données d'abonnement et de paiement
- `prefetchStrategies.userProfile()` -- Pré-récupère les données du profil utilisateur

#### `cacheUtils`

Utilitaires de gestion du cache :

- `cacheUtils.invalidateBilling()` -- Invalide toutes les requêtes de facturation
- `cacheUtils.invalidateSubscription()` -- Invalide la requête d'abonnement
- `cacheUtils.invalidatePayments()` -- Invalide la requête de paiement
- `cacheUtils.removeBilling()` -- Supprime toutes les données de facturation du cache
- `cacheUtils.resetCache()` -- Efface tout le cache des requêtes

## Détails de mise en œuvre

**Répartition serveur/client** : `getQueryClient()` utilise l'indicateur `isServer` de TanStack pour déterminer l'environnement. Les instances de serveur sont éphémères (nouvelles par requête) pour éviter les fuites de données entre les utilisateurs. Le singleton du navigateur est stocké dans une variable au niveau du module.

**Stratégie de gestion des erreurs** : le client général utilise `toast.error()` de Sonner pour les erreurs de mutation, fournissant ainsi un retour immédiat de l'utilisateur. Le client de facturation ignore les nouvelles tentatives en cas d'erreurs 4xx, car elles indiquent des problèmes côté client que les nouvelles tentatives ne résoudront pas.

**Réessayer avec instabilité** : le client de facturation ajoute une instabilité aléatoire (85 à 115 % du délai de base) à l'intervalle d'attente exponentiel pour éviter des problèmes de troupeau tonitruants lorsque de nombreux clients réessayent simultanément après une interruption de service.

## Configuration

Aucun fichier de configuration supplémentaire n'est nécessaire. Les deux clients sont entièrement configurés en code. Pour ajuster les valeurs par défaut, modifiez le `defaultOptions` dans les fonctions d'usine respectives.

## Exemples d'utilisation

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## Meilleures pratiques

- Utilisez `getQueryClient()` à partir de `lib/query-client.ts` pour toutes les récupérations de données générales ; utilisez le client spécifique à la facturation uniquement pour les fonctionnalités liées au paiement.
- Utilisez toujours les usines `queryKeys` pour la cohérence des clés de cache ; ne codez jamais en dur les tableaux de clés de requête.
- Appelez `cacheUtils.invalidateBilling()` après toute mutation modifiant l'état d'abonnement ou de paiement.
- Utilisez `prefetchStrategies` en survol ou en préchargement d'itinéraire pour améliorer les performances perçues.
- Évitez d'appeler `cacheUtils.resetCache()` en production sauf en cas d'absolue nécessité, car cela supprime toutes les données mises en cache.

## Modules associés

- [API Client Layer](/template/architecture/api-client-layer) -- Rend les appels API consommés par les fonctions de requête
- [Guards System](./guards-system-deep-dive) -- Contrôle d'accès basé sur un plan qui peut dépendre des données d'abonnement
