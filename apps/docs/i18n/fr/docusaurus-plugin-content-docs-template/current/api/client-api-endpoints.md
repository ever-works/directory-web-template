---
id: client-api-endpoints
title: "Points de terminaison API Client"
sidebar_label: "API Client"
sidebar_position: 58
---

# Points de terminaison API Client

L'API Client fournit des points de terminaison authentifiés pour les utilisateurs inscrits afin de gérer leurs éléments soumis, consulter les statistiques du tableau de bord et accéder aux données géographiques. Tous les points de terminaison nécessitent une authentification par session via `requireClientAuth()`.

**Répertoire source :** `template/app/api/client/`

---

## Authentification

Chaque point de terminaison de ce groupe nécessite une session utilisateur valide. Les requêtes non authentifiées reçoivent :

**Statut 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Statistiques du tableau de bord

### Obtenir les statistiques du tableau de bord

Retourne les statistiques complètes du tableau de bord pour l'utilisateur authentifié.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/dashboard/stats` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/dashboard/stats/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### Exemple curl

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obtenir les statistiques géographiques

Retourne les statistiques de couverture géographique pour les éléments de l'utilisateur authentifié.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/geo-stats` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/geo-stats/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

#### Exemple curl

```bash
curl -s http://localhost:3000/api/client/geo-stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obtenir les coordonnées des éléments

Retourne les coordonnées de tous les éléments de l'utilisateur qui ont des données de localisation, adaptées au rendu cartographique.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/items/coordinates` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/items/coordinates/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

#### Exemple curl

```bash
curl -s http://localhost:3000/api/client/items/coordinates \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Gestion des éléments

### Lister les éléments de l'utilisateur

Retourne une liste paginée des éléments soumis par l'utilisateur authentifié.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/items` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/items/route.ts` |

#### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | `integer` | Non | `1` | Numéro de page (min : 1) |
| `limit` | `integer` | Non | `10` | Éléments par page (1-100) |
| `status` | `string` | Non | -- | Filtre : `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | Non | -- | Recherche par nom ou description d'élément |
| `sortBy` | `string` | Non | -- | Champ de tri |
| `sortOrder` | `string` | Non | -- | Direction du tri |
| `deleted` | `boolean` | Non | `false` | Si `true`, retourne les éléments supprimés de façon logique |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "items": [ /* objets d'éléments */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### Exemple curl

```bash
# Lister les éléments approuvés, page 2
curl -s "http://localhost:3000/api/client/items?status=approved&page=2&limit=10" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Rechercher des éléments
curl -s "http://localhost:3000/api/client/items?search=productivity" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Lister les éléments supprimés
curl -s "http://localhost:3000/api/client/items?deleted=true" \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Créer un élément

Crée une nouvelle soumission d'élément. L'élément est défini avec le statut `pending` pour révision par l'administrateur.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `POST` |
| **Chemin** | `/api/client/items` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/items/route.ts` |

#### Corps de la requête

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `name` | `string` | Oui | Nom de l'élément (3-100 caractères) |
| `description` | `string` | Oui | Description de l'élément (10-500 caractères) |
| `source_url` | `string` (URI) | Oui | URL/lien principal de l'élément |
| `category` | `string \| string[]` | Non | Nom de catégorie ou tableau de catégories |
| `tags` | `string[]` | Non | Tableau de chaînes de tags |
| `icon_url` | `string` (URI) | Non | URL de l'icône de l'élément |

#### Réponse

**Statut 201**

```json
{
  "success": true,
  "item": { /* objet de l'élément créé */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

**Statut 400** -- Erreur de validation

```json
{
  "success": false,
  "error": "Name must be at least 3 characters"
}
```

#### Exemple curl

```bash
curl -s -X POST http://localhost:3000/api/client/items \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "name": "Awesome Tool",
    "description": "A great productivity tool that helps teams collaborate effectively.",
    "source_url": "https://example.com",
    "category": "Productivity",
    "tags": ["collaboration"]
  }'
```

---

### Obtenir un élément

Retourne les détails d'un élément spécifique appartenant à l'utilisateur authentifié.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/items/{id}` |
| **Auth** | Session (utilisateur, propriétaire) |
| **Source** | `client/items/[id]/route.ts` |

#### Paramètres de chemin

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Identifiant de l'élément |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "item": { /* objet de l'élément */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Statut | Description |
|--------|-------------|
| 400 | Identifiant d'élément invalide |
| 401 | Non authentifié |
| 403 | L'utilisateur n'est pas propriétaire de l'élément |
| 404 | Élément introuvable |

---

### Mettre à jour un élément

Met à jour un élément appartenant à l'utilisateur authentifié. Si l'élément était précédemment approuvé, sa mise à jour change son statut en `pending` pour une nouvelle révision.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `PUT` |
| **Chemin** | `/api/client/items/{id}` |
| **Auth** | Session (utilisateur, propriétaire) |
| **Source** | `client/items/[id]/route.ts` |

#### Corps de la requête

Tous les champs sont facultatifs. Au moins un champ doit être fourni.

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description with more details.",
  "source_url": "https://example.com/v2",
  "category": ["Productivity", "Developer Tools"],
  "tags": ["collaboration", "ai"],
  "icon_url": "https://example.com/new-icon.png"
}
```

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "item": { /* objet de l'élément mis à jour */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `statusChanged` | `boolean` | `true` si le statut a changé d'approuvé à en attente |
| `previousStatus` | `string` | Statut de l'élément avant la mise à jour |

#### Exemple curl

```bash
curl -s -X PUT http://localhost:3000/api/client/items/item_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "name": "Updated Tool Name" }'
```

---

### Supprimer un élément (suppression logique)

Supprime de façon logique un élément appartenant à l'utilisateur authentifié. L'élément est masqué mais peut être restauré ultérieurement.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `DELETE` |
| **Chemin** | `/api/client/items/{id}` |
| **Auth** | Session (utilisateur, propriétaire) |
| **Source** | `client/items/[id]/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

| Statut | Description |
|--------|-------------|
| 400 | L'élément est déjà supprimé |
| 401 | Non authentifié |
| 403 | L'utilisateur n'est pas propriétaire de l'élément |
| 404 | Élément introuvable |

---

### Restaurer un élément

Restaure un élément précédemment supprimé de façon logique.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `POST` |
| **Chemin** | `/api/client/items/{id}/restore` |
| **Auth** | Session (utilisateur, propriétaire) |
| **Source** | `client/items/[id]/restore/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "item": { /* objet de l'élément restauré */ },
  "message": "Item restored successfully"
}
```

| Statut | Description |
|--------|-------------|
| 400 | L'élément n'est pas supprimé (impossible de restaurer un élément actif) |
| 401 | Non authentifié |
| 403 | L'utilisateur n'est pas propriétaire de l'élément |
| 404 | Élément introuvable |

#### Exemple curl

```bash
curl -s -X POST http://localhost:3000/api/client/items/item_123/restore \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obtenir les statistiques de soumission

Retourne les statistiques des soumissions de l'utilisateur authentifié regroupées par statut.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/client/items/stats` |
| **Auth** | Session (utilisateur) |
| **Source** | `client/items/stats/route.ts` |

#### Réponse

**Statut 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### Exemple curl

```bash
curl -s http://localhost:3000/api/client/items/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Utilisation TypeScript

```typescript
import type { ClientCreateItemResponse } from '@/lib/types/client-item';

// Récupérer les statistiques du tableau de bord
const dashboardRes = await fetch('/api/client/dashboard/stats');
const dashboard = await dashboardRes.json();

// Créer une nouvelle soumission d'élément
const createRes = await fetch('/api/client/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My New Tool',
    description: 'A detailed description of what this tool does.',
    source_url: 'https://mytool.com',
    category: 'Productivity',
  }),
});
const created: ClientCreateItemResponse = await createRes.json();

// Mettre à jour un élément
const updateRes = await fetch(`/api/client/items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Updated Name' }),
});
const updated = await updateRes.json();
if (updated.statusChanged) {
  console.log('Item moved back to pending for re-review');
}
```

## Modèle de réponse d'erreur

Tous les points de terminaison de l'API client suivent une structure d'erreur cohérente :

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Les réponses d'erreur utilisent l'utilitaire `serverErrorResponse()`, qui journalise les informations d'erreur détaillées côté serveur tout en ne retournant qu'un message générique au client pour éviter la divulgation d'informations.
