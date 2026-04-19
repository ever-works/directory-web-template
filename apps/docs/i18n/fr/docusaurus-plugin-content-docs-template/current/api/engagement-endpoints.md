---
id: engagement-endpoints
title: "Points de terminaison API Engagement"
sidebar_label: "Engagement"
sidebar_position: 12
---

# Points de terminaison API Engagement

L'API d'engagement fournit des points de terminaison pour récupérer les métriques d'engagement (vues, votes, notes, favoris, commentaires) et calculer des scores de popularité pour les éléments. Ces points de terminaison alimentent les fonctionnalités de tri, de classement et d'analyse du template.

**Fichiers source :**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/items/engagement` | Aucune | Récupérer les métriques d'engagement pour plusieurs éléments |
| GET | `/api/items/popularity-scores` | Aucune | Obtenir les éléments triés par score de popularité calculé |

Les deux points de terminaison utilisent `dynamic = 'force-dynamic'` pour garantir des données fraîches à chaque requête.

---

## GET `/api/items/engagement`

Récupère les métriques d'engagement pour plusieurs éléments identifiés par leurs slugs. Retourne une carte de slug vers métriques.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Oui** | -- | Liste de slugs d'éléments séparés par des virgules |

### Contraintes

- Le paramètre `slugs` est **obligatoire**. Son omission retourne une erreur 400.
- Maximum de **200 slugs** par requête. Dépasser cette limite retourne une erreur 400.

### Fonctionnement

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Format de réponse

#### 200 -- Métriques récupérées

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Vide (aucun slug valide après analyse)

```json
{
  "metrics": {}
}
```

#### 400 -- Slugs manquants

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Trop de slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Erreur serveur

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Exemple d'utilisation

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Accéder aux métriques d'un élément individuel
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Point de terminaison de débogage/analyse qui retourne les éléments triés par leur score de popularité calculé. L'algorithme de notation utilise une échelle logarithmique et prend en compte plusieurs signaux d'engagement ainsi que la récence.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | Non | `20` | Nombre d'éléments à retourner (max 100) |
| `locale` | string | Non | `"en"` | Langue pour la récupération des données d'éléments |

### Algorithme de notation

Le score de popularité est calculé comme la somme de composantes pondérées :

| Composante | Pondération | Formule |
|-----------|--------|--------|
| Bonus élément mis en avant | +10 000 | Bonus fixe pour les éléments mis en avant |
| Vues | 1 000x | `log10(views + 1) * 1000` |
| Votes | 1 200x | `log10(max(votes, 0) + 1) * 1200` |
| Note moyenne | 500x | `avgRating * 500` |
| Favoris | 1 100x | `log10(favorites + 1) * 1100` |
| Commentaires | 1 000x | `log10(comments + 1) * 1000` |
| Récence (moins de 30 jours) | jusqu'à +1 000 | Décroissance linéaire sur 30 jours |
| Récence (30 à 90 jours) | jusqu'à +500 | Décroissance linéaire sur les 60 jours suivants |
| Récence (90 à 180 jours) | jusqu'à +250 | Décroissance linéaire sur les 90 jours suivants |

Les éléments sans données d'engagement reçoivent un score de repli heuristique basé sur le nombre de tags, la longueur du nom, la présence d'une icône et l'existence d'un code promo.

### Format de réponse

#### 200 -- Scores récupérés

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Exemple d'utilisation

```ts
// Récupérer les 10 éléments les plus populaires
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### Remarques

- L'algorithme de notation correspond à la logique de tri de production dans `sort-utils.ts`.
- L'échelle logarithmique empêche les éléments avec un très grand nombre de vues de dominer le classement.
- Le bonus de récence garantit que les éléments récemment ajoutés bénéficient temporairement d'une meilleure visibilité.
- Les éléments sont triés par score décroissant ; les égalités sont départagées par ordre alphabétique du nom.

### Fichiers source associés

| Fichier | Rôle |
|------|-------|
| `template/app/api/items/engagement/route.ts` | Point de terminaison des métriques d'engagement |
| `template/app/api/items/popularity-scores/route.ts` | Point de terminaison du score de popularité |
| `template/lib/db/queries/engagement.queries.ts` | Requêtes de base de données pour les données d'engagement |
| `template/lib/content.ts` | `getCachedItems` pour les données d'éléments |
