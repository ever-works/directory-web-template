---
id: sponsor-ads
title: Sistema de anuncios de patrocinadores
sidebar_label: Anuncios de patrocinadores
sidebar_position: 10
---

# Sistema de anuncios de patrocinadores

El sistema de anuncios de patrocinadores permite a los usuarios del directorio promocionar sus artículos a través de patrocinios pagados. El sistema incluye un flujo de trabajo de envío, integración de pagos, proceso de aprobación del administrador y visualización pública de anuncios de patrocinadores activos.

## Ubicaciones de origen

```
hooks/use-user-sponsor-ads.ts        # User-facing CRUD + checkout
hooks/use-admin-sponsor-ads.ts       # Admin management (approve/reject/cancel)
hooks/use-active-sponsor-ads.ts      # Public display of active ads
hooks/use-sponsor-ad-detail.ts       # Single ad detail fetch
lib/types/sponsor-ad.ts              # Type definitions
app/api/sponsor-ads/                  # API routes
  route.ts                            #   GET active ads (public)
  checkout/route.ts                   #   POST create checkout
  user/route.ts                       #   GET/POST user's ads
  user/[id]/route.ts                  #   GET/PUT single ad
  user/[id]/cancel/route.ts           #   POST cancel ad
  user/[id]/renew/route.ts            #   POST renew ad
  user/stats/route.ts                 #   GET user stats
```

## Ciclo de vida del anuncio del patrocinador

```
User Submits --> pending_payment --> User Pays --> pending --> Admin Reviews
                                                    |
                                            +-------+-------+
                                            |               |
                                         approved        rejected
                                            |
                                          active --> expired
                                            |
                                        cancelled
```

### Valores de estado

| Estado | Descripción |
|--------|-------------|
| `pending_payment` | Anuncio creado, pendiente de pago |
| `pending` | Pago recibido, pendiente de aprobación del administrador |
| `active` | Aprobado y mostrado actualmente |
| `rejected` | El administrador rechazó el envío |
| `expired` | El período activo ha finalizado |
| `cancelled` | Cancelado por usuario o administrador |

### Tipos de intervalo

| Intervalo | Duración |
|----------|----------|
| `weekly` | Patrocinio de 7 días |
| `monthly` | Patrocinio de 30 días |

## Definiciones de tipo

### Anuncio de patrocinador (esquema de base de datos)

El tipo `SponsorAd` proviene del esquema Drizzle ( `lib/db/schema` ). Los campos clave incluyen:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (uno de los valores de estado anteriores)
- `interval` ( `weekly` o `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### PatrocinadorConArtículo

Se utiliza para componentes de visualización: combina un anuncio de patrocinador con los datos del artículo resuelto:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### Estadísticas de anuncios del patrocinador

Estadísticas agregadas devueltas por el punto final de estadísticas:

```ts
interface SponsorAdStats {
  overview: {
    total: number;
    pendingPayment: number;
    pending: number;
    active: number;
    rejected: number;
    expired: number;
    cancelled: number;
  };
  byInterval: {
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  };
}
```

---

## useUserSponsorAds

El gancho principal para los usuarios que administran los envíos de anuncios de sus patrocinadores.

### Importar

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parámetros

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Valor de retorno

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats

  // Loading states
  isLoading,            // boolean - initial fetch
  isFetching,           // boolean - any fetch including background
  isStatsLoading,       // boolean - stats query loading
  isCreating,           // boolean - creation mutation in progress

  // Pagination
  currentPage,          // number
  totalPages,           // number
  totalItems,           // number

  // Filters
  statusFilter,         // SponsorAdStatus | undefined
  intervalFilter,       // 'weekly' | 'monthly' | undefined
  search,               // string
  isSearching,          // boolean - debounce in progress

  // Actions
  createSponsorAd,      // (input) => Promise<SponsorAd | null>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  payNow,               // (id) => Promise<{ checkoutUrl } | null>
  renewSponsorship,     // (id) => Promise<{ checkoutUrl } | null>

  // Submitting states
  isCancelling,         // boolean
  isPayingNow,          // boolean
  isRenewing,           // boolean

  // Filter setters
  setStatusFilter,      // (status) => void
  setIntervalFilter,    // (interval) => void
  setSearch,            // (search) => void
  setCurrentPage,       // (page) => void
  nextPage,             // () => void
  prevPage,             // () => void

  // Utility
  refreshData,          // () => void
} = useUserSponsorAds(options);
```

### Creación de un anuncio de patrocinador

```tsx
const { createSponsorAd } = useUserSponsorAds();

async function handleSubmit(item) {
  const sponsorAd = await createSponsorAd({
    itemSlug: item.slug,
    itemName: item.name,
    itemIconUrl: item.icon,
    itemCategory: item.category,
    itemDescription: item.description,
    interval: 'monthly',
  });

  if (sponsorAd) {
    // Ad created in pending_payment status
    // Redirect user to payment
  }
}
```

### Flujo de pago

Después de crear un anuncio patrocinador, el usuario debe pagar. El método `payNow` crea una sesión de pago y devuelve una URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

La API de pago ( `/api/sponsor-ads/checkout` ) devuelve:

```ts
interface CheckoutResponse {
  success: boolean;
  data: {
    checkoutId: string;
    checkoutUrl: string | null;
    provider: string;
  };
}
```

### Renovación de un patrocinio

Los anuncios caducados o a punto de caducar se pueden renovar:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Búsqueda con antirrebote

El gancho incluye protección antirrebote de búsqueda incorporada (retraso de 300 ms):

```tsx
const { search, setSearch, isSearching, sponsorAds } = useUserSponsorAds();

return (
  <div>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search your sponsor ads..."
    />
    {isSearching && <span>Searching...</span>}
    {sponsorAds.map(ad => /* render */)}
  </div>
);
```

---

## useAdminSponsorAds

El enlace de administración proporciona capacidades de administración: aprobar, rechazar, cancelar y eliminar anuncios de patrocinadores.

### Importar

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parámetros

```ts
interface UseAdminSponsorAdsOptions {
  page?: number;
  limit?: number;
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

### Valor de retorno

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats | null

  // Loading
  isLoading,
  isSubmitting,         // any mutation in progress

  // Pagination
  currentPage,
  totalPages,
  totalItems,

  // Sorting
  sortBy,
  sortOrder,

  // Actions
  approveSponsorAd,     // (id, forceApprove?) => Promise<{ success, requiresForceApprove? }>
  rejectSponsorAd,      // (id, reason) => Promise<boolean>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  deleteSponsorAd,      // (id) => Promise<boolean>

  // Setters
  setSortBy,
  setSortOrder,
  setCurrentPage,

  // Utility
  refreshData,
} = useAdminSponsorAds(options);
```

### Flujo de trabajo de aprobación

La acción de aprobación admite una opción `forceApprove` para los casos en los que no se ha recibido el pago:

```tsx
const { approveSponsorAd } = useAdminSponsorAds();

async function handleApprove(id: string) {
  const result = await approveSponsorAd(id);

  if (result.requiresForceApprove) {
    // Show confirmation dialog
    const confirmed = await showDialog(
      'Payment not received. Approve anyway?'
    );
    if (confirmed) {
      await approveSponsorAd(id, true);
    }
  }
}
```

Cuando la API devuelve un error `PAYMENT_NOT_RECEIVED` , el gancho lo detecta y devuelve `requiresForceApprove: true` en lugar de mostrar un error del sistema.

### Rechazo con razón

Los rechazos requieren una cadena de motivo que se almacena en el registro del anuncio del patrocinador:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Ordenar con reinicio de paginación

Al cambiar el campo de clasificación o el orden, se restablece automáticamente a la página 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## utilizar anuncios de patrocinador activo

Un gancho liviano para recuperar anuncios de patrocinadores activos para mostrarlos públicamente en diseños de páginas de inicio y barras laterales.

### Importar

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parámetros

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Valor de retorno

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Ejemplo de uso

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';

function SponsorSidebar() {
  const { sponsors, isLoading } = useActiveSponsorAds({ limit: 3 });

  if (isLoading || sponsors.length === 0) return null;

  return (
    <aside className="sponsor-sidebar">
      <h3>Sponsored</h3>
      {sponsors.map(({ sponsor, item }) => (
        <a key={sponsor.id} href={`/items/${sponsor.itemSlug}`}>
          {item?.icon && <img src={item.icon} alt={sponsor.itemName} />}
          <span>{sponsor.itemName}</span>
        </a>
      ))}
    </aside>
  );
}
```

### Almacenamiento en caché

El gancho utiliza un almacenamiento en caché agresivo ya que los patrocinadores activos no cambian con frecuencia:

| Configuración | Valor |
|---------|-------|
| `staleTime` | 5 minutos |
| `gcTime` | 10 minutos |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Obtiene un anuncio de patrocinador único por ID. Se utiliza para páginas de detalles/edición.

### Importar

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Uso

```tsx
function SponsorAdDetailPage({ adId }: { adId: string }) {
  const { data: sponsorAd, isLoading, error } = useSponsorAdDetail(adId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!sponsorAd) return <NotFound />;

  return (
    <div>
      <h1>{sponsorAd.itemName}</h1>
      <Badge>{sponsorAd.status}</Badge>
      <p>Interval: {sponsorAd.interval}</p>
    </div>
  );
}
```

El enlace acepta `null` como ID, en cuyo caso la consulta está deshabilitada. Esto es útil para renderizado condicional:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## Puntos finales API

### Puntos finales públicos

| Método | Punto final | Descripción |
|--------|----------|-------------|
| OBTENER | `/api/sponsor-ads` | Obtener anuncios de patrocinadores activos para exhibición pública |

### Puntos finales de usuario (autenticados)

| Método | Punto final | Descripción |
|--------|----------|-------------|
| OBTENER | `/api/sponsor-ads/user` | Listar los anuncios patrocinadores del usuario con paginación |
| PUBLICAR | `/api/sponsor-ads/user` | Crear un nuevo envío de anuncio de patrocinador |
| OBTENER | `/api/sponsor-ads/user/stats` | Obtener estadísticas de anuncios patrocinadores del usuario |
| OBTENER | `/api/sponsor-ads/user/{id}` | Obtener un anuncio de patrocinador específico |
| PUBLICAR | `/api/sponsor-ads/user/{id}/cancel` | Cancelar un anuncio de patrocinador |
| PUBLICAR | `/api/sponsor-ads/user/{id}/renew` | Renovar un patrocinio caducado |
| PUBLICAR | `/api/sponsor-ads/checkout` | Crear una sesión de pago y pago |

### Puntos finales de administración

| Método | Punto final | Descripción |
|--------|----------|-------------|
| OBTENER | `/api/admin/sponsor-ads` | Listar todos los anuncios de patrocinadores con filtros |
| PUBLICAR | `/api/admin/sponsor-ads/{id}/approve` | Aprobar un anuncio de patrocinador |
| PUBLICAR | `/api/admin/sponsor-ads/{id}/reject` | Rechazar con razón |
| PUBLICAR | `/api/admin/sponsor-ads/{id}/cancel` | Cancelación del administrador |
| BORRAR | `/api/admin/sponsor-ads/{id}` | Eliminar un anuncio patrocinador |

## Flujo de trabajo de envío completo

Aquí está el flujo de trabajo completo desde la perspectiva del usuario:

### Paso 1: seleccione un artículo

El usuario elige qué artículo patrocinar desde su panel de control o en la página de detalles del artículo.

### Paso 2: enviar anuncio del patrocinador

```tsx
const ad = await createSponsorAd({
  itemSlug: 'my-awesome-tool',
  itemName: 'My Awesome Tool',
  itemIconUrl: '/icons/tool.png',
  itemCategory: 'Productivity',
  interval: 'monthly',
});
// Status: pending_payment
```

### Paso 3: completar el pago

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Paso 4: revisión del administrador

El administrador ve el anuncio pendiente en su panel y puede aprobarlo o rechazarlo:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Paso 5: pantalla activa

Los anuncios activos aparecen en los componentes públicos hasta `useActiveSponsorAds` .

### Paso 6: Vencimiento y renovación

Cuando finaliza el período de patrocinio, el estado cambia a `expired` . El usuario puede renovar:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Panel de estadísticas

Tanto los enlaces de usuario como los de administrador exponen estadísticas para las visualizaciones del panel:

```tsx
const { stats } = useUserSponsorAds();

// Display in dashboard
<div>
  <StatCard label="Active" value={stats.overview.active} />
  <StatCard label="Pending" value={stats.overview.pending} />
  <StatCard label="Total Revenue" value={`$${stats.revenue.totalRevenue}`} />
  <StatCard label="Weekly Ads" value={stats.byInterval.weekly} />
  <StatCard label="Monthly Ads" value={stats.byInterval.monthly} />
</div>
```
