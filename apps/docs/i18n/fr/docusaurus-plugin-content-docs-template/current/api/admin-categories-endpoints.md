---
id: admin-categories-endpoints
title: "Points de terminaison Admin Catégories"
sidebar_label: "Admin Catégories"
sidebar_position: 30
---

# Points de terminaison Admin Catégories

L'API Admin Catégories fournit des opérations CRUD complètes pour gérer les catégories de contenu, y compris la réorganisation et la synchronisation Git avec un dépôt de données distant. Tous les points de terminaison requièrent une authentification administrateur via une authentification par session.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Admin | Lister les catégories (paginé) |
| `POST` | `/api/admin/categories` | Admin | Créer une nouvelle catégorie |
| `GET` | `/api/admin/categories/all` | Admin | Obtenir toutes les catégories (depuis le cache) |
| `GET` | `/api/admin/categories/{id}` | Admin | Obtenir une catégorie par ID |
| `PUT` | `/api/admin/categories/{id}` | Admin | Mettre à jour une catégorie |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Suppression douce ou définitive |
| `PUT` | `/api/admin/categories/reorder` | Admin | Réordonner les catégories par tableau d'ID |
| `GET` | `/api/admin/categories/git` | Admin | Obtenir le statut Git et les catégories |
| `POST` | `/api/admin/categories/git` | Admin | Créer une catégorie via commit Git |

## Authentification

Tous les points de terminaison de gestion des catégories vérifient la présence d'une session active avec des privilèges administrateur :

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Points de terminaison

### GET `/api/admin/categories`

Retourne une liste paginée de catégories avec filtrage et tri optionnels.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `page` | entier | `1` | Numéro de page (minimum : 1) |
| `limit` | entier | `10` | Éléments par page (1--100) |
| `includeInactive` | chaîne | `"false"` | Inclure les catégories inactives |
| `sortBy` | chaîne | `"name"` | Champ de tri : `"name"` ou `"id"` |
| `sortOrder` | chaîne | `"asc"` | Direction : `"asc"` ou `"desc"` |

**Réponse (200) :**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Crée une nouvelle catégorie. Le champ `id` est optionnel et sera auto-généré à partir du nom s'il n'est pas fourni. Invalide les caches de contenu en cas de succès.

**Corps de la requête :**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `id` | chaîne | Non | Identifiant URL (`^[a-z0-9-]+$`). Auto-généré si omis. |
| `name` | chaîne | Oui | Nom d'affichage (2--100 caractères) |

**Réponse (201) :**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Retourne toutes les catégories depuis le cache de contenu pour une locale donnée. Utile pour les menus déroulants et sélecteurs d'administration.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `locale` | chaîne | `"en"` | Code de locale pour la récupération du contenu |

**Réponse (200) :**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Récupère une catégorie unique par son identifiant.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Met à jour le nom d'une catégorie existante. Invalide les caches de contenu en cas de succès.

**Corps de la requête :**

```json
{ "name": "Productivity Tools" }
```

**Réponse (200) :**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Supprime une catégorie. Par défaut, effectue une suppression douce (désactivation). Utilisez le paramètre `hard=true` pour une suppression permanente. Invalide les caches de contenu en cas de succès.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `hard` | chaîne | `"false"` | Mettre à `"true"` pour une suppression permanente |

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Réordonne les catégories selon un tableau d'identifiants. La position de chaque ID dans le tableau détermine le nouvel ordre d'affichage.

**Corps de la requête :**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Règles de validation :**
- `categoryIds` doit être un tableau non vide
- Toutes les valeurs doivent être des chaînes

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Récupère l'état du dépôt Git et les catégories depuis le dépôt de données GitHub configuré. Requiert les variables d'environnement `DATA_REPOSITORY` et `GITHUB_TOKEN`.

**Réponse (200) :**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Crée une nouvelle catégorie et la commet directement dans le dépôt de données GitHub. Requiert les variables `DATA_REPOSITORY` et `GH_TOKEN`.

**Corps de la requête :**

```json
{ "id": "productivity", "name": "Productivity" }
```

Les champs `id` et `name` sont tous les deux requis pour la création via Git.

**Réponse (200) :**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Codes d'erreur

| Statut | Erreur | Cause |
|--------|-------|-------|
| `400` | Paramètres de pagination invalides | Page < 1 ou limit hors de 1--100 |
| `400` | Le nom de la catégorie est requis | `name` manquant dans la requête de création |
| `400` | categoryIds doit être un tableau | Charge utile de réordonnancement invalide |
| `401` | Non autorisé. Accès administrateur requis. | Session manquante ou non-admin |
| `404` | Catégorie non trouvée | ID de catégorie invalide |
| `409` | Une catégorie avec ce nom existe déjà | Nom dupliqué lors de la création/mise à jour |
| `500` | DATA_REPOSITORY non configuré | Variable d'environnement manquante pour les points de terminaison Git |
| `500` | Jeton GitHub non configuré | `GITHUB_TOKEN` ou `GH_TOKEN` manquant |

## Invalidation du cache

Toutes les opérations d'écriture (création, mise à jour, suppression, réordonnancement) appellent `invalidateContentCaches()` pour s'assurer que les modifications sont immédiatement visibles dans toute l'application.

## Documentation associée

- [Vue d'ensemble des points de terminaison Admin](./admin-endpoints.md)
- [Points de terminaison publics des catégories](./category-endpoints.md)
- [Patterns de réponse](./response-patterns.md)
- [Validation des requêtes](./request-validation.md)
