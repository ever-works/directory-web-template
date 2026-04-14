---
id: guards-system-deep-dive
title: "Análisis profundo del sistema de guardias"
sidebar_label: "Análisis profundo del sistema de guardias"
sidebar_position: 47
---

# Análisis profundo del sistema de guardias

## Descripción general

El sistema Guards implementa un control de acceso a funciones basado en planes de suscripción. Define una matriz de funciones centralizada que asigna funciones a planes de suscripción (Gratis, Estándar, Premium), proporciona límites numéricos por plan y ofrece API funcionales y basadas en clases para verificar y hacer cumplir el acceso. El sistema admite la aplicación del lado del servidor mediante el lanzamiento de guardias y el uso del lado del cliente a través de objetos de resultados compatibles con React.

## Arquitectura

El módulo de guardias vive en `lib/guards/` con dos archivos:

- **`lib/guards/plan-features.guard.ts`**: la implementación principal que contiene todas las definiciones de funciones, la matriz de acceso, los límites del plan, las funciones de verificación de acceso y la fábrica de guardias.
- **`lib/guards/index.ts`** -- Exportación de barril que reexporta todo desde el archivo de guardia.

El sistema de protección depende de `PaymentPlan` de `@/lib/constants` para las definiciones de tipos de planes y es consumido por rutas API, servicios y enlaces de React para la activación de funciones.

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

## Referencia de API

### Constantes

#### `FEATURES`

Un objeto que contiene todas las constantes de cadena de características:

|categoría|Características|
|----------|----------|
|Presentación|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Revisión|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Visibilidad|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Analítica|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Soporte|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|sociales|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Otro|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Valores de jerarquía del plan: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

La matriz de acceso asigna cada característica a sus planes permitidos. Tipos de acceso:
- `'all'` -- Todos los planes pueden acceder
- `PaymentPlan` -- Sólo ese plan específico
- `PaymentPlan[]` -- Sólo planes listados
- `{ minPlan: PaymentPlan }` -- Ese plan y más

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Límites numéricos por plan:

|Límite|Gratis|Estándar|prima|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |ilimitado|
|`max_description_words`| 200 | 500 |ilimitado|
|`max_submissions`| 1 | 10 |ilimitado|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Tipos

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

### Funciones

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Comprueba si un plan tiene acceso a una función según la matriz de acceso.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Devuelve el límite numérico para una clave de límite de función específica. Devuelve `null` de forma ilimitada.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Comprueba si un valor está dentro del límite del plan. Devuelve `true` si el límite es `null` (ilimitado).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Devuelve una serie de todas las funciones a las que puede acceder el plan determinado.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Devuelve el plan más bajo que puede acceder a una función. Útil para mensajes de actualización.

#### `getPlanLevel(plan: string): number`

Devuelve el nivel de jerarquía numérica de un plan (0 si se desconoce).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Comprueba si el plan del usuario cumple o supera el nivel de plan requerido.

#### `createPlanGuard(userPlan: string)`

Función de fábrica que devuelve un objeto de protección vinculado a un plan de usuario específico:

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

Crea un objeto de resultado adecuado para los ganchos de React, calculando previamente la lista de funciones accesibles.

### Clases de error

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Lanzado por `requireFeature()` cuando se deniega el acceso. Contiene toda la información necesaria para mostrar un mensaje de actualización.

## Detalles de implementación

**Resolución de acceso**: `canAccessFeature()` evalúa el tipo de acceso en orden: `'all'` -> coincidencia de cadena de plan único -> la matriz incluye verificación -> `{ minPlan }` comparación de jerarquía. Las funciones desconocidas devuelven `false` con una advertencia en la consola.

**Comparación basada en jerarquía**: `planMeetsRequirement()` compara niveles numéricos de `PLAN_LEVELS`, lo que permite que las funciones estén controladas por "este plan y superiores" sin enumerar cada plan explícitamente.

**Nulo para ilimitado**: Los límites usan `null` para representar valores ilimitados. `isWithinLimit()` cortocircuita a `true` cuando el límite es `null`.

**Prototipo seguro contra la contaminación**: Las claves de funciones provienen del objeto constante `FEATURES` y nunca se derivan de la entrada del usuario.

## Configuración

Las reglas de acceso a funciones se configuran modificando los objetos `FEATURE_ACCESS` y `PLAN_LIMITS` en `plan-features.guard.ts`. Para agregar una nueva característica:

1. Agregue una constante a `FEATURES`
2. Agregue una regla de acceso a `FEATURE_ACCESS`
3. Opcionalmente, agregue límites numéricos a `PLAN_LIMITS` (si la función tiene restricciones de cantidad)

## Ejemplos de uso

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

## Mejores prácticas

- Utilice siempre constantes `FEATURES` en lugar de cadenas sin formato para obtener seguridad de tipos y autocompletado.
- Utilice `createPlanGuard()` con `requireFeature()` en rutas y servicios API para la aplicación del lado del servidor que genera errores.
- Utilice `createPlanGuardResult()` en los componentes de React para la activación de la interfaz de usuario del lado del cliente sin excepciones.
- Al agregar nuevas funciones, comience agregando la constante `FEATURES` y la matriz `FEATURE_ACCESS` antes de escribir cualquier lógica de activación.
- Capture `PlanGuardError` en el nivel de ruta API y tradúzcalo en una respuesta 403 con información de actualización (`requiredPlan`).

## Módulos relacionados

- [Sistema de administrador de configuración] (./config-manager-system): indicadores de funciones para funciones dependientes de la base de datos
- [Query Client System](./query-client-system) -- Obtención de datos de suscripción que alimentan los guardias del plan
