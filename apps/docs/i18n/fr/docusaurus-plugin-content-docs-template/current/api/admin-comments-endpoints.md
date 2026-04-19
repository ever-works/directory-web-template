---
id: admin-comments-endpoints
title: "Points de terminaison Admin Commentaires"
sidebar_label: "Admin Commentaires"
sidebar_position: 31
---

# Points de terminaison Admin Commentaires

L'API Admin Commentaires fournit des capacités de modération pour gérer les commentaires des utilisateurs. Les administrateurs peuvent lister, afficher, mettre à jour et supprimer (soft delete) les commentaires. Tous les points de terminaison utilisent le runtime Node.js et requièrent la disponibilité de la base de données. Les vérifications d'authentification renvoient `403 Forbidden` pour les non-administrateurs.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Admin | Lister les commentaires (paginé, recherchable) |
| `GET` | `/api/admin/comments/{id}` | Admin | Obtenir un commentaire avec les infos utilisateur |
| `PUT` | `/api/admin/comments/{id}` | Admin | Mettre à jour le contenu d'un commentaire |
| `DELETE` | `/api/admin/comments/{id}` | Admin | Suppression douce d'un commentaire |

## Authentification

Les points de terminaison de modération des commentaires vérifient le statut admin et retournent `403 Forbidden` (et non `401`) pour les non-administrateurs :

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Disponibilité de la base de données

Les points de terminaison de commentaires vérifient la disponibilité de la base de données avant de traiter les requêtes :

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Si la base de données n'est pas configurée, une réponse d'erreur appropriée est retournée avant toute vérification d'authentification.

## Points de terminaison

### GET `/api/admin/comments`

Retourne une liste paginée de commentaires avec les informations utilisateur associées. Supporte la recherche en texte intégral dans le contenu des commentaires, les noms d'utilisateur et les emails. Seuls les commentaires non supprimés sont retournés.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `page` | entier | `1` | Numéro de page pour la pagination |
| `limit` | entier | `10` | Commentaires par page (1--100) |
| `search` | chaîne | `""` | Recherche dans le contenu, le nom ou l'email |

**Comportement de la recherche :**

La requête de recherche est comparée sans distinction de casse (via `ILIKE`) contre :
- Le contenu du commentaire
- Le nom d'affichage de l'utilisateur
- L'adresse email de l'utilisateur

Les caractères spéciaux `%`, `_` et `\` sont échappés pour éviter les injections SQL.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
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

### GET `/api/admin/comments/{id}`

Récupère un commentaire spécifique par son ID avec les informations complètes du profil utilisateur. Inclut une jointure gauche sur la table `clientProfiles` pour les données utilisateur.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne | Identifiant unique du commentaire |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Utilisateur non trouvé :** Si le profil utilisateur est introuvable (utilisateur supprimé), un objet de substitution est retourné :

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Met à jour le contenu d'un commentaire spécifique. Seul le champ `content` peut être modifié. Le commentaire doit exister et ne pas être marqué comme supprimé.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne | Identifiant unique du commentaire |

**Corps de la requête :**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `content` | chaîne | Oui | Nouveau texte du commentaire (ne doit pas être vide après suppression des espaces) |

**Règles de validation :**
- `content` est requis et ne doit pas être vide ou contenir uniquement des espaces
- Le commentaire cible doit exister et ne pas avoir d'horodatage `deletedAt`

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Effectue une suppression douce d'un commentaire en définissant l'horodatage `deletedAt`. Le commentaire doit exister et ne pas être déjà supprimé. Les commentaires avec suppression douce sont exclus de toutes les requêtes de liste.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne | Identifiant unique du commentaire |

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Modèle de données des commentaires

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | chaîne | Non | Identifiant unique du commentaire |
| `content` | chaîne | Non | Contenu textuel du commentaire |
| `rating` | entier | Oui | Valeur de notation (1--5) |
| `userId` | chaîne | Non | ID de l'auteur |
| `itemId` | chaîne | Non | ID de l'élément associé |
| `createdAt` | datetime | Oui | Horodatage de création |
| `updatedAt` | datetime | Oui | Horodatage de dernière mise à jour |
| `deletedAt` | datetime | Oui | Horodatage de suppression douce (null si actif) |

## Codes d'erreur

| Statut | Erreur | Cause |
|--------|-------|-------|
| `400` | Le contenu est requis | Contenu vide ou manquant lors de la mise à jour |
| `403` | Interdit | Utilisateur non-admin tentant d'accéder |
| `404` | Commentaire non trouvé | ID invalide ou déjà supprimé (soft delete) |
| `500` | Erreur interne du serveur | Défaillance de la base de données ou du serveur |

## Notes d'implémentation

- Les commentaires utilisent la **suppression douce** -- le champ `deletedAt` est défini plutôt que de supprimer la ligne. Cela préserve l'intégrité des données et permet une récupération potentielle.
- Toutes les requêtes de liste filtrent avec `isNull(comments.deletedAt)` pour exclure les commentaires supprimés.
- Les données utilisateur sont récupérées via un `LEFT JOIN` sur `clientProfiles`, garantissant que les commentaires des utilisateurs supprimés restent accessibles.
- Le `runtime` est défini à `"nodejs"` pour ces routes (pas Edge).

## Documentation associée

- [Vue d'ensemble des points de terminaison Admin](./admin-endpoints.md)
- [Points de terminaison publics des commentaires](./comment-endpoints.md)
- [Patterns de réponse](./response-patterns.md)
- [Validation des requêtes](./request-validation.md)
