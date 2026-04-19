---
id: sponsor-ad-types
title: Definiciones de tipos de anuncios de patrocinadores
sidebar_label: Tipos de anuncios de patrocinadores
sidebar_position: 8
---

# Definiciones de tipos de anuncios de patrocinadores

**Fuente:** `lib/types/sponsor-ad.ts`

El módulo de anuncios de patrocinadores define tipos para el sistema de patrocinio y publicidad. Los patrocinadores pueden promocionar artículos a través de espacios publicitarios semanales o mensuales con un ciclo de vida completo desde el pago hasta la aprobación, activación y vencimiento.

## Tipo de alias

### `SponsorAdStatus`

Estados del ciclo de vida de un anuncio de patrocinador:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Estado|Descripción|
|--------|-------------|
|`pending_payment`|Anuncio creado, pendiente de finalización del pago|
|`pending`|Pago recibido, pendiente de aprobación del administrador|
|`rejected`|El administrador rechazó la solicitud de patrocinio.|
|`active`|Aprobado y mostrado actualmente|
|`expired`|El período activo ha finalizado.|
|`cancelled`|Cancelado por el patrocinador o administrador|

### `SponsorAdIntervalType`

Opciones de intervalo de facturación:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Tipos de visualización

### `SponsorWithItem`

Un anuncio de patrocinador con sus datos de elementos asociados para su visualización en la interfaz de usuario. El campo `item` puede ser `null` si el elemento vinculado ya no existe.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Tipos de solicitud

### `CreateSponsorAdRequest`

Carga útil para crear un nuevo anuncio patrocinador.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Carga útil para actualizar un anuncio de patrocinador existente. Utilizado principalmente por operaciones administrativas.

```typescript
interface UpdateSponsorAdRequest {
  id: string;
  status?: SponsorAdStatus;
  startDate?: Date;
  endDate?: Date;
  subscriptionId?: string;
  customerId?: string;
}
```

### `ApproveSponsorAdRequest`

Carga útil para aprobar un anuncio de patrocinador pendiente.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Carga útil por rechazar un anuncio patrocinador con un motivo.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Carga útil para cancelar un anuncio de patrocinador activo o pendiente.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Tipos de respuesta

### `SponsorAdResponse`

Respuesta sindical discriminada para operaciones publicitarias de un solo patrocinador:

```typescript
type SponsorAdResponse =
  | {
      success: true;
      data: SponsorAd;
      message?: string;
    }
  | { success: false; error: string };
```

### `SponsorAdListResponse`

Respuesta sindical discriminada por listas de anuncios de patrocinadores paginados:

```typescript
type SponsorAdListResponse =
  | {
      success: true;
      data: { sponsorAds: SponsorAd[] };
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };
```

## Opciones de consulta

### `SponsorAdListOptions`

Parámetros de consulta para filtrar y paginar listas de anuncios de patrocinadores.

```typescript
interface SponsorAdListOptions {
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

## Tipos de estadísticas

### `SponsorAdStats`

Estadísticas agregadas para el panel de anuncios del patrocinador.

```typescript
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

## Tipos de paneles

### `SponsorAdDashboardResponse`

Respuesta combinada para el panel del patrocinador administrador, incluida la lista, paginación y estadísticas.

```typescript
interface SponsorAdDashboardResponse {
  success: boolean;
  data: {
    sponsorAds: SponsorAd[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
    };
    stats: SponsorAdStats;
  };
  error?: string;
}
```

## Tipos extendidos

### `SponsorAdWithUser`

Anuncio del patrocinador enriquecido con datos de usuarios y revisores, utilizado en vistas detalladas del administrador.

```typescript
interface SponsorAdWithUser extends SponsorAd {
  user?: {
    id: string;
    email: string | null;
    image: string | null;
  };
  reviewer?: {
    id: string;
    email: string | null;
  } | null;
}
```

## Ejemplos de uso

### Crear un anuncio de patrocinador

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtrar anuncios de patrocinadores

```typescript
import type { SponsorAdListOptions } from '@/lib/types/sponsor-ad';

const options: SponsorAdListOptions = {
  status: 'active',
  interval: 'monthly',
  sortBy: 'startDate',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};
```

### Manejo de respuestas sindicales discriminadas

```typescript
import type { SponsorAdResponse } from '@/lib/types/sponsor-ad';

async function approveSponsor(id: string): Promise<void> {
  const res = await fetch(`/api/admin/sponsor-ads/${id}/approve`, {
    method: 'POST',
  });
  const data: SponsorAdResponse = await res.json();

  if (data.success) {
    console.log('Approved:', data.data.id);
    if (data.message) {
      console.log('Message:', data.message);
    }
  } else {
    console.error('Failed:', data.error);
  }
}
```

### Visualización de estadísticas del panel

```typescript
import type { SponsorAdStats } from '@/lib/types/sponsor-ad';

function renderStats(stats: SponsorAdStats) {
  const activeRate = stats.overview.total > 0
    ? (stats.overview.active / stats.overview.total * 100).toFixed(1)
    : '0';

  return {
    totalAds: stats.overview.total,
    activePercentage: `${activeRate}%`,
    weeklyRevenue: `$${stats.revenue.weeklyRevenue.toFixed(2)}`,
    monthlyRevenue: `$${stats.revenue.monthlyRevenue.toFixed(2)}`,
  };
}
```

## Notas de diseño

### Ciclo de vida del anuncio del patrocinador

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. El patrocinador crea un anuncio e inicia el pago (`pending_payment`)
2. Una vez completado el pago, el anuncio se traslada a `pending` para revisión del administrador.
3. El administrador aprueba (`active`) o rechaza (`rejected`)
4. Los anuncios activos caducan automáticamente cuando `endDate` pasa
5. Los patrocinadores o administradores pueden cancelar en cualquier momento.

### Respuestas sindicales discriminadas

Los tipos `SponsorAdResponse` y `SponsorAdListResponse` utilizan uniones discriminadas basadas en el campo `success`. Esto permite el manejo de errores con seguridad de tipos en TypeScript:

```typescript
// TypeScript narrows the type based on success check
if (response.success) {
  // TypeScript knows response.data exists here
  console.log(response.data);
} else {
  // TypeScript knows response.error exists here
  console.error(response.error);
}
```

## Tipos relacionados

- [`ItemData`](./item-types.md): el artículo patrocinado (referenciado por `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Tipo de esquema de base de datos de `lib/db/schema`
