---
id: newsletter-service
title: Newsletter Service
sidebar_label: Newsletter Service
sidebar_position: 33
---

# Newsletter Service

The newsletter system handles subscriber management, email delivery, and analytics tracking. It is built around a configuration module, database queries, utility helpers, and email template integration.

## Architecture Overview

The newsletter functionality spans several modules:

| Module | Path | Purpose |
|--------|------|---------|
| Config | `lib/newsletter/config.ts` | Constants, types, Zod schemas, email config factory |
| Utilities | `lib/newsletter/utils.ts` | Email sending, subscription validation, logging |
| Queries | `lib/db/queries/newsletter.queries.ts` | Database CRUD for subscriptions |
| Templates | `lib/mail/templates/newsletter-*.ts` | Welcome, regular, and unsubscribe email templates |

## Configuration

All newsletter constants live in `NEWSLETTER_CONFIG`:

```ts
// lib/newsletter/config.ts
export const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",
    POPUP: "popup",
    SIGNUP: "signup",
  } as const,

  ERRORS: {
    INVALID_EMAIL: "Please enter a valid email address",
    ALREADY_SUBSCRIBED: "Email is already subscribed to the newsletter",
    NOT_SUBSCRIBED: "Email is not subscribed to the newsletter",
    SUBSCRIPTION_FAILED: "Failed to create subscription. Please try again.",
    UNSUBSCRIPTION_FAILED: "Failed to unsubscribe. Please try again.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
    STATS_FAILED: "Failed to get newsletter statistics",
  } as const,

  SUCCESS: {
    SUBSCRIBED: "Successfully subscribed to newsletter",
    UNSUBSCRIBED: "Successfully unsubscribed from newsletter",
  } as const,
} as const;
```

### Types

```ts
export type NewsletterSource =
  typeof NEWSLETTER_CONFIG.SOURCES[keyof typeof NEWSLETTER_CONFIG.SOURCES];

export interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: {
    resend: string;
    novu: string;
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}

export interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

export interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}
```

## Validation Schemas

The module uses Zod for input validation:

```ts
import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum([
      NEWSLETTER_CONFIG.SOURCES.FOOTER,
      NEWSLETTER_CONFIG.SOURCES.POPUP,
      NEWSLETTER_CONFIG.SOURCES.SIGNUP,
    ])
    .default(NEWSLETTER_CONFIG.SOURCES.FOOTER),
});
```

## Email Config Factory

The `createEmailConfig` function builds email service configuration from the app config, with support for both Resend and Novu providers:

```ts
export const createEmailConfig = async (): Promise<EmailConfig> => {
  const config = await getCachedConfig();
  return {
    provider: config.mail?.provider || NEWSLETTER_CONFIG.DEFAULT_PROVIDER,
    defaultFrom: config.mail?.default_from || NEWSLETTER_CONFIG.DEFAULT_FROM,
    domain: config.app_url || coreConfig.APP_URL || "",
    apiKeys: {
      resend: globalEmailConfig.resend.apiKey || "",
      novu: globalEmailConfig.novu.apiKey || "",
    },
    novu: config.mail?.provider === "novu"
      ? {
          templateId: config.mail?.template_id,
          backendUrl: config.mail?.backend_url,
        }
      : undefined,
  };
};
```

## Database Queries

All newsletter queries live in `lib/db/queries/newsletter.queries.ts`. Emails are always normalized to lowercase and trimmed before storage.

### Create Subscription

```ts
export async function createNewsletterSubscription(
  email: string,
  source: string = 'footer'
): Promise<NewsletterSubscription | null> {
  const newSubscription: NewNewsletterSubscription = {
    email: normalizeEmail(email),
    source
  };
  const result = await db
    .insert(newsletterSubscriptions)
    .values(newSubscription)
    .returning();
  return result[0] || null;
}
```

### Look Up Subscription

```ts
export async function getNewsletterSubscriptionByEmail(email: string) {
  const subscriptions = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.email, normalizeEmail(email)))
    .limit(1);
  return subscriptions[0] || null;
}
```

### Unsubscribe and Resubscribe

```ts
export async function unsubscribeFromNewsletter(email: string) {
  const result = await db
    .update(newsletterSubscriptions)
    .set({ isActive: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriptions.email, normalizeEmail(email)))
    .returning();
  return result[0] || null;
}

export async function resubscribeToNewsletter(email: string) {
  const result = await db
    .update(newsletterSubscriptions)
    .set({ isActive: true, unsubscribedAt: null })
    .where(eq(newsletterSubscriptions.email, normalizeEmail(email)))
    .returning();
  return result[0] || null;
}
```

### Statistics

```ts
export async function getNewsletterStats() {
  const totalSubscriptions = await db
    .select({ count: sql`count(*)` })
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.isActive, true));

  const recentSubscriptions = await db
    .select({ count: sql`count(*)` })
    .from(newsletterSubscriptions)
    .where(
      sql`${newsletterSubscriptions.subscribedAt} >= NOW() - INTERVAL '30 days'`
    );

  return {
    totalActive: totalSubscriptions[0]?.count || 0,
    recentSubscriptions: recentSubscriptions[0]?.count || 0,
  };
}
```

## Utility Helpers

### Safe Email Sending

The `sendEmailSafely` wrapper provides comprehensive error handling:

```ts
export const sendEmailSafely = async (
  emailService: EmailService,
  emailConfig: EmailConfig,
  template: { subject: string; html: string; text: string },
  to: string,
  context: string = "newsletter"
): Promise<{ success: boolean; error?: string }> => {
  try {
    await emailService.sendCustomEmail({
      from: emailConfig.defaultFrom,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to send ${context} email: ${errorMessage}`,
    };
  }
};
```

### Subscription Validation

Before subscribing or unsubscribing, validate the current state:

```ts
export const canSubscribe = async (
  email: string
): Promise<{ canSubscribe: boolean; error?: string }> => {
  const validation = await validateSubscriptionStatus(email, false);
  return { canSubscribe: validation.isValid, error: validation.error };
};

export const canUnsubscribe = async (
  email: string
): Promise<{ canUnsubscribe: boolean; error?: string }> => {
  const validation = await validateSubscriptionStatus(email, true);
  return { canUnsubscribe: validation.isValid, error: validation.error };
};
```

### Activity Logging

Newsletter actions are logged for monitoring purposes:

```ts
export const logNewsletterActivity = (
  action: "subscribe" | "unsubscribe" | "email_sent" | "email_failed",
  email: string,
  source: NewsletterSource = "footer",
  details?: Record<string, any>
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    action,
    email,
    source,
    ...details,
  };
  console.log("Newsletter Activity:", logData);
};
```

## Database Schema

The `newsletterSubscriptions` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` (UUID) | Primary key |
| `email` | `text` | Unique subscriber email |
| `is_active` | `boolean` | Whether subscription is active (default `true`) |
| `subscribed_at` | `timestamp` | When the subscription was created |
| `unsubscribed_at` | `timestamp` | When the user unsubscribed (nullable) |
| `last_email_sent` | `timestamp` | Timestamp of last email sent |
| `source` | `text` | Subscription source: `footer`, `popup`, or `signup` |

## Subscription Flow

1. User enters email in footer, popup, or signup form
2. Email is validated via `newsletterSubscriptionSchema`
3. `canSubscribe()` checks if email is not already active
4. `createNewsletterSubscription()` inserts the record
5. Welcome email is sent via `sendEmailSafely()`
6. Activity is logged via `logNewsletterActivity()`

## Provider Support

The newsletter system supports two email providers:

- **Resend** (default) -- uses the Resend API key from environment variables
- **Novu** -- configured with a template ID and backend URL

The provider is determined from the app config `mail.provider` field and falls back to `resend`.

## Related Documentation

- [Mail System](/docs/template/services/mail-system) -- Email service integration
- [Mail Providers](/docs/template/services/mail-providers) -- Provider configuration
- [Newsletter Feature](/docs/template/features/newsletter) -- UI components
