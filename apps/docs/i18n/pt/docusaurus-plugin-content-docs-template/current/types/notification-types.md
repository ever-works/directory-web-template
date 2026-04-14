---
id: notification-types
title: Definições de tipo de notificação
sidebar_label: Tipos de notificação
sidebar_position: 14
---

# Definições de tipo de notificação

**Fonte:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

As notificações no modelo são principalmente baseadas em e-mail, acionadas por eventos do sistema, como conclusão de pagamentos, alterações de assinatura e revisões de envios.

## Interfaces

### `EmailNotificationData`

A carga principal para enviar e-mails de notificação ao administrador.

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

|Campo|Obrigatório|Descrição|
|-------|----------|-------------|
|`to`|Sim|Endereço de e-mail do destinatário|
|`title`|Sim|Linha de assunto e cabeçalho interno|
|`message`|Sim|Corpo de notificação principal|
|`actionUrl`|Não|Link para o botão de call to action|
|`actionText`|Não|Texto do rótulo para o botão CTA|
|`notificationType`|Sim|Usado para selecionar a variante do modelo de e-mail|
|`timestamp`|Sim|Quando ocorreu o evento desencadeador|

### `WebhookEventType`

Eventos recebidos de webhooks de provedores de pagamento que acionam notificações.

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

Resultado padronizado do processamento de um evento de webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Categorias de notificação

O modelo aciona notificações para estas categorias de eventos:

|Categoria|Eventos de gatilho|
|----------|---------------|
|**Pagamento**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Assinatura**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Fatura**|`invoice_paid`, `invoice_payment_failed`|
|**Envio**|Item aprovado, item rejeitado, novo envio recebido|
|**Conta**|Senha alterada, e-mail verificado|

## Integração de serviço de e-mail

As notificações são enviadas através da classe `EmailNotificationService`:

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

O serviço verifica a disponibilidade do provedor de e-mail antes de enviar e retorna um resultado `skipped` se nenhum provedor estiver configurado, evitando erros de tempo de execução em ambientes sem configuração de e-mail.

## Configuração do provedor de e-mail

A entrega da notificação depende da configuração do e-mail em `lib/config/schemas/email.schema.ts`:

|Provedor|Var de ambiente necessária|Ativado automaticamente|
|----------|-----------------|--------------|
|Reenviar|`RESEND_API_KEY`|Quando a chave está presente|
|Novu|`NOVU_API_KEY`|Quando a chave está presente|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Quando todos os três estão presentes|

## Exemplo de uso

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Tipos Relacionados

- [Tipos de pagamento](./payment-types.md) -- `WebhookEventType` e enums de pagamento
- [Tipos de assinatura](./subscription-types.md) – eventos do ciclo de vida da assinatura
- [Tipos de configuração](./config-types.md) -- `EmailConfig` para configurações do provedor
