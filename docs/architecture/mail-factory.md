---
id: mail-factory
title: Mail Factory
sidebar_label: Mail Factory
sidebar_position: 33
---

# Mail Factory

The template uses a factory pattern for email delivery, supporting multiple providers (Resend, Novu) with an automatic fallback to a mock provider during development or when credentials are missing.

## File Structure

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

## Provider Interface

Every email provider implements the `EmailProvider` interface:

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

## Factory Pattern (`factory.ts`)

The `EmailProviderFactory` selects the appropriate provider based on configuration. If the specified provider's API key is missing or empty, it falls back to the mock provider:

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

## Provider Implementations

### MockEmailProvider

Logs emails to the console. Used during development or when no API keys are configured:

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

Sends emails via the Resend API:

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

Sends emails through Novu's notification infrastructure using workflow triggers:

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

## EmailService Class

The `EmailService` class wraps the factory-created provider and provides domain-specific email methods. It includes an availability check so the application can gracefully degrade when email is not configured:

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

## Exported Helper Functions

The module exports top-level functions that handle service creation and error management automatically. These are the recommended way to send emails throughout the application:

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

The `tryEmailOperation` wrapper catches availability errors and returns a structured result instead of throwing:

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## Configuration

The service configuration is assembled from the app's content config and environment variables:

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

Configuration sources (in priority order):

1. **Content config** (`config.mail.provider`, `config.mail.default_from`) - from the Git-based CMS
2. **Environment variables** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - from the config service
3. **Fallback defaults** - Resend provider, `info@ever.works`

## Email Templates

All templates are exported from `lib/mail/templates/index.ts`:

| Template | Function | Purpose |
|----------|----------|---------|
| Account Created | `getAccountCreatedTemplate` | Welcome email after registration |
| Email Verification | `getEmailVerificationTemplate` | Verification link email |
| Password Change | `getPasswordChangeConfirmationTemplate` | Confirms password was changed |
| Payment Success | `getPaymentSuccessTemplate` | Payment receipt |
| Payment Failed | `getPaymentFailedTemplate` | Payment failure notification |
| Subscription Events | `getNewSubscriptionTemplate`, `getUpdatedSubscriptionTemplate`, `getCancelledSubscriptionTemplate` | Subscription lifecycle |
| Renewal Reminder | `getRenewalReminderTemplate` | Upcoming renewal notice |
| Newsletter Welcome | `getWelcomeEmailTemplate` | Newsletter signup confirmation |
| Newsletter Unsubscribe | `getUnsubscribeEmailTemplate` | Unsubscribe confirmation |
| Newsletter Regular | `getRegularNewsletterTemplate` | Newsletter content dispatch |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_PROVIDER` | No | Provider name: `resend` or `novu` (default: `resend`) |
| `EMAIL_FROM` | No | Default sender address |
| `RESEND_API_KEY` | For Resend | Resend API key |
| `NOVU_API_KEY` | For Novu | Novu API key |
| `NOVU_TEMPLATE_ID` | No | Novu workflow ID (default: `email-default`) |
| `NOVU_BACKEND_URL` | No | Custom Novu backend URL |

## Related Files

- `lib/mail/factory.ts` - Provider factory
- `lib/mail/index.ts` - EmailService and exported functions
- `lib/mail/templates/` - All email template generators
- `lib/newsletter/` - Newsletter-specific email utilities
