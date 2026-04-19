---
id: guards-system-deep-dive
title: "Bewakingssysteem Diepe duik"
sidebar_label: "Bewakingssysteem Diepe duik"
sidebar_position: 47
---

# Bewakingssysteem Diepe duik

## Overzicht

Het Guards-systeem implementeert op abonnementen gebaseerde toegangscontrole voor functies. Het definieert een gecentraliseerde functiematrix voor het in kaart brengen van functies voor abonnementen (Gratis, Standaard, Premium), biedt numerieke limieten per abonnement en biedt zowel functionele als op klassen gebaseerde API's voor het controleren en afdwingen van toegang. Het systeem ondersteunt handhaving aan de serverzijde via het gooien van bewakers en gebruik aan de clientzijde via React-compatibele resultaatobjecten.

## Architectuur

De bewakersmodule bevindt zich in `lib/guards/` met twee bestanden:

- **`lib/guards/plan-features.guard.ts`** -- De kernimplementatie die alle functiedefinities, de toegangsmatrix, planlimieten, toegangscontrolefuncties en de bewakingsfabriek bevat.
- **`lib/guards/index.ts`** -- Vatexport die alles uit het bewakingsbestand opnieuw exporteert.

Het bewakingssysteem is afhankelijk van `PaymentPlan` van `@/lib/constants` voor definities van plantypes en wordt gebruikt door API-routes, services en React-hooks voor feature-gating.

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

## API-referentie

### Constanten

#### `FEATURES`

Een object dat alle featurestringconstanten bevat:

|Categorie|Kenmerken|
|----------|----------|
|Indiening|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Beoordeling|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Zichtbaarheid|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analyse|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Ondersteuning|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Sociaal|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Anders|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Planhiërarchiewaarden: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

De toegangsmatrix wijst elke functie toe aan de toegestane plannen. Toegangstypen:
- `'all'` -- Alle abonnementen hebben toegang
- `PaymentPlan` -- Alleen dat specifieke plan
- `PaymentPlan[]` -- Alleen vermelde abonnementen
- `{ minPlan: PaymentPlan }` -- Dat plan en hoger

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Numerieke limieten per plan:

|Limiet|Gratis|Standaard|Premie|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |onbeperkt|
|`max_description_words`| 200 | 500 |onbeperkt|
|`max_submissions`| 1 | 10 |onbeperkt|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Soorten

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

### Functies

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Controleert of een abonnement toegang heeft tot een functie op basis van de toegangsmatrix.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Retourneert de numerieke limiet voor een specifieke functielimietsleutel. Retourneert `null` voor onbeperkt.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Controleert of een waarde binnen de limiet van het plan valt. Retourneert `true` als de limiet `null` (onbeperkt) is.

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Retourneert een array van alle functies die toegankelijk zijn via het opgegeven abonnement.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Retourneert het laagste abonnement dat toegang heeft tot een functie. Handig voor upgrade-aanwijzingen.

#### `getPlanLevel(plan: string): number`

Retourneert het numerieke hiërarchieniveau voor een plan (0 indien onbekend).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Controleert of het abonnement van de gebruiker voldoet aan het vereiste abonnementsniveau of dit overtreft.

#### `createPlanGuard(userPlan: string)`

Fabrieksfunctie die een bewakingsobject retourneert dat is gebonden aan een specifiek gebruikersplan:

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

Creëert een resultaatobject dat geschikt is voor React-hooks, waarbij de lijst met toegankelijke functies vooraf wordt berekend.

### Foutklassen

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Geworpen door `requireFeature()` wanneer toegang wordt geweigerd. Bevat alle informatie die nodig is om een ​​upgrade-prompt weer te geven.

## Implementatiedetails

**Toegangsresolutie**: `canAccessFeature()` evalueert het toegangstype in de volgende volgorde: `'all'` -> overeenkomst met enkele planreeks -> array bevat controle -> `{ minPlan }` hiërarchievergelijking. Onbekende functies retourneren `false` met een consolewaarschuwing.

**Op hiërarchie gebaseerde vergelijking**: `planMeetsRequirement()` vergelijkt numerieke niveaus van `PLAN_LEVELS`, waardoor functies kunnen worden afgesloten door "dit plan en hoger" zonder elk plan expliciet te vermelden.

**Null voor onbeperkt**: Limieten gebruiken `null` om onbeperkte waarden weer te geven. `isWithinLimit()` maakt kortsluiting naar `true` wanneer de limiet `null` is.

**Prototype veilig tegen vervuiling**: Functiesleutels zijn afkomstig van het constante object `FEATURES` en zijn nooit afgeleid van gebruikersinvoer.

## Configuratie

Regels voor functietoegang worden geconfigureerd door het wijzigen van de objecten `FEATURE_ACCESS` en `PLAN_LIMITS` in `plan-features.guard.ts`. Een nieuwe functie toevoegen:

1. Voeg een constante toe aan `FEATURES`
2. Voeg een toegangsregel toe aan `FEATURE_ACCESS`
3. Voeg optioneel numerieke limieten toe aan `PLAN_LIMITS` (als de functie hoeveelheidsbeperkingen heeft)

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik altijd `FEATURES` constanten in plaats van onbewerkte tekenreeksen om typeveiligheid en automatische aanvulling te verkrijgen.
- Gebruik `createPlanGuard()` met `requireFeature()` in API-routes en -services voor handhaving aan de serverzijde die fouten veroorzaakt.
- Gebruik `createPlanGuardResult()` in React-componenten voor UI-gating aan de clientzijde zonder uitzonderingen.
- Wanneer u nieuwe functies toevoegt, begin dan met het toevoegen van de `FEATURES` constante en `FEATURE_ACCESS` matrix voordat u enige poortlogica schrijft.
- Vang `PlanGuardError` op API-routeniveau en vertaal het naar een 403-antwoord met upgrade-informatie (`requiredPlan`).

## Gerelateerde modules

- [Config Manager System](./config-manager-system) -- Functievlaggen voor database-afhankelijke functies
- [Query Client System](./query-client-system) - Ophalen van abonnementsgegevens die worden ingevoerd in planbewakers
