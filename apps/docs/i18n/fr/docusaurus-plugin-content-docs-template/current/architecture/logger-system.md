---
id: logger-system
title: "Système d'enregistrement"
sidebar_label: "Système d'enregistrement"
sidebar_position: 44
---

# Système d'enregistrement

## Aperçu

Le système Logger fournit un utilitaire de journalisation léger et respectueux de l'environnement pour une sortie de journal cohérente dans toute l'application. Il prend en charge quatre niveaux de journalisation (DEBUG, INFO, WARN, ERROR), des instances de journalisation contextuelles et un formatage spécifique à l'environnement : sortie de console de style dans le navigateur pendant le développement et sortie au format JSON dans Node.js et les environnements de production.

## Architecture

Le module (`lib/logger.ts`) exporte deux éléments :

- **`logger`** -- Une instance singleton par défaut sans étiquette de contexte, adaptée à la journalisation à usage général.
- **`Logger`** (class) -- La classe elle-même, pour créer des instances de journalisation contextuelles étendues à des modules ou fonctionnalités spécifiques.

Le logger suit une stratégie de filtrage simple : en production (`NODE_ENV !== 'development'`), seuls les messages WARN et ERROR sont émis. En développement, tous les niveaux sont enregistrés. Cela garantit que les résultats de débogage détaillés ne fuient pas dans les environnements de production.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Référence API

### Exportations

#### `logger` (célibataire)

Une instance `Logger` pré-instanciée sans contexte. À utiliser pour une journalisation rapide et sans portée.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Classe)

##### `static create(context: string): Logger`

Méthode d'usine pour créer un enregistreur contextuel. La chaîne de contexte apparaît comme préfixe dans tous les messages de journal.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Enregistre un message de niveau débogage. Uniquement émis en développement.

##### `info(message: string, data?: any): void`

Enregistre un message d'information. Uniquement émis en développement.

##### `warn(message: string, data?: any): void`

Enregistre un message d'avertissement. Émis dans tous les environnements.

##### `error(message: string, error?: any): void`

Enregistre un message d'erreur. Si le paramètre `error` est une instance `Error`, l'enregistreur extrait automatiquement les propriétés `message`, `stack` et `name`. Émis dans tous les environnements.

##### `api(method: string, url: string, data?: any): void`

Méthode pratique pour enregistrer les requêtes API. Délégués à `debug()` avec des données structurées. Développement uniquement.

##### `performance(label: string, duration: number): void`

Méthode pratique pour enregistrer les mesures de performances. Enregistre l'étiquette et la durée en millisecondes. Développement uniquement.

### Types internes

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Détails de mise en œuvre

**Détection d'environnement** : l'enregistreur vérifie `process.env.NODE_ENV === 'development'` au moment de la construction et met en cache le résultat. Cela évite les recherches répétées d’environnement à chaque appel de journal.

**Style du navigateur** : lors de l'exécution dans le navigateur (`typeof window !== 'undefined'`) en mode développement, les messages de journal sont stylisés à l'aide des directives CSS `%c` :

|Niveau|Couleur|
|-------|-------|
|DÉBOGAGE|`#6366f1` (indigo)|
|INFOS|`#3b82f6` (bleu)|
|AVERTIR|`#f59e0b` (orange)|
|ERREUR|`#ef4444` (rouge)|

**Sortie Node.js** : dans les environnements ou en production Node.js, les messages sont formatés sous forme de chaînes simples avec des données sérialisées JSON (joliment imprimées avec un retrait de 2 espaces).

**Extraction d'erreur** : la méthode `error()` détecte les instances de `Error` et extrait `errorMessage`, `stack` et `name` dans un objet de données structurées pour un débogage plus facile.

## Configuration

L'enregistreur ne nécessite aucune configuration. Son comportement est entièrement déterminé par `NODE_ENV` :

|`NODE_ENV`|DÉBOGAGE|INFOS|AVERTIR|ERREUR|
|------------|-------|------|------|-------|
|`development`|Oui|Oui|Oui|Oui|
|`production`|Non|Non|Oui|Oui|
|`test`|Non|Non|Oui|Oui|

## Exemples d'utilisation

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Meilleures pratiques

- Créez des enregistreurs contextuels pour chaque module ou zone de fonctionnalités à l'aide de `Logger.create('ModuleName')` pour faciliter le filtrage des journaux.
- Utilisez `debug()` pour un traçage détaillé qui ne devrait jamais apparaître en production ; utilisez `info()` pour les événements notables.
- Transmettez toujours les objets `Error` (pas les chaînes) à la méthode `error()` afin que les traces de pile soient automatiquement capturées.
- Utilisez la méthode `api()` pour la journalisation des requêtes HTTP afin de maintenir une structure de journal cohérente entre les appels d'API.
- Ne comptez pas sur l'enregistreur pour le suivi en production ; intégrer à une plate-forme d'observabilité appropriée (PostHog, Sentry) pour le suivi des erreurs de production.

## Modules associés

- [API Client Layer](/template/architecture/api-client-layer) -- Utilise l'enregistreur pour la journalisation des demandes/réponses
- [Config Manager System](./config-manager-system) -- ConfigService enregistre les résultats de validation au démarrage
