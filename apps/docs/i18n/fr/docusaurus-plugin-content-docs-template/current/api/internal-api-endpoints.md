---
id: internal-api-endpoints
title: "Points de terminaison API Internes"
sidebar_label: "API Internes"
sidebar_position: 64
---

# Points de terminaison API Internes

L'API Interne fournit des points de terminaison au niveau système utilisés pour les opérations d'infrastructure. Ces points de terminaison sont restreints au mode développement et ne sont pas accessibles en production.

**Répertoire source :** `template/app/api/internal/`

---

## Initialisation de la base de données

Déclenche la migration et l'amorçage automatiques de la base de données si celle-ci n'est pas encore initialisée.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/internal/db-init` |
| **Auth** | Mode développement uniquement |
| **Runtime** | `nodejs` |
| **Mise en cache** | `force-dynamic` |
| **Source** | `internal/db-init/route.ts` |

### Sécurité

Ce point de terminaison est **uniquement accessible en mode développement** (`NODE_ENV === 'development'`). En production, il retourne une réponse `403 Forbidden`.

### Réponse

**Statut 200** -- Initialisation de la base de données terminée.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Statut 403** -- Environnement de production (accès refusé).

```json
{
  "error": "Not available in production"
}
```

**Statut 500** -- Échec de l'initialisation.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### Fonctionnement

Lorsqu'il est appelé, le point de terminaison importe dynamiquement et exécute `initializeDatabase()` depuis `@/lib/db/initialize`, qui :

1. Exécute les migrations Drizzle en attente.
2. Amorce les données initiales si la base de données est vide (ex. : utilisateur administrateur par défaut, configuration initiale).
3. S'assure que le schéma de la base de données est à jour pour le développement.

### Exemple curl

```bash
# Initialiser la base de données (développement uniquement)
curl -s http://localhost:3000/api/internal/db-init
```

### Utilisation TypeScript

```typescript
// Généralement appelé lors de la mise en place du développement
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed:', data.error);
  }
}
```

### Notes d'implémentation

- La fonction `initializeDatabase()` est importée dynamiquement via `await import()` pour éviter de charger le code d'initialisation de la base de données dans les bundles de production.
- La route est configurée avec `export const runtime = 'nodejs'` pour garantir son exécution dans le runtime Node.js (et non le runtime Edge), car les opérations de base de données nécessitent les API Node.js complètes.
- La route utilise `export const dynamic = 'force-dynamic'` pour empêcher Next.js de mettre en cache la réponse.
- La gestion des erreurs utilise `safeErrorResponse()` pour retourner des messages d'erreur génériques tout en enregistrant les erreurs détaillées côté serveur.
- Ce point de terminaison est conçu pour être utilisé lors de la configuration du développement local et des pipelines CI/CD. Il ne doit jamais être exposé en production.

### Commandes associées

Pour les opérations manuelles sur la base de données en dehors de l'API, utilisez les commandes CLI :

```bash
# Générer les fichiers de migration
pnpm db:generate

# Exécuter les migrations
pnpm db:migrate

# Amorcer la base de données
pnpm db:seed

# Ouvrir le studio de base de données
pnpm db:studio
```
