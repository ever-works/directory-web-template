---
id: items-api-endpoints-deep-dive
title: "Analyse Approfondie des Endpoints API Éléments"
sidebar_label: "API Éléments (Approfondi)"
sidebar_position: 65
---

# Analyse Approfondie des Endpoints API Éléments

L'API Éléments fournit des points de terminaison publics pour interagir avec les éléments, notamment les commentaires, les votes, le suivi des vues, les associations d'entreprises et les métriques d'engagement. Ces points de terminaison alimentent les fonctionnalités principales du site d'annuaire.

**Répertoire source :** `template/app/api/items/`

---

## Carte des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/items/{slug}/comments` | Public | Lister les commentaires d'un élément |
| `POST` | `/api/items/{slug}/comments` | Session | Créer un commentaire |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Session (auteur) | Mettre à jour un commentaire |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Session (auteur) | Supprimer un commentaire |
| `GET` | `/api/items/{slug}/comments/rating` | Public | Obtenir les statistiques de notation |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Obtenir la notation d'un commentaire |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Public | Mettre à jour la notation d'un commentaire |
| `GET` | `/api/items/{slug}/company` | Admin | Obtenir l'entreprise associée à l'élément |
| `POST` | `/api/items/{slug}/company` | Admin | Associer une entreprise à l'élément |
| `DELETE` | `/api/items/{slug}/company` | Admin | Retirer l'entreprise de l'élément |
| `POST` | `/api/items/{slug}/views` | Public | Enregistrer une vue d'élément |
| `GET` | `/api/items/{slug}/votes` | Public | Obtenir les infos de vote + statut utilisateur |
| `POST` | `/api/items/{slug}/votes` | Session | Voter ou modifier un vote |
| `DELETE` | `/api/items/{slug}/votes` | Session | Supprimer un vote |
| `GET` | `/api/items/{slug}/votes/count` | Public | Obtenir uniquement le nombre de votes |
| `GET` | `/api/items/{slug}/votes/status` | Session | Obtenir le vote de l'utilisateur |
| `GET` | `/api/items/engagement` | Public | Métriques d'engagement par lot |
| `GET` | `/api/items/popularity-scores` | Public | Scores de popularité (débogage) |

---

## Commentaires

### Lister les commentaires

Retourne tous les commentaires d'un élément spécifique, y compris les informations du profil utilisateur.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/comments` |
| **Auth** | Aucune (public) |
| **Source** | `items/[slug]/comments/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
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

#### Exemple curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Créer un commentaire

Crée un nouveau commentaire avec une notation pour un élément.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `POST` |
| **Chemin** | `/api/items/{slug}/comments` |
| **Auth** | Session (utilisateur avec profil client) |
| **Source** | `items/[slug]/comments/route.ts` |

#### Corps de la requête

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `content` | `string` | Oui | Texte du commentaire (ne doit pas être vide) |
| `rating` | `integer` | Oui | Note de 1 à 5 |

#### Réponses

| Statut | Description |
|--------|-------------|
| 200 | Commentaire créé avec succès |
| 400 | Contenu ou note invalide |
| 401 | Authentification requise |
| 403 | Utilisateur bloqué (suspendu ou banni) |
| 404 | Profil client introuvable |
| 500 | Erreur serveur |

**Statut 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### Exemple curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Modération
Les utilisateurs bloqués (suspendus ou bannis) reçoivent une réponse 403 avec un message expliquant leur statut. La vérification `isUserBlocked()` est effectuée en utilisant le champ de statut du profil client.
:::

---

### Mettre à jour un commentaire

Met à jour le contenu et/ou la notation d'un commentaire. Seul l'auteur du commentaire peut le modifier.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `PUT` |
| **Chemin** | `/api/items/{slug}/comments/{commentId}` |
| **Auth** | Session (auteur du commentaire) |
| **Source** | `items/[slug]/comments/[commentId]/route.ts` |

#### Corps de la requête

Au moins un champ doit être fourni :

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|----------|-------------|
| `content` | `string` | Non | 1–1000 caractères |
| `rating` | `integer` | Non | 1–5 |

#### Réponse

**Statut 200** — Retourne le commentaire mis à jour avec les informations utilisateur et un horodatage `editedAt`.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Supprimer un commentaire

Suppression logicielle d'un commentaire. Seul l'auteur du commentaire peut le supprimer.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `DELETE` |
| **Chemin** | `/api/items/{slug}/comments/{commentId}` |
| **Auth** | Session (auteur du commentaire) |
| **Source** | `items/[slug]/comments/[commentId]/route.ts` |

#### Réponse

**Statut 204** — Aucun contenu (commentaire supprimé avec succès).

| Statut | Description |
|--------|-------------|
| 204 | Commentaire supprimé |
| 401 | Non autorisé |
| 404 | Commentaire introuvable ou non autorisé |

#### Exemple curl

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obtenir les statistiques de notation

Retourne les statistiques de notation agrégées pour un élément : note moyenne et nombre total.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/comments/rating` |
| **Auth** | Aucune (public) |
| **Source** | `items/[slug]/comments/rating/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `averageRating` | `number` | Note moyenne (0 si aucune note, max 5) |
| `totalRatings` | `number` | Nombre total de commentaires non supprimés avec des notes |

#### Exemple curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Obtenir/Mettre à jour la notation d'un commentaire

#### Obtenir la notation d'un commentaire

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | Aucune (public) |

Retourne l'objet commentaire complet pour un ID de commentaire spécifique.

#### Mettre à jour la notation d'un commentaire

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `PATCH` |
| **Chemin** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Auth** | Aucune |

**Corps de la requête :**
```json
{
  "rating": 4
}
```

Retourne l'objet commentaire mis à jour.

---

## Association d'entreprise

Points de terminaison réservés aux administrateurs pour gérer la relation entre les éléments et les entreprises.

### Obtenir l'entreprise de l'élément

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/company` |
| **Auth** | Admin |
| **Source** | `items/[slug]/company/route.ts` |

#### Réponse

**Statut 200** — Entreprise trouvée.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**Statut 200** — Aucune entreprise assignée.

```json
{
  "success": true,
  "data": null
}
```

---

### Associer une entreprise à l'élément

Associe une entreprise à un élément. Cette opération est idempotente.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `POST` |
| **Chemin** | `/api/items/{slug}/company` |
| **Auth** | Admin |
| **Source** | `items/[slug]/company/route.ts` |

#### Corps de la requête

```json
{
  "companyId": "company_123"
}
```

#### Réponses

**Statut 201** — Nouvelle association créée.

```json
{
  "success": true,
  "data": { /* objet association */ },
  "created": true,
  "updated": false
}
```

**Statut 200** — Association existante mise à jour.

```json
{
  "success": true,
  "data": { /* objet association */ },
  "created": false,
  "updated": true
}
```

**Statut 409** — L'élément est déjà lié à une autre entreprise.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### Retirer l'entreprise de l'élément

Supprime l'association d'entreprise d'un élément. Cette opération est idempotente.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `DELETE` |
| **Chemin** | `/api/items/{slug}/company` |
| **Auth** | Admin |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### Exemple curl

```bash
# Associer une entreprise
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Retirer l'entreprise
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Vues

### Enregistrer une vue d'élément

Enregistre une vue journalière unique pour un élément avec déduplication intégrée, détection de bots et exclusion du propriétaire.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `POST` |
| **Chemin** | `/api/items/{slug}/views` |
| **Auth** | Aucune (public) |
| **Source** | `items/[slug]/views/route.ts` |

#### Flux de traitement

1. **Vérification de la base de données** — vérifie la disponibilité de la base de données.
2. **Détection de bots** — rejette les agents utilisateurs connus comme des bots.
3. **Validation de l'élément** — confirme l'existence de l'élément (retourne 404 si introuvable).
4. **Exclusion du propriétaire** — si authentifié, ignore le comptage si le visiteur est le propriétaire.
5. **ID visiteur** — lit ou crée un cookie visiteur (`VIEWER_COOKIE_NAME`) pour le suivi anonyme.
6. **Déduplication journalière** — enregistre la vue une seule fois par visiteur par jour.

#### Réponse

**Statut 200** — Vue traitée.

```json
{ "success": true, "counted": true }
```

| Scénario | `counted` | `reason` |
|----------|-----------|----------|
| Nouvelle vue enregistrée | `true` | — |
| Vue en double (même jour) | `false` | — |
| Bot détecté | `false` | `"bot"` |
| Propriétaire consultant son propre élément | `false` | `"owner"` |

**Statut 404** — Élément introuvable.

```json
{ "success": false, "error": "Item not found" }
```

#### Exemple curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Notes d'implémentation

- Le cookie visiteur est `HttpOnly`, `Secure` en production, et utilise `SameSite: lax`.
- La déduplication des vues est basée sur `(itemId, viewerId, viewedDateUtc)` où la date est `YYYY-MM-DD` en UTC.
- L'utilitaire `isBot()` vérifie l'agent utilisateur par rapport aux patterns de bots connus.

---

## Votes

### Obtenir les informations de vote

Retourne le nombre total de votes et le statut de vote de l'utilisateur actuel (si authentifié).

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/votes` |
| **Auth** | Aucune (public ; statut utilisateur nécessite une session) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `count` | `number` | Nombre net de votes (votes positifs - votes négatifs) |
| `userVote` | `"up" \| "down" \| null` | Vote de l'utilisateur (`null` si non authentifié ou sans vote) |

---

### Voter ou modifier un vote

Enregistre un nouveau vote ou remplace un vote existant.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `POST` |
| **Chemin** | `/api/items/{slug}/votes` |
| **Auth** | Session (utilisateur avec profil client) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Corps de la requête

```json
{
  "type": "up"
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `type` | `string` | Oui | Type de vote : `"up"` ou `"down"` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Statut | Description |
|--------|-------------|
| 200 | Vote enregistré avec succès |
| 400 | Type de vote invalide |
| 401 | Non autorisé |
| 403 | Utilisateur bloqué (suspendu/banni) |
| 404 | Profil client introuvable |

#### Exemple curl

```bash
# Vote positif
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Vote négatif
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### Supprimer un vote

Supprime le vote de l'utilisateur actuel pour un élément.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `DELETE` |
| **Chemin** | `/api/items/{slug}/votes` |
| **Auth** | Session (utilisateur avec profil client) |
| **Source** | `items/[slug]/votes/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Obtenir le nombre de votes

Point de terminaison léger qui retourne uniquement le nombre de votes (sans statut utilisateur).

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/votes/count` |
| **Auth** | Aucune (public) |
| **Source** | `items/[slug]/votes/count/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### Obtenir le statut de vote de l'utilisateur

Retourne l'enregistrement de vote complet pour le vote de l'utilisateur authentifié sur un élément spécifique.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/{slug}/votes/status` |
| **Auth** | Session (utilisateur) |
| **Source** | `items/[slug]/votes/status/route.ts` |

#### Réponse

**Statut 200** — L'utilisateur a voté.

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Statut 200** — L'utilisateur n'a pas voté.

```json
null
```

---

## Métriques d'engagement

### Métriques d'engagement par lot

Récupère les métriques d'engagement (vues, votes, notations, favoris, commentaires) pour plusieurs éléments en une seule requête.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/engagement` |
| **Auth** | Aucune (public) |
| **Mise en cache** | `force-dynamic` |
| **Source** | `items/engagement/route.ts` |

#### Paramètres de requête

| Paramètre | Type | Requis | Description |
|-----------|------|----------|-------------|
| `slugs` | `string` | Oui | Liste de slugs d'éléments séparés par des virgules (max 200) |

#### Réponse

**Statut 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Codes d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Paramètre `slugs` manquant ou plus de 200 slugs |

#### Exemple curl

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### Scores de popularité (Débogage)

Point de terminaison de débogage qui retourne les éléments triés par leur score de popularité calculé avec une répartition détaillée des facteurs de notation.

| Propriété | Valeur |
|----------|-------|
| **Méthode** | `GET` |
| **Chemin** | `/api/items/popularity-scores` |
| **Auth** | Aucune (public) |
| **Mise en cache** | `force-dynamic` |
| **Source** | `items/popularity-scores/route.ts` |

#### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | Non | `20` | Nombre d'éléments à retourner (max 100) |
| `locale` | `string` | Non | `"en"` | Langue des éléments |

#### Réponse

**Statut 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### Algorithme de scoring

Le score de popularité utilise une mise à l'échelle logarithmique pour éviter que les valeurs aberrantes ne dominent :

| Facteur | Poids | Formule |
|--------|--------|---------|
| Boost mis en avant | 10000 | Bonus fixe pour les éléments mis en avant |
| Vues | 1000 | `log10(views + 1) * 1000` |
| Votes | 1200 | `log10(max(votes, 0) + 1) * 1200` |
| Note moyenne | 500 | `avgRating * 500` |
| Favoris | 1100 | `log10(favorites + 1) * 1100` |
| Commentaires | 1000 | `log10(comments + 1) * 1000` |
| Récence | jusqu'à 1000 | Bonus décroissant pour les éléments de moins de 180 jours |

Les éléments sans données d'engagement reçoivent un petit score heuristique basé sur la qualité des métadonnées (nombre de tags, longueur du nom, présence d'icône, code promo).

#### Exemple curl

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## Utilisation TypeScript

```typescript
// Récupérer les commentaires d'un élément
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Publier un commentaire
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Voter positivement pour un élément
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`Nouveau nombre de votes : ${voteRes.count}`);

// Enregistrer une vue
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Récupérer l'engagement de plusieurs éléments en lot
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Obtenir les statistiques de notation
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```

## Intégration de la modération

Plusieurs points de terminaison de l'API Éléments s'intègrent avec le système de modération :

- **Commentaires :** Le point de terminaison `POST /api/items/{slug}/comments` vérifie si l'utilisateur est bloqué (suspendu ou banni) avant d'autoriser la création de commentaire.
- **Votes :** Le point de terminaison `POST /api/items/{slug}/votes` effectue la même vérification de blocage.
- Les utilisateurs bloqués reçoivent une réponse `403` avec un message lisible expliquant leur statut.

La vérification de blocage utilise `isUserBlocked()` et `getBlockReasonMessage()` depuis `@/lib/db/queries/moderation.queries`.
