---
id: version-sync-endpoints
title: Référence API Version et Synchronisation
sidebar_label: Version & Sync
sidebar_position: 58
---

# Référence API Version et Synchronisation

## Aperçu

Les points de terminaison Version et Sync donnent accès aux informations de version du contenu de l'application et aux contrôles de synchronisation du dépôt. Le point de terminaison de version lit les métadonnées Git du dépôt de contenu, tandis que les points de terminaison de synchronisation permettent de déclencher et de surveiller les opérations de synchronisation en arrière-plan.

## Points de terminaison

### GET /api/version

Récupère des informations complètes sur la version depuis le dépôt Git de contenu, incluant les derniers détails de commit, l'auteur, la branche et l'horodatage de synchronisation. Tente automatiquement de synchroniser le dépôt si le répertoire Git n'est pas trouvé (utile pour les démarrages à froid sur Vercel).

**Requête**

Aucun paramètre requis.

**Réponse**
```typescript
{
  commit: string;       // Hash de commit court (7 caractères), ex. "a1b2c3d"
  date: string;         // Date du commit en format ISO 8601
  message: string;      // Message du commit
  author: string;       // Nom de l'auteur du commit
  repository: string;   // URL DATA_REPOSITORY ou "unknown"
  lastSync: string;     // Horodatage actuel (ISO 8601) indiquant quand l'info a été récupérée
  branch?: string;      // Branche Git actuelle (défaut : "main")
}
```

**En-têtes de réponse**
- `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- `ETag: "<commit-hash>-<timestamp>"`
- `Last-Modified: <commit-date>`

**Exemple**
```typescript
const response = await fetch('/api/version');
const version = await response.json();
// { commit: "a1b2c3d", date: "2024-01-15T10:30:00.000Z", message: "Update content", author: "John", ... }
```

### POST /api/version/sync

Déclenche une synchronisation manuelle en arrière-plan du dépôt Git de contenu. Empêche les opérations de synchronisation concurrentes — si une synchronisation est déjà en cours, retourne immédiatement avec un message de statut.

**Requête**
```typescript
{
  options?: object;   // Réservé pour usage futur (optionnel)
}
```

Le corps de la requête est entièrement optionnel.

**Réponse**
```typescript
// Synchronisation réussie
{
  success: true;
  timestamp: string;    // Horodatage ISO 8601 de complétion
  duration: number;     // Durée de l'opération en millisecondes
  message: string;      // ex. "Repository synchronized successfully"
  details?: string;     // ex. "Updated 5 files, 3 commits ahead"
}

// Synchronisation déjà en cours
{
  success: true;
  timestamp: string;
  duration: number;
  message: "Sync was already in progress";
  details: "Another sync operation is currently running";
}

// Échec de synchronisation (statut 500)
{
  success: false;
  error: string;        // ex. "Manual sync request failed"
  timestamp: string;
  duration: number;
  details?: string;     // ex. "Git fetch failed: network timeout"
}
```

**Exemple**
```typescript
const response = await fetch('/api/version/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const result = await response.json();
console.log(`Synchronisation terminée en ${result.duration}ms : ${result.message}`);
```

### GET /api/version/sync

Retourne le statut de synchronisation actuel, incluant si une synchronisation est en cours, quand la dernière synchronisation a eu lieu et la durée de fonctionnement du serveur.

**Requête**

Aucun paramètre requis.

**Réponse**
```typescript
{
  syncInProgress: boolean;              // Si une synchronisation est en cours
  lastSyncTime: string | null;          // Horodatage ISO 8601 de la dernière synchronisation
  timeSinceLastSync: number | null;     // Millisecondes depuis la dernière synchronisation
  timeSinceLastSyncHuman: string;       // Lisible, ex. "300s ago" ou "never"
  uptime: number;                       // Durée de fonctionnement du serveur en secondes
  timestamp: string;                    // Horodatage serveur actuel (ISO 8601)
}
```

**Exemple**
```typescript
const response = await fetch('/api/version/sync');
const status = await response.json();

if (status.syncInProgress) {
  console.log('La synchronisation est en cours...');
} else {
  console.log(`Dernière synchronisation : ${status.timeSinceLastSyncHuman}`);
}
```

## Authentification

Tous les points de terminaison de version et de synchronisation sont **publics** — aucune authentification n'est requise. Ces points de terminaison sont conçus pour les tableaux de bord de surveillance et les outils d'administration.

## Réponses d'erreur

### GET /api/version

| Statut | Code | Description |
| ------ | ---- | ----------- |
| 404 | `REPOSITORY_NOT_FOUND` | Répertoire Git du dépôt de contenu introuvable |
| 404 | `NO_COMMITS` | Le dépôt existe mais ne contient aucun commit |
| 500 | `GIT_ERROR` | Échec de la lecture du journal Git ou des informations de commit |
| 500 | `VALIDATION_ERROR` | Les données de commit manquent de champs requis |
| 500 | `INTERNAL_ERROR` | Erreur d'exécution inattendue |

