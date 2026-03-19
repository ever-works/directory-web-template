---
id: newsletter-endpoints
title: Newsletter Server Actions
sidebar_label: Newsletter
sidebar_position: 26
---

# Newsletter Server Actions

The newsletter system uses Next.js Server Actions rather than traditional API route handlers. These actions manage email subscriptions including subscribing, unsubscribing, and retrieving statistics. Email notifications are sent for both subscribe and unsubscribe events using configurable email providers.

## Overview

| Action | Auth | Description |
|---|---|---|
| `subscribeToNewsletter` | Public | Subscribe an email to the newsletter |
| `unsubscribeFromNewsletter` | Public | Unsubscribe an email from the newsletter |
| `getNewsletterStatistics` | None | Get subscription statistics |

These are Server Actions defined with `'use server'` and invoked from React components via form submissions or direct calls, not via HTTP endpoints.

## Server Actions

### Subscribe to Newsletter

```typescript
subscribeToNewsletter(data: { email: string })
```

Subscribes an email address to the newsletter. Validates the email using Zod, checks for duplicate active subscriptions, creates the database record, and sends a welcome email. The email is automatically normalized to lowercase and trimmed.

**Input Validation (Zod):**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email format |

**Success Response:**

```json
{
  "success": true
}
```

**Error Responses:**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

| Error | Condition |
|---|---|
| `"Please enter a valid email address"` | Invalid email format (Zod validation) |
| `"Email is already subscribed to the newsletter"` | Active subscription already exists |
| `"Failed to create subscription. Please try again."` | Database insert failed |
| `"Failed to subscribe to newsletter. Please try again."` | Unexpected error |

**Processing Steps:**

1. Validate and normalize email (lowercase, trim)
2. Check for existing active subscription via `getNewsletterSubscriptionByEmail`
3. Create subscription record with source `"footer"` via `createNewsletterSubscription`
4. Send welcome email using the configured email provider (Resend or Novu)

Email send failures are caught silently and do not prevent the subscription from succeeding.

**Source:** `template/app/[locale]/newsletter/actions.ts`

### Unsubscribe from Newsletter

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

Unsubscribes an email from the newsletter by setting `isActive` to `false`. Sends an unsubscribe confirmation email.

**Success Response:**

```json
{
  "success": true
}
```

**Error Responses:**

| Error | Condition |
|---|---|
| `"Email is not subscribed to the newsletter"` | No active subscription found |
| `"Failed to unsubscribe. Please try again."` | Database update failed |

**Source:** `template/app/[locale]/newsletter/actions.ts`

### Get Newsletter Statistics

```typescript
getNewsletterStatistics()
```

Returns aggregate newsletter statistics. No input parameters required.

**Success Response:**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

| Field | Type | Description |
|---|---|---|
| `totalActive` | integer | Number of currently active subscriptions |
| `recentSubscriptions` | integer | Subscriptions created in the last 30 days |

Returns zeros for both fields if the query fails, ensuring graceful degradation.

**Source:** `template/app/[locale]/newsletter/actions.ts`

## Database Queries

The newsletter subscription data is managed through dedicated query functions in `lib/db/queries/newsletter.queries.ts`.

### Subscription Operations

| Function | Description |
|---|---|
| `createNewsletterSubscription(email, source)` | Creates a new subscription record |
| `getNewsletterSubscriptionByEmail(email)` | Looks up a subscription by email |
| `updateNewsletterSubscription(email, updates)` | Updates subscription fields |
| `unsubscribeFromNewsletter(email)` | Sets `isActive: false` and records `unsubscribedAt` |
| `resubscribeToNewsletter(email)` | Sets `isActive: true` and clears `unsubscribedAt` |
| `getNewsletterStats()` | Returns active count and 30-day subscription count |

All email lookups normalize the input to lowercase and trim whitespace before querying.

**Source:** `template/lib/db/queries/newsletter.queries.ts`

## Configuration

Newsletter configuration constants are defined in `lib/newsletter/config.ts`:

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### Subscription Sources

| Source | Description |
|---|---|
| `footer` | Subscription from the site footer form |
| `popup` | Subscription from a popup dialog |
| `signup` | Subscription during user registration |

### Validation Schemas

Two Zod schemas are exported for validation:

- **`emailSchema`** -- validates and normalizes a single email field
- **`newsletterSubscriptionSchema`** -- validates email and source (defaults to `"footer"`)

### Email Providers

The system supports two email providers configured via `config.yml` and environment variables:

| Provider | Environment Variable | Description |
|---|---|---|
| Resend | `RESEND_API_KEY` | Default email provider |
| Novu | `NOVU_API_KEY` | Alternative provider with template support |

The provider is selected based on the `mail.provider` field in `config.yml`. Email configuration is built dynamically from the app config using `createEmailConfig()`.

**Source:** `template/lib/newsletter/config.ts`

## Key Implementation Details

- **Server Actions:** These are not REST API endpoints. They use the `validatedAction` wrapper from `lib/auth/middleware` which provides Zod schema validation before the action executes.
- **Email Normalization:** All emails are normalized to lowercase and trimmed at both the action level and the database query level for consistent lookups.
- **Graceful Email Failures:** Welcome and unsubscribe confirmation emails are sent via `sendEmailSafely()`, which catches errors silently. A failed email does not prevent the subscription operation from completing.
- **Duplicate Prevention:** Before creating a subscription, the system checks for an existing active subscription using `validateExistingSubscription()`.
- **Soft Unsubscribe:** Unsubscribing sets `isActive: false` rather than deleting the record, preserving the subscription history.
