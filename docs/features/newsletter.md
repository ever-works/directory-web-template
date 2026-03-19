---
id: newsletter
title: Newsletter System
sidebar_label: Newsletter
sidebar_position: 5
---

# Newsletter System

The Ever Works template includes a newsletter subscription system with email integration, multiple subscription sources, and admin statistics.

## Configuration

Located at `lib/newsletter/config.ts`, the newsletter system provides centralized configuration:

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### Email Provider Setup

The newsletter uses the same email provider as the notification system:

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

Configuration is resolved from the site config with fallbacks to environment variables:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Subscription Management

### Validation

Email addresses are validated and normalized using Zod schemas:

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

Emails are automatically lowercased and trimmed during validation.

### Subscription Sources

Each subscription records where the user signed up:

| Source | Location | Description |
|--------|----------|-------------|
| `footer` | Site footer | Always-visible subscription form |
| `popup` | Modal/popup | Triggered subscription prompt |
| `signup` | Registration | Opt-in during account creation |

### Statistics

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/newsletter` | Subscribe to newsletter |
| DELETE | `/api/newsletter` | Unsubscribe from newsletter |
| GET | `/api/newsletter/stats` | Get subscription statistics (admin) |

## Error Messages

The system provides consistent, user-friendly error messages:

| Code | Message |
|------|---------|
| `INVALID_EMAIL` | Please enter a valid email address |
| `ALREADY_SUBSCRIBED` | Email is already subscribed to the newsletter |
| `NOT_SUBSCRIBED` | Email is not subscribed to the newsletter |
| `SUBSCRIPTION_FAILED` | Failed to create subscription. Please try again. |

## Utility Functions

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
