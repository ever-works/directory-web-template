---
id: mail-factory
title: Usine de courrier
sidebar_label: Usine de courrier
sidebar_position: 33
---

# Usine de courrier

Le modèle utilise un modèle d'usine pour la livraison des e-mails, prenant en charge plusieurs fournisseurs (Resend, Novu) avec un retour automatique vers un fournisseur fictif pendant le développement ou lorsque les informations d'identification sont manquantes.

## Structure du fichier

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

## Interface du fournisseur

Chaque fournisseur de messagerie implémente l'interface `EmailProvider` :

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

## Modèle d'usine (`factory.ts`)

Le `EmailProviderFactory` sélectionne le fournisseur approprié en fonction de la configuration. Si la clé API du fournisseur spécifié est manquante ou vide, elle revient au fournisseur fictif :

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

## Implémentations du fournisseur

### MockEmailProvider

Enregistre les e-mails sur la console. Utilisé pendant le développement ou lorsqu'aucune clé API n'est configurée :

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### Fournisseur de renvoi

Envoie des e-mails via l'API Resend :

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

### NovuFournisseur

Envoie des e-mails via l'infrastructure de notification de Novu à l'aide de déclencheurs de workflow :

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

La classe `EmailService` encapsule le fournisseur créé en usine et fournit des méthodes de messagerie spécifiques au domaine. Il inclut un contrôle de disponibilité afin que l'application puisse se dégrader progressivement lorsque la messagerie électronique n'est pas configurée :

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

## Fonctions d'assistance exportées

Le module exporte des fonctions de niveau supérieur qui gèrent automatiquement la création de services et la gestion des erreurs. Voici la manière recommandée d’envoyer des e-mails dans l’ensemble de l’application :

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

Le wrapper `tryEmailOperation` détecte les erreurs de disponibilité et renvoie un résultat structuré au lieu de lancer :

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configuration

La configuration du service est assemblée à partir de la configuration du contenu et des variables d'environnement de l'application :

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

Sources de configuration (par ordre de priorité) :

1. **Configuration du contenu** (`config.mail.provider`, `config.mail.default_from`) - à partir du CMS basé sur Git
2. **Variables d'environnement** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - à partir du service de configuration
3. **Paramètres de secours** - Renvoyer le fournisseur, `info@ever.works`

## Modèles d'e-mails

Tous les modèles sont exportés depuis `lib/mail/templates/index.ts` :

|Modèle|Fonction|Objectif|
|----------|----------|---------|
|Compte créé|`getAccountCreatedTemplate`|E-mail de bienvenue après l'inscription|
|Vérification par e-mail|`getEmailVerificationTemplate`|E-mail de lien de vérification|
|Changement de mot de passe|`getPasswordChangeConfirmationTemplate`|Confirme que le mot de passe a été modifié|
|Succès du paiement|`getPaymentSuccessTemplate`|Reçu de paiement|
|Échec du paiement|`getPaymentFailedTemplate`|Notification d'échec de paiement|
|Événements d'abonnement|`getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate`|Cycle de vie de l'abonnement|
|Rappel de renouvellement|`getRenewalReminderTemplate`|Avis de renouvellement à venir|
|Bienvenue à la newsletter|`getWelcomeEmailTemplate`|Confirmation d'inscription à la newsletter|
|Désabonnement à la newsletter|`getUnsubscribeEmailTemplate`|Confirmation de désabonnement|
|Newsletter régulière|`getRegularNewsletterTemplate`|Envoi du contenu de la newsletter|

## Variables d'environnement

|Variable|Obligatoire|Descriptif|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|Non|Nom du fournisseur : `resend` ou `novu` (par défaut : `resend`)|
|`EMAIL_FROM`|Non|Adresse de l'expéditeur par défaut|
|`RESEND_API_KEY`|Pour renvoyer|Renvoyer la clé API|
|`NOVU_API_KEY`|Pour Novu|Clé API Novu|
|`NOVU_TEMPLATE_ID`|Non|ID de flux de travail Novu (par défaut : `email-default`)|
|`NOVU_BACKEND_URL`|Non|URL backend Novu personnalisée|

## Fichiers associés

- `lib/mail/factory.ts` - Fabrique de fournisseurs
- `lib/mail/index.ts` - EmailService et fonctions exportées
- `lib/mail/templates/` - Tous les générateurs de modèles d'e-mails
- `lib/newsletter/` - Utilitaires de messagerie spécifiques à la newsletter
