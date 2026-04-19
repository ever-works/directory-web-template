---
id: admin-roles-endpoints
title: Points de terminaison API Admin – Rôles
sidebar_label: Admin Rôles
sidebar_position: 35
---

# Points de terminaison API Admin – Rôles

L'API Rôles fournit des points de terminaison pour gérer les rôles utilisateurs et leurs permissions associées. Les rôles contrôlent les niveaux d'accès dans l'application et peuvent être assignés aux utilisateurs via l'[API Admin Utilisateurs](./admin-users-endpoints.md).

## Chemin de base

```
/api/admin/roles
```

## Résumé des routes

| Méthode  | Chemin                                  | Auth    | Description                              |
| -------- | --------------------------------------- | ------- | ---------------------------------------- |
| `GET`    | `/api/admin/roles`                      | Admin   | Obtenir la liste paginée des rôles       |
| `POST`   | `/api/admin/roles`                      | Admin   | Créer un nouveau rôle                    |
| `GET`    | `/api/admin/roles/active`               | Public  | Obtenir tous les rôles actifs            |
| `GET`    | `/api/admin/roles/stats`                | Admin   | Obtenir les statistiques des rôles       |
| `GET`    | `/api/admin/roles/{id}`                 | Admin   | Obtenir un rôle par ID                   |
| `PUT`    | `/api/admin/roles/{id}`                 | Admin   | Mettre à jour un rôle                    |
| `DELETE` | `/api/admin/roles/{id}`                 | Admin   | Supprimer un rôle (doux ou définitif)    |
| `GET`    | `/api/admin/roles/{id}/permissions`     | Admin   | Obtenir les permissions d'un rôle        |
| `PUT`    | `/api/admin/roles/{id}/permissions`     | Admin   | Mettre à jour les permissions d'un rôle  |

---

## Lister les rôles

```
GET /api/admin/roles
```

Retourne une liste paginée de rôles avec filtrage et tri optionnels.

**Paramètres de requête :**

| Paramètre   | Type    | Défaut | Description                                    |
| ----------- | ------- | ------ | ---------------------------------------------- |
| `page`      | entier  | `1`    | Numéro de page (minimum : 1)                   |
| `limit`     | entier  | `10`   | Résultats par page (1–100)                     |
| `status`    | chaîne  | –      | Filtre par `active` ou `inactive`              |
| `sortBy`    | chaîne  | `name` | Champ de tri : `name`, `id`, `created_at`      |
| `sortOrder` | chaîne  | `asc`  | Sens du tri : `asc` ou `desc`                  |

**Réponse (200) :**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Créer un rôle

```
POST /api/admin/roles
```

Crée un nouveau rôle. L'ID du rôle est automatiquement généré à partir du nom en normalisant, supprimant les diacritiques et convertissant en slug URL (max 64 caractères). Les noms dupliqués (y compris les enregistrements supprimés logiquement) sont rejetés.

**Corps de la requête :**

| Champ         | Type    | Requis | Description                              |
| ------------- | ------- | ------ | ---------------------------------------- |
| `name`        | chaîne  | Oui    | Nom du rôle (3–100 caractères)           |
| `description` | chaîne  | Oui    | Description du rôle (max 500 caractères) |
| `status`      | chaîne  | Non    | `active` (défaut) ou `inactive`          |
| `isAdmin`     | booléen | Non    | Indicateur de privilèges admin (défaut : `false`) |

**Exemple :**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Réponse (201) :**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Obtenir les rôles actifs

```
GET /api/admin/roles/active
```

Retourne tous les rôles avec le statut `active`. Généralement utilisé pour peupler les listes déroulantes de rôles dans les formulaires de gestion des utilisateurs. Aucune authentification requise.

**Réponse (200) :**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [] }
  ]
}
```

---

## Obtenir les statistiques des rôles

```
GET /api/admin/roles/stats
```

Retourne des statistiques agrégées sur les rôles. Requiert une session admin.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Obtenir / Mettre à jour / Supprimer un rôle

### Obtenir un rôle

```
GET /api/admin/roles/{id}
```

Retourne les détails complets d'un seul rôle incluant les permissions, le statut et les horodatages.

### Mettre à jour un rôle

```
PUT /api/admin/roles/{id}
```

Mise à jour partielle — seuls les champs fournis sont modifiés. Valide la longueur du nom (3–100) et la longueur de la description (max 500).

**Corps de la requête (tous les champs sont optionnels) :**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Supprimer un rôle

```
DELETE /api/admin/roles/{id}?hard=false
```

| Paramètre | Type   | Défaut  | Description                                                              |
| --------- | ------ | ------- | ------------------------------------------------------------------------ |
| `hard`    | chaîne | `false` | `true` pour la suppression définitive, `false` pour la suppression douce (marque inactif) |

---

## Permissions du rôle

### Obtenir les permissions

```
GET /api/admin/roles/{id}/permissions
```

Retourne le tableau des permissions et les métadonnées de base du rôle.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Mettre à jour les permissions

```
PUT /api/admin/roles/{id}/permissions
```

Remplace l'intégralité du tableau de permissions. Chaque chaîne de permission est validée par rapport aux définitions de permissions du système. Les permissions invalides sont retournées dans la réponse d'erreur.

**Corps de la requête :**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Règles de validation

| Champ         | Règle                                                         |
| ------------- | ------------------------------------------------------------- |
| `name`        | 3–100 caractères ; utilisé pour dériver un ID slug unique     |
| `description` | Maximum 500 caractères                                        |
| `status`      | Doit être `active` ou `inactive`                              |
| `permissions` | Tableau de chaînes ; chacune doit être une permission système valide |

## Codes d'erreur

| Statut | Signification                                             |
| ------ | --------------------------------------------------------- |
| `400`  | Erreur de validation (paramètres invalides, champs manquants) |
| `401`  | Authentification requise                                  |
| `403`  | Privilèges administrateur requis                          |
| `404`  | Rôle introuvable                                          |
| `409`  | Nom de rôle ou conflit d'ID en doublon                    |
| `500`  | Erreur interne du serveur                                 |

## Documentation associée

- [API Admin Utilisateurs](./admin-users-endpoints.md) – assigner des rôles aux utilisateurs
- [Authentification](../architecture/nextauth-configuration.md) – détails de session et de garde admin
- [Système de permissions](../architecture/permissions-system.md) – définitions et validation des permissions

