---
id: items-queries-deep-dive
title: Requêtes d'articles approfondies
sidebar_label: Requêtes d'articles approfondies
sidebar_position: 60
---

# Requêtes d'articles approfondies

Référence complète pour toutes les fonctions de requête de base de données liées aux éléments, y compris l'identification des éléments, la normalisation des slugs, le suivi des vues et l'agrégation des vues.

## Aperçu

La couche de requête d'élément est divisée en deux modules :

- **`item.queries.ts`** -- Utilitaires d'identification d'articles et de normalisation de slugs
- **`item-view.queries.ts`** -- Suivi de la vue des éléments avec déduplication et agrégation quotidiennes

Les éléments du modèle Ever Works sont stockés sous forme de fichiers YAML dans un référentiel CMS basé sur Git. La base de données stocke les **données d'engagement** (votes, commentaires, vues, favoris) saisies par éléments d'élément, et non par le contenu de l'élément lui-même.

## Fichiers sources

```
lib/db/queries/item.queries.ts
lib/db/queries/item-view.queries.ts
```

---

## Function Reference: item.queries.ts

### `normalizeItemSlug`

Normalizes an item slug to ensure consistency across the system.

```typescript
function normalizeItemSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description          |
|-----------|----------|----------|----------------------|
| `slug`    | `string` | Yes      | Raw slug input       |

**Returns:** `string` -- Normalized slug (lowercase, trimmed)

**Throws:**
- `Error` if slug is falsy, not a string, empty after trimming, or contains invalid characters

**Validation Rules:**
- Must be a non-empty string
- After normalization: lowercase and trimmed
- Must match regex `/^[a-zA-Z0-9_-]+$/` (alphanumeric, hyphens, underscores only)

**Usage Example:**

```typescript
import { normalizeItemSlug } from '@/lib/db/queries';

const slug = normalizeItemSlug('My-Cool-Tool');
// Returns: 'my-cool-tool'

normalizeItemSlug(''); // Throws Error
normalizeItemSlug('invalid slug!'); // Throws Error
```

---

### `getItemIdFromSlug`

Mappe un slug d’élément à un itemId pour les opérations de base de données. Dans ce système, l'itemId EST le slug normalisé.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-----------|----------|----------|-------------|
|`slug`|`string`|Oui|Limace d'objet|

**Retours :** `string` -- Slug normalisé comme itemId

**Modèle SQL :** Aucune requête de base de données -- délègue à `normalizeItemSlug`.

---

### `validateItemExists`

Validates if a slug exists in the content system. Currently a placeholder that validates slug format only.

```typescript
async function validateItemExists(slug: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description            |
|-----------|----------|----------|------------------------|
| `slug`    | `string` | Yes      | Item slug to validate  |

**Returns:** `Promise<boolean>` -- `true` if slug format is valid, `false` otherwise

**Note:** This function currently only validates format. It does not check against the actual Git-based content system.

---

## Référence de la fonction : item-view.queries.ts

### `recordItemView`

Enregistre une vue d'élément avec une déduplication quotidienne. Utilise `ON CONFLICT DO NOTHING` pour ignorer silencieusement les vues en double pour le même élément, la même visionneuse et la même date UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Oui|Limace d'objet|
|`view.viewerId`|`string`|Oui|Identifiant du spectateur (utilisateur/anonyme)|
|`view.viewedDateUtc`|`string`|Oui|Chaîne de date UTC (AAAA-MM-JJ)|

**Renvoie :** `Promise<boolean>` -- `true` si une nouvelle vue a été enregistrée, `false` s'il s'agissait d'un doublon

**Modèle SQL :**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Remarques sur les performances :**
- Utilise `ON CONFLICT DO NOTHING` pour les inserts idempotents
- Une contrainte unique sur `(itemId, viewerId, viewedDateUtc)` garantit une déduplication quotidienne
- Aucun aller-retour nécessaire pour vérifier les doublons

---

### `getTotalViewsCount`

Gets the total view count for a set of items.

```typescript
async function getTotalViewsCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<number>` -- Total view count across all specified items

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views WHERE item_id IN (...);
```

**Edge Case:** Returns `0` if `itemSlugs` is empty (no DB query executed).

---

### `getRecentViewsCount`

Obtient le nombre de vues pour les éléments au cours des N derniers jours.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Par défaut|Descriptif|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Oui| --      |Tableau de limaces d'éléments|
|`days`|`number`|Non| `7`     |Nombre de jours pour regarder en arrière|

**Retours :** `Promise<number>` -- Afficher le nombre pour la période

**Modèle SQL :**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Remarques sur les performances :**
- Utilise des chaînes de date UTC pour un filtrage indépendant du fuseau horaire
- Efficace lorsque la colonne `viewedDateUtc` est indexée

---

### `getDailyViewsData`

Returns a Map of daily view counts keyed by date string (YYYY-MM-DD) for the last N days.

```typescript
async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<Map<string, number>>` -- Map of `YYYY-MM-DD` date string to view count

**SQL Pattern:**

```sql
SELECT viewed_date_utc, count(*)
FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?
GROUP BY viewed_date_utc;
```

---

### `getViewsPerItem`

Obtient le nombre de vues par élément pour l’affichage des principaux éléments.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Oui|Tableau de limaces d'éléments|

**Retours :** `Promise<Map<string, number>>` -- Carte du slug d'article pour afficher le nombre

**Modèle SQL :**

```sql
SELECT item_id, count(*) FROM item_views
WHERE item_id IN (...)
GROUP BY item_id;
```

---

## Helper Functions (Internal)

### `getUtcDateString`

Internal helper that returns a UTC date string for N days ago. Uses UTC methods to avoid timezone-related off-by-one errors.

```typescript
function getUtcDateString(daysAgo: number = 0): string
// Returns: 'YYYY-MM-DD' format
```

---

## Notes de performances

1. **Garde de tableau vide** -- Toutes les fonctions d'agrégation renvoient immédiatement des résultats nuls/vides lorsqu'elles transmettent un tableau `itemSlugs` vide, évitant ainsi les requêtes de base de données inutiles.

2. **Déduplication quotidienne** -- `recordItemView` utilise une contrainte unique et `ON CONFLICT DO NOTHING` pour une déduplication efficace et sans verrouillage, sans vérification préalable.

3. **Dates basées sur UTC** -- Le filtrage des dates d'affichage utilise des chaînes de date UTC (`YYYY-MM-DD`), garantissant un comportement cohérent sur tous les fuseaux horaires du serveur.

4. ** Normalisation Slug ** -- `getItemIdFromSlug` est appelé tout au long de la couche d'engagement (votes, commentaires) pour garantir une identification cohérente des éléments.

## Exemples d'utilisation

### Enregistrer une page vue

```typescript
import { recordItemView } from '@/lib/db/queries';

const isNew = await recordItemView({
  itemId: 'clockify',
  viewerId: 'user-123',
  viewedDateUtc: '2025-06-15',
});

if (isNew) {
  console.log('New unique view recorded');
}
```

### Création d'un graphique de vues de tableau de bord

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
