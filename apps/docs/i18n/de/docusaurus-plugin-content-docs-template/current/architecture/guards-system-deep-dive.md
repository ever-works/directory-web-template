---
id: guards-system-deep-dive
title: "Tiefer Einblick in das Wachsystem"
sidebar_label: "Tiefer Einblick in das Wachsystem"
sidebar_position: 47
---

# Tiefer Einblick in das Wachsystem

## Übersicht

Das Guards-System implementiert eine abonnementbasierte Funktionszugriffskontrolle. Es definiert eine zentralisierte Funktionsmatrix, die Funktionen den Abonnementplänen (kostenlos, Standard, Premium) zuordnet, stellt numerische Beschränkungen pro Plan bereit und bietet sowohl funktionale als auch klassenbasierte APIs zur Überprüfung und Durchsetzung des Zugriffs. Das System unterstützt die serverseitige Durchsetzung über Throwing Guards und die clientseitige Nutzung über React-kompatible Ergebnisobjekte.

## Architektur

Das Guards-Modul befindet sich in `lib/guards/` mit zwei Dateien:

- **`lib/guards/plan-features.guard.ts`** – Die Kernimplementierung, die alle Featuredefinitionen, die Zugriffsmatrix, Plangrenzen, Zugriffskontrollfunktionen und die Schutzfabrik enthält.
- **`lib/guards/index.ts`** – Barrel-Export, der alles aus der Guard-Datei erneut exportiert.

Das Schutzsystem ist für Plantypdefinitionen von `PaymentPlan` von `@/lib/constants` abhängig und wird von API-Routen, Diensten und React-Hooks für Feature-Gating genutzt.

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

## API-Referenz

### Konstanten

#### `FEATURES`

Ein Objekt, das alle Feature-String-Konstanten enthält:

|Kategorie|Funktionen|
|----------|----------|
|Einreichung|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Rezension|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Sichtbarkeit|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analytik|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Unterstützung|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Sozial|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Andere|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Planhierarchiewerte: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

Die Zugriffsmatrix ordnet jede Funktion den zulässigen Plänen zu. Zugriffsarten:
- `'all'` – Alle Pläne können darauf zugreifen
- `PaymentPlan` – Nur dieser spezielle Plan
- `PaymentPlan[]` – Nur aufgeführte Pläne
- `{ minPlan: PaymentPlan }` – Dieser Plan und höher

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Numerische Grenzen pro Plan:

|Begrenzen|Kostenlos|Standard|Premium|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |unbegrenzt|
|`max_description_words`| 200 | 500 |unbegrenzt|
|`max_submissions`| 1 | 10 |unbegrenzt|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Typen

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

### Funktionen

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Überprüft anhand der Zugriffsmatrix, ob ein Plan Zugriff auf eine Funktion hat.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Gibt das numerische Limit für einen bestimmten Feature-Limit-Schlüssel zurück. Gibt `null` für unbegrenzte Zeit zurück.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Überprüft, ob ein Wert innerhalb des Planlimits liegt. Gibt `true` zurück, wenn das Limit `null` (unbegrenzt) beträgt.

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Gibt ein Array aller Funktionen zurück, auf die der angegebene Plan zugreifen kann.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Gibt den niedrigsten Plan zurück, der auf eine Funktion zugreifen kann. Nützlich für Upgrade-Eingabeaufforderungen.

#### `getPlanLevel(plan: string): number`

Gibt die numerische Hierarchieebene für einen Plan zurück (0, wenn unbekannt).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Überprüft, ob der Plan des Benutzers die erforderliche Planebene erreicht oder überschreitet.

#### `createPlanGuard(userPlan: string)`

Factory-Funktion, die ein an einen bestimmten Benutzerplan gebundenes Schutzobjekt zurückgibt:

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

Erstellt ein für React-Hooks geeignetes Ergebnisobjekt und berechnet vorab die Liste der zugänglichen Funktionen.

### Fehlerklassen

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Wird von `requireFeature()` ausgelöst, wenn der Zugriff verweigert wird. Enthält alle Informationen, die zum Anzeigen einer Upgrade-Eingabeaufforderung erforderlich sind.

## Implementierungsdetails

**Zugriffsauflösung**: `canAccessFeature()` wertet den Zugriffstyp in der folgenden Reihenfolge aus: `'all'` -> Einzelplan-String-Übereinstimmung -> Array enthält Prüfung -> `{ minPlan }` Hierarchievergleich. Unbekannte Funktionen geben `false` mit einer Konsolenwarnung zurück.

**Hierarchiebasierter Vergleich**: `planMeetsRequirement()` vergleicht numerische Ebenen von `PLAN_LEVELS` und ermöglicht so die Eingrenzung von Features nach „diesem Plan und höher“, ohne jeden Plan explizit aufzulisten.

**Null für unbegrenzt**: Grenzwerte verwenden `null`, um unbegrenzte Werte darzustellen. `isWithinLimit()` schließt `true` kurz, wenn der Grenzwert `null` ist.

**Prototyp verschmutzungssicher**: Funktionsschlüssel stammen vom konstanten Objekt `FEATURES` und werden niemals von Benutzereingaben abgeleitet.

## Konfiguration

Funktionszugriffsregeln werden durch Ändern der Objekte `FEATURE_ACCESS` und `PLAN_LIMITS` in `plan-features.guard.ts` konfiguriert. So fügen Sie eine neue Funktion hinzu:

1. Fügen Sie eine Konstante zu `FEATURES` hinzu.
2. Fügen Sie eine Zugriffsregel zu `FEATURE_ACCESS` hinzu.
3. Fügen Sie optional numerische Grenzwerte zu `PLAN_LIMITS` hinzu (wenn für die Funktion Mengenbeschränkungen gelten).

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie immer `FEATURES`-Konstanten anstelle von Rohzeichenfolgen, um Typsicherheit und automatische Vervollständigung zu gewährleisten.
- Verwenden Sie `createPlanGuard()` mit `requireFeature()` in API-Routen und -Diensten für serverseitige Durchsetzung, die Fehler auslöst.
- Verwenden Sie `createPlanGuardResult()` in React-Komponenten für clientseitiges UI-Gating ohne Ausnahmen.
- Wenn Sie neue Funktionen hinzufügen, beginnen Sie mit dem Hinzufügen der `FEATURES`-Konstante und der `FEATURE_ACCESS`-Matrix, bevor Sie eine Gating-Logik schreiben.
- Fangen Sie `PlanGuardError` auf der API-Routenebene ab und übersetzen Sie es in eine 403-Antwort mit Upgrade-Informationen (`requiredPlan`).

## Verwandte Module

- [Config Manager System](./config-manager-system) – Funktionsflags für datenbankabhängige Funktionen
- [Query Client System](./query-client-system) – Abruf von Abonnementdaten, die in Planwächter eingespeist werden
