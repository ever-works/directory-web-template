---
id: mail-factory
title: Fabbrica di posta
sidebar_label: Fabbrica di posta
sidebar_position: 33
---

# Fabbrica di posta

Il modello utilizza un modello di fabbrica per la consegna della posta elettronica, supportando più provider (Resend, Novu) con un fallback automatico a un provider fittizio durante lo sviluppo o quando mancano le credenziali.

## Struttura dei file

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

## Interfaccia del fornitore

Ogni provider di posta elettronica implementa l'interfaccia `EmailProvider`:

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

## Modello di fabbrica (`factory.ts`)

`EmailProviderFactory` seleziona il provider appropriato in base alla configurazione. Se la chiave API del provider specificato è mancante o vuota, ricorre al provider fittizio:

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

## Implementazioni del fornitore

### MockEmailProvider

Registra le email sulla console. Utilizzato durante lo sviluppo o quando non sono configurate chiavi API:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### ReinviaProvider

Invia e-mail tramite l'API Resend:

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

### NovuProvider

Invia e-mail attraverso l'infrastruttura di notifica di Novu utilizzando i trigger del flusso di lavoro:

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

## Classe EmailService

La classe `EmailService` racchiude il provider creato in fabbrica e fornisce metodi di posta elettronica specifici del dominio. Include un controllo della disponibilità in modo che l'applicazione possa degradarsi con garbo quando l'e-mail non è configurata:

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

## Funzioni di supporto esportate

Il modulo esporta funzioni di primo livello che gestiscono automaticamente la creazione del servizio e la gestione degli errori. Questi sono i modi consigliati per inviare e-mail attraverso l'applicazione:

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

Il wrapper `tryEmailOperation` rileva gli errori di disponibilità e restituisce un risultato strutturato invece di lanciare:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configurazione

La configurazione del servizio viene assemblata dalla configurazione del contenuto dell'app e dalle variabili di ambiente:

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

Origini della configurazione (in ordine di priorità):

1. **Configurazione contenuto** (`config.mail.provider`, `config.mail.default_from`) - dal CMS basato su Git
2. **Variabili d'ambiente** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - dal servizio di configurazione
3. **Predefinite di fallback** - Invia nuovamente il provider, `info@ever.works`

## Modelli di posta elettronica

Tutti i modelli vengono esportati da `lib/mail/templates/index.ts`:

|Modello|Funzione|Scopo|
|----------|----------|---------|
|Conto creato|`getAccountCreatedTemplate`|Email di benvenuto dopo la registrazione|
|Verifica e-mail|`getEmailVerificationTemplate`|E-mail con collegamento di verifica|
|Modifica password|`getPasswordChangeConfirmationTemplate`|Conferma che la password è stata modificata|
|Successo del pagamento|`getPaymentSuccessTemplate`|Ricevuta di pagamento|
|Pagamento non riuscito|`getPaymentFailedTemplate`|Notifica di mancato pagamento|
|Eventi in abbonamento|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Ciclo di vita dell'abbonamento|
|Promemoria di rinnovo|`getRenewalReminderTemplate`|Prossimo avviso di rinnovo|
|Newsletter Benvenuto|`getWelcomeEmailTemplate`|Conferma iscrizione alla newsletter|
|Cancellazione newsletter|`getUnsubscribeEmailTemplate`|Conferma di cancellazione|
|Newsletter regolare|`getRegularNewsletterTemplate`|Invio dei contenuti della newsletter|

## Variabili d'ambiente

|Variabile|Obbligatorio|Descrizione|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|No|Nome del fornitore: `resend` o `novu` (predefinito: `resend`)|
|`EMAIL_FROM`|No|Indirizzo mittente predefinito|
|`RESEND_API_KEY`|Per rinviare|Invia nuovamente la chiave API|
|`NOVU_API_KEY`|Per Novu|Chiave API nuova|
|`NOVU_TEMPLATE_ID`|No|ID flusso di lavoro Novu (predefinito: `email-default`)|
|`NOVU_BACKEND_URL`|No|URL del backend Novu personalizzato|

## File correlati

- `lib/mail/factory.ts` - Fabbrica del fornitore
- `lib/mail/index.ts` - EmailService e funzioni esportate
- `lib/mail/templates/` - Tutti i generatori di modelli di posta elettronica
- `lib/newsletter/` - Utilità di posta elettronica specifiche per la newsletter
