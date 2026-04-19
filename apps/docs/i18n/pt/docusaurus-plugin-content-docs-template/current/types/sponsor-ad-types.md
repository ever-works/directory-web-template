---
id: sponsor-ad-types
title: Definições de tipo de anúncio do patrocinador
sidebar_label: Tipos de anúncios de patrocinador
sidebar_position: 8
---

# Definições de tipo de anúncio do patrocinador

**Fonte:** `lib/types/sponsor-ad.ts`

O módulo de anúncios do patrocinador define tipos para o sistema de patrocínio e publicidade. Os patrocinadores podem promover itens por meio de espaços publicitários semanais ou mensais com um ciclo de vida completo, desde o pagamento até a aprovação, ativação e vencimento.

## Aliases de tipo

### `SponsorAdStatus`

Estados do ciclo de vida para um anúncio de patrocinador:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Estado|Descrição|
|--------|-------------|
|`pending_payment`|Anúncio criado, aguardando conclusão do pagamento|
|`pending`|Pagamento recebido, aguardando aprovação do administrador|
|`rejected`|O administrador rejeitou o pedido de patrocínio|
|`active`|Aprovado e exibido atualmente|
|`expired`|O período ativo terminou|
|`cancelled`|Cancelado pelo patrocinador ou administrador|

### `SponsorAdIntervalType`

Opções de intervalo de cobrança:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Tipos de exibição

### `SponsorWithItem`

Um anúncio patrocinador com os dados do item associado para exibição na interface do usuário. O campo `item` poderá ser `null` se o item vinculado não existir mais.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Tipos de solicitação

### `CreateSponsorAdRequest`

Carga útil para criar um novo anúncio de patrocinador.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Carga útil para atualizar um anúncio de patrocinador existente. Usado principalmente por operações administrativas.

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

Carga útil para aprovação de um anúncio de patrocinador pendente.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Carga útil para rejeitar um anúncio de patrocinador com um motivo.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Payload para cancelar um anúncio de patrocinador ativo ou pendente.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Tipos de resposta

### `SponsorAdResponse`

Resposta sindical discriminada para operações publicitárias de patrocinador único:

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

Resposta sindical discriminada para listas de anúncios de patrocinadores paginadas:

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

## Opções de consulta

### `SponsorAdListOptions`

Parâmetros de consulta para filtragem e paginação de listas de anúncios de patrocinadores.

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

## Tipos de estatísticas

### `SponsorAdStats`

Estatísticas agregadas para o painel de anúncios do patrocinador.

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

## Tipos de painel

### `SponsorAdDashboardResponse`

Resposta combinada para o painel do patrocinador administrativo, incluindo lista, paginação e estatísticas.

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

## Tipos estendidos

### `SponsorAdWithUser`

Anúncio patrocinador enriquecido com dados de usuários e revisores, usado em visualizações de detalhes do administrador.

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

## Exemplos de uso

### Criando um anúncio de patrocinador

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtrando anúncios de patrocinadores

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

### Lidando com respostas sindicais discriminadas

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

### Exibindo estatísticas do painel

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

## Notas de projeto

### Ciclo de vida do anúncio do patrocinador

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Patrocinador cria anúncio e inicia o pagamento (`pending_payment`)
2. Após a conclusão do pagamento, o anúncio é transferido para `pending` para revisão administrativa
3. O administrador aprova (`active`) ou rejeita (`rejected`)
4. Os anúncios ativos expiram automaticamente quando `endDate` passa
5. Patrocinadores ou administradores podem cancelar a qualquer momento

### Respostas sindicais discriminadas

Os tipos `SponsorAdResponse` e `SponsorAdListResponse` usam uniões discriminadas com base no campo `success`. Isso permite o tratamento de erros com segurança de tipo no TypeScript:

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

## Tipos Relacionados

- [`ItemData`](./item-types.md) - O item que está sendo patrocinado (referenciado por `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Tipo de esquema de banco de dados de `lib/db/schema`
