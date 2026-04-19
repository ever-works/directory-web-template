---
id: solidgate-deep-dive
title: "Solidgate — Análise Aprofundada"
sidebar_label: "Solidgate"
sidebar_position: 7
---

# Solidgate — Análise Aprofundada

Esta página descreve os endpoints da integração Solidgate em detalhes: criação de checkout, processamento de webhook com verificação HMAC e mapeamento de eventos.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | `/api/solidgate/checkout` | Criar uma sessão de checkout Solidgate |
| GET | `/api/solidgate/checkout` | Recuperar informações de checkout |
| POST | `/api/solidgate/webhook` | Receber eventos de webhook Solidgate |
| GET | `/api/solidgate/webhook` | Retornar mensagem informativa |

**Arquivos fonte:**
- `template/app/api/solidgate/checkout/route.ts`
- `template/app/api/solidgate/webhook/route.ts`

---

## POST `/api/solidgate/checkout`

Cria uma sessão de checkout Solidgate. O corpo é validado com Zod antes do processamento.

### Autenticação

Requer sessão válida do usuário.

### Corpo da Solicitação

```typescript
{
  priceId: string;              // Obrigatório: ID do preço
  mode?: "one_time" | "subscription"; // Padrão: "subscription"
  successUrl: string;           // Obrigatório: URL de retorno após sucesso
  cancelUrl: string;            // Obrigatório: URL de retorno ao cancelar
  metadata?: Record<string, string>; // Metadados opcionais
}
```

### Validação Zod

```typescript
const checkoutSchema = z.object({
  priceId: z.string().min(1),
  mode: z.enum(["one_time", "subscription"]).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});
```

### Resposta

```json
{
  "url": "https://pay.solidgate.com/...",
  "paymentIntentId": "pi_..."
}
```

### Geração de Assinatura para SDK Incorporado

Ao usar o SDK Solidgate incorporado no frontend:

```typescript
import { generatePaymentIntentSignature } from '@/lib/payment/solidgate/solidgate.client';

const signature = generatePaymentIntentSignature({
  merchantId: process.env.SOLIDGATE_MERCHANT_ID!,
  paymentIntentId: paymentIntentId,
  secretKey: process.env.SOLIDGATE_SECRET_KEY!,
});
```

---

## GET `/api/solidgate/checkout`

Recupera informações de uma sessão de checkout existente.

### Parâmetros de Consulta

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|------------|-----------|
| `session_id` | string | **Sim** | ID da sessão de checkout |

---

## POST `/api/solidgate/webhook`

Recebe e processa eventos de webhook do Solidgate.

### Verificação de Assinatura (HMAC-SHA512)

O webhook verifica a assinatura usando HMAC-SHA512. São aceitos os cabeçalhos `x-signature` ou `solidgate-signature`:

```typescript
const signature =
  request.headers.get('x-signature') ||
  request.headers.get('solidgate-signature');

const rawBody = await request.text();
const expectedSignature = crypto
  .createHmac('sha512', process.env.SOLIDGATE_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest('hex');

if (signature !== expectedSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

### Idempotência em Memória

IDs de eventos já processados são armazenados em um `Set` em memória por 24 horas:

```typescript
const processedEvents = new Set<string>();
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

if (processedEvents.has(eventId)) {
  return NextResponse.json({ received: true }); // Ignorar duplicata
}
processedEvents.add(eventId);
setTimeout(() => processedEvents.delete(eventId), EVENT_TTL_MS);
```

:::warning Limitação Serverless
O armazenamento em memória não persiste entre reinicializações em ambientes serverless. Para produção, use um banco de dados ou Redis para idempotência confiável.
:::

### Mapeamento de Eventos Solidgate

| Tipo de Evento | WebhookEventType |
|----------------|------------------|
| `payment_approved` | `payment_succeeded` |
| `payment_declined` | `payment_failed` |
| `refund_approved` | `payment_refunded` |
| `subscription_activated` | `subscription_created` |
| `subscription_updated` | `subscription_updated` |
| `subscription_cancelled` | `subscription_cancelled` |

### Resposta do Webhook

```json
{ "received": true }
```

---

## GET `/api/solidgate/webhook`

Retorna apenas uma mensagem informativa (não processa eventos):

```json
{
  "message": "Solidgate webhook endpoint. Send POST requests to process events."
}
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `SOLIDGATE_API_KEY` | Chave de API Solidgate |
| `SOLIDGATE_SECRET_KEY` | Chave secreta para assinatura de payment intent |
| `SOLIDGATE_WEBHOOK_SECRET` | Segredo para verificação HMAC de webhook |
| `SOLIDGATE_PUBLISHABLE_KEY` | Chave pública para SDK frontend |
| `SOLIDGATE_MERCHANT_ID` | ID do comerciante Solidgate |

---

## Arquivos Fonte

| Arquivo | Descrição |
|---------|-----------|
| `template/app/api/solidgate/checkout/route.ts` | Handler de checkout |
| `template/app/api/solidgate/webhook/route.ts` | Handler de webhook |
| `template/lib/payment/solidgate/solidgate.service.ts` | Lógica de serviço |
| `template/lib/payment/solidgate/solidgate.client.ts` | Geração de assinatura |
