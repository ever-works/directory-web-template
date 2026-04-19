---
id: admin-users-endpoints
title: Points de terminaison API Admin – Utilisateurs
sidebar_label: Admin Utilisateurs
sidebar_position: 36
---

# Points de terminaison API Admin – Utilisateurs

L'API Utilisateurs fournit des points de terminaison pour la gestion des comptes utilisateurs, incluant la création, les mises à jour, les changements de statut, l'assignation de rôles et des utilitaires de validation. Tous les points de terminaison requièrent une authentification administrateur sauf indication contraire.

## Chemin de base

```
/api/admin/users
```

## Résumé des routes

| Méthode  | Chemin                                    | Auth  | Description                              |
| -------- | ----------------------------------------- | ----- | ---------------------------------------- |
| `GET`    | `/api/admin/users`                        | Admin | Obtenir la liste paginée des utilisateurs|
| `POST`   | `/api/admin/users`                        | Admin | Créer un nouvel utilisateur              |
| `GET`    | `/api/admin/users/stats`                  | Admin | Obtenir les statistiques utilisateurs    |
| `POST`   | `/api/admin/users/check-email`            | Admin | Vérifier la disponibilité d'un e-mail    |
| `POST`   | `/api/admin/users/check-username`         | Admin | Vérifier la disponibilité d'un nom d'utilisateur |
| `GET`    | `/api/admin/users/{id}`                   | Admin | Obtenir un utilisateur par ID            |
| `PUT`    | `/api/admin/users/{id}`                   | Admin | Mettre à jour un utilisateur             |
| `DELETE` | `/api/admin/users/{id}`                   | Admin | Supprimer un utilisateur                 |

---

## Lister les utilisateurs

```
GET /api/admin/users
```

Retourne une liste paginée d'utilisateurs avec recherche, filtrage et tri.

**Paramètres de requête :**

| Paramètre         | Type    | Défaut  | Description                                                        |
| ----------------- | ------- | ------- | ------------------------------------------------------------------ |
| `page`            | entier  | `1`     | Numéro de page (minimum : 1)                                       |
| `limit`           | entier  | `10`    | Résultats par page (1–100)                                         |
| `search`          | chaîne  | –       | Recherche par nom, e-mail ou nom d'utilisateur (max 100 caractères)|
| `role`            | chaîne  | –       | Filtrer par ID de rôle (max 50 caractères)                         |
| `status`          | chaîne  | –       | Filtre : `active` ou `inactive`                                    |
| `sortBy`          | chaîne  | `name`  | Champ de tri : `name`, `username`, `email`, `role`, `created_at`   |
| `sortOrder`       | chaîne  | `asc`   | Sens du tri : `asc` ou `desc`                                      |
| `includeInactive` | booléen | `false` | Inclure les utilisateurs inactifs dans les résultats              |

**Réponse (200) :**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Créer un utilisateur

```
POST /api/admin/users
```

Crée un nouvel utilisateur avec une validation complète. Le rôle doit exister dans le système (validé par rapport à la table des rôles).

**Corps de la requête :**

| Champ      | Type   | Requis | Description                                                     |
| ---------- | ------ | ------ | --------------------------------------------------------------- |
| `username` | chaîne | Oui    | 3–30 caractères, alphanumérique plus `-` et `_`                |
| `email`    | chaîne | Oui    | Format e-mail valide                                            |
| `name`     | chaîne | Oui    | Nom complet (2–100 caractères)                                  |
| `password` | chaîne | Oui    | Minimum 8 caractères (validé par Zod `passwordSchema`)          |
| `role`     | chaîne | Oui    | Doit référencer un ID de rôle existant                          |
| `title`    | chaîne | Non    | Titre du poste (max 100 caractères)                             |
| `avatar`   | chaîne | Non    | URL d'avatar (max 500 caractères)                               |

**Exemple :**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "role": "admin",
  "title": "Senior Developer",
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**Réponse (201) :**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Obtenir les statistiques utilisateurs

```
GET /api/admin/users/stats
```

Retourne des statistiques complètes pour le tableau de bord admin.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## Vérifier la disponibilité d'un e-mail

```
POST /api/admin/users/check-email
```

Vérifie si une adresse e-mail est déjà utilisée. Prend en charge un paramètre `excludeId` pour les scénarios de mise à jour où l'e-mail de l'utilisateur actuel doit être exclu de la vérification des doublons.

**Corps de la requête :**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Réponse (200) :**

```json
{ "available": true, "exists": false }
```

---

## Vérifier la disponibilité d'un nom d'utilisateur

```
POST /api/admin/users/check-username
```

Vérifie si un nom d'utilisateur est déjà utilisé. Même schéma `excludeId` que pour la vérification de l'e-mail.

**Corps de la requête :**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Réponse (200) :**

```json
{ "available": false, "exists": true }
```

---

## Obtenir / Mettre à jour / Supprimer un utilisateur

### Obtenir un utilisateur

```
GET /api/admin/users/{id}
```

Retourne les informations complètes de profil d'un seul utilisateur.

### Mettre à jour un utilisateur

```
PUT /api/admin/users/{id}
```

Mise à jour partielle — seuls les champs fournis sont modifiés. Valide le format de l'e-mail, la longueur du nom d'utilisateur (3–50), la longueur du nom (2–100) et que le rôle existe dans le système.

**Corps de la requête (tous les champs optionnels) :**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### Supprimer un utilisateur

```
DELETE /api/admin/users/{id}
```

Supprime définitivement un utilisateur. Inclut une protection contre l'auto-suppression : un admin ne peut pas supprimer son propre compte.

**Réponse (200) :**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Règles de validation

| Champ      | Règle                                                                   |
| ---------- | ----------------------------------------------------------------------- |
| `username` | 3–30 caractères ; regex `^[a-zA-Z0-9_-]{3,30}$` (création), 3–50 caractères (mise à jour) |
| `email`    | Format e-mail valide via l'utilitaire `isValidEmail`                    |
| `name`     | 2–100 caractères                                                        |
| `password` | Minimum 8 caractères ; validé par Zod `passwordSchema`                  |
| `role`     | Doit référencer un rôle existant en base de données                      |
| `status`   | Doit être `active` ou `inactive`                                        |
| `title`    | Maximum 100 caractères                                                  |
| `avatar`   | Maximum 500 caractères                                                  |

## Codes d'erreur

| Statut | Signification                                                      |
| ------ | ------------------------------------------------------------------ |
| `400`  | Erreur de validation, auto-suppression, e-mail/nom d'utilisateur dupliqué |
| `401`  | Authentification requise                                           |
| `403`  | Privilèges administrateur requis                                   |
| `404`  | Utilisateur introuvable                                            |
| `500`  | Erreur interne du serveur                                          |

## Documentation associée

- [API Admin Rôles](./admin-roles-endpoints.md) – gérer les rôles assignés aux utilisateurs
- [Authentification](../architecture/nextauth-configuration.md) – gestion des sessions et gardes
- [API Admin Clients](./admin-clients-endpoints.md) – gestion des profils clients

