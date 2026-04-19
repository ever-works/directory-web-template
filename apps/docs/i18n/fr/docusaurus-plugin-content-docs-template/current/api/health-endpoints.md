---
id: health-endpoints
title: Référence API Santé
sidebar_label: Santé
sidebar_position: 52
---

# Référence API Santé

## Aperçu

Le point de terminaison Santé fournit une vérification simple de la connectivité à la base de données à des fins de surveillance et d'infrastructure. Il exécute une requête légère pour vérifier que la connexion à la base de données est active et réactive, en retournant des informations d'état avec des horodatages.

## Points de terminaison

### GET /api/health/database

Effectue une vérification de santé de base en exécutant une requête `SELECT 1` pour vérifier la connexion à la base de données.

**Requête**

Aucun paramètre ou corps requis.

**Réponse**
```typescript
// Réponse saine
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // Format ISO 8601, ex. "2024-01-15T10:30:00.000Z"
  result: object;           // Résultat brut de la requête SELECT 1
}

// Réponse non saine (statut 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Exemple**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('La base de données est connectée à', health.timestamp);
} else {
  console.error('La base de données est déconnectée :', health.error);
}
```

## Authentification

Ce point de terminaison est **public** — aucune authentification n'est requise. Il est destiné aux équilibreurs de charge, aux moniteurs de disponibilité et aux vérifications de santé des déploiements.

## Réponses d'erreur

| Statut | Description |
|--------| ----------- |
| 200 | La connexion à la base de données est saine |
| 500 | La connexion à la base de données a échoué — retourne le statut `"unhealthy"` avec les détails de l'erreur |

## Limitation du débit

Aucune limitation de débit n'est appliquée. Ce point de terminaison est léger et convient aux interrogations fréquentes par les systèmes de surveillance.

## Points de terminaison associés

- [Points de terminaison Config Feature](./config-feature-endpoints) — Indicateurs de disponibilité des fonctionnalités (dépend aussi de la base de données)
- [Points de terminaison Version & Sync](./version-sync-endpoints) — Version du système et état de synchronisation

