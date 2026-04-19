---
id: sponsor-ads-endpoints
title: "Endpoints da API de Anúncios Patrocinados"
sidebar_label: "Anúncios Patrocinados"
sidebar_position: 16
---

# Endpoints da API de Anúncios Patrocinados

A API de Anúncios Patrocinados permite que usuários criem, gerenciem e monitorem campanhas de anúncios patrocinados. O provedor de pagamento é configurado via a variável de ambiente `NEXT_PUBLIC_PAYMENT_PROVIDER` (padrão: `"stripe"`).

## Endpoints

| Método | Caminho | Autenticação | Descrição |
|--------|---------|--------------|----------|
| GET | `/api/sponsor-ads` | Nenhuma | Listar anúncios publicados |
| POST | `/api/sponsor-ads/checkout` | Sessão | Iniciar checkout de anúncio |
| GET | `/api/user/sponsor-ads` | Sessão | Listar anúncios do usuário |
| POST | `/api/user/sponsor-ads` | Sessão | Criar novo anúncio |
| GET | `/api/user/sponsor-ads/{adId}` | Sessão | Obter um anúncio específico |
| POST | `/api/user/sponsor-ads/{adId}/cancel` | Sessão | Cancelar um anúncio |
| POST | `/api/user/sponsor-ads/{adId}/renew` | Sessão | Renovar um anúncio |
| GET | `/api/user/sponsor-ads/{adId}/stats` | Sessão | Obter estatísticas do anúncio |

---

## GET `/api/sponsor-ads`

Retorna a lista de anúncios patrocinados ativos e disponíveis ao público.

### Parâmetros de Consulta

| Parâmetro | Tipo | Descrição |
|-----------|------|----------|
| `page` | integer | Número da página (padrão: 1) |
| `limit` | integer | Itens por página (padrão: 10, máx: 100) |

### Resposta

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad_123",
        "title": "My Product",
        "description": "Best product ever",
        "url": "https://example.com",
        "status": "active",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-02-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "totalPages": 1
  }
}
```

---

## POST `/api/sponsor-ads/checkout`

Inicia o fluxo de checkout para publicar um anúncio patrocinado. Valida as URLs de redirecionamento para prevenir redirecionamentos abertos.

### Corpo da Solicitação

```typescript
{
  adId: string;           // ID do anúncio a publicar
  successUrl: string;     // URL de retorno após pagamento bem-sucedido
  cancelUrl: string;      // URL de retorno ao cancelar
}
```

### Validação de URL

As URLs `successUrl` e `cancelUrl` são validadas para prevenir redirecionamentos abertos. Só são aceitas URLs da mesma origem ou URLs de retorno configuradas:

```typescript
if (!isValidRedirectUrl(successUrl) || !isValidRedirectUrl(cancelUrl)) {
  return NextResponse.json(
    { success: false, error: 'Invalid redirect URL' },
    { status: 400 }
  );
}
```

### Resposta

```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/pay/cs_test_..."
  }
}
```

---

## GET `/api/user/sponsor-ads`

Lista todos os anúncios patrocinados do usuário autenticado.

### Resposta

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad_123",
        "title": "My Campaign",
        "status": "active",
        "impressions": 1500,
        "clicks": 45
      }
    ],
    "total": 3
  }
}
```

---

## POST `/api/user/sponsor-ads`

Cria um novo anúncio patrocinado (ainda não publicado).

### Corpo da Solicitação

```typescript
{
  title: string;          // Obrigatório
  description: string;    // Obrigatório
  url: string;            // Obrigatório: URL de destino do anúncio
  imageUrl?: string;      // URL opcional da imagem do anúncio
  duration: number;       // Duração em dias
  packageId: string;      // ID do pacote de anúncio selecionado
}
```

### Resposta

```json
{
  "success": true,
  "data": {
    "id": "ad_new123",
    "title": "My New Ad",
    "status": "draft"
  },
  "message": "Sponsor ad created successfully"
}
```

---

## GET `/api/user/sponsor-ads/{adId}`

Obtém detalhes completos de um anúncio específico. Apenas o dono pode acessar.

---

## POST `/api/user/sponsor-ads/{adId}/cancel`

Cancela um anúncio ativo. Se o anúncio tiver uma assinatura no provedor de pagamento, ela será cancelada também.

### Resposta

```json
{
  "success": true,
  "message": "Sponsor ad cancelled successfully"
}
```

---

## POST `/api/user/sponsor-ads/{adId}/renew`

Renova um anúncio expirado ou cancelado iniciando um novo checkout.

### Corpo da Solicitação

```typescript
{
  successUrl: string;   // URL de retorno após pagamento
  cancelUrl: string;    // URL de retorno ao cancelar
}
```

---

## GET `/api/user/sponsor-ads/{adId}/stats`

Retorna estatísticas de desempenho do anúncio. Os valores de receita são em unidades de moeda menores (centavos).

### Resposta

```typescript
{
  success: true;
  data: {
    impressions: number;     // Total de visualizações
    clicks: number;          // Total de cliques
    ctr: number;             // Taxa de cliques (click-through rate)
    revenue: number;         // Em centavos (ex: 2999 = US$29,99)
    currency: string;        // ex: "USD"
    periodStart: string;     // ISO 8601
    periodEnd: string;       // ISO 8601
  };
}
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|----------|
| `NEXT_PUBLIC_PAYMENT_PROVIDER` | Provedor ativo: `"stripe"`, `"lemonsqueezy"`, `"polar"`, `"solidgate"` (padrão: `"stripe"`) |
