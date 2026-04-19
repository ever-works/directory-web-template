---
id: guards-system-deep-dive
title: "Approfondimento sul sistema delle guardie"
sidebar_label: "Approfondimento sul sistema delle guardie"
sidebar_position: 47
---

# Approfondimento sul sistema delle guardie

## Panoramica

Il sistema Guards implementa il controllo dell'accesso alle funzionalità basato sul piano di abbonamento. Definisce una matrice di funzionalità centralizzata che mappa le funzionalità ai piani di abbonamento (gratuito, standard, premium), fornisce limiti numerici per piano e offre API sia funzionali che basate su classi per controllare e imporre l'accesso. Il sistema supporta l'applicazione lato server tramite l'attivazione di guardie e l'utilizzo lato client tramite oggetti risultato compatibili con React.

## Architettura

Il modulo Guardie si trova in `lib/guards/` con due file:

- **`lib/guards/plan-features.guard.ts`** -- L'implementazione principale contenente tutte le definizioni delle funzionalità, la matrice di accesso, i limiti del piano, le funzioni di controllo dell'accesso e la fabbrica di guardia.
- **`lib/guards/index.ts`** -- Esportazione barile che riesporta tutto dal file di guardia.

Il sistema di guardia dipende da `PaymentPlan` da `@/lib/constants` per le definizioni del tipo di piano ed è utilizzato da percorsi API, servizi e hook React per il gating delle funzionalità.

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

## Riferimento API

### Costanti

#### `FEATURES`

Un oggetto contenente tutte le costanti della stringa di funzionalità:

|Categoria|Caratteristiche|
|----------|----------|
|Sottomissione|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Recensione|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Visibilità|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analitica|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Supporto|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Sociale|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Altro|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Valori della gerarchia del piano: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

La matrice di accesso mappa ciascuna funzionalità ai suoi piani consentiti. Tipi di accesso:
- `'all'` -- Tutti i piani possono accedere
- `PaymentPlan` -- Solo quel piano specifico
- `PaymentPlan[]` -- Solo i piani elencati
- `{ minPlan: PaymentPlan }` -- Quel piano e oltre

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Limiti numerici per piano:

|Limite|Gratuito|Norma|Premio|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |illimitato|
|`max_description_words`| 200 | 500 |illimitato|
|`max_submissions`| 1 | 10 |illimitato|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Tipi

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

### Funzioni

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Controlla se un piano ha accesso a una funzionalità in base alla matrice di accesso.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Restituisce il limite numerico per una chiave di limite di funzionalità specifica. Restituisce `null` per illimitato.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Controlla se un valore rientra nel limite del piano. Restituisce `true` se il limite è `null` (illimitato).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Restituisce una serie di tutte le funzionalità accessibili dal piano specificato.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Restituisce il piano più basso che può accedere a una funzionalità. Utile per le richieste di aggiornamento.

#### `getPlanLevel(plan: string): number`

Restituisce il livello gerarchico numerico per un piano (0 se sconosciuto).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Controlla se il piano dell'utente soddisfa o supera il livello del piano richiesto.

#### `createPlanGuard(userPlan: string)`

Funzione di fabbrica che restituisce un oggetto guard legato ad un piano utente specifico:

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

Crea un oggetto risultato adatto agli hook React, precalcolando l'elenco delle funzionalità accessibili.

### Classi di errore

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Lanciato da `requireFeature()` quando l'accesso è negato. Contiene tutte le informazioni necessarie per visualizzare una richiesta di aggiornamento.

## Dettagli di implementazione

**Risoluzione dell'accesso**: `canAccessFeature()` valuta il tipo di accesso nell'ordine: `'all'` -> corrispondenza stringa piano singolo -> l'array include il controllo -> `{ minPlan }` confronto gerarchia. Le funzionalità sconosciute restituiscono `false` con un avviso sulla console.

**Confronto basato sulla gerarchia**: `planMeetsRequirement()` confronta i livelli numerici di `PLAN_LEVELS`, consentendo di delimitare le funzionalità da "questo piano e superiori" senza elencare esplicitamente ogni piano.

**Null per illimitato**: i limiti utilizzano `null` per rappresentare valori illimitati. `isWithinLimit()` cortocircuita su `true` quando il limite è `null`.

**Prototipo anti-inquinamento**: le chiavi funzione provengono dall'oggetto costante `FEATURES` e non derivano mai dall'input dell'utente.

## Configurazione

Le regole di accesso alle funzioni vengono configurate modificando gli oggetti `FEATURE_ACCESS` e `PLAN_LIMITS` in `plan-features.guard.ts`. Per aggiungere una nuova funzionalità:

1. Aggiungi una costante a `FEATURES`
2. Aggiungi una regola di accesso a `FEATURE_ACCESS`
3. Facoltativamente, aggiungi limiti numerici a `PLAN_LIMITS` (se la funzionalità prevede limitazioni di quantità)

## Esempi di utilizzo

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

## Migliori pratiche

- Utilizza sempre le costanti `FEATURES` anziché le stringhe grezze per ottenere l'indipendenza dal tipo e il completamento automatico.
- Utilizza `createPlanGuard()` con `requireFeature()` nei percorsi e nei servizi API per l'applicazione lato server che genera errori.
- Utilizza `createPlanGuardResult()` nei componenti React per il gating dell'interfaccia utente lato client senza eccezioni.
- Quando si aggiungono nuove funzionalità, iniziare aggiungendo alla costante `FEATURES` e alla matrice `FEATURE_ACCESS` prima di scrivere qualsiasi logica di gate.
- Cattura `PlanGuardError` a livello di percorso API e traducilo in una risposta 403 con informazioni sull'aggiornamento (`requiredPlan`).

## Moduli correlati

- [Config Manager System](./config-manager-system) -- Flag di funzionalità per funzionalità dipendenti dal database
- [Query Client System](./query-client-system): recupero dei dati di abbonamento che alimentano Plan Guards
