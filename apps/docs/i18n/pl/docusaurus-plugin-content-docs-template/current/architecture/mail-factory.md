---
id: mail-factory
title: Fabryka poczty
sidebar_label: Fabryka poczty
sidebar_position: 33
---

# Fabryka poczty

Szablon wykorzystuje fabryczny wzorzec dostarczania wiadomości e-mail, obsługując wielu dostawców (Resend, Novu) z automatycznym przełączaniem do fałszywego dostawcy podczas programowania lub w przypadku braku poświadczeń.

## Struktura pliku

```
lib/mail/
  index.ts                    # EmailService class, exported helper functions
  factory.ts                  # EmailProviderFactory - provider selection logic
  mock.ts                     # MockEmailProvider - logs to console
  resend.ts                   # ResendProvider - Resend API integration
  novu.ts                     # NovuProvider - Novu notification integration
  templates/
    index.ts                  # Re-exports all templates
    account-created.ts        # Account creation email
    admin-notification.ts     # Admin notification emails
    email-verification.ts     # Email verification link
    newsletter-welcome.ts     # Newsletter welcome email
    newsletter-unsubscribe.ts # Newsletter unsubscribe confirmation
    newsletter-regular.ts     # Regular newsletter dispatch
    password-change-confirmation.ts  # Password change confirmation
    payment-success.ts        # Payment success notification
    payment-failed.ts         # Payment failure notification
    submission-decision.ts    # Item submission approval/rejection
    subscription-events.ts    # Subscription lifecycle events
    subscription-expired.ts   # Subscription expiration notice
    subscription-renewal-reminder.ts # Renewal reminder
```

## Interfejs dostawcy

Każdy dostawca poczty e-mail wdraża interfejs `EmailProvider`:

```ts
export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}
```

## Wzór fabryczny (`factory.ts`)

`EmailProviderFactory` wybiera odpowiedniego dostawcę na podstawie konfiguracji. Jeśli brakuje klucza API określonego dostawcy lub jest on pusty, wraca on do próbnego dostawcy:

```ts
export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case "resend":
        if (!config.apiKeys.resend || config.apiKeys.resend.trim() === '') {
          console.warn('Resend API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);

      case "novu":
        if (!config.apiKeys.novu || config.apiKeys.novu.trim() === '') {
          console.warn('Novu API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new NovuProvider(config.apiKeys.novu, config.defaultFrom, config.novu);

      default:
        console.warn(`Unknown email provider. Using mock email provider.`);
        return new MockEmailProvider();
    }
  }
}
```

## Wdrożenia dostawców

### Próbny dostawca poczty e-mail

Rejestruje wiadomości e-mail w konsoli. Używane podczas programowania lub gdy nie skonfigurowano żadnych kluczy API:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### Wyślij ponownie dostawcę

Wysyła e-maile za pośrednictwem interfejsu Resend API:

```ts
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(message: EmailMessage): Promise<CreateEmailResponse> {
    return this.resend.emails.send({
      from: message.from || this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
```

### Dostawca Novu

Wysyła e-maile za pośrednictwem infrastruktury powiadomień Novu, korzystając z wyzwalaczy przepływu pracy:

```ts
export class NovuProvider implements EmailProvider {
  private novu: Novu;
  private defaultFrom: string;
  private templateId: string;

  constructor(apiKey: string, defaultFrom: string, config?: EmailNovuConfig) {
    this.novu = new Novu({
      secretKey: apiKey,
      serverURL: config?.backendUrl,
    });
    this.defaultFrom = defaultFrom;
    this.templateId = config?.templateId || "email-default";
  }

  async sendEmail(message: EmailMessage) {
    const email = Array.isArray(message.to) ? message.to[0] : message.to;
    return this.novu.trigger({
      to: { subscriberId: email, email },
      workflowId: this.templateId,
      payload: {
        subject: message.subject,
        body: message.html,
        preheader: message.text,
        from: message.from || this.defaultFrom,
      },
    });
  }
}
```

## Klasa usługi poczty elektronicznej

Klasa `EmailService` otacza fabrycznie utworzonego dostawcę i zapewnia metody poczty e-mail specyficzne dla domeny. Obejmuje kontrolę dostępności, dzięki czemu aplikacja może bezpiecznie ulec degradacji, gdy poczta e-mail nie jest skonfigurowana:

```ts
export class EmailService {
  private provider: EmailProvider | null = null;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    const hasApiKey = Object.values(config.apiKeys).some(
      key => key && key.trim() !== ''
    );
    if (hasApiKey) {
      this.provider = EmailProviderFactory.createProvider(config);
      this.isAvailable = true;
    }
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  // Domain-specific methods
  async sendVerificationEmail(email: string, token: string): Promise<any>
  async sendPasswordResetEmail(email: string, token: string): Promise<any>
  async sendTwoFactorTokenEmail(email: string, token: string): Promise<any>
  async sendPasswordChangeConfirmationEmail(email: string, ...): Promise<any>
  async sendAccountCreatedEmail(userName: string, email: string, ...): Promise<any>
  async sendNewsletterSubscriptionEmail(email: string): Promise<any>
  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any>
  async sendCustomEmail(message: EmailMessage): Promise<any>
}
```

## Eksportowane funkcje pomocnicze

Moduł eksportuje funkcje najwyższego poziomu, które automatycznie obsługują tworzenie usług i zarządzanie błędami. Oto zalecane sposoby wysyłania wiadomości e-mail w aplikacji:

```ts
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorTokenEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountCreatedEmail,
  sendNewsletterSubscriptionEmail,
  sendNewsletterUnsubscriptionEmail,
} from '@/lib/mail';

// Each function handles service unavailability gracefully
const result = await sendVerificationEmail('user@example.com', verificationToken);

// Returns either the provider result or a skipped result
if ('skipped' in result) {
  console.log(result.reason); // "Email service not configured"
}
```

Opakowanie `tryEmailOperation` wychwytuje błędy dostępności i zwraca ustrukturyzowany wynik zamiast rzucać:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Konfiguracja

Konfiguracja usługi jest składana z konfiguracji zawartości aplikacji i zmiennych środowiskowych:

```ts
export interface EmailServiceConfig {
  provider: string;         // "resend" | "novu"
  defaultFrom: string;      // e.g., "info@ever.works"
  apiKeys: Record<string, string>;
  domain: string;           // App URL for link generation
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

Źródła konfiguracji (w kolejności priorytetów):

1. **Konfiguracja treści** (`config.mail.provider`, `config.mail.default_from`) - z CMS-a opartego na Git
2. **Zmienne środowiskowe** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - z usługi konfiguracyjnej
3. **Domyślne ustawienia awaryjne** - Wyślij ponownie dostawcę, `info@ever.works`

## Szablony e-maili

Wszystkie szablony są eksportowane z `lib/mail/templates/index.ts`:

|Szablon|Funkcja|Cel|
|----------|----------|---------|
|Konto utworzone|`getAccountCreatedTemplate`|E-mail powitalny po rejestracji|
|Weryfikacja e-mailowa|`getEmailVerificationTemplate`|E-mail z linkiem weryfikacyjnym|
|Zmiana hasła|`getPasswordChangeConfirmationTemplate`|Potwierdza zmianę hasła|
|Sukces płatności|`getPaymentSuccessTemplate`|Potwierdzenie płatności|
|Płatność nie powiodła się|`getPaymentFailedTemplate`|Powiadomienie o niepowodzeniu płatności|
|Wydarzenia związane z subskrypcją|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Cykl życia subskrypcji|
|Przypomnienie o odnowieniu|`getRenewalReminderTemplate`|Nadchodzące powiadomienie o odnowieniu|
|Witamy w biuletynie|`getWelcomeEmailTemplate`|Potwierdzenie zapisu do newslettera|
|Wypisz się z newslettera|`getUnsubscribeEmailTemplate`|Potwierdzenie rezygnacji z subskrypcji|
|Biuletyn Regularny|`getRegularNewsletterTemplate`|Wysyłka treści newslettera|

## Zmienne środowiskowe

|Zmienna|Wymagane|Opis|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Nie|Nazwa dostawcy: `resend` lub `novu` (domyślnie: `resend`)|
|`EMAIL_FROM`|Nie|Domyślny adres nadawcy|
|`RESEND_API_KEY`|Do ponownego wysłania|Wyślij ponownie klucz API|
|`NOVU_API_KEY`|Dla Novu|Klucz API Novu|
|`NOVU_TEMPLATE_ID`|Nie|Identyfikator przepływu pracy Novu (domyślnie: `email-default`)|
|`NOVU_BACKEND_URL`|Nie|Niestandardowy adres URL backendu Novu|

## Powiązane pliki

- `lib/mail/factory.ts` - Fabryka dostawcy
- `lib/mail/index.ts` - EmailService i funkcje eksportowane
- `lib/mail/templates/` - Wszystkie generatory szablonów e-maili
- `lib/newsletter/` — narzędzia e-mail przeznaczone do obsługi biuletynów
