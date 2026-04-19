---
id: comment-endpoints
title: "Points de terminaison Commentaires"
sidebar_label: "Commentaires"
sidebar_position: 24
---

# Points de terminaison Commentaires

Le système de commentaires fournit des points de terminaison pour créer, lire, mettre à jour et supprimer des commentaires sur des éléments. Les commentaires incluent une note de 1 à 5 étoiles et prennent en charge l'accès public (lecture) ainsi que les opérations authentifiées (création, modification, suppression). Les points de terminaison d'administration offrent des fonctionnalités de modération.

## Aperçu

### Points de terminaison publics

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/items/[slug]/comments` | GET | Public | Lister les commentaires d'un élément |
| `/api/items/[slug]/comments/rating` | GET | Public | Obtenir les statistiques de note agrégées |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Public | Obtenir la note d'un seul commentaire |

### Points de terminaison authentifiés

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/items/[slug]/comments` | POST | Utilisateur | Créer un nouveau commentaire |
| `/api/items/[slug]/comments/[commentId]` | PUT | Propriétaire | Mettre à jour son propre commentaire |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Propriétaire | Supprimer son propre commentaire |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | Utilisateur | Mettre à jour la note d'un commentaire |

### Points de terminaison d'administration

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/admin/comments` | GET | Admin | Lister tous les commentaires avec pagination |
| `/api/admin/comments/[id]` | GET | Admin | Obtenir un commentaire par identifiant |
| `/api/admin/comments/[id]` | PUT | Admin | Mettre à jour le contenu d'un commentaire |
| `/api/admin/comments/[id]` | DELETE | Admin | Suppression logique d'un commentaire |

## Points de terminaison publics

### Lister les commentaires d'un élément

```
GET /api/items/[slug]/comments
```

Retourne tous les commentaires d'un élément spécifique, y compris les informations de profil utilisateur. Aucune authentification n'est requise.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|---|---|---|
| `slug` | string | Slug de l'élément |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Source :** `template/app/api/items/[slug]/comments/route.ts`

### Obtenir les statistiques de note

```
GET /api/items/[slug]/comments/rating
```

Retourne la note moyenne et le nombre total de notes pour un élément. Seuls les commentaires non supprimés sont comptabilisés.

**Réponse en cas de succès (200) :**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Retourne `averageRating: 0` et `totalRatings: 0` lorsqu'aucune note n'existe.

**Source :** `template/app/api/items/[slug]/comments/rating/route.ts`

## Points de terminaison authentifiés

### Créer un commentaire

```
POST /api/items/[slug]/comments
```

Crée un nouveau commentaire avec une note sur un élément. Nécessite une authentification et un profil client valide. Les utilisateurs bloqués ne peuvent pas commenter.

**Authentification :** Requise

**Corps de la requête :**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `content` | string | Oui | Doit être non vide après suppression des espaces |
| `rating` | integer | Oui | Doit être compris entre 1 et 5 inclus |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Statut | Condition |
|---|---|
| 400 | Contenu vide ou note invalide |
| 401 | Non authentifié |
| 403 | Utilisateur suspendu ou banni |
| 404 | Profil client introuvable |

**Source :** `template/app/api/items/[slug]/comments/route.ts`

### Mettre à jour un commentaire

```
PUT /api/items/[slug]/comments/[commentId]
```

Met à jour le contenu et/ou la note d'un commentaire existant. Seul l'auteur du commentaire peut modifier son propre commentaire. Au moins un des champs `content` ou `rating` doit être fourni.

**Authentification :** Requise (doit être le propriétaire du commentaire)

**Corps de la requête :**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `content` | string | Non | 1 à 1000 caractères |
| `rating` | integer | Non | Doit être compris entre 1 et 5 |

La réponse inclut le commentaire mis à jour avec un horodatage `editedAt`.

| Statut | Condition |
|---|---|
| 400 | Aucun champ fourni, contenu trop long, ou note invalide |
| 401 | Non authentifié |
| 404 | Commentaire introuvable ou l'utilisateur n'est pas l'auteur |

**Source :** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Supprimer un commentaire

```
DELETE /api/items/[slug]/comments/[commentId]
```

Effectue une suppression logique d'un commentaire. Seul l'auteur du commentaire peut supprimer son propre commentaire. Le commentaire est marqué avec un horodatage `deletedAt` plutôt qu'être définitivement supprimé.

**Authentification :** Requise (doit être le propriétaire du commentaire)

**Réponse en cas de succès :** 204 Aucun contenu

| Statut | Condition |
|---|---|
| 401 | Non authentifié |
| 404 | Commentaire introuvable, déjà supprimé, ou non propriété de l'utilisateur |

**Source :** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Mettre à jour la note d'un commentaire

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Met à jour uniquement la note d'un commentaire spécifique.

**Corps de la requête :**

```json
{
  "rating": 4
}
```

**Source :** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Points de terminaison d'administration

Tous les points de terminaison d'administration nécessitent que `session.user.isAdmin` soit `true`.

### Lister tous les commentaires

```
GET /api/admin/comments
```

Retourne une liste paginée de tous les commentaires (à l'exclusion des commentaires supprimés de manière logique) avec les informations utilisateur. Prend en charge la recherche dans le contenu des commentaires, le nom d'utilisateur et l'adresse e-mail.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Résultats par page (1-100) |
| `search` | string | - | Recherche dans le contenu, le nom ou l'e-mail |

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

**Source :** `template/app/api/admin/comments/route.ts`

### Obtenir un commentaire par identifiant

```
GET /api/admin/comments/[id]
```

Récupère un commentaire spécifique avec les informations utilisateur complètes.

**Source :** `template/app/api/admin/comments/[id]/route.ts`

### Mise à jour administrative d'un commentaire

```
PUT /api/admin/comments/[id]
```

Permet aux administrateurs de mettre à jour le contenu de n'importe quel commentaire, quelle que soit la propriété.

**Corps de la requête :**

```json
{
  "content": "This content has been moderated by an administrator."
}
```

**Source :** `template/app/api/admin/comments/[id]/route.ts`

### Suppression administrative d'un commentaire

```
DELETE /api/admin/comments/[id]
```

Effectue une suppression logique de n'importe quel commentaire. Le commentaire doit exister et ne pas déjà être supprimé.

**Réponse en cas de succès (200) :**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

| Statut | Condition |
|---|---|
| 403 | L'utilisateur n'est pas administrateur |
| 404 | Commentaire introuvable ou déjà supprimé |

**Source :** `template/app/api/admin/comments/[id]/route.ts`

## Détails clés d'implémentation

- **Suppression logique :** Toutes les suppressions définissent `deletedAt` plutôt que de retirer les enregistrements. Les requêtes filtrent les commentaires supprimés via `isNull(comments.deletedAt)`.
- **Vérification de propriété :** Les points de terminaison utilisateur vérifient que l'identifiant du profil client de l'utilisateur authentifié correspond au champ `userId` du commentaire.
- **Prévention des utilisateurs bloqués :** La vérification `isUserBlocked()` empêche les utilisateurs suspendus ou bannis de créer des commentaires.
- **Recherche (admin) :** Utilise ILIKE pour une recherche insensible à la casse avec échappement approprié des caractères génériques SQL (`%` et `_`).
