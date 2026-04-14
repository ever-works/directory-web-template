---
id: newsletter-library
title: Biblioteca de boletins informativos
sidebar_label: Biblioteca de boletins informativos
sidebar_position: 35
---

# Biblioteca de boletins informativos

A biblioteca de boletins informativos fornece funções de configuração, validação e utilitários para gerenciar assinaturas de boletins informativos por e-mail. Ele se baseia no [Mail Factory](./mail-factory.md) para entrega de e-mail.

## Estrutura de arquivo

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## Configuração (`config.ts`)

### Constantes do boletim informativo

O objeto `NEWSLETTER_CONFIG` centraliza todas as constantes relacionadas ao boletim informativo:

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

### Esquemas de validação

Dois esquemas Zod tratam da validação de e-mail para operações de boletim informativo:

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

### Criação de configuração

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## Utilitários (`utils.ts`)

### Enviando e-mails com segurança

A função `sendEmailSafely` envolve o envio de e-mail com tratamento abrangente de erros:

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

### Validação de assinatura

Verifique se um e-mail pode ser inscrito ou cancelado:

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

A função `validateSubscriptionStatus` subjacente consulta o banco de dados:

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### Registro e monitoramento

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### Utilitários de modelo

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

### Respostas Padronizadas

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## Fluxo de Integração

Um fluxo típico de assinatura de boletim informativo:

1. **Validar entrada** usando `newsletterSubscriptionSchema`
2. **Verifique a elegibilidade** usando `canSubscribe`
3. **Criar registro de banco de dados** através do repositório de newsletter
4. **Enviar e-mail de boas-vindas** usando `sendEmailSafely`
5. **Registrar atividade** usando `logNewsletterActivity`
6. **Retornar resultado** usando `createSuccessResponse` ou `createErrorResponse`

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

## Arquivos relacionados

- `lib/newsletter/config.ts` - Configuração, tipos e esquemas de validação
- `lib/newsletter/utils.ts` - E-mail, validação, registro e utilitários de modelo
- `lib/mail/` - Fábrica e serviço de provedor de e-mail
- `lib/mail/templates/newsletter-*.ts` - Modelos de e-mail para boletins informativos
- `lib/db/queries.ts` - Consultas de banco de dados para registros de assinatura
