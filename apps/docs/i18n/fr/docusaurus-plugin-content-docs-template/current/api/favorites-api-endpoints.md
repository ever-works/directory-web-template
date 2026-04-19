---
id: favorites-api-endpoints
title: "Points de terminaison API Favoris"
sidebar_label: "API Favoris"
sidebar_position: 62
---

# Points de terminaison API Favoris

L'API Favoris permet aux utilisateurs authentifiés de gérer leurs éléments favoris. Les utilisateurs peuvent lister, ajouter et supprimer des éléments de leur liste de favoris personnelle. Les enregistrements de favoris stockent les métadonnées de l'élément (nom, icône, catégorie) pour un affichage rapide sans jointure avec la table des éléments.

**Répertoire source :** `template/app/api/favorites/`

---

## Authentification

Tous les points de terminaison des favoris nécessitent une authentification basée sur la session. Les requêtes non authentifiées reçoivent :

**Statut 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Lister les favoris de l'utilisateur

Retourne tous les éléments mis en favori par l'utilisateur authentifié.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/favorites` |
| **Auth** | Session (utilisateur) |
| **Source** | `favorites/route.ts` |

### Réponse

**Statut 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `favorites[].id` | `string` | Identifiant de l'enregistrement favori |
| `favorites[].userId` | `string` | Utilisateur ayant mis l'élément en favori |
| `favorites[].itemSlug` | `string` | Identifiant slug de l'élément |
| `favorites[].itemName` | `string` | Nom d'affichage de l'élément |
| `favorites[].itemIconUrl` | `string \| null` | URL de l'icône de l'élément |
| `favorites[].itemCategory` | `string \| null` | Catégorie de l'élément |
| `favorites[].createdAt` | `string` (ISO 8601) | Date d'ajout en favori |
| `favorites[].updatedAt` | `string \| null` | Horodatage de la dernière mise à jour |

Les favoris sont triés par `createdAt` (du plus ancien au plus récent).

### Exemple curl

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Ajouter un favori

Ajoute un élément à la liste de favoris de l'utilisateur authentifié.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `POST` |
| **Chemin** | `/api/favorites` |
| **Auth** | Session (utilisateur) |
| **Source** | `favorites/route.ts` |

### Corps de la requête

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `itemSlug` | `string` | Oui | Identifiant slug unique de l'élément (min 1 caractère) |
| `itemName` | `string` | Oui | Nom d'affichage de l'élément (min 1 caractère) |
| `itemIconUrl` | `string` | Non | URL de l'icône de l'élément |
| `itemCategory` | `string` | Non | Catégorie de l'élément |

### Réponses

**Statut 201** -- Favori ajouté avec succès.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Statut 400** -- Données de requête invalides.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Statut 409** -- Élément déjà dans les favoris.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Exemple curl

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity"
  }'
```

---

## Supprimer un favori

Supprime un élément spécifique de la liste de favoris de l'utilisateur authentifié.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `DELETE` |
| **Chemin** | `/api/favorites/{itemSlug}` |
| **Auth** | Session (utilisateur) |
| **Source** | `favorites/[itemSlug]/route.ts` |

### Paramètres de chemin

| Paramètre | Type | Description |
|-----------|------|-------------|
| `itemSlug` | `string` | Slug de l'élément à supprimer des favoris |

### Réponses

**Statut 200** -- Favori supprimé avec succès.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Statut 404** -- Favori introuvable.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Exemple curl

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Utilisation TypeScript

```typescript
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl: string | null;
  itemCategory: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Lister tous les favoris
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Ajouter aux favoris
async function addFavorite(item: {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (res.status === 409) {
    throw new Error('Item is already in favorites');
  }

  const data = await res.json();
  return data.favorite;
}

// Supprimer des favoris
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Favorite not found');
  }
}

// Basculer l'état favori
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite({ itemSlug, itemName });
  }
}
```

### Remarques d'implémentation

- La table des favoris utilise une vérification d'unicité composite sur `(userId, itemSlug)` pour éviter les doublons.
- Les métadonnées de l'élément (`itemName`, `itemIconUrl`, `itemCategory`) sont stockées dans l'enregistrement favori lui-même, permettant un affichage rapide sans requêtes supplémentaires.
- La suppression vérifie la propriété -- un utilisateur ne peut supprimer que les favoris qui lui appartiennent.
- La disponibilité de la base de données est vérifiée au début de chaque requête via `checkDatabaseAvailability()`.
- Les erreurs de validation retournent les détails d'erreur Zod dans le champ `details`.
