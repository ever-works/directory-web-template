---
id: sponsor-checkout-endpoints
title: "Referência da API de Anúncios Patrocinados e Checkout"
sidebar_label: "Anúncios Patrocinados e Checkout"
sidebar_position: 59
---

# Referência da API de Anúncios Patrocinados e Checkout

Documentação detalhada dos endpoints da API de Anúncios Patrocinados com interfaces TypeScript, regras de autenticação e respostas de erro.

## Visão Geral de Autenticação

| Endpoint | Autenticação | Observação |
|----------|--------------|------------|
| GET `/api/sponsor-ads` | Nenhuma | Público |
| POST `/api/sponsor-ads/checkout` | Sessão | Usuário autenticado |
| GET `/api/user/sponsor-ads` | Sessão | Apenas próprios anúncios |
| POST `/api/user/sponsor-ads` | Sessão | Criar anúncio |
| GET `/api/user/sponsor-ads/{id}` | Sessão | Apenas dono |
| POST `/api/user/sponsor-ads/{id}/cancel` | Sessão | Apenas dono |
| POST `/api/user/sponsor-ads/{id}/renew` | Sessão | Apenas dono |
| GET `/api/user/sponsor-ads/{id}/stats` | Sessão | Apenas dono |

## Interfaces TypeScript

```typescript
type SponsorAdStatus = "draft" | "pending" | "active" | "expired" | "cancelled";

interface SponsorAd {
  id: string;
  userId: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  status: SponsorAdStatus;
  packageId: string;
  duration: number;          // Em dias
  impressions: number;
  clicks: number;
  startDate: string | null;  // ISO 8601
  endDate: string | null;    // ISO 8601
  createdAt: string;
  updatedAt: string;
}

interface SponsorAdStats {
  impressions: number;
  clicks: number;
  ctr: number;              // Taxa de cliques (click-through rate)
  revenue: number;          // Em unidades de moeda menores (centavos)
  currency: string;
  periodStart: string;      // ISO 8601
  periodEnd: string;        // ISO 8601
}

interface SponsorAdCheckoutBody {
  adId: string;
  successUrl: string;       // Deve ser URL válida da mesma origem
  cancelUrl: string;        // Deve ser URL válida da mesma origem
}

interface CreateSponsorAdBody {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  duration: number;         // Em dias
  packageId: string;
}
```

## Detalhes de Cada Endpoint

### GET `/api/sponsor-ads` — Listar anúncios públicos

**Parâmetros de consulta:** `page` (padrão: 1), `limit` (padrão: 10, máx: 100)

**Resposta (200):**
```typescript
{
  success: true;
  data: {
    ads: SponsorAd[];
    total: number;
    page: number;
    totalPages: number;
  };
}
```

### POST `/api/sponsor-ads/checkout` — Iniciar checkout

**Corpo da solicitação:** `SponsorAdCheckoutBody`

**Validação de URL de redirecionamento:**
As URLs `successUrl` e `cancelUrl` são validadas contra a origem e lista de permitidos para prevenir redirecionamentos abertos.

**Resposta (200):**
```typescript
{ success: true; data: { url: string } }
```

**Resposta (400 — URL inválida):**
```typescript
{ success: false; error: "Invalid redirect URL" }
```

### GET `/api/user/sponsor-ads` — Listar anúncios do usuário

**Resposta (200):**
```typescript
{
  success: true;
  data: { ads: SponsorAd[]; total: number };
}
```

### POST `/api/user/sponsor-ads` — Criar anúncio

**Corpo da solicitação:** `CreateSponsorAdBody`

**Resposta (201):**
```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad created successfully";
}
```

### GET `/api/user/sponsor-ads/{adId}` — Obter anúncio

**Resposta (200):**
```typescript
{ success: true; data: SponsorAd; }
```

**Resposta (403 — não é o dono):**
```typescript
{ success: false; error: "Forbidden" }
```

### POST `/api/user/sponsor-ads/{adId}/cancel` — Cancelar anúncio

**Resposta (200):**
```typescript
{
  success: true;
  message: "Sponsor ad cancelled successfully";
}
```

### POST `/api/user/sponsor-ads/{adId}/renew` — Renovar anúncio

**Corpo da solicitação:**
```typescript
{ successUrl: string; cancelUrl: string; }
```

**Resposta (200):**
```typescript
{ success: true; data: { url: string }; }
```

### GET `/api/user/sponsor-ads/{adId}/stats` — Estatísticas do anúncio

**Resposta (200):**
```typescript
{ success: true; data: SponsorAdStats; }
```

## Respostas de Erro Comuns

| Código | Situação | Corpo |
|--------|----------|-------|
| 400 | Corpo inválido / URL de redirecionamento inválida | `{ success: false, error: "..." }` |
| 401 | Sessão ausente | `{ success: false, error: "Unauthorized" }` |
| 403 | Usuário não é o dono do anúncio | `{ success: false, error: "Forbidden" }` |
| 404 | Anúncio não encontrado | `{ success: false, error: "Sponsor ad not found" }` |
| 500 | Erro interno do servidor | `{ success: false, error: "Internal server error" }` |

## Limitação de Taxa

Não há limitação de taxa explícita. A validação de URL de redirecionamento protege o endpoint de checkout contra abusos.
