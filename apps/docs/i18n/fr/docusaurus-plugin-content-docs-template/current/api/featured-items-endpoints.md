---
id: featured-items-endpoints
title: "Points de terminaison API Éléments en Vedette"
sidebar_label: "Éléments en Vedette"
sidebar_position: 18
---

# Points de terminaison API Éléments en Vedette

L'API Éléments en Vedette fournit un point de terminaison public pour récupérer les éléments mis en avant pour un affichage prominent sur le site web. Les éléments en vedette prennent en charge l'ordonnancement, les dates d'expiration et les états actif/inactif.

**Fichier source :** `template/app/api/featured-items/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/featured-items` | Aucune | Obtenir les éléments en vedette actifs pour l'affichage public |

---

## GET `/api/featured-items`

Retourne une liste d'éléments en vedette actifs pour l'affichage public. Filtre automatiquement les éléments inactifs et exclut optionnellement les éléments expirés selon leur date `featuredUntil`. Les éléments sont triés par ordre de mise en vedette (décroissant) et date de mise en vedette (décroissant) pour une présentation optimale.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | Non | 6 | Nombre maximum d'éléments à retourner (1-50) |
| `includeExpired` | boolean | Non | `false` | Indique si les éléments dont la date `featuredUntil` est passée doivent être inclus |

### Prérequis base de données

Le point de terminaison vérifie la disponibilité de la base de données avant le traitement. Si la base de données n'est pas configurée, la vérification `checkDatabaseAvailability()` retourne une réponse d'erreur appropriée.

### Fonctionnement

La requête construit dynamiquement les conditions selon les paramètres :

```ts
// Toujours filtrer les éléments actifs
const conditions = [eq(featuredItems.isActive, true)];

// Exclure optionnellement les éléments expirés
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Logique de tri

Les éléments sont triés par deux champs en ordre décroissant :

1. **`featuredOrder`** -- Les valeurs plus élevées apparaissent en premier (priorité contrôlée par l'administrateur)
2. **`featuredAt`** -- Les éléments mis en vedette le plus récemment apparaissent en premier (départage)

### Format de réponse

#### 200 -- Éléments en vedette récupérés

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- Aucun élément en vedette

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Erreur serveur

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Modèle de données

Chaque enregistrement d'élément en vedette contient :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique de l'enregistrement |
| `itemSlug` | string | Slug de l'élément en vedette |
| `itemName` | string | Nom d'affichage |
| `itemDescription` | string (nullable) | Description pour l'affichage en vedette |
| `itemIconUrl` | string (nullable) | URL de l'icône de l'élément |
| `itemImageUrl` | string (nullable) | URL de l'image bannière en vedette |
| `featuredOrder` | integer | Priorité d'affichage (plus élevé = plus prominent) |
| `isActive` | boolean | Indique si l'élément est actuellement en vedette |
| `featuredAt` | datetime | Date de mise en vedette de l'élément |
| `featuredUntil` | datetime (nullable) | Date d'expiration (null signifie pas d'expiration) |
| `createdAt` | datetime | Horodatage de création de l'enregistrement |
| `updatedAt` | datetime (nullable) | Horodatage de la dernière mise à jour |

### Comportement d'expiration

- Les éléments avec `featuredUntil: null` n'expirent jamais et sont toujours inclus.
- Les éléments avec une date `featuredUntil` dans le passé sont exclus par défaut.
- Définir `includeExpired=true` contourne le filtrage d'expiration (utile pour les vues d'administration).

### Exemple d'utilisation

```ts
// Récupérer les 3 premiers éléments en vedette pour la section héro de la page d'accueil
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Featured: ${item.itemName} (order: ${item.featuredOrder})`);
  });
}
```

### Remarques

- Les erreurs ne sont journalisées qu'en mode développement (`NODE_ENV === 'development'`).
- Il s'agit d'un **point de terminaison public** -- aucune authentification n'est requise.
- Les éléments en vedette sont gérés par les administrateurs via le panneau d'administration (voir Points de terminaison d'administration).

---

## Fichiers source associés

| Fichier | Rôle |
|------|-------|
| `template/app/api/featured-items/route.ts` | Point de terminaison public des éléments en vedette |
| `template/lib/db/schema.ts` | Définition de la table `featuredItems` |
| `template/lib/utils/database-check.ts` | Vérification de la disponibilité de la base de données |
