---
id: mail-system
title: "Mail & Email System"
sidebar_label: "Mail System"
sidebar_position: 14
---

# Mail & Email System

The template includes a fully-featured email system built on a **provider-agnostic architecture**. It supports multiple email providers out of the box, offers professional HTML email templates for all transactional events, and degrades gracefully when no provider is configured.

## Architecture Overview

The mail system is organized across several files in `lib/mail/`:

| File | Purpose |
|------|---------|
| `lib/mail/index.ts` | Core `EmailService` class and exported helper functions |
| `lib/mail/factory.ts` | `EmailProviderFactory` for creating provider instances |
| `lib/mail/resend.ts` | Resend email provider implementation |
| `lib/mail/novu.ts` | Novu notification provider implementation |
| `lib/mail/mock.ts` | Mock provider for development and testing |
| `lib/mail/templates/` | HTML email templates for all transactional emails |

## Core Interfaces

### EmailMessage

Every email sent through the system uses this standard message format:

```ts
export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}
```

### EmailProvider

All email providers implement this interface:

```ts
export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}
```

### EmailServiceConfig

Configuration used to initialize the service:

```ts
export interface EmailServiceConfig {
  provider: string;
  defaultFrom: string;
  apiKeys: Record<string, string>;
  domain: string;
  novu?: EmailNovuConfig;
}
```

## EmailService Class

The `EmailService` class at `lib/mail/index.ts` is the main entry point for sending emails. It initializes a provider based on configuration and provides methods for every transactional email type.

### Initialization

```ts
const service = new EmailService({
  provider: 'resend',
  defaultFrom: 'info@ever.works',
  domain: 'https://demo.ever.works',
  apiKeys: {
    resend: process.env.RESEND_API_KEY || '',
  },
});
```

The constructor handles missing API keys gracefully:

- If no API keys are configured, the service marks itself as unavailable
- If initialization fails, a warning is logged and the service remains disabled
- The `isServiceAvailable()` method can be checked before sending

### Available Methods

| Method | Description |
|--------|-------------|
| `sendVerificationEmail(email, token)` | Send email verification link |
| `sendPasswordResetEmail(email, token)` | Send password reset link |
| `sendTwoFactorTokenEmail(email, token)` | Send 2FA code |
| `sendNewsletterSubscriptionEmail(email)` | Welcome to newsletter |
| `sendNewsletterUnsubscriptionEmail(email)` | Unsubscribe confirmation |
| `sendPasswordChangeConfirmationEmail(email, userName?, ipAddress?, userAgent?)` | Password change notification |
| `sendAccountCreatedEmail(userName, userEmail, companyName?)` | Account creation welcome |
| `sendVerificationEmailWithTemplate(email, token, userName?)` | Verification with professional template |
| `sendCustomEmail(message)` | Send any custom email |

## Provider Factory

The `EmailProviderFactory` at `lib/mail/factory.ts` creates the appropriate provider based on configuration:

```ts
export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case 'resend':
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);
      case 'novu':
        return new NovuProvider(
          config.apiKeys.novu,
          config.defaultFrom,
          config.novu
        );
      default:
        return new MockEmailProvider();
    }
  }
}
```

If an API key is missing for the selected provider, the factory falls back to the mock provider with a console warning.

## Email Providers

### Resend Provider

The `ResendProvider` at `lib/mail/resend.ts` wraps the Resend SDK:

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

  getName(): string {
    return 'resend';
  }
}
```

**Configuration:**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=info@yourdomain.com
```

### Novu Provider

The `NovuProvider` at `lib/mail/novu.ts` integrates with the Novu notification infrastructure:

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
    this.templateId = config?.templateId || 'email-default';
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

**Configuration:**

```env
EMAIL_PROVIDER=novu
NOVU_API_KEY=your_novu_api_key
NOVU_TEMPLATE_ID=email-default
NOVU_BACKEND_URL=https://api.novu.co
```

### Mock Provider

The `MockEmailProvider` at `lib/mail/mock.ts` logs emails to the console for development:

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log('Sending email:', message);
    return Promise.resolve();
  }
  getName(): string {
    return 'mock';
  }
}
```

## Graceful Degradation

The system uses the `tryEmailOperation` helper to ensure email failures never break core functionality:

```ts
async function tryEmailOperation<T>(
  operation: (service: EmailService) => Promise<T>,
  operationName: string
): Promise<T | EmailSkippedResult> {
  try {
    const service = await mailService();
    if (!service.isServiceAvailable()) {
      console.warn(`[EMAIL] ${operationName}: Skipped - email service not configured`);
      return { skipped: true, reason: 'Email service not configured' };
    }
    return await operation(service);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not available')) {
      return { skipped: true, reason: error.message };
    }
    throw error;
  }
}
```

This means registration, password reset, and other flows work even without a configured email provider.

## Exported Helper Functions

The module exports convenience functions that wrap `tryEmailOperation`:

```ts
export const sendVerificationEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendVerificationEmail(email, token),
    'sendVerificationEmail'
  );
};

export const sendPasswordResetEmail = async (email: string, token: string) => { ... };
export const sendNewsletterSubscriptionEmail = async (email: string) => { ... };
export const sendTwoFactorTokenEmail = async (email: string, token: string) => { ... };
export const sendPasswordChangeConfirmationEmail = async (...) => { ... };
export const sendAccountCreatedEmail = async (...) => { ... };
```

Import and use these directly from any server-side code:

```ts
import { sendVerificationEmail } from '@/lib/mail';

await sendVerificationEmail(user.email, verificationToken);
```

## Email Templates

Professional HTML templates are located in `lib/mail/templates/`:

| Template | File |
|----------|------|
| Account Created | `account-created.ts` |
| Admin Notification | `admin-notification.ts` |
| Email Verification | `email-verification.ts` |
| Newsletter Regular | `newsletter-regular.ts` |
| Newsletter Welcome | `newsletter-welcome.ts` |
| Newsletter Unsubscribe | `newsletter-unsubscribe.ts` |
| Password Change Confirmation | `password-change-confirmation.ts` |
| Payment Success | `payment-success.ts` |
| Payment Failed | `payment-failed.ts` |
| Submission Decision | `submission-decision.ts` |
| Subscription Events | `subscription-events.ts` |
| Subscription Expired | `subscription-expired.ts` |
| Subscription Renewal Reminder | `subscription-renewal-reminder.ts` |

Each template is a function that accepts data and returns an object with `subject`, `html`, and `text` fields.

## Configuration via Git-Based CMS

The `mailService()` factory function reads mail configuration from the Git-based CMS config:

```ts
async function mailService() {
  const config = await getCachedConfig();
  return new EmailService({
    provider: config.mail?.provider || emailConfig.provider,
    defaultFrom: config.mail?.default_from || emailConfig.defaultFrom,
    domain: config.app_url || emailConfig.domain,
  });
}
```

This allows administrators to change the email provider, sender address, or Novu template through the CMS configuration without code changes.

## Related Files

| File | Description |
|------|-------------|
| `lib/mail/index.ts` | Core email service and exported helpers |
| `lib/mail/factory.ts` | Provider factory pattern |
| `lib/mail/resend.ts` | Resend provider |
| `lib/mail/novu.ts` | Novu provider |
| `lib/mail/mock.ts` | Mock provider for development |
| `lib/mail/templates/` | All HTML email templates |
| `lib/config/config-service.ts` | Email configuration source |
