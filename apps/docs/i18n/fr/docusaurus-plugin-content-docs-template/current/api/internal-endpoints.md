---
id: internal-endpoints
title: "Points de terminaison Internes et Système"
sidebar_label: "Interne & Système"
sidebar_position: 17
---

# Points de terminaison Internes et Système

Ces points de terminaison fournissent des opérations au niveau système : initialisation de la base de données, configuration des indicateurs de fonctionnalité, vérifications de santé, informations de version et synchronisation des dépôts. La plupart sont utilisés par la plateforme elle-même plutôt que par les utilisateurs finaux.

**Fichiers source :**
- `template/app/api/internal/db-init/route.ts`
- `template/app/api/config/features/route.ts`
- `template/app/api/health/database/route.ts`
- `template/app/api/version/route.ts`
- `template/app/api/version/sync/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/internal/db-init` | Dév. uniquement | Déclencher l'initialisation de la base de données |
| GET | `/api/config/features` | Aucune | Obtenir les indicateurs de disponibilité des fonctionnalités |
| GET | `/api/health/database` | Aucune | Vérification de santé de la base de données |
| GET | `/api/version` | Aucune | Obtenir les informations de version de l'application |
| GET | `/api/version/sync` | Aucune | Obtenir le statut de synchronisation |
| POST | `/api/version/sync` | Aucune | Déclencher une synchronisation manuelle du dépôt |

---

## GET `/api/internal/db-init`

Déclenche la migration et l'amorçage automatiques de la base de données si celle-ci n'est pas encore initialisée.

### Sécurité

Ce point de terminaison est **uniquement disponible en mode développement**. En production, il retourne 403 :

```ts
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json(
    { error: 'Not available in production' },
    { status: 403 }
  );
}
```

### Configuration du runtime

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Réponse : 200

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

### Réponse : 403 (Production)

```json
{
  "error": "Not available in production"
}
```

---

## GET `/api/config/features`

Retourne les indicateurs de disponibilité des fonctionnalités actuels basés sur la configuration du système (principalement la disponibilité de la base de données). Il s'agit d'un **point de terminaison public** utilisé par le frontend pour gérer gracieusement les fonctionnalités manquantes.

### Réponse : 200

```json
{
  "ratings": true,
  "comments": true,
  "favorites": true,
  "featuredItems": true,
  "surveys": true
}
```

### Réponse : 200 (Pas de base de données)

Lorsque la base de données n'est pas configurée, toutes les fonctionnalités sont désactivées :

```json
{
  "ratings": false,
  "comments": false,
  "favorites": false,
  "featuredItems": false,
  "surveys": false
}
```

### Mise en cache

Les réponses réussies sont mises en cache pendant 5 minutes avec stale-while-revalidate :

```ts
headers: {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}
```

Les réponses d'erreur utilisent `Cache-Control: no-cache`.

### Comportement en cas d'erreur

En cas d'erreur, le point de terminaison retourne toutes les fonctionnalités comme désactivées (avec un statut 500) pour garantir une dégradation gracieuse du frontend.

---

## GET `/api/health/database`

Une vérification de santé légère qui teste la connexion à la base de données en exécutant `SELECT 1`.

### Réponse : 200 (Sain)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "result": [{ "test": 1 }]
}
```

### Réponse : 500 (Non sain)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection check failed",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Cas d'utilisation

- Sondes de vivacité et de disponibilité Kubernetes/Docker
- Tableaux de bord de surveillance
- Scripts de vérification de déploiement
- Vérifications de santé de l'équilibreur de charge

---

## GET `/api/version`

Récupère les informations de version complètes depuis le dépôt de contenu Git, incluant les derniers détails de commit, les informations sur l'auteur, la branche et le statut de synchronisation.

### Fonctionnement

1. Valide que le répertoire Git existe au chemin du contenu
2. Si le répertoire `.git` est manquant, tente une synchronisation (utile pour les démarrages à froid sur Vercel)
3. Lit le dernier commit via `isomorphic-git`
4. Retourne les informations de version formatées avec des en-têtes de mise en cache

### Réponse : 200

```json
{
  "commit": "a1b2c3d",
  "date": "2024-01-15T10:30:00.000Z",
  "message": "Add new feature for user management",
  "author": "John Doe",
  "repository": "https://github.com/user/repo.git",
  "lastSync": "2024-01-15T10:35:00.000Z",
  "branch": "main"
}
```

### En-têtes de réponse

| En-tête | Valeur | Description |
|---------|--------|-------------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | Mise en cache client d'1 minute |
| `ETag` | `"a1b2c3d-1705312200000"` | Basé sur le hash du commit |
| `Last-Modified` | `Mon, 15 Jan 2024 10:30:00 GMT` | Horodatage du commit |

### Réponses d'erreur

Toutes les erreurs incluent un format structuré avec un code d'erreur :

| Statut | Code | Condition |
|--------|------|-----------|
| 404 | `REPOSITORY_NOT_FOUND` | Le répertoire Git n'existe pas |
| 404 | `NO_COMMITS` | Le dépôt n'a pas de commits |
| 500 | `GIT_ERROR` | Échec de lecture des informations de commit |
| 500 | `VALIDATION_ERROR` | Les données de commit manquent de champs requis |
| 500 | `INTERNAL_ERROR` | Erreur inattendue |

```json
{
  "error": "Data repository not found",
  "code": "REPOSITORY_NOT_FOUND",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "details": "Git directory not found at: /path/to/content/.git"
}
```

---

## GET `/api/version/sync`

Retourne le statut de synchronisation actuel, notamment si une synchronisation est en cours, quand la dernière synchronisation a eu lieu et la durée de fonctionnement du serveur.

### Réponse : 200

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-15T10:30:00.000Z",
  "timeSinceLastSync": 300000,
  "timeSinceLastSyncHuman": "300s ago",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Réponse : 200 (Jamais synchronisé)

```json
{
  "syncInProgress": false,
  "lastSyncTime": null,
  "timeSinceLastSync": null,
  "timeSinceLastSyncHuman": "never",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## POST `/api/version/sync`

Déclenche manuellement une synchronisation en arrière-plan du dépôt de contenu Git. Empêche les opérations de synchronisation simultanées (si une synchronisation est déjà en cours, retourne un succès avec un message informatif).

### Corps de la requête

Optionnel. Réservé pour une utilisation future :

```json
{}
```

### Réponse : 200 (Synchronisation terminée)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 1250,
  "message": "Repository synchronized successfully",
  "details": "Updated 5 files, 3 commits ahead"
}
```

### Réponse : 200 (Déjà en cours)

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 50,
  "message": "Sync was already in progress",
  "details": "Another sync operation is currently running"
}
```

### Réponse : 500

```json
{
  "success": false,
  "error": "Manual sync request failed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "duration": 800,
  "details": "Git fetch failed: network timeout"
}
```

Les réponses GET et POST incluent toutes les deux `Cache-Control: no-cache, no-store, must-revalidate` pour éviter les statuts de synchronisation périmés.

---

## Fichiers source associés

| Fichier | Utilisation |
|---------|-------------|
| `template/app/api/internal/db-init/route.ts` | Point de terminaison d'initialisation de la base de données |
| `template/app/api/config/features/route.ts` | Point de terminaison des indicateurs de fonctionnalité |
| `template/app/api/health/database/route.ts` | Vérification de santé de la base de données |
| `template/app/api/version/route.ts` | Point de terminaison d'information de version |
| `template/app/api/version/sync/route.ts` | Déclencheur et statut de synchronisation |
| `template/lib/db/initialize.ts` | Logique d'initialisation de la base de données |
| `template/lib/config/feature-flags.ts` | Résolution des indicateurs de fonctionnalité |
| `template/lib/services/sync-service.ts` | Service de synchronisation du dépôt |
| `template/lib/lib.ts` | Utilitaires de chemin de contenu et de système de fichiers |
