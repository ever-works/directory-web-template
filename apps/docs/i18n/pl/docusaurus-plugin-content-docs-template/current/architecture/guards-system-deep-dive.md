---
id: guards-system-deep-dive
title: "Głębokie nurkowanie w systemie strażników"
sidebar_label: "Głębokie nurkowanie w systemie strażników"
sidebar_position: 47
---

# Głębokie nurkowanie w systemie strażników

## Przegląd

System Guards wdraża kontrolę dostępu do funkcji opartą na planie abonamentowym. Definiuje scentralizowaną matrycę funkcji mapującą funkcje do planów subskrypcji (bezpłatny, standardowy, premium), zapewnia limity liczbowe na plan i oferuje zarówno funkcjonalne, jak i oparte na klasach interfejsy API do sprawdzania i egzekwowania dostępu. System obsługuje egzekwowanie po stronie serwera poprzez rzucanie strażników i użycie po stronie klienta za pośrednictwem obiektów wynikowych zgodnych z React.

## Architektura

Moduł strażników znajduje się w `lib/guards/` z dwoma plikami:

- **`lib/guards/plan-features.guard.ts`** — Podstawowa implementacja zawierająca wszystkie definicje funkcji, macierz dostępu, limity planu, funkcje kontroli dostępu i fabrykę strażników.
- **`lib/guards/index.ts`** — Eksport beczki, który reeksportuje wszystko z pliku strażnika.

System ochronny zależy od `PaymentPlan` z `@/lib/constants` w zakresie definicji typów planów i jest używany przez trasy API, usługi i zaczepy React do bramkowania funkcji.

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

## Dokumentacja API

### Stałe

#### `FEATURES`

Obiekt zawierający wszystkie stałe ciągu cech:

|Kategoria|Funkcje|
|----------|----------|
|Poddanie|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Recenzja|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Widoczność|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analityka|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Wsparcie|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Społeczny|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Inne|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Wartości hierarchii planu: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

Macierz dostępu mapująca każdą funkcję na dozwolone plany. Rodzaje dostępu:
- `'all'` — Dostęp dla wszystkich planów
- `PaymentPlan` -- Tylko ten konkretny plan
- `PaymentPlan[]` — Tylko wymienione plany
- `{ minPlan: PaymentPlan }` -- Ten plan i więcej

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Limity liczbowe na plan:

|Limit|Bezpłatny|Standardowe|Premium|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |nieograniczony|
|`max_description_words`| 200 | 500 |nieograniczony|
|`max_submissions`| 1 | 10 |nieograniczony|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Typy

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

### Funkcje

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Sprawdza, czy plan ma dostęp do funkcji w oparciu o macierz dostępu.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Zwraca limit liczbowy dla określonego klucza limitu funkcji. Zwraca `null` bez ograniczeń.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Sprawdza, czy wartość mieści się w limicie planu. Zwraca `true`, jeśli limit wynosi `null` (nieograniczony).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Zwraca tablicę wszystkich funkcji dostępnych w ramach danego planu.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Zwraca najniższy plan, który może uzyskać dostęp do funkcji. Przydatne w przypadku monitów o aktualizację.

#### `getPlanLevel(plan: string): number`

Zwraca numeryczny poziom hierarchii planu (0, jeśli nieznany).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Sprawdza, czy plan użytkownika spełnia lub przekracza wymagany poziom planu.

#### `createPlanGuard(userPlan: string)`

Funkcja fabryczna, która zwraca obiekt ochronny powiązany z konkretnym planem użytkownika:

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

Tworzy obiekt wynikowy odpowiedni dla haków React, wstępnie obliczając listę dostępnych funkcji.

### Klasy błędów

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Zgłaszany przez `requireFeature()` w przypadku odmowy dostępu. Zawiera wszystkie informacje potrzebne do wyświetlenia monitu o aktualizację.

## Szczegóły wdrożenia

**Rozdzielczość dostępu**: `canAccessFeature()` ocenia typ dostępu w kolejności: `'all'` -> dopasowanie ciągu pojedynczego planu -> tablica zawiera sprawdzenie -> `{ minPlan }` porównanie hierarchii. Nieznane funkcje zwracają `false` z ostrzeżeniem w konsoli.

**Porównanie oparte na hierarchii**: `planMeetsRequirement()` porównuje poziomy liczbowe z `PLAN_LEVELS`, umożliwiając grupowanie funkcji według „tego planu i wyższych” bez jawnego wymieniania każdego planu.

**Null dla nieograniczonej**: Limity używają `null` do reprezentowania nieograniczonych wartości. `isWithinLimit()` powoduje zwarcie do `true`, gdy limit wynosi `null`.

**Prototyp bezpieczny przed zanieczyszczeniami**: Klucze funkcji pochodzą z obiektu stałego `FEATURES` i nigdy nie są wyprowadzane z danych wprowadzonych przez użytkownika.

## Konfiguracja

Reguły dostępu do funkcji konfiguruje się poprzez modyfikację obiektów `FEATURE_ACCESS` i `PLAN_LIMITS` w `plan-features.guard.ts`. Aby dodać nową funkcję:

1. Dodaj stałą do `FEATURES`
2. Dodaj regułę dostępu do `FEATURE_ACCESS`
3. Opcjonalnie dodaj limity liczbowe do `PLAN_LIMITS` (jeśli funkcja ma ograniczenia ilościowe)

## Przykłady użycia

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

## Najlepsze praktyki

- Zawsze używaj stałych `FEATURES` zamiast surowych ciągów znaków, aby uzyskać bezpieczeństwo typu i autouzupełnianie.
- Użyj `createPlanGuard()` z `requireFeature()` w trasach i usługach API w celu egzekwowania po stronie serwera, co powoduje błędy.
- Użyj `createPlanGuardResult()` w komponentach React do bramkowania interfejsu użytkownika po stronie klienta bez wyjątków.
- Dodając nowe funkcje, zacznij od dodania stałej `FEATURES` i macierzy `FEATURE_ACCESS` przed napisaniem jakiejkolwiek logiki bramkującej.
- Złap `PlanGuardError` na poziomie trasy API i przetłumacz go na odpowiedź 403 z informacjami o aktualizacji (`requiredPlan`).

## Powiązane moduły

- [System menedżera konfiguracji](./config-manager-system) — Flagi funkcji dla funkcji zależnych od bazy danych
- [Query Client System](./query-client-system) — Pobieranie danych subskrypcji, które trafiają do strażników planu
