---
id: config-manager-system
title: "Système de gestion de configuration"
sidebar_label: "Système de gestion de configuration"
sidebar_position: 41
---

# Système de gestion de configuration

## Aperçu

Le système Config Manager fournit deux couches de configuration complémentaires : la classe **ConfigManager** (`lib/config-manager.ts`) pour gérer le fichier de configuration de contenu basé sur YAML (`config.yml`) avec une persistance basée sur Git, et **ConfigService** (`lib/config/`) pour valider et accéder à la configuration d'application basée sur des variables d'environnement avec les schémas Zod. Ensemble, ils couvrent à la fois les paramètres modifiables au moment de l'exécution et la configuration de l'environnement au moment du déploiement.

## Architecture

Le système est divisé en deux sous-systèmes distincts :

### ConfigManager (basé sur YAML, modifiable à l'exécution)

`lib/config-manager.ts` gère le fichier `config.yml` dans le répertoire `.content/` (cloné à partir du référentiel de données). Il lit et écrit la configuration YAML, et valide et transmet automatiquement les modifications au référentiel Git à l'aide de `isomorphic-git`. Ceci est utilisé pour les paramètres que les administrateurs peuvent modifier au moment de l'exécution (pagination, navigation, en-tête/pied de page).

### ConfigService (basé sur l'environnement, validé au démarrage)

`lib/config/` fournit un singleton validé par Zod qui lit toutes les variables d'environnement au démarrage et les organise en sections typées : noyau, authentification, e-mail, paiement, analyses et intégrations. Il comprend des indicateurs de fonctionnalités, des utilitaires de détection d'environnement et des exportations arborescentes.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## Référence API

### Gestionnaire de configuration (`lib/config-manager.ts`)

#### Espèces

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (célibataire)

Instance singleton exportée par défaut de `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Renvoie l'objet de configuration complet, en fusionnant le contenu du fichier avec les valeurs par défaut.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Renvoie une valeur de configuration de niveau supérieur par clé.

#### `configManager.getNestedValue(keyPath: string): any`

Renvoie une valeur de configuration imbriquée en utilisant la notation par points (par exemple, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Met à jour une clé de niveau supérieur et persiste dans file + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Met à jour une clé imbriquée à l'aide de la notation par points. Comprend un prototype de protection contre la pollution.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Méthode pratique pour mettre à jour les paramètres de pagination.

#### `configManager.getPaginationConfig(): PaginationConfig`

Renvoie la configuration de pagination actuelle.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (célibataire)

Singleton serveur uniquement qui valide toutes les variables d'environnement au démarrage.

|Propriété|Tapez|Descriptif|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL, informations sur le site, base de données|
|`configService.auth`|`AuthConfig`|Secrets, fournisseurs OAuth|
|`configService.email`|`EmailConfig`|SMTP, Renvoyer, Novu|
|`configService.payment`|`PaymentConfig`|Rayé, LemonSqueezy, Polaire|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentinelle, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Indicateurs de fonctionnalités (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Les fonctionnalités (notes, commentaires, favoris, éléments présentés, enquêtes) sont activées lorsque `DATABASE_URL` est configuré.

#### Utilitaires d'environnement (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Détails de mise en œuvre

**File d'attente des opérations Git** : `ConfigManager` utilise une file d'attente série avec un modèle mutex pour empêcher les opérations Git simultanées. Lorsque `writeConfig()` est appelé, le fichier est immédiatement enregistré et le commit/push Git est mis en file d'attente. Si les opérations Git échouent, la sauvegarde du fichier réussit toujours.

**Dépendances Git à chargement paresseux** : `isomorphic-git` et son module HTTP sont chargés paresseusement via `import()` dynamique avec un modèle singleton pour éviter les problèmes de regroupement et empêcher les importations en double.

**Protection contre la pollution des prototypes** : la méthode `updateNestedKey()` vérifie les clés `__proto__`, `constructor` et `prototype` à chaque niveau du chemin pour empêcher les attaques de pollution des prototypes.

**Validation de démarrage** : `ConfigService` valide toutes les variables d'environnement à l'aide des schémas Zod lors de la première importation. Une configuration non valide provoque un échec de démarrage avec des messages d'erreur descriptifs. Les schémas utilisent les gestionnaires `.catch()` pour une dégradation progressive des champs facultatifs.

**Application uniquement sur le serveur** : `config-service.ts` importe `'server-only'` pour éviter toute inclusion accidentelle dans les bundles clients. La configuration sécurisée pour le client est exportée séparément de `lib/config/client.ts`.

## Configuration

### Variables d'environnement ConfigManager

|Variable|Obligatoire|Descriptif|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Oui|URL du référentiel Git pour le contenu|
|`GH_TOKEN`|Pour Git, poussez|Jeton d'accès GitHub|
|`GITHUB_BRANCH`|Non|Nom de la succursale (par défaut : `main`)|
|`GIT_NAME`|Non|Nom du committer (par défaut : `Website Bot`)|
|`GIT_EMAIL`|Non|E-mail du committer (par défaut : `website@ever.works`)|

### Variables d'environnement ConfigService

Voir `.env.example` pour la liste complète. Les sections clés incluent `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` et d'autres validées par les schémas Zod.

## Exemples d'utilisation

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Meilleures pratiques

- Utilisez `configManager` pour les paramètres qui doivent être modifiés au moment de l'exécution par les administrateurs sans redéploiement.
- Utilisez `configService` pour la configuration au moment du déploiement qui doit être validée au démarrage.
- Importez une configuration sécurisée pour le client depuis `@/lib/config/client` dans les composants clients, jamais depuis l'exportation principale.
- Gérez toujours le retour `Promise<boolean>` de `updateKey` et `updateNestedKey` pour détecter les échecs d'écriture.
- Utilisez les indicateurs de fonctionnalité pour dégrader progressivement les fonctionnalités lorsque les dépendances facultatives (comme la base de données) ne sont pas configurées.

## Modules associés

- [Cache System](./cache-system) -- Utilise `CACHE_TAGS.CONFIG` pour la mise en cache de la configuration
- [Guards System](./guards-system-deep-dive) -- Consomme la configuration du plan/des fonctionnalités
- [Content Library](/template/architecture/content-library) -- Résolution du chemin de contenu utilisée par ConfigManager
