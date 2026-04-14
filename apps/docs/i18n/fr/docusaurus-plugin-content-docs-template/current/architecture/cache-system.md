---
id: cache-system
title: "Système de cache"
sidebar_label: "Système de cache"
sidebar_position: 40
---

# Système de cache

## Aperçu

Le système de cache fournit une configuration et une invalidation centralisées du cache pour l'application Next.js. Il définit des durées TTL (Time To Live) cohérentes et des clés de cache basées sur des balises utilisées avec Next.js `unstable_cache`, et propose des utilitaires d'invalidation de cache sécurisés qui gèrent les cas extrêmes tels que les restrictions de phase de rendu dans Next.js 16.

## Architecture

Le système de cache est divisé en deux modules qui fonctionnent ensemble :

- **`lib/cache-config.ts`** -- Définit toutes les constantes TTL du cache et les générateurs de balises de cache. Il s’agit de la source unique de vérité sur la durée pendant laquelle les données restent mises en cache et sur les balises utilisées pour une invalidation ciblée.
- **`lib/cache-invalidation.ts`** -- Fournit des fonctions asynchrones qui appellent `revalidateTag()` pour invalider des caches spécifiques ou tous liés au contenu. Il enveloppe chaque appel dans une logique de sécurité pour gérer les erreurs de phase de rendu Next.js avec élégance.

Les deux modules sont consommés par la couche de contenu (`lib/content.ts`) et les processus de synchronisation en arrière-plan pour conserver les données mises en cache à jour après les mises à jour du référentiel.

## Référence API

### Exportations depuis `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Objet constant définissant les durées de cache en secondes pour chaque catégorie de données.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

Cachez les définitions de balises à utiliser avec `revalidateTag()`. Les balises statiques sont des chaînes simples ; Les balises dynamiques sont des fonctions d'usine qui acceptent un paramètre slug ou locale.

### Exportations depuis `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Invalide tous les caches liés au contenu (contenu, éléments, catégories, balises, collections, pages) et efface le cache en mémoire `fetchItems`. Doit être appelé après une synchronisation réussie du référentiel.

#### `invalidateItemCache(slug: string): Promise<void>`

Invalide le cache pour un seul élément identifié par son slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Invalide le cache pour une seule page statique identifiée par son slug.

## Détails de mise en œuvre

**Sécurité pendant la phase de rendu** : Next.js génère une erreur lorsque `revalidateTag()` est appelé pendant la phase de rendu React. Le wrapper interne `safeRevalidateTag()` détecte cette erreur spécifique à l'aide de `isRenderPhaseError()`, qui vérifie que plusieurs modèles de chaînes (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) sont résilients. par rapport aux modifications du message d'erreur Next.js d'une version à l'autre.

**Compatibilité Next.js 16** : l'appel `revalidateTag()` inclut un deuxième argument `'max'` pour la sémantique obsolète pendant la revalidation, comme l'exige Next.js 16.

**Effacement du cache en mémoire** : après l'invalidation basée sur les balises, `invalidateContentCaches()` appelle également `clearFetchItemsCache()` pour vider toutes les données en mémoire qui contournent le cache basé sur le fichier Next.js.

## Configuration

Aucune configuration supplémentaire n'est requise. Les valeurs TTL sont des constantes codées en dur. Pour modifier les durées du cache, modifiez les valeurs dans `CACHE_TTL`.

|Constante|Durée|Cas d'utilisation|
|----------|----------|----------|
|`CONTENT`|600 s (10 minutes)|Cache de contenu général|
|`ITEM`|600 s (10 minutes)|Pages d'articles individuels|
|`CONFIG`|600 s (10 minutes)|Configuration du site|
|`PAGES`|600 s (10 minutes)|Pages statiques|

## Exemples d'utilisation

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## Meilleures pratiques

- Utilisez toujours les constantes `CACHE_TAGS` au lieu de chaînes de balises codées en dur pour éviter les fautes de frappe et garantir la cohérence.
- Appelez `invalidateContentCaches()` après chaque synchronisation réussie du référentiel pour conserver les données à jour.
- Utilisez des balises spécifiques aux paramètres régionaux (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) lors de la mise en cache des données filtrées par paramètres régionaux pour activer l'invalidation ciblée.
- N'appelez pas directement `revalidateTag()` ; utilisez les wrappers sécurisés de `cache-invalidation.ts` pour éviter les plantages lors de la phase de rendu.
- Gardez les valeurs TTL alignées sur les types de données associés pour éviter les références croisées obsolètes.

## Modules associés

- [Bibliothèque de contenu](/template/architecture/content-library) -- Consommateur principal des balises de cache et des valeurs TTL
- [Config Manager System](./config-manager-system) -- Utilise `CACHE_TAGS.CONFIG` pour la mise en cache de la configuration du site
