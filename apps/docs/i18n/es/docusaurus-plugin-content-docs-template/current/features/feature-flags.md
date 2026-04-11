---
id: feature-flags
title: Sistema de indicadores de funciones
sidebar_label: Banderas de características
sidebar_position: 9
---

# Sistema de banderas de funciones

La plantilla Ever Works utiliza un sistema de indicadores de funciones para manejar con elegancia las dependencias faltantes, en particular la disponibilidad de la base de datos. Las funciones que dependen de la base de datos se desactivan automáticamente cuando `DATABASE_URL` no está configurado, lo que permite que la plantilla funcione en modo de contenido estático.

## Configuración

Ubicado en `lib/config/feature-flags.ts` , el módulo de indicadores de funciones proporciona resolución de indicadores del lado del servidor.

### Definiciones de banderas

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Lógica de resolución

Todas las banderas actuales dependen de la disponibilidad de la base de datos:

```typescript
function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

## API del lado del servidor

### obtener indicadores de características

Devuelve todas las banderas como un objeto:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### está habilitada la característica

Verifique una sola bandera:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### obtener funciones deshabilitadas

Devuelve una matriz de nombres de funciones deshabilitadas, útil para depurar:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledCaracterísticas

Devuelve una serie de nombres de funciones habilitadas:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### están habilitadas todas las funciones

Comprobación rápida si todas las funciones están disponibles:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Ganchos del lado del cliente

### useFeatureFlag

Verifique un indicador de característica única en el cliente:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

Obtenga todas las banderas de funciones:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Gancho extendido que admite el modo de simulación de administrador para probar funciones:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

El sistema de favoritos utiliza este enlace para habilitar/deshabilitar condicionalmente funciones en desarrollo.

## Ejemplos de integración

### Representación de componentes condicionales

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### Puerta de función a nivel de gancho

Muchos ganchos verifican las banderas de funciones internamente. Por ejemplo, `useFavorites` solo recupera cuando la función de favoritos está habilitada:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Rutas API condicionales

Los indicadores de funciones también se pueden verificar en las rutas API para devolver respuestas apropiadas:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## Agregar una nueva bandera de función

1. **Agregue la bandera a la interfaz** en `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Establezca la lógica de resolución** en `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Usar en componentes y ganchos** a través de `isFeatureEnabled('newFeature')` o los ganchos del lado del cliente.

## Filosofía del diseño

El sistema de banderas de características es intencionalmente simple:
- **Sin dependencia de servicios externos**: los indicadores se resuelven a partir de variables de entorno
- **Sin sobrecarga de tiempo de ejecución**: los indicadores se calculan una vez por solicitud/procesamiento
- **Degradación elegante**: la base de datos faltante desactiva las funciones dependientes de la base de datos sin errores
- **Apto para desarrolladores**: nombres claros, tipos de TypeScript y funciones auxiliares
