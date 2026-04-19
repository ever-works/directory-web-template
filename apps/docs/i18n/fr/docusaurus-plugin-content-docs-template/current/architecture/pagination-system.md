---
id: pagination-system
title: "Système de pagination"
sidebar_label: "Système de pagination"
sidebar_position: 45
---

# Système de pagination

## Aperçu

Le système de pagination fournit des utilitaires de calcul de pagination côté serveur et de navigation de page côté client. Il se compose de deux petits modules ciblés : `lib/paginate.ts` pour calculer les métadonnées de page (numéros de page, décalages) et `utils/pagination.ts` pour limiter en toute sécurité les numéros de page et déclencher un comportement de défilement vers le haut lors des changements de page.

## Architecture

Le système de pagination est intentionnellement léger et divisé en deux couches :

- **`lib/paginate.ts`** (Serveur/partagé) -- Fonctions pures pour les mathématiques de pagination. Utilisé dans les routes API, les composants de serveur et la logique de récupération de données pour calculer la tranche de données à renvoyer.
- **`utils/pagination.ts`** (Client) -- Un assistant d'interface utilisateur qui limite les numéros de page à des plages valides et fait défiler la page vers le haut. Utilisé par les composants de pagination et les vues de liste.

Les deux modules sont consommés par les composants de l'interface utilisateur de pagination et les pages de liste de contenu. Le `ConfigManager` fournit la valeur `itemsPerPage` qui alimente ces calculs.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Référence API

### Exportations depuis `lib/paginate.ts`

#### `PER_PAGE: number`

Éléments par défaut par page constante. Valeur : `12`.

#### `totalPages(size: number, perPage?: number): number`

Calcule le nombre total de pages pour une taille de collection donnée. Utilise `Math.ceil()` pour garantir que la dernière page partielle est incluse.

**Paramètres :**
- `size` -- Nombre total d'éléments dans la collection
- `perPage` -- Éléments par page (par défaut `PER_PAGE`)

**Retours :** Nombre total de pages (minimum 1 pour les collections non vides)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Calcule les métadonnées de pagination à partir d'un paramètre de page brut (qui peut provenir d'une chaîne provenant des paramètres de requête d'URL).

**Paramètres :**
- `rawPage` -- Le numéro de page demandé (par défaut `1`). Accepte à la fois `number` et `string`.
- `perPage` -- Éléments par page (par défaut `PER_PAGE`)

**Retours :**
- `page` -- Le numéro de page analysé sous forme d'entier
- `start` -- Le décalage d'index de base zéro pour découper le tableau de données

### Exportations depuis `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Navigue en toute sécurité vers une nouvelle page en limitant la valeur à la plage valide `[1, total]`, en mettant à jour l'état de la page et en faisant défiler la fenêtre vers le haut avec une animation fluide.

**Paramètres :**
- `newPage` -- Le numéro de page demandé (peut être hors plage)
- `total` -- Nombre total de pages
- `setPage` -- Fonction de définition d'état de réaction pour la page actuelle

**Comportement :**
- Fixe les valeurs `NaN` à la page 1
- Valeurs des pinces inférieures à 1 à la page 1
- Fixe les valeurs supérieures à `total` à `total`
- Appelle `window.scrollTo({ top: 0, behavior: 'smooth' })` (sans danger pour SSR ; vérifie `typeof window`)

## Détails de mise en œuvre

**Analyse de chaîne** : `paginateMeta` accepte `string | number` pour le paramètre `rawPage`, car les paramètres de requête d'URL arrivent sous forme de chaînes. Il utilise `parseInt()` pour la conversion.

**Décalage de base zéro** : la valeur `start` renvoyée par `paginateMeta` est calculée comme `(page - 1) * perPage`, fournissant un index de base zéro adapté aux clauses `Array.slice()` ou SQL `OFFSET`.

**Sécurité SSR** : `clampAndScrollToTop` vérifie `typeof window !== 'undefined'` avant d'appeler `window.scrollTo()`, ce qui permet d'appeler en toute sécurité dans des contextes de rendu côté serveur.

**Gestion NaN** : `clampAndScrollToTop` convertit l'entrée avec `Number()` et revient à la page 1 si le résultat est `NaN`.

## Configuration

La taille de page par défaut (`PER_PAGE = 12`) est une constante dans `lib/paginate.ts`. La taille de la page d'exécution peut être remplacée via `ConfigManager` :

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

Le `ConfigManager` prend en charge deux types de pagination :
- `'standard'` -- Navigation traditionnelle page par page
- `'infinite'` -- Défilement infini / motif de chargement supplémentaire

## Exemples d'utilisation

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Meilleures pratiques

- Utilisez toujours `paginateMeta()` pour analyser les paramètres de page à partir des chaînes de requête d'URL afin de gérer la coercition de type et les valeurs par défaut en toute sécurité.
- Transmettez le remplacement `perPage` de `ConfigManager` plutôt que de vous fier à la constante `PER_PAGE` codée en dur lorsque l'administrateur a peut-être modifié la taille de la page.
- Utilisez `clampAndScrollToTop()` dans toutes les navigations de pages côté client pour éviter les numéros de page hors plage et fournir une UX cohérente.
- Pour les implémentations de défilement infini, utilisez le décalage `start` de `paginateMeta()` pour calculer la prochaine tranche d'éléments à ajouter.
- Tenez compte de la pagination `type` de `ConfigManager` (`'standard'` vs `'infinite'`) lors du choix du composant d'interface utilisateur de pagination à restituer.

## Modules associés

- [Config Manager System](./config-manager-system) -- Fournit la configuration de la pagination d'exécution (`type`, `itemsPerPage`)
- [Bibliothèque de contenu](/template/architecture/content-library) -- Utilise la pagination pour les pages de liste de contenu
