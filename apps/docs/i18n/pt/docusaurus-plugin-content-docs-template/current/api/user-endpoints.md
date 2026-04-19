---
id: user-endpoints
title: Endpoints de Usuário
sidebar_label: Usuário
sidebar_position: 21
---

# Endpoints de Usuário

A API de usuário fornece endpoints para gerenciar preferências do usuário autenticado, detalhes de assinatura, histórico de pagamentos e configurações de localização do perfil. Todos os endpoints exigem autenticação baseada em sessão.

## Visão geral

| Endpoint | Método | Autenticação | Descrição |
|---|---|---|---|
| `/api/user/currency` | GET | Público | Detectar moeda do usuário a partir dos cabeçalhos |
| `/api/user/currency` | PUT | Usuário | Atualizar preferência de moeda |
| `/api/user/payments` | GET | Usuário | Obter histórico de pagamentos do Stripe |
| `/api/user/plan-status` | GET | Usuário | Obter status do plano com informações de expiração |
| `/api/user/subscription` | GET | Usuário | Obter detalhes da assinatura |
| `/api/user/profile/location` | GET | Usuário | Obter configurações de localização salvas |
| `/api/user/profile/location` | PATCH | Usuário | Atualizar configurações de localização |

## Detecção e Preferências de Moeda

### Detectar Moeda

```
GET /api/user/currency
```

Detecta a moeda do usuário com base em cabeçalhos HTTP de provedores CDN/proxy. Este endpoint usa degradação graciosa — sempre retorna 200 OK com um código de moeda válido, revertendo para USD se a detecção falhar. Nenhuma autenticação é necessária.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `provider` | string | `"smart"` | Provedor de detecção: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` |

**Resposta de Sucesso (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `currency` | string | Código de moeda ISO 4217 (3 caracteres), padrão `"USD"` |
| `country` | string ou null | Código de país ISO 3166-1 alpha-2, null se a detecção falhou |
| `detected` | boolean | Se a detecção foi bem-sucedida ou se o valor é um fallback |

Quando a detecção falha, a resposta ainda retorna 200 com `"USD"` e `detected: false`.

**Fonte:** `template/app/api/user/currency/route.ts`

### Atualizar Preferência de Moeda

```
PUT /api/user/currency
```

Atualiza a moeda e o país preferidos do usuário autenticado. Validado usando Zod com a lista `SUPPORTED_CURRENCIES` de `lib/config/billing`.

**Autenticação:** Obrigatória

**Corpo da solicitação:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `currency` | string | Sim | Código de moeda ISO 4217 (exatamente 3 caracteres, maiúsculas) |
| `country` | string ou null | Não | Código de país ISO 3166-1 alpha-2 (exatamente 2 caracteres) |

**Resposta de Sucesso (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Status | Condição |
|---|---|
| 400 | JSON inválido, código de moeda não suportado ou formato de país inválido |
| 401 | Usuário não autenticado |
| 500 | Falha ao persistir a atualização |

**Fonte:** `template/app/api/user/currency/route.ts`

## Histórico de Pagamentos

### Obter Histórico de Pagamentos

```
GET /api/user/payments
```

Recupera o histórico completo de pagamentos do usuário autenticado no Stripe. Busca faturas e assinaturas, enriquece com metadados do plano e retorna uma lista ordenada de registros de pagamento.

**Autenticação:** Obrigatória

**Resposta de Sucesso (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

Detalhes de processamento principais:

- Filtra apenas faturas `"paid"` e `"open"`
- Converte valores de centavos para unidades de moeda principais (divide por 100)
- Ordena por data, mais recente primeiro
- Mapeia status para valores legíveis por humanos: `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- Retorna um array vazio `[]` se nenhum cliente Stripe existir

**Fonte:** `template/app/api/user/payments/route.ts`

## Status do Plano

### Obter Status do Plano

```
GET /api/user/plan-status
```

Retorna informações abrangentes sobre o status do plano, incluindo detalhes de expiração. Usado pelo frontend para exibir avisos de plano e controlar acesso a funcionalidades com base nas verificações de plano.

**Autenticação:** Obrigatória

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `planId` | string | O plano assinado pelo usuário: `"free"`, `"standard"`, `"premium"` |
| `effectivePlan` | string | O plano que o usuário pode acessar de fato (pode diferir se expirado) |
| `isExpired` | boolean | Se a assinatura expirou |
| `expiresAt` | string ou null | Data de expiração no formato ISO |
| `daysUntilExpiration` | integer ou null | Dias até a expiração (negativo se já expirou) |
| `isInWarningPeriod` | boolean | Verdadeiro se a assinatura expira em 7 dias |
| `canAccessPlanFeatures` | boolean | Se o usuário pode acessar as funcionalidades do seu plano |
| `warningMessage` | string ou null | Mensagem de aviso exibida ao usuário, se aplicável |
| `status` | string ou null | Status bruto da assinatura |

Usa `subscriptionService.getUserPlanWithExpiration()` de `lib/services/subscription.service`.

**Fonte:** `template/app/api/user/plan-status/route.ts`

## Detalhes da Assinatura

### Obter Status da Assinatura

```
GET /api/user/subscription
```

Recupera informações detalhadas da assinatura do Stripe, incluindo a assinatura ativa atual e o histórico completo de assinaturas.

**Autenticação:** Obrigatória

**Resposta de Sucesso (200) — Assinatura Ativa:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

Assinaturas ativas são identificadas por `status === "active"` ou `status === "trialing"`. As entradas do histórico podem incluir `cancelledAt` e `cancelReason` para assinaturas canceladas.

**Fonte:** `template/app/api/user/subscription/route.ts`

## Localização do Perfil

### Obter Configurações de Localização

```
GET /api/user/profile/location
```

Retorna a localização padrão salva e a preferência de privacidade do usuário autenticado.

**Autenticação:** Obrigatória (perfil de cliente)

**Resposta de Sucesso (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**Fonte:** `template/app/api/user/profile/location/route.ts`

### Atualizar Configurações de Localização

```
PATCH /api/user/profile/location
```

Atualiza a localização padrão e a preferência de privacidade do usuário autenticado. Validado usando o `updateLocationSchema` de `lib/validations/user-location`.

**Corpo da solicitação:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `defaultLatitude` | number ou null | Não | Coordenada de latitude |
| `defaultLongitude` | number ou null | Não | Coordenada de longitude |
| `defaultCity` | string ou null | Não | Nome da cidade |
| `defaultCountry` | string ou null | Não | Código do país |
| `locationPrivacy` | string | Não | Nível de privacidade: `"private"`, `"city"`, `"exact"` |

Latitude e longitude devem ser fornecidas juntas.
