---
id: sponsor-ads
title: Sistema de anúncios de patrocinadores
sidebar_label: Anúncios de patrocinadores
sidebar_position: 10
---

# Sistema de anúncios de patrocinadores

O sistema de anúncios de patrocinadores permite que os usuários do diretório promovam seus itens por meio de patrocínios pagos. O sistema inclui um fluxo de trabalho de envio, integração de pagamento, processo de aprovação administrativa e exibição pública de anúncios de patrocinadores ativos.

## Locais de origem

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

## Ciclo de vida do anúncio do patrocinador

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

### Valores de status

| Estado | Descrição |
|--------|------------|
| `pending_payment` | Anúncio criado, aguardando pagamento |
| `pending` | Pagamento recebido, aguardando aprovação do administrador |
| `active` | Aprovado e atualmente exibido |
| `rejected` | O administrador rejeitou o envio |
| `expired` | O período ativo terminou |
| `cancelled` | Cancelado pelo usuário ou administrador |

### Tipos de intervalo

| Intervalo | Duração |
|----------|----------|
| `weekly` | Patrocínio de 7 dias |
| `monthly` | Patrocínio de 30 dias |

## Definições de tipo

### SponsorAd (esquema de banco de dados)

O tipo `SponsorAd` vem do esquema Drizzle ( `lib/db/schema` ). Os principais campos incluem:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (um dos valores de status acima)
- `interval` ( `weekly` ou `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### PatrocinadorComItem

Usado para componentes de exibição: emparelha um anúncio patrocinador com seus dados de item resolvido:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

###SponsorAdStats

Estatísticas agregadas retornadas pelo endpoint de estatísticas:

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

##useUserSponsorAds

O principal gancho para usuários que gerenciam os envios de anúncios de patrocinadores.

### Importar

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parâmetros

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

### Criando um anúncio de patrocinador

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

### Fluxo de pagamento

Depois de criar um anúncio patrocinador, o usuário precisa pagar. O método `payNow` cria uma sessão de checkout e retorna uma URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

A API de checkout ( `/api/sponsor-ads/checkout` ) retorna:

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

### Renovando um patrocínio

Anúncios expirados ou prestes a expirar podem ser renovados:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Pesquisa com Debouncing

O gancho inclui depuração de pesquisa integrada (atraso de 300 ms):

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

O gancho do administrador fornece recursos de gerenciamento: aprovar, rejeitar, cancelar e excluir anúncios de patrocinadores.

### Importar

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parâmetros

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

### Fluxo de trabalho de aprovação

A ação de aprovação suporta a opção `forceApprove` para casos em que o pagamento não foi recebido:

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

Quando a API retorna um erro `PAYMENT_NOT_RECEIVED` , o gancho o captura e retorna `requiresForceApprove: true` em vez de mostrar um erro do sistema.

### Rejeição com Razão

As rejeições exigem uma string de motivo que é armazenada no registro do anúncio do patrocinador:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Classificando com redefinição de paginação

Alterar o campo de classificação ou a ordem redefine automaticamente para a página 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

##useActiveSponsorAds

Um gancho leve para buscar anúncios de patrocinadores ativos para exibição pública em layouts de páginas iniciais e barras laterais.

### Importar

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parâmetros

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

### Exemplo de uso

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

### Cache

O gancho usa cache agressivo, já que os patrocinadores ativos não mudam com frequência:

| Configuração | Valor |
|--------|-------|
| `staleTime` | 5 minutos |
| `gcTime` | 10 minutos |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Busca um único anúncio de patrocinador por ID. Usado para páginas de detalhes/edição.

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

O gancho aceita `null` como ID e, nesse caso, a consulta é desabilitada. Isso é útil para renderização condicional:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## Terminais de API

### Pontos de extremidade públicos

| Método | Ponto final | Descrição |
|--------|----------|------------|
| OBTER | `/api/sponsor-ads` | Buscar anúncios de patrocinadores ativos para exibição pública |

### Endpoints do usuário (autenticados)

| Método | Ponto final | Descrição |
|--------|----------|------------|
| OBTER | `/api/sponsor-ads/user` | Listar anúncios patrocinadores do usuário com paginação |
| POSTAR | `/api/sponsor-ads/user` | Crie um novo envio de anúncio de patrocinador |
| OBTER | `/api/sponsor-ads/user/stats` | Buscar estatísticas de anúncios patrocinadores do usuário |
| OBTER | `/api/sponsor-ads/user/{id}` | Obtenha um anúncio de patrocinador específico |
| POSTAR | `/api/sponsor-ads/user/{id}/cancel` | Cancelar um anúncio de patrocinador |
| POSTAR | `/api/sponsor-ads/user/{id}/renew` | Renovar um patrocínio expirado |
| POSTAR | `/api/sponsor-ads/checkout` | Crie uma sessão de finalização de pagamento |

### Terminais de administração

| Método | Ponto final | Descrição |
|--------|----------|------------|
| OBTER | `/api/admin/sponsor-ads` | Liste todos os anúncios de patrocinadores com filtros |
| POSTAR | `/api/admin/sponsor-ads/{id}/approve` | Aprovar um anúncio de patrocinador |
| POSTAR | `/api/admin/sponsor-ads/{id}/reject` | Rejeitar com razão |
| POSTAR | `/api/admin/sponsor-ads/{id}/cancel` | Cancelamento do administrador |
| EXCLUIR | `/api/admin/sponsor-ads/{id}` | Excluir um anúncio de patrocinador |

## Fluxo de trabalho de envio completo

Aqui está o fluxo de trabalho completo da perspectiva do usuário:

### Etapa 1 – Selecione um item

O usuário escolhe qual item patrocinar em seu painel ou na página de detalhes do item.

### Etapa 2 – Enviar anúncio do patrocinador

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

### Etapa 3 – Concluir pagamento

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Etapa 4 – Revisão do administrador

O administrador vê o anúncio pendente em seu painel e pode aprovar ou rejeitar:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Etapa 5 – Exibição ativa

Anúncios ativos aparecem nos componentes voltados ao público até `useActiveSponsorAds` .

### Etapa 6 – Expiração e renovação

Quando o período de patrocínio termina, o status muda para `expired` . O usuário pode renovar:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Painel de estatísticas

Os ganchos do usuário e do administrador expõem estatísticas para exibições do painel:

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
