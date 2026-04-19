---
id: notification-types
title: Definicje typów powiadomień
sidebar_label: Typy powiadomień
sidebar_position: 14
---

# Definicje typów powiadomień

**Źródło:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Powiadomienia w szablonie są wysyłane głównie pocztą elektroniczną i wywoływane przez zdarzenia systemowe, takie jak zakończenie płatności, zmiany subskrypcji i sprawdzenie przesłanych zgłoszeń.

## Interfejsy

### `EmailNotificationData`

Podstawowy ładunek służący do wysyłania wiadomości e-mail z powiadomieniami administratora.

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

|Pole|Wymagane|Opis|
|-------|----------|-------------|
|`to`|Tak|Adres e-mail odbiorcy|
|`title`|Tak|Wiersz tematu i nagłówek wewnętrzny|
|`message`|Tak|Główny organ powiadamiający|
|`actionUrl`|Nie|Link do przycisku wezwania do działania|
|`actionText`|Nie|Tekst etykiety przycisku CTA|
|`notificationType`|Tak|Służy do wyboru wariantu szablonu wiadomości e-mail|
|`timestamp`|Tak|Kiedy nastąpiło zdarzenie inicjujące|

### `WebhookEventType`

Zdarzenia otrzymane od webhooków dostawców usług płatniczych, które wyzwalają powiadomienia.

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

Standaryzowany wynik przetwarzania zdarzenia webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Kategorie powiadomień

Szablon wyzwala powiadomienia dla następujących kategorii zdarzeń:

|Kategoria|Zdarzenia wyzwalające|
|----------|---------------|
|**Płatność**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Subskrypcja**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Faktura**|`invoice_paid`, `invoice_payment_failed`|
|**Przesłanie**|Przedmiot zatwierdzony, przedmiot odrzucony, otrzymano nowe zgłoszenie|
|**Konto**|Hasło zmienione, e-mail zweryfikowany|

## Integracja usług e-mail

Powiadomienia wysyłane są poprzez klasę `EmailNotificationService`:

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

Usługa sprawdza dostępność dostawcy poczty e-mail przed wysłaniem i zwraca wynik `skipped`, jeśli nie skonfigurowano żadnego dostawcy, zapobiegając błędom w czasie wykonywania w środowiskach bez konfiguracji poczty e-mail.

## Konfiguracja dostawcy poczty e-mail

Dostarczenie powiadomień zależy od konfiguracji poczty elektronicznej w `lib/config/schemas/email.schema.ts`:

|Dostawca|Wymagana zmienna środowiska|Włączone automatycznie|
|----------|-----------------|--------------|
|Wyślij ponownie|`RESEND_API_KEY`|Gdy klucz jest obecny|
|Nowy|`NOVU_API_KEY`|Gdy klucz jest obecny|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Kiedy wszyscy trzej są obecni|

## Przykład użycia

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

## Powiązane typy

- [Typy płatności](./payment-types.md) -- `WebhookEventType` i wyliczenia płatności
- [Typy subskrypcji](./subscription-types.md) -- zdarzenia cyklu życia subskrypcji
- [Typy konfiguracji](./config-types.md) -- `EmailConfig` dla ustawień dostawcy
