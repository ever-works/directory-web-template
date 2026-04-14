---
id: mail-factory
title: Postfabrik
sidebar_label: Postfabrik
sidebar_position: 33
---

# Postfabrik

Die Vorlage verwendet ein Fabrikmuster für die E-Mail-Zustellung und unterstützt mehrere Anbieter (Resend, Novu) mit einem automatischen Fallback auf einen Scheinanbieter während der Entwicklung oder wenn Anmeldeinformationen fehlen.

## Dateistruktur

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

## Anbieterschnittstelle

Jeder E-Mail-Anbieter implementiert die Schnittstelle `EmailProvider`:

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

## Fabrikmuster (`factory.ts`)

Der `EmailProviderFactory` wählt den geeigneten Anbieter basierend auf der Konfiguration aus. Wenn der API-Schlüssel des angegebenen Anbieters fehlt oder leer ist, wird auf den Scheinanbieter zurückgegriffen:

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

## Anbieterimplementierungen

### MockEmailProvider

Protokolliert E-Mails an der Konsole. Wird während der Entwicklung verwendet oder wenn keine API-Schlüssel konfiguriert sind:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### ResendProvider

Versendet E-Mails über die Resend-API:

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

Sendet E-Mails über die Benachrichtigungsinfrastruktur von Novu mithilfe von Workflow-Triggern:

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

## EmailService-Klasse

Die Klasse `EmailService` umschließt den werkseitig erstellten Anbieter und stellt domänenspezifische E-Mail-Methoden bereit. Es umfasst eine Verfügbarkeitsprüfung, sodass die Anwendung ordnungsgemäß heruntergefahren werden kann, wenn E-Mail nicht konfiguriert ist:

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

## Exportierte Hilfsfunktionen

Das Modul exportiert Funktionen der obersten Ebene, die die Serviceerstellung und das Fehlermanagement automatisch durchführen. Dies sind die empfohlenen Methoden zum Versenden von E-Mails während der gesamten Anwendung:

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

Der Wrapper `tryEmailOperation` fängt Verfügbarkeitsfehler ab und gibt ein strukturiertes Ergebnis zurück, anstatt Folgendes auszulösen:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Konfiguration

Die Dienstkonfiguration wird aus der Inhaltskonfiguration und den Umgebungsvariablen der App zusammengestellt:

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

Konfigurationsquellen (in Prioritätsreihenfolge):

1. **Inhaltskonfiguration** (`config.mail.provider`, `config.mail.default_from`) – vom Git-basierten CMS
2. **Umgebungsvariablen** (`EMAIL_PROVIDER`, `EMAIL_FROM`) – vom Konfigurationsdienst
3. **Fallback-Standardwerte** – Anbieter erneut senden, `info@ever.works`

## E-Mail-Vorlagen

Alle Vorlagen werden aus `lib/mail/templates/index.ts` exportiert:

|Vorlage|Funktion|Zweck|
|----------|----------|---------|
|Konto erstellt|`getAccountCreatedTemplate`|Willkommens-E-Mail nach der Registrierung|
|E-Mail-Verifizierung|`getEmailVerificationTemplate`|E-Mail mit Bestätigungslink|
|Passwortänderung|`getPasswordChangeConfirmationTemplate`|Bestätigt, dass das Passwort geändert wurde|
|Zahlungserfolg|`getPaymentSuccessTemplate`|Zahlungsbeleg|
|Zahlung fehlgeschlagen|`getPaymentFailedTemplate`|Benachrichtigung über Zahlungsfehler|
|Abonnement-Events|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Abonnementlebenszyklus|
|Verlängerungserinnerung|`getRenewalReminderTemplate`|Bevorstehende Verlängerungsmitteilung|
|Newsletter Willkommen|`getWelcomeEmailTemplate`|Bestätigung der Newsletter-Anmeldung|
|Newsletter abbestellen|`getUnsubscribeEmailTemplate`|Abmeldebestätigung|
|Newsletter Regelmäßig|`getRegularNewsletterTemplate`|Versand von Newsletter-Inhalten|

## Umgebungsvariablen

|Variabel|Erforderlich|Beschreibung|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Nein|Anbietername: `resend` oder `novu` (Standard: `resend`)|
|`EMAIL_FROM`|Nein|Standard-Absenderadresse|
|`RESEND_API_KEY`|Zum erneuten Senden|API-Schlüssel erneut senden|
|`NOVU_API_KEY`|Für Novu|Novu-API-Schlüssel|
|`NOVU_TEMPLATE_ID`|Nein|Novu-Workflow-ID (Standard: `email-default`)|
|`NOVU_BACKEND_URL`|Nein|Benutzerdefinierte Novu-Backend-URL|

## Verwandte Dateien

- `lib/mail/factory.ts` – Anbieterfabrik
- `lib/mail/index.ts` – EmailService und exportierte Funktionen
- `lib/mail/templates/` – Alle E-Mail-Vorlagengeneratoren
- `lib/newsletter/` – Newsletter-spezifische E-Mail-Dienstprogramme
