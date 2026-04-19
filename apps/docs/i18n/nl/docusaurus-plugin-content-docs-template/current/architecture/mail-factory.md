---
id: mail-factory
title: Postfabriek
sidebar_label: Postfabriek
sidebar_position: 33
---

# Postfabriek

De sjabloon maakt gebruik van een fabriekspatroon voor de bezorging van e-mail en ondersteunt meerdere providers (Resend, Novu) met een automatische terugval naar een nepprovider tijdens de ontwikkeling of wanneer inloggegevens ontbreken.

## Bestandsstructuur

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

## Provider-interface

Elke e-mailprovider implementeert de `EmailProvider`-interface:

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

## Fabriekspatroon (`factory.ts`)

De `EmailProviderFactory` selecteert op basis van de configuratie de juiste provider. Als de API-sleutel van de opgegeven provider ontbreekt of leeg is, valt deze terug op de nepprovider:

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

## Implementaties van leveranciers

### MockEmailProvider

Registreert e-mails naar de console. Gebruikt tijdens de ontwikkeling of wanneer er geen API-sleutels zijn geconfigureerd:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### Provider opnieuw verzenden

Verstuurt e-mails via de Resend API:

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

Verstuurt e-mails via de notificatie-infrastructuur van Novu met behulp van workflow-triggers:

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

## E-mailserviceklasse

De klasse `EmailService` omvat de in de fabriek gemaakte provider en biedt domeinspecifieke e-mailmethoden. Het bevat een beschikbaarheidscontrole, zodat de applicatie netjes kan verslechteren als e-mail niet is geconfigureerd:

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

## Geëxporteerde helperfuncties

De module exporteert functies op het hoogste niveau die het maken van services en het foutbeheer automatisch afhandelen. Dit zijn de aanbevolen manieren om e-mails te verzenden in de hele applicatie:

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

De wrapper `tryEmailOperation` vangt beschikbaarheidsfouten op en retourneert een gestructureerd resultaat in plaats van het volgende te genereren:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configuratie

De serviceconfiguratie wordt samengesteld uit de inhoudsconfiguratie en omgevingsvariabelen van de app:

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

Configuratiebronnen (in prioriteitsvolgorde):

1. **Contentconfiguratie** (`config.mail.provider`, `config.mail.default_from`) - vanuit het op Git gebaseerde CMS
2. **Omgevingsvariabelen** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - van de configuratieservice
3. **Fallback-standaardwaarden** - Provider opnieuw verzenden, `info@ever.works`

## E-mailsjablonen

Alle sjablonen worden geëxporteerd vanuit `lib/mail/templates/index.ts`:

|Sjabloon|Functie|Doel|
|----------|----------|---------|
|Account aangemaakt|`getAccountCreatedTemplate`|Welkomstmail na registratie|
|E-mailverificatie|`getEmailVerificationTemplate`|E-mail met verificatielink|
|Wachtwoord wijzigen|`getPasswordChangeConfirmationTemplate`|Bevestigt dat het wachtwoord is gewijzigd|
|Betaling succes|`getPaymentSuccessTemplate`|Betalingsbewijs|
|Betaling mislukt|`getPaymentFailedTemplate`|Melding mislukte betaling|
|Abonnementsevenementen|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Levenscyclus van abonnement|
|Herinnering voor verlenging|`getRenewalReminderTemplate`|Aankondiging van komende verlenging|
|Nieuwsbrief Welkom|`getWelcomeEmailTemplate`|Bevestiging van aanmelding nieuwsbrief|
|Nieuwsbrief Afmelden|`getUnsubscribeEmailTemplate`|Bevestiging van afmelden|
|Nieuwsbrief Regelmatig|`getRegularNewsletterTemplate`|Verzending van de inhoud van de nieuwsbrief|

## Omgevingsvariabelen

|Variabel|Vereist|Beschrijving|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Nee|Naam provider: `resend` of `novu` (standaard: `resend`)|
|`EMAIL_FROM`|Nee|Standaard afzenderadres|
|`RESEND_API_KEY`|Voor opnieuw verzenden|API-sleutel opnieuw verzenden|
|`NOVU_API_KEY`|Voor Novu|Novu API-sleutel|
|`NOVU_TEMPLATE_ID`|Nee|Novu-workflow-ID (standaard: `email-default`)|
|`NOVU_BACKEND_URL`|Nee|Aangepaste Novu-backend-URL|

## Gerelateerde bestanden

- `lib/mail/factory.ts` - Leveranciersfabriek
- `lib/mail/index.ts` - E-mailservice en geëxporteerde functies
- `lib/mail/templates/` - Alle e-mailsjabloongeneratoren
- `lib/newsletter/` - Nieuwsbrief-specifieke e-mailhulpprogramma's
