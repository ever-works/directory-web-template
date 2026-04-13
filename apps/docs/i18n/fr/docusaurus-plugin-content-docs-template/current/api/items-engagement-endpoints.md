---
id: items-engagement-endpoints
title: "Référence API Engagement des Éléments"
sidebar_label: "Engagement des Éléments"
sidebar_position: 54
---

# Référence API Engagement des Éléments

## Aperçu

Les points de terminaison d'engagement des éléments donnent accès aux métriques d'engagement et aux scores de popularité pour les éléments du répertoire. Cela inclut les comptages de vues, les votes, les notations, les favoris et les commentaires. Le point de terminaison des scores de popularité calcule en outre un classement pondéré tenant compte des métriques d'engagement, du statut mis en avant et de la récence du contenu.

## Points de terminaison

### GET /api/items/engagement

Récupère les métriques d'engagement pour plusieurs éléments par leurs slugs en une seule requête par lot.

**Requête**

| Paramètre | Type   | Dans    | Description |
|-----------|--------|-------|-------------|
| slugs     | string | query | Liste de slugs d'éléments séparés par des virgules (requis, max 200) |

**Réponse**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Exemple**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Point de terminaison de débogage qui retourne les éléments triés par leur score de popularité calculé avec une répartition détaillée des facteurs de notation. Utile pour comprendre comment l'algorithme de tri classe les éléments.

**Requête**

| Paramètre | Type   | Dans    | Description |
|-----------|--------|-------|-------------|
| limit     | number | query | Nombre d'éléments à retourner (défaut : 20, max : 100) |
| locale    | string | query | Code de langue pour les éléments (défaut : `"en"`) |

**Réponse**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Score total calculé (arrondi)
    scoreBreakdown: {
      featured: number;          // 10000 si mis en avant, 0 sinon
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Décroît sur 180 jours
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Exemple**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Authentification

Les deux points de terminaison sont **publics** — aucune authentification n'est requise. Ils sont marqués comme `force-dynamic` pour garantir des données fraîches à chaque requête.
