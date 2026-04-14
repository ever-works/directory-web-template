---
id: newsletter-library
title: Biblioteka biuletynów
sidebar_label: Biblioteka biuletynów
sidebar_position: 35
---

# Biblioteka biuletynów

Biblioteka biuletynów zapewnia konfigurację, weryfikację i funkcje narzędziowe do zarządzania subskrypcjami biuletynów e-mailowych. Opiera się na [Mail Factory](./mail-factory.md) do dostarczania wiadomości e-mail.

## Struktura pliku

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## Konfiguracja (`config.ts`)

### Stałe biuletynu

Obiekt `NEWSLETTER_CONFIG` centralizuje wszystkie stałe związane z newsletterem:

```ts
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

### Typy

```ts
// Source of the subscription action
type NewsletterSource = "footer" | "popup" | "signup";

// Email provider configuration
interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: { resend: string; novu: string };
  novu?: { templateId?: string; backendUrl?: string };
}

// Action result for subscribe/unsubscribe operations
interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

// Newsletter statistics
interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}
```

### Schematy walidacji

Dwa schematy Zoda obsługują weryfikację poczty e-mail dla operacji biuletynu:

```ts
import { z } from "zod";

// Basic email validation
export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

// Full subscription schema with source tracking
export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum(["footer", "popup", "signup"])
    .default("footer"),
});
```

### Tworzenie konfiguracji

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## Narzędzia (`utils.ts`)

### Bezpieczne wysyłanie e-maili

Funkcja `sendEmailSafely` obejmuje wysyłanie wiadomości e-mail kompleksową obsługą błędów:

```ts
import { sendEmailSafely, createEmailService } from '@/lib/newsletter/utils';

const { service, config } = await createEmailService();

const result = await sendEmailSafely(
  service,
  config,
  { subject: "Welcome!", html: "<p>Hi</p>", text: "Hi" },
  "user@example.com",
  "welcome"
);

if (result.success) {
  // Email sent
} else {
  console.log(result.error);
}
```

### Weryfikacja subskrypcji

Sprawdź, czy e-mail można subskrybować lub anulować subskrypcję:

```ts
import { canSubscribe, canUnsubscribe } from '@/lib/newsletter/utils';

// Check if email is not already active
const subCheck = await canSubscribe("user@example.com");
if (!subCheck.canSubscribe) {
  console.log(subCheck.error); // "Email is already subscribed..."
}

// Check if email is currently active
const unsubCheck = await canUnsubscribe("user@example.com");
if (!unsubCheck.canUnsubscribe) {
  console.log(unsubCheck.error); // "Email is not subscribed..."
}
```

Podstawowa funkcja `validateSubscriptionStatus` wysyła zapytanie do bazy danych:

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### Rejestrowanie i monitorowanie

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### Narzędzia szablonów

```ts
import { getTemplateWithCompany } from '@/lib/newsletter/utils';

// Automatically injects the company name into a template function
const template = await getTemplateWithCompany(
  (email, companyName) => ({
    subject: `Welcome to ${companyName}`,
    html: `<p>Thanks for subscribing, ${email}!</p>`,
    text: `Thanks for subscribing, ${email}!`,
  }),
  "user@example.com"
);
```

### Standaryzowane odpowiedzi

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## Przepływ integracji

Typowy przebieg subskrypcji biuletynu:

1. **Sprawdź wprowadzone dane** za pomocą `newsletterSubscriptionSchema`
2. **Sprawdź, czy się kwalifikujesz**, używając `canSubscribe`
3. **Utwórz rekord bazy danych** poprzez repozytorium biuletynów
4. **Wyślij e-mail powitalny**, używając `sendEmailSafely`
5. **Rejestracja aktywności** za pomocą `logNewsletterActivity`
6. **Zwróć wynik**, używając `createSuccessResponse` lub `createErrorResponse`

```ts
// Simplified server action example
async function subscribeToNewsletter(formData: FormData) {
  const parsed = newsletterSubscriptionSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source'),
  });
  if (!parsed.success) {
    return createErrorResponse(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL);
  }

  const { email, source } = parsed.data;
  const eligibility = await canSubscribe(email);
  if (!eligibility.canSubscribe) {
    return createErrorResponse(eligibility.error || "Cannot subscribe");
  }

  // Create subscription in database...
  // Send welcome email...

  logNewsletterActivity("subscribe", email, source);
  return createSuccessResponse(email, "subscribe");
}
```

## Powiązane pliki

- `lib/newsletter/config.ts` - Konfiguracja, typy i schematy walidacji
- `lib/newsletter/utils.ts` — narzędzia poczty e-mail, sprawdzania poprawności, rejestrowania i szablonów
- `lib/mail/` - Fabryka i serwis dostawców poczty e-mail
- `lib/mail/templates/newsletter-*.ts` - Szablony e-maili z biuletynami
- `lib/db/queries.ts` - Zapytania do bazy danych o zapisy abonamentowe
