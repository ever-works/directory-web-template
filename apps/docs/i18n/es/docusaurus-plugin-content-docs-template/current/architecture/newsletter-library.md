---
id: newsletter-library
title: Biblioteca de boletines
sidebar_label: Biblioteca de boletines
sidebar_position: 35
---

# Biblioteca de boletines

La biblioteca de boletines proporciona funciones de configuración, validación y utilidades para gestionar las suscripciones a boletines por correo electrónico. Se basa en [Mail Factory](./mail-factory.md) para la entrega de correo electrónico.

## Estructura de archivos

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## Configuración (`config.ts`)

### Constantes del boletín

El objeto `NEWSLETTER_CONFIG` centraliza todas las constantes relacionadas con el boletín:

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

### Tipos

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

### Esquemas de validación

Dos esquemas de Zod manejan la validación del correo electrónico para las operaciones del boletín:

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

### Creación de configuración

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## Utilidades (`utils.ts`)

### Enviar correos electrónicos de forma segura

La función `sendEmailSafely` envuelve el envío de correo electrónico con un manejo integral de errores:

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

### Validación de suscripción

Compruebe si se puede suscribir o cancelar la suscripción de un correo electrónico:

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

La función subyacente `validateSubscriptionStatus` consulta la base de datos:

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### Registro y monitoreo

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### Utilidades de plantilla

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

### Respuestas estandarizadas

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## Flujo de integración

Un flujo típico de suscripción a un boletín informativo:

1. **Validar entrada** usando `newsletterSubscriptionSchema`
2. **Verifique la elegibilidad** usando `canSubscribe`
3. **Crear registro de base de datos** a través del repositorio de boletines
4. **Enviar correo electrónico de bienvenida** usando `sendEmailSafely`
5. **Registrar actividad** usando `logNewsletterActivity`
6. **Devolver resultado** usando `createSuccessResponse` o `createErrorResponse`

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

## Archivos relacionados

- `lib/newsletter/config.ts` - Configuración, tipos y esquemas de validación
- `lib/newsletter/utils.ts` - Utilidades de correo electrónico, validación, registro y plantillas
- `lib/mail/` - Fábrica y servicio de proveedores de correo electrónico
- `lib/mail/templates/newsletter-*.ts` - Plantillas de correo electrónico para boletines informativos
- `lib/db/queries.ts` - Consultas de bases de datos para registros de suscripción
