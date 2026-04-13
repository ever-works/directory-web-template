---
id: payment-endpoints
title: Endpoints da API de Pagamento
sidebar_label: Endpoints de Pagamento
sidebar_position: 3
---

# Endpoints da API de Pagamento

O template suporta quatro provedores de pagamento: **Stripe**, **Lemon Squeezy**, **Polar** e **Solidgate**. Cada provedor possui seu próprio conjunto de rotas de API para checkout, gerenciamento de assinaturas e tratamento de webhooks. Um grupo genérico `/api/payment` fornece consultas de assinatura independentes de provedor.

## Stripe (`/api/stripe`)

O Stripe é a integração mais completa, com 17 manipuladores de rotas cobrindo checkout, assinaturas, métodos de pagamento, setup intents e produtos.

### Checkout

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/stripe/checkout` | Criar uma Sessão de Checkout do Stripe |

### Assinaturas

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/stripe/subscription` | Obter a assinatura ativa do usuário atual |
| `POST` | `/api/stripe/subscription` | Criar uma nova assinatura |
| `GET` | `/api/stripe/subscriptions` | Listar todas as assinaturas do usuário |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Cancelar uma assinatura |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Reativar uma assinatura cancelada |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Atualizar assinatura (mudar plano) |
| `POST` | `/api/stripe/subscription/portal` | Criar uma sessão do Portal do Cliente Stripe |

### Métodos de Pagamento

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/stripe/payment-methods/list` | Listar métodos de pagamento salvos |
| `POST` | `/api/stripe/payment-methods/create` | Adicionar um novo método de pagamento |
| `PUT` | `/api/stripe/payment-methods/update` | Atualizar método de pagamento padrão |
| `DELETE` | `/api/stripe/payment-methods/delete` | Remover um método de pagamento |
| `GET` | `/api/stripe/payment-methods/[id]` | Obter detalhes do método de pagamento |

### Setup Intents

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/stripe/setup-intent` | Criar um Setup Intent para salvar método de pagamento |
| `GET` | `/api/stripe/setup-intent/[id]` | Obter status do Setup Intent |

### Payment Intents

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/stripe/payment-intent` | Criar um Payment Intent avulso |

### Produtos

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/stripe/products` | Listar produtos/preços disponíveis do Stripe |

### Webhook

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/stripe/webhook` | Manipulador de eventos webhook do Stripe |

O manipulador de webhook do Stripe processa eventos como:
- `checkout.session.completed` — Conclusão do checkout
- `customer.subscription.created` — Nova assinatura
- `customer.subscription.updated` — Alterações na assinatura
- `customer.subscription.deleted` — Cancelamento de assinatura
- `invoice.payment_succeeded` — Pagamento bem-sucedido
- `invoice.payment_failed` — Pagamento com falha

## Lemon Squeezy (`/api/lemonsqueezy`)

O Lemon Squeezy fornece um modelo de assinatura mais simples com 7 endpoints.

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/lemonsqueezy/checkout` | Criar um checkout do Lemon Squeezy |
| `GET` | `/api/lemonsqueezy/list` | Listar assinaturas do usuário |
| `POST` | `/api/lemonsqueezy/cancel` | Cancelar uma assinatura |
| `POST` | `/api/lemonsqueezy/reactivate` | Reativar uma assinatura cancelada |
| `POST` | `/api/lemonsqueezy/update` | Atualizar detalhes da assinatura |
| `POST` | `/api/lemonsqueezy/update-plan` | Mudar plano de assinatura |
| `POST` | `/api/lemonsqueezy/webhook` | Manipulador de webhook do Lemon Squeezy |

### Eventos de Webhook

O webhook do Lemon Squeezy processa:
- `subscription_created` — Nova assinatura
- `subscription_updated` — Mudanças de plano
- `subscription_cancelled` — Cancelamento
- `subscription_payment_success` — Confirmação de pagamento
- `subscription_payment_failed` — Falha de pagamento

## Polar (`/api/polar`)

O Polar fornece 5 endpoints para checkout e gerenciamento de assinaturas.

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/polar/checkout` | Criar uma sessão de checkout do Polar |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Cancelar assinatura |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Reativar assinatura |
| `POST` | `/api/polar/subscription/portal` | Acessar portal de assinatura |
| `POST` | `/api/polar/webhook` | Manipulador de webhook do Polar |

## Solidgate (`/api/solidgate`)

O Solidgate é a integração mais minimalista, com 2 endpoints.

| Método | Caminho | Descrição |
|--------|---------|----------|
| `POST` | `/api/solidgate/checkout` | Criar um checkout do Solidgate |
| `POST` | `/api/solidgate/webhook` | Manipulador de webhook do Solidgate |

## Pagamento Genérico (`/api/payment`)

Endpoints de pagamento independentes de provedor para gerenciar assinaturas independentemente do provedor de pagamento subjacente.

| Método | Caminho | Descrição |
|--------|---------|----------|
| `GET` | `/api/payment/[subscriptionId]` | Obter detalhes da assinatura por ID |
| `GET` | `/api/payment/account` | Obter conta de pagamento do usuário atual |
| `GET` | `/api/payment/account/[userId]` | Obter conta de pagamento de usuário específico (admin) |

## Segurança de Webhooks

Todos os endpoints de webhook implementam verificação de assinatura específica do provedor:

### Stripe

Os webhooks do Stripe verificam o cabeçalho `stripe-signature` usando a variável de ambiente `STRIPE_WEBHOOK_SECRET` e o método `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

Os webhooks do Lemon Squeezy verificam o cabeçalho `x-signature` usando HMAC-SHA256 com o `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

Os webhooks do Polar verificam assinaturas de solicitações usando o `POLAR_WEBHOOK_SECRET`.

### Solidgate

Os webhooks do Solidgate usam a verificação de assinatura embutida do SDK com o `SOLIDGATE_SECRET_KEY`.

## Variáveis de Ambiente

### Stripe

| Variável | Descrição |
|----------|----------|
| `STRIPE_SECRET_KEY` | Chave secreta da API do Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Chave publicável do Stripe (lado do cliente) |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook |

### Lemon Squeezy

| Variável | Descrição |
|----------|----------|
| `LEMONSQUEEZY_API_KEY` | Chave de API do Lemon Squeezy |
| `LEMONSQUEEZY_STORE_ID` | Identificador da loja |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Segredo de assinatura do webhook |

### Polar

| Variável | Descrição |
|----------|----------|
| `POLAR_ACCESS_TOKEN` | Token de acesso à API do Polar |
| `POLAR_WEBHOOK_SECRET` | Segredo de assinatura do webhook |
| `POLAR_ORGANIZATION_ID` | Identificador da organização |

### Solidgate

| Variável | Descrição |
|----------|----------|
| `SOLIDGATE_MERCHANT_ID` | Identificador do comerciante |
| `SOLIDGATE_SECRET_KEY` | Chave secreta da API |

## Requisitos de Autenticação

| Tipo de Endpoint | Autenticação Obrigatória |
|-----------------|-------------------------|
| Criação de checkout | Sim (usuário autenticado) |
| Gerenciamento de assinaturas | Sim (proprietário da assinatura) |
| Gerenciamento de métodos de pagamento | Sim (cliente Stripe) |
| Listagem de produtos | Público (produtos Stripe) |
| Manipuladores de webhook | Verificação de assinatura (sem sessão) |
| Consultas de pagamento genéricas | Sim (proprietário da conta ou admin) |
