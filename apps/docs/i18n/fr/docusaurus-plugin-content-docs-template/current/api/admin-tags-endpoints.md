---
id: admin-tags-endpoints
title: Points de terminaison API Admin – Tags
sidebar_label: Admin Tags
sidebar_position: 34
---

# Points de terminaison API Admin – Tags

L'API Admin Tags fournit des opérations CRUD complètes pour la gestion des tags de contenu. Les tags sont utilisés pour classer et filtrer les éléments de l'annuaire. L'API prend en charge la liste paginée, la création avec états actif/inactif, les mises à jour, la suppression et la récupération depuis le cache de contenu tenant compte des paramètres régionaux. Toutes les opérations d'écriture invalident les caches de contenu pour une visibilité immédiate.

## Résumé des routes

| Méthode  | Chemin                    | Auth  | Description                                     |
| -------- | ------------------------- | ----- | ----------------------------------------------- |
| `GET`    | `/api/admin/tags`         | Admin | Lister les tags (paginé)                        |
| `POST`   | `/api/admin/tags`         | Admin | Créer un nouveau tag                             |
| `GET`    | `/api/admin/tags/all`     | Admin | Obtenir tous les tags (depuis le cache contenu) |
| `GET`    | `/api/admin/tags/{id}`    | Admin | Obtenir un tag par ID                           |
| `PUT`    | `/api/admin/tags/{id}`    | Admin | Mettre à jour un tag                             |
| `DELETE` | `/api/admin/tags/{id}`    | Admin | Supprimer définitivement un tag                  |

## Authentification

Tous les points de terminaison de gestion des tags requièrent des privilèges admin :

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Points de terminaison

### GET `/api/admin/tags`

Retourne une liste paginée de tous les tags du système. Les paramètres de pagination sont validés avec l'utilitaire partagé `validatePaginationParams`.

**Paramètres de requête :**

| Paramètre | Type   | Défaut | Description                     |
| --------- | ------ | ------ | ------------------------------- |
| `page`    | entier | `1`    | Numéro de page (minimum : 1)    |
| `limit`   | entier | `10`   | Éléments par page (1–100)       |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "design",
        "name": "Design",
        "isActive": true,
        "itemCount": 89,
        "created_at": "2024-01-19T15:20:00.000Z",
        "updated_at": "2024-01-19T15:20:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### POST `/api/admin/tags`

Crée un nouveau tag avec l'ID, le nom et l'état actif optionnel spécifiés. Invalide les caches de contenu en cas de succès.

**Corps de la requête :**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

| Champ      | Type    | Requis | Description                                             |
| ---------- | ------- | ------ | ------------------------------------------------------- |
| `id`       | chaîne  | Oui    | Identifiant slug URL-compatible                         |
| `name`     | chaîne  | Oui    | Nom de tag lisible (2–50 caractères)                    |
| `isActive` | booléen | Non    | Si le tag est actif (défaut : `true`)                   |

**Règles de validation :**
- `id` et `name` sont tous deux requis
- Le nom du tag doit comporter entre 2 et 50 caractères
- L'ID du tag doit être unique parmi tous les tags existants
- Le nom du tag doit être unique parmi tous les tags existants

**Réponse (201) :**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### GET `/api/admin/tags/all`

Retourne tous les tags depuis le cache de contenu pour une locale donnée. Ce point de terminaison lit depuis la couche de cache plutôt que depuis la base de données, ce qui le rend adapté au peuplement des sélecteurs de tags dans l'interface admin.

**Paramètres de requête :**

| Paramètre | Type   | Défaut | Description                                  |
| --------- | ------ | ------ | -------------------------------------------- |
| `locale`  | chaîne | `"en"` | Code de locale pour la récupération du contenu |

**Réponse (200) :**

```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 156
    }
  ]
}
```

### GET `/api/admin/tags/{id}`

Récupère un seul tag par son identifiant unique avec des détails complets incluant les statistiques d'utilisation.

**Paramètres de chemin :**

| Paramètre | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `id`      | chaîne | Identifiant unique du tag     |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/tags/{id}`

Met à jour le nom et/ou le statut actif d'un tag. L'ID du tag ne peut pas être modifié après la création. Invalide les caches de contenu en cas de succès.

**Paramètres de chemin :**

| Paramètre | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `id`      | chaîne | Identifiant unique du tag     |

**Corps de la requête :**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

| Champ      | Type    | Requis | Description                      |
| ---------- | ------- | ------ | -------------------------------- |
| `name`     | chaîne  | Oui    | Nom d'affichage du tag mis à jour |
| `isActive` | booléen | Non    | Statut actif mis à jour           |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### DELETE `/api/admin/tags/{id}`

Supprime définitivement un tag du système. Supprime également le tag de tous les éléments associés. Invalide les caches de contenu en cas de succès.

**Paramètres de chemin :**

| Paramètre | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `id`      | chaîne | Identifiant unique du tag     |

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::caution
La suppression d'un tag est permanente et irréversible. Toutes les associations élément-tag pour le tag supprimé seront retirées. Envisagez de désactiver le tag (en définissant `isActive` à `false` via PUT) si vous souhaitez préserver l'intégrité des données.
:::

## Modèle de données de tag

| Champ        | Type      | Nullable | Description                                      |
| ------------ | --------- | -------- | ------------------------------------------------ |
| `id`         | chaîne    | Non      | Identifiant unique URL-compatible                |
| `name`       | chaîne    | Non      | Nom d'affichage lisible                          |
| `isActive`   | booléen   | Non      | Si le tag peut être assigné à des éléments       |
| `itemCount`  | entier    | Non      | Nombre d'éléments utilisant ce tag              |
| `created_at` | datetime  | Non      | Horodatage de création                           |
| `updated_at` | datetime  | Non      | Horodatage de la dernière mise à jour            |

## Codes d'erreur

| Statut | Erreur                                | Cause                                             |
| ------ | ------------------------------------- | ------------------------------------------------- |
| `400`  | L'ID et le nom du tag sont requis     | Champs requis manquants lors de la création       |
| `400`  | Le nom du tag est requis              | Nom manquant lors de la mise à jour               |
| `400`  | Le nom du tag doit comporter entre 2 et 50 caractères | Échec de la validation de longueur   |
| `400`  | Paramètre de page/limite invalide     | Paramètre de pagination hors limites              |
| `401`  | Non autorisé                          | Session manquante ou non-admin                    |
| `404`  | Tag introuvable                       | Aucun tag avec l'ID donné                         |
| `409`  | Un tag avec cet ID existe déjà       | ID dupliqué lors de la création                   |
| `409`  | Un tag avec ce nom existe déjà       | Nom dupliqué lors de la création/mise à jour      |
| `500`  | Échec de la récupération/création/mise à jour/suppression du tag | Erreur serveur ou base de données |

## Invalidation du cache

Toutes les opérations d'écriture (création, mise à jour, suppression) appellent `invalidateContentCaches()` pour garantir que les modifications des tags sont immédiatement visibles dans le contenu public :

```typescript
await invalidateContentCaches();
```

Cela efface à la fois le cache de contenu en mémoire et les caches CDN éventuellement actifs.

## Sources de données

L'API tags utilise deux sources de données différentes selon le point de terminaison :

| Point de terminaison        | Source de données          | Cas d'usage                             |
| --------------------------- | -------------------------- | --------------------------------------- |
| `GET /api/admin/tags`       | `tagRepository` (base de données) | Gestion admin avec pagination    |
| `POST /api/admin/tags`      | `tagRepository` (base de données) | Création de nouveaux tags        |
| `GET /api/admin/tags/all`   | `getCachedItems()` (cache contenu) | Sélecteurs, lookups rapides     |
| `GET /api/admin/tags/{id}`  | `tagRepository` (base de données) | Vue détaillée du tag           |
| `PUT /api/admin/tags/{id}`  | `tagRepository` (base de données) | Mise à jour des propriétés    |
| `DELETE /api/admin/tags/{id}` | `tagRepository` (base de données) | Suppression des tags          |

## Documentation associée

- [Aperçu des points de terminaison Admin](./admin-endpoints.md)
- [Points de terminaison Admin Catégories](./admin-categories-endpoints.md) – schéma similaire pour la gestion des catégories
- [Modèles de réponse](./response-patterns.md)
- [Validation des requêtes](./request-validation.md)

