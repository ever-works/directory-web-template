---
id: guards-system-deep-dive
title: "Analyse approfondie du système de gardes"
sidebar_label: "Analyse approfondie du système de gardes"
sidebar_position: 47
---

# Analyse approfondie du système de gardes

## Aperçu

Le système Guards implémente un contrôle d’accès aux fonctionnalités basé sur un plan d’abonnement. Il définit une matrice de fonctionnalités centralisée mappant les fonctionnalités aux plans d'abonnement (gratuit, standard, premium), fournit des limites numériques par plan et propose des API à la fois fonctionnelles et basées sur les classes pour vérifier et appliquer l'accès. Le système prend en charge l'application côté serveur via des gardes et l'utilisation côté client via des objets de résultat compatibles React.

## Architecture

Le module de gardes réside dans `lib/guards/` avec deux fichiers :

- **`lib/guards/plan-features.guard.ts`** -- L'implémentation de base contenant toutes les définitions de fonctionnalités, la matrice d'accès, les limites du plan, les fonctions de contrôle d'accès et la fabrique de gardes.
- **`lib/guards/index.ts`** -- Exportation en baril qui réexporte tout le fichier de garde.

Le système de garde dépend de `PaymentPlan` de `@/lib/constants` pour les définitions de type de plan et est consommé par les routes API, les services et les hooks React pour le contrôle des fonctionnalités.

```
lib/guards/
  |-- index.ts                  (barrel export)
  |-- plan-features.guard.ts    (core implementation)
      |-- PLAN_LEVELS           (hierarchy: FREE=1, STANDARD=2, PREMIUM=3)
      |-- FEATURES              (feature constants)
      |-- FEATURE_ACCESS        (feature -> plan mapping matrix)
      |-- PLAN_LIMITS           (numeric limits per plan)
      |-- canAccessFeature()    (check function)
      |-- createPlanGuard()     (guard factory)
      |-- createPlanGuardResult() (React hook helper)
      |-- PlanGuardError        (typed error class)
```

## Référence API

### Constantes

#### `FEATURES`

Un objet contenant toutes les constantes de chaîne de fonctionnalités :

|Catégorie|Caractéristiques|
|----------|----------|
|Soumission|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Examen|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Visibilité|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analyse|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Assistance|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Social|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Autre|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Valeurs de la hiérarchie du plan : `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

La matrice d'accès mappant chaque fonctionnalité à ses plans autorisés. Types d'accès :
- `'all'` -- Tous les forfaits peuvent accéder
- `PaymentPlan` -- Uniquement ce plan spécifique
- `PaymentPlan[]` -- Uniquement les forfaits répertoriés
- `{ minPlan: PaymentPlan }` -- Ce plan et supérieur

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Limites numériques par forfait :

|Limite|Gratuit|Norme|Prime|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |illimité|
|`max_description_words`| 200 | 500 |illimité|
|`max_submissions`| 1 | 10 |illimité|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Espèces

#### `Feature`

```typescript
type Feature = (typeof FEATURES)[keyof typeof FEATURES];
// Union of all feature string values
```

#### `PlanGuardResult`

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### Fonctions

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Vérifie si un plan a accès à une fonctionnalité en fonction de la matrice d'accès.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Renvoie la limite numérique pour une clé de limite de fonctionnalité spécifique. Renvoie `null` pour un nombre illimité.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Vérifie si une valeur est dans la limite du plan. Renvoie `true` si la limite est `null` (illimité).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Renvoie un tableau de toutes les fonctionnalités accessibles par le plan donné.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Renvoie le forfait le plus bas pouvant accéder à une fonctionnalité. Utile pour les invites de mise à niveau.

#### `getPlanLevel(plan: string): number`

Renvoie le niveau hiérarchique numérique d'un plan (0 si inconnu).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Vérifie si le plan de l'utilisateur atteint ou dépasse le niveau de plan requis.

#### `createPlanGuard(userPlan: string)`

Fonction d'usine qui renvoie un objet guard lié à un plan utilisateur spécifique :

```typescript
const guard = createPlanGuard('standard');
guard.canAccess(feature)          // boolean check
guard.requireFeature(feature)     // throws PlanGuardError if denied
guard.getLimit(limitName)         // get numeric limit
guard.isWithinLimit(name, value)  // check within limit
guard.requireWithinLimit(name, v) // throws if exceeded
guard.getAccessibleFeatures()     // all accessible features
guard.getPlan()                   // current plan string
guard.getPlanLevel()              // current plan level number
```

#### `createPlanGuardResult(userPlan: string): PlanGuardResult`

Crée un objet de résultat adapté aux hooks React, en pré-calculant la liste des fonctionnalités accessibles.

### Classes d'erreur

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Lancé par `requireFeature()` lorsque l'accès est refusé. Contient toutes les informations nécessaires pour afficher une invite de mise à niveau.

## Détails de mise en œuvre

**Résolution d'accès** : `canAccessFeature()` évalue le type d'accès dans l'ordre : `'all'` -> correspondance de chaîne de plan unique -> le tableau inclut la vérification -> `{ minPlan }` comparaison de hiérarchie. Les fonctionnalités inconnues renvoient `false` avec un avertissement de console.

**Comparaison basée sur la hiérarchie** : `planMeetsRequirement()` compare les niveaux numériques de `PLAN_LEVELS`, permettant aux fonctionnalités d'être contrôlées par « ce plan et supérieur » sans répertorier explicitement chaque plan.

**Null pour illimité** : les limites utilisent `null` pour représenter des valeurs illimitées. `isWithinLimit()` court-circuite vers `true` lorsque la limite est `null`.

**Prototype sécurisé contre la pollution** : les clés de fonctionnalité proviennent de l'objet constant `FEATURES` et ne sont jamais dérivées de la saisie de l'utilisateur.

## Configuration

Les règles d'accès aux fonctionnalités sont configurées en modifiant les objets `FEATURE_ACCESS` et `PLAN_LIMITS` dans `plan-features.guard.ts`. Pour ajouter une nouvelle fonctionnalité :

1. Ajouter une constante à `FEATURES`
2. Ajouter une règle d'accès à `FEATURE_ACCESS`
3. Ajoutez éventuellement des limites numériques à `PLAN_LIMITS` (si la fonctionnalité a des restrictions de quantité)

## Exemples d'utilisation

```typescript
// Simple feature check in an API route
import { canAccessFeature, FEATURES } from '@/lib/guards';

export async function POST(request: Request) {
  const userPlan = await getUserPlan(session);

  if (!canAccessFeature(FEATURES.UPLOAD_VIDEO, userPlan)) {
    return Response.json(
      { error: 'Video upload requires Premium plan' },
      { status: 403 }
    );
  }
  // ... handle upload
}

// Using the guard factory in a service
import { createPlanGuard, FEATURES } from '@/lib/guards';

async function submitProduct(data: ProductData, userPlan: string) {
  const guard = createPlanGuard(userPlan);

  // This throws PlanGuardError if not allowed
  guard.requireFeature(FEATURES.SUBMIT_PRODUCT);

  // Check numeric limits
  guard.requireWithinLimit('max_images', data.images.length);
  guard.requireWithinLimit('max_description_words', countWords(data.description));

  // Proceed with submission
  return await saveProduct(data);
}

// React hook usage
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

function SubmissionForm({ userPlan }: { userPlan: string }) {
  const guard = createPlanGuardResult(userPlan);
  const imageLimit = guard.getLimit('max_images');

  return (
    <form>
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
      <ImageUploader maxImages={imageLimit ?? Infinity} />
      {!guard.canAccess(FEATURES.VERIFIED_BADGE) && (
        <UpgradePrompt feature="Verified Badge" />
      )}
    </form>
  );
}

// Get minimum plan for upgrade messaging
import { getMinimumPlanForFeature, FEATURES } from '@/lib/guards';

const requiredPlan = getMinimumPlanForFeature(FEATURES.ADVANCED_ANALYTICS);
// Returns PaymentPlan.PREMIUM
```

## Meilleures pratiques

- Utilisez toujours des constantes `FEATURES` au lieu de chaînes brutes pour obtenir la sécurité des types et la saisie semi-automatique.
- Utilisez `createPlanGuard()` avec `requireFeature()` dans les routes et services API pour l'application côté serveur qui génère des erreurs.
- Utilisez `createPlanGuardResult()` dans les composants React pour le contrôle de l'interface utilisateur côté client sans exceptions.
- Lors de l'ajout de nouvelles fonctionnalités, commencez par ajouter la constante `FEATURES` et la matrice `FEATURE_ACCESS` avant d'écrire une logique de déclenchement.
- Attrapez `PlanGuardError` au niveau de la route API et traduisez-le en une réponse 403 avec des informations de mise à niveau (`requiredPlan`).

## Modules associés

- [Config Manager System](./config-manager-system) -- Indicateurs de fonctionnalités pour les fonctionnalités dépendantes de la base de données
- [Query Client System](./query-client-system) -- Récupération des données d'abonnement qui alimentent les gardes du plan
