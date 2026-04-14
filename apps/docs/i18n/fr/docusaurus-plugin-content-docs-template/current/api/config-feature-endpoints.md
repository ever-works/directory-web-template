---
id: config-feature-endpoints
title: "Référence API Config et Drapeaux de Fonctionnalités"
sidebar_label: "Config & Fonctionnalités"
sidebar_position: 53
---

# Référence API Config et Drapeaux de Fonctionnalités

## Aperçu

Le point de terminaison Config Features expose les indicateurs de disponibilité des fonctionnalités actuelles de l'application. Ces indicateurs signalent quelles fonctionnalités dépendant de la base de données sont actives, permettant au frontend de se dégrader gracieusement lorsque des fonctionnalités ne sont pas disponibles. Il s'agit d'un point de terminaison public et mis en cache, conçu pour une consommation à haute fréquence.

## Points de terminaison

### GET /api/config/features

Retourne la disponibilité actuelle des fonctionnalités en fonction de la configuration du système et de la disponibilité de la base de données.

**Requête**

Aucun paramètre ni corps requis.

**Réponse**
```typescript
{
  ratings: boolean;         // Si la fonctionnalité de notation est disponible
  comments: boolean;        // Si la fonctionnalité de commentaires est disponible
  favorites: boolean;       // Si la fonctionnalité de favoris est disponible
  featuredItems: boolean;   // Si la fonctionnalité d'éléments mis en avant est disponible
  surveys: boolean;         // Si la fonctionnalité de sondages est disponible
}
```

**Exemple**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Afficher le composant de notation
}

if (!features.surveys) {
  // Masquer la section sondages
}
```

## Authentification

Ce point de terminaison est **public** -- aucune authentification n'est requise. Il est conçu pour être consommé par le frontend au chargement initial de la page afin de déterminer quelles fonctionnalités d'interface utilisateur doivent être affichées.

## Réponses d'erreur

| Statut | Description |
|--------|-------------|
| 200 | Drapeaux de fonctionnalités récupérés avec succès |
| 500 | Erreur interne -- retourne tous les indicateurs à `false` pour la sécurité avec l'en-tête `no-cache` |

En cas d'erreur, le point de terminaison retourne toutes les fonctionnalités à `false` pour garantir que l'application échoue de manière sécurisée plutôt que d'exposer des fonctionnalités défaillantes.

## Limitation de débit

Les réponses sont mises en cache avec les en-têtes suivants :
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Effectivement mis en cache pendant 5 minutes au niveau du CDN avec une fenêtre stale-while-revalidate de 10 minutes.

Les réponses d'erreur utilisent `Cache-Control: no-cache` pour éviter la mise en cache de l'état dégradé.

## Points de terminaison associés

- [Points de terminaison de santé](./health-endpoints) -- vérification de la connectivité de la base de données
