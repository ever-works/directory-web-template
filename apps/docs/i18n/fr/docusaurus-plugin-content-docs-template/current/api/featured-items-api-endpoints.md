---
id: featured-items-api-endpoints
title: "Points de terminaison API Éléments en Vedette"
sidebar_label: "API Éléments en Vedette"
sidebar_position: 63
---

# Points de terminaison API Éléments en Vedette

L'API Éléments en Vedette fournit un point de terminaison public pour récupérer les éléments mis en avant sur le site web. Les éléments en vedette sont gérés via le panneau d'administration et stockés dans la base de données avec prise en charge de l'ordonnancement, de l'activation et des dates d'expiration.

**Source :** `template/app/api/featured-items/route.ts`

---

## Obtenir les éléments en vedette

Retourne une liste d'éléments en vedette actifs pour l'affichage public. Filtre automatiquement les éléments inactifs et (optionnellement) les éléments expirés.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/featured-items` |
| **Auth** | Aucune (public) |

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | Non | `6` | Nombre maximum d'éléments en vedette à retourner (1-50) |
| `includeExpired` | `boolean` | Non | `false` | Indique si les éléments dont la date `featured_until` est passée doivent être inclus |

### Réponse

**Statut 200** -- Éléments en vedette récupérés avec succès.

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
    }
  ],
  "count": 1
}
```

### Champs de réponse

| Champ | Type | Description |
|-------|------|-------------|
| `data` | `array` | Tableau d'objets d'éléments en vedette |
| `count` | `number` | Nombre d'éléments en vedette retournés |
| `data[].id` | `string` | Identifiant de l'enregistrement de l'élément en vedette |
| `data[].itemSlug` | `string` | Identifiant slug de l'élément |
| `data[].itemName` | `string` | Nom d'affichage de l'élément |
| `data[].itemDescription` | `string \| null` | Description de l'élément en vedette |
| `data[].itemIconUrl` | `string \| null` | URL de l'icône de l'élément |
| `data[].itemImageUrl` | `string \| null` | URL de l'image bannière en vedette |
| `data[].featuredOrder` | `number` | Ordre d'affichage (plus élevé = plus prominent) |
| `data[].isActive` | `boolean` | Indique si l'élément est actuellement en vedette |
| `data[].featuredAt` | `string` (ISO 8601) | Date de mise en vedette de l'élément |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Date d'expiration (`null` = pas d'expiration) |
| `data[].createdAt` | `string` (ISO 8601) | Horodatage de création de l'enregistrement |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Horodatage de la dernière mise à jour |

### Tri

Les éléments sont triés par :
1. `featuredOrder` décroissant (ordre le plus élevé en premier)
2. `featuredAt` décroissant (éléments mis en vedette le plus récemment en premier)

### Logique de filtrage

Le point de terminaison applique ces filtres :

1. **Actifs uniquement :** Seuls les éléments avec `isActive = true` sont retournés.
2. **Vérification d'expiration** (lorsque `includeExpired` est `false`) :
   - Les éléments avec `featuredUntil = null` sont toujours inclus (pas d'expiration).
   - Les éléments avec `featuredUntil >= date actuelle` sont inclus (pas encore expirés).
   - Les éléments avec `featuredUntil < date actuelle` sont exclus.

### Réponse d'erreur

**Statut 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Exemples curl

```bash
# Obtenir les éléments en vedette par défaut (top 6, exclure les expirés)
curl -s http://localhost:3000/api/featured-items

# Obtenir les 3 premiers éléments en vedette
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Inclure les éléments en vedette expirés
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Combiner les paramètres
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### Utilisation TypeScript

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Utilisation
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (order: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Expires: ${item.featuredUntil}`);
  }
});
```

### Remarques d'implémentation

- La disponibilité de la base de données est vérifiée au démarrage via `checkDatabaseAvailability()`.
- Le paramètre `limit` est analysé depuis la chaîne de requête avec une valeur par défaut de `6`. Les valeurs supérieures à 50 ne sont pas plafonnées (validation côté client).
- Les erreurs ne sont journalisées qu'en mode développement pour éviter le bruit dans les journaux de production.
- Les éléments en vedette sont gérés via les points de terminaison du panneau d'administration (voir [Points de terminaison d'administration](/template/api/admin-endpoints)).
- Le champ `featuredUntil` prend en charge à la fois la mise en vedette permanente (`null`) et la mise en vedette à durée limitée.
