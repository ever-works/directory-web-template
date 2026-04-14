---
id: favorites-endpoints
title: "Points de terminaison API Favoris"
sidebar_label: "Favoris"
sidebar_position: 13
---

# Points de terminaison API Favoris

L'API Favoris permet aux utilisateurs authentifiés de gérer leur liste personnelle d'éléments favoris. Chaque favori stocke les métadonnées de l'élément (nom, icône, catégorie) pour un affichage rapide sans nécessiter de jointure avec la couche de contenu.

**Fichiers source :**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/favorites` | Session | Lister tous les favoris de l'utilisateur courant |
| POST | `/api/favorites` | Session | Ajouter un élément aux favoris |
| DELETE | `/api/favorites/{itemSlug}` | Session | Supprimer un élément des favoris |

Tous les points de terminaison nécessitent une session utilisateur authentifiée et une connexion à la base de données fonctionnelle (vérifiée via `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Retourne tous les éléments mis en favori par l'utilisateur authentifié, triés par date de création (du plus ancien au plus récent).

### Requête

Aucun paramètre de requête ni corps n'est requis. L'authentification est fournie via le cookie de session.

### Format de réponse

#### 200 -- Succès

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

#### 401 -- Non autorisé

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Erreur serveur

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Ajoute un élément aux favoris de l'utilisateur authentifié. Inclut une vérification des doublons pour éviter d'ajouter deux fois le même élément.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `itemSlug` | string | **Oui** | Identifiant slug unique de l'élément |
| `itemName` | string | **Oui** | Nom d'affichage de l'élément |
| `itemIconUrl` | string | Non | URL de l'icône de l'élément |
| `itemCategory` | string | Non | Nom de la catégorie de l'élément |

Le corps de la requête est validé par un schéma Zod :

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Exemple de requête

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Format de réponse

#### 201 -- Créé

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

#### 400 -- Erreur de validation

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Non autorisé

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflit (doublon)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Détection des doublons

Avant l'insertion, le gestionnaire vérifie l'existence d'un favori avec le même utilisateur et le même slug d'élément :

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Supprime un élément spécifique de la liste de favoris de l'utilisateur authentifié.

### Paramètres de chemin

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| `itemSlug` | string | **Oui** | Le slug de l'élément à supprimer |

### Format de réponse

#### 200 -- Supprimé avec succès

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Non autorisé

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Introuvable

Retourné lorsque le favori n'existe pas ou n'appartient pas à l'utilisateur courant :

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Fonctionnement

Le gestionnaire vérifie la propriété avant la suppression. Il recherche d'abord un favori correspondant appartenant à l'utilisateur courant, puis supprime uniquement s'il est trouvé :

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Exemple d'utilisation (flux complet)

```ts
// 1. Lister les favoris actuels
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Ajouter un nouveau favori
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();

// 3. Supprimer un favori
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Prérequis base de données

- Nécessite que la table `favorites` existe dans le schéma de la base de données.
- `checkDatabaseAvailability()` est appelé au début de chaque gestionnaire.
- Les réponses d'erreur utilisent `safeErrorResponse` pour éviter de divulguer des détails internes.

## Fichiers source associés

| Fichier | Rôle |
|------|-------|
| `template/app/api/favorites/route.ts` | Gestionnaires GET (liste) et POST (ajout) |
| `template/app/api/favorites/[itemSlug]/route.ts` | Gestionnaire DELETE |
