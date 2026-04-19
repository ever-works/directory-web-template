---
id: user-payment-endpoints
title: "Referência da API de Pagamentos do Usuário"
sidebar_label: "Pagamentos do Usuário"
sidebar_position: 55
---

# Referência da API de Pagamentos do Usuário

## Visão geral

Os endpoints de Pagamentos do Usuário gerenciam preferências de moeda, histórico de pagamentos, status do plano e detalhes de assinatura para usuários autenticados. A detecção de moeda usa cabeçalhos CDN/proxy (Cloudflare, Vercel, CloudFront, Fastly) para determinar automaticamente a moeda do usuário. Os dados de pagamento e assinatura são obtidos do Stripe.

## Endpoints

### GET /api/user/currency

Detecta e retorna a preferência de moeda do usuário com base em cabeçalhos HTTP de provedores CDN/proxy. Sempre retorna `200 OK` com degradação graciosa — reverte para USD se a detecção falhar.

**Requisição**

| Parâmetro | Tipo | Em | Descrição |
|-----------|------|----|-----------|
| provider | string | query | Provedor de detecção: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (padrão: `"smart"`) |

**Resposta**
```typescript
{
  currency: string;     // Código ISO 4217, ex: "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, ex: "US", "FR", ou null se não detectado
  detected: boolean;    // true se detectado dos cabeçalhos, false se usando fallback
}
```

**Exemplo**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/user/currency

Atualiza a preferência de moeda e país do usuário autenticado. Requer uma sessão válida.

**Requisição**
```typescript
{
  currency: string;       // Código ISO 4217, exatamente 3 caracteres, obrigatório
  country?: string | null; // ISO 3166-1 alpha-2, exatamente 2 caracteres, opcional
}
```

**Resposta**
```typescript
{
  currency: string;       // Código de moeda atualizado
  country: string | null; // Código de país atualizado ou null
}
```

**Exemplo**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### GET /api/user/payments

Recupera o histórico completo de pagamentos do usuário autenticado no Stripe. Retorna faturas com detalhes do plano, intervalos de cobrança e links de fatura, ordenados por data (mais recente primeiro).

**Requisição**

Nenhum parâmetro necessário. Autenticação via cookie de sessão.

**Resposta**
```typescript
Array<{
  id: string;                // ID da fatura Stripe
  date: string;              // Data ISO 8601
  amount: number;            // Em unidades de moeda principais (ex: 29.99)
  currency: string;          // Código de moeda em maiúsculas
  plan: string;              // Nome de exibição do plano
  planId: string;            // Identificador do plano
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // ID da assinatura associada
  description: string;       // ex: "Premium Plan - monthly billing"
  invoiceUrl: string | null; // URL da fatura hospedada
  invoicePdf: string | null; // URL de download do PDF da fatura
  invoiceNumber: string | null;
  period_end: string | null;   // Fim do período de cobrança (ISO 8601)
  period_start: string | null; // Início do período de cobrança (ISO 8601)
}>
```

**Exemplo**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### GET /api/user/plan-status

Retorna o plano atual do usuário com detalhes completos de expiração, incluindo o plano efetivo (ao que o usuário pode realmente acessar), períodos de aviso e status de acesso às funcionalidades.

**Requisição**

Nenhum parâmetro necessário. Autenticação via cookie de sessão.

**Resposta**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // Pode diferir se expirado
    isExpired: boolean;
    expiresAt: string | null;          // Data ISO 8601
    daysUntilExpiration: number | null; // Negativo se já expirou
    isInWarningPeriod: boolean;        // true se expira em 7 dias
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // Texto de aviso para o usuário
    status: string | null;             // Status bruto da assinatura
  };
}
```

**Exemplo**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### GET /api/user/subscription

Recupera informações completas da assinatura, incluindo detalhes da assinatura ativa atual e histórico completo de assinaturas do Stripe.

**Requisição**

Nenhum parâmetro necessário. Autenticação via cookie de sessão.

**Resposta**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Apenas quando nenhum cliente Stripe é encontrado
  currentSubscription?: {
    id: string;                        // ID da assinatura Stripe
    planId: string;                    // ID do preço Stripe
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Unidades de moeda principais
    currency: string;                  // Maiúsculas
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**Exemplo**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```
