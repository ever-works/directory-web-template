---
id: query-client-system
title: "Consultar el sistema cliente"
sidebar_label: "Consultar el sistema cliente"
sidebar_position: 43
---

# Consultar el sistema cliente

## Descripción general

El sistema Query Client proporciona una configuración centralizada de TanStack React Query para la aplicación. Consta de dos módulos: una fábrica de clientes de consultas de propósito general (`lib/query-client.ts`) que maneja la administración de singleton de servidor/cliente, y una configuración optimizada para facturación (`lib/react-query-config.ts`) con fábricas de claves de consultas, estrategias de captación previa y utilidades de invalidación de caché.

## Arquitectura

El sistema tiene dos puntos de entrada que atienden diferentes preocupaciones:

- **`lib/query-client.ts`**: el cliente de consulta principal utilizado en toda la aplicación. Crea instancias separadas para entornos de servidor y cliente, lo que garantiza que la representación del lado del servidor no comparta el estado entre las solicitudes mientras el navegador reutiliza una sola instancia.
- **`lib/react-query-config.ts`**: un cliente de consultas especializado configurado para la gestión de facturación y suscripciones. Agrega fábricas de claves de consulta, estrategias de captación previa y utilidades de invalidación de caché adaptadas a los datos relacionados con los pagos.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## Referencia de API

### Exportaciones desde `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Función de fábrica que crea un nuevo `QueryClient` con los siguientes valores predeterminados:

|Opción|Valor|Propósito|
|--------|-------|---------|
|`staleTime`|5 minutos|Datos considerados nuevos|
|`gcTime`|10 minutos|Retención de caché después del último uso|
|`refetchOnWindowFocus`|`false`|Prevenir la recuperación excesiva|
|`refetchOnMount`|`false`|Omitir la recuperación si los datos están nuevos|
|`refetchOnReconnect`|`true`|Volver a buscar en la recuperación de la red|
|`retry`|Hasta 2 intentos|Reintento simple para todos los errores|
|`retryDelay`|Retroceso exponencial, máximo 30 s|`1000 * 2^attempt`|
|Mutación `retry`| 1 |Reintentar las mutaciones una vez|
|Mutación `onError`|Brindis + consola.error|Notificación de error global|

#### `getQueryClient(): QueryClient`

Devuelve la instancia `QueryClient` apropiada. En el servidor, crea una nueva instancia por llamada (sin estado compartido). En el cliente, devuelve una instancia única (creada una vez y reutilizada).

### Exportaciones desde `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Una instancia `QueryClient` preconfigurada y optimizada para operaciones de facturación. Diferencias clave con el cliente general:

- `refetchOnWindowFocus: true`: garantiza que el estado de la suscripción esté siempre actualizado
- `refetchOnMount: true` -- Vuelve a buscar datos obsoletos en el montaje del componente
- El reintento omite los errores 4xx y 401 (los errores de cliente/autenticación no se reintentan)
- El retroceso exponencial incluye jitter (85-115% del retraso base)
- `notifyOnChangeProps` establecido en `['data', 'error', 'isLoading', 'isFetching']` para renderizaciones optimizadas

#### `queryKeys`

Fábrica de claves de consulta jerárquica para una gestión de caché coherente:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

Funciones de captación previa prediseñadas para patrones de navegación comunes:

- `prefetchStrategies.billing()` -- Precarga datos de suscripción y pago
- `prefetchStrategies.userProfile()` -- Precarga datos de perfil de usuario

#### `cacheUtils`

Utilidades de gestión de caché:

- `cacheUtils.invalidateBilling()` -- Invalida todas las consultas de facturación
- `cacheUtils.invalidateSubscription()` -- Invalida la consulta de suscripción
- `cacheUtils.invalidatePayments()` -- Invalida la consulta de pagos
- `cacheUtils.removeBilling()` -- Elimina todos los datos de facturación del caché
- `cacheUtils.resetCache()` -- Borra todo el caché de consultas

## Detalles de implementación

**División servidor/cliente**: `getQueryClient()` usa el indicador `isServer` de TanStack para determinar el entorno. Las instancias del servidor son efímeras (nuevas por solicitud) para evitar la fuga de datos entre usuarios. El singleton del navegador se almacena en una variable a nivel de módulo.

**Estrategia de manejo de errores**: el cliente general utiliza `toast.error()` de Sonner para errores de mutación, lo que proporciona comentarios inmediatos al usuario. El cliente de facturación omite los reintentos en caso de errores 4xx, ya que indican problemas del lado del cliente que los reintentos no se resolverán.

**Reintentar con jitter**: el cliente de facturación agrega jitter aleatorio (85-115 % del retraso base) al retroceso exponencial para evitar problemas de rebaño cuando muchos clientes reintentan simultáneamente después de una interrupción del servicio.

## Configuración

No se necesitan archivos de configuración adicionales. Ambos clientes están configurados completamente en código. Para ajustar los valores predeterminados, modifique `defaultOptions` en las respectivas funciones de fábrica.

## Ejemplos de uso

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## Mejores prácticas

- Utilice `getQueryClient()` de `lib/query-client.ts` para obtener todos los datos generales; Utilice el cliente específico de facturación solo para funciones relacionadas con pagos.
- Utilice siempre fábricas `queryKeys` para mantener la coherencia de la clave de caché; nunca codifique matrices de claves de consulta.
- Llame a `cacheUtils.invalidateBilling()` después de cualquier mutación que cambie el estado de suscripción o pago.
- Utilice `prefetchStrategies` al pasar el mouse o precargar rutas para mejorar el rendimiento percibido.
- Evite llamar a `cacheUtils.resetCache()` en producción a menos que sea absolutamente necesario, ya que descarta todos los datos almacenados en caché.

## Módulos relacionados

- [Capa de cliente API](/template/architecture/api-client-layer): hace que las llamadas API sean consumidas por funciones de consulta
- [Sistema de guardias](./guards-system-deep-dive) -- Control de acceso basado en planes que puede depender de los datos de suscripción
