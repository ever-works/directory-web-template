---
id: version-management
title: Gestión de versiones
sidebar_label: Gestión de versiones
sidebar_position: 15
---

# Gestión de versiones

La plantilla Ever Works incluye un sistema de administración de versiones que rastrea la versión del repositorio de datos, muestra información de la versión a los administradores y proporciona detección automática de sincronización. Este sistema monitorea el repositorio de contenido CMS basado en Git y presenta detalles de la versión a través de componentes de interfaz de usuario configurables.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | Gancho React Query para obtener datos de la versión de la API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Gancho de utilidad para la gestión de caché |
| `VersionDisplay` | `components/version/version-display.tsx` | Componente de visualización de versión configurable |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Información sobre herramientas al pasar el cursor que muestra información detallada de la versión |
| `/api/version` | `app/api/version/route.ts` | Punto final API que devuelve datos de la versión actual |

## Estructura de datos de información de versión

El sistema de versiones rastrea los siguientes datos del repositorio de contenido:

| Campo | Tipo | Descripción |
|---|---|---|
| `commit` | `string` | Hash de confirmación corta de la versión de datos actual |
| `date` | `string` | Cadena de fecha ISO de la confirmación |
| `author` | `string` | Confirmar nombre del autor |
| `message` | `string` | Mensaje de confirmación |
| `repository` | `string` | URL del repositorio |
| `lastSync` | `string` | Marca de tiempo de la última sincronización de datos |

## El gancho `useVersionInfo` ### Interfaz

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### Uso

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### Estrategia de almacenamiento en caché

| Configuración | Valor | Descripción |
|---|---|---|
| `staleTime` | 5 minutos | Datos considerados frescos durante 5 minutos |
| `gcTime` | 30 minutos | Recogida de basura a los 30 minutos |
| `refetchOnWindowFocus` | `false` | No se puede volver a buscar al cambiar de pestaña |
| `refetchOnReconnect` | `true` | Volver a buscar cuando la red se vuelva a conectar |
| `refetchOnMount` | `false` | Omitir la recuperación si el caché tiene datos |

### Reintentar lógica

El gancho implementa un reintento inteligente con retroceso exponencial:

- No reintenta errores del cliente (códigos de estado 4xx)
- Reintenta errores de red y servidor hasta 2 veces
- Utiliza retroceso exponencial: `min(1000 * 2^attempt, 30000ms)` ## Componente de visualización de versión

El componente `VersionDisplay` admite tres variantes visuales:

### Variante en línea (predeterminada)

Una pantalla compacta en línea que muestra el hash de confirmación y el tiempo relativo:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Variante de insignia

Una insignia en forma de pastilla con fondo degradado:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Variante detallada

Una tarjeta con información de la versión completa:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

La variante detallada muestra:
- Confirmar hash y tiempo relativo.
- Nombre del autor
- Mensaje de confirmación (primera línea, citado)
- Marca de tiempo de la última actualización (cuando `showDetails` es verdadero)
- Marca de tiempo de la última sincronización
- Nombre del repositorio

### Accesorios

| Apoyo | Tipo | Predeterminado | Descripción |
|---|---|---|---|
| `className` | `string` | `""` | Clases CSS adicionales |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Estilo de visualización |
| `showDetails` | `boolean` | `false` | Mostrar detalles ampliados (solo variante detallada) |
| `refreshInterval` | `number` | `300000` (5 minutos) | Intervalo de actualización automática en milisegundos |

### Control de acceso

El componente respeta los roles de los usuarios:
- **Usuarios habituales**: el componente está oculto cuando la información de la versión no está disponible
- **Usuarios desarrolladores/administradores**: el estado de error se muestra con el mensaje "Versión no disponible"

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Información sobre herramientas de versión

El `VersionTooltip` envuelve cualquier elemento con una información sobre herramientas que muestra información detallada de la versión:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### Funciones de información sobre herramientas

| Característica | Descripción |
|---|---|
| Espectáculo retrasado | Retraso configurable antes de que aparezca la información sobre herramientas (predeterminado: 300 ms) |
| Ocultar rápidamente | Retraso de 100 ms al dejar el mouse para una interacción fluida |
| Desplazamiento sobre información sobre herramientas | La información sobre herramientas permanece visible al pasar el cursor sobre ella |
| Soporte de teclado | La tecla Escape descarta la información sobre herramientas |
| Accesibilidad | Atributos ARIA ( `role="tooltip"` , `aria-describedby` ) |
| Degradación elegante | Devuelve elementos secundarios sin información sobre herramientas cuando los datos no están disponibles |

### Accesorios

| Apoyo | Tipo | Predeterminado | Descripción |
|---|---|---|---|
| `children` | `ReactNode` | requerido | El elemento desencadenante |
| `className` | `string` | `""` | Clases CSS adicionales |
| `disabled` | `boolean` | `false` | Deshabilitar la información sobre herramientas por completo |
| `delay` | `number` | `300` | Mostrar retraso en milisegundos |

## Utilidades de caché

El gancho `useVersionInfoUtils` proporciona funciones de administración de caché:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## Formato de fecha

El componente `VersionDisplay` incluye utilidades de formato de fecha memorizada:

| Función | Salida de ejemplo |
|---|---|
| `formatDate` | "15 de enero de 2025, 14:30" |
| `getRelativeTime` | "Justo ahora", "Hace 3 horas", "Hace 2 días", "15 de enero" |
| `getRepositoryName` | "siempre-funciona/datos-de-seguimiento-del-tiempo-increíbles" |

## Archivos clave

| Archivo | Camino |
|---|---|
| Gancho de información de versión | `hooks/use-version-info.ts` |
| Visualización de versión | `components/version/version-display.tsx` |
| Información sobre herramientas de versión | `components/version/version-tooltip.tsx` |
| Versión Ruta API | `app/api/version/route.ts` |
