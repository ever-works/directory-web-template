---
id: newsletter
title: Sistema de boletines
sidebar_label: Hoja informativa
sidebar_position: 5
---

# Sistema de boletines

La plantilla Ever Works incluye un sistema de suscripción al boletín con integración de correo electrónico, múltiples fuentes de suscripción y estadísticas administrativas.

## Configuración

Ubicado en `lib/newsletter/config.ts` , el sistema de newsletter proporciona una configuración centralizada:

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

### Configuración del proveedor de correo electrónico

El boletín utiliza el mismo proveedor de correo electrónico que el sistema de notificación:

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

La configuración se resuelve desde la configuración del sitio con alternativas a las variables de entorno:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Gestión de suscripciones

### Validación

Las direcciones de correo electrónico se validan y normalizan utilizando esquemas Zod:

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

Los correos electrónicos se reducen y recortan automáticamente durante la validación.

### Fuentes de suscripción

Cada suscripción registra dónde se registró el usuario:

| Fuente | Ubicación | Descripción |
|--------|----------|-------------|
| `footer` | Pie de página del sitio | Formulario de suscripción siempre visible |
| `popup` | Modal/emergente | Aviso de suscripción activado |
| `signup` | Registro | Registrarse durante la creación de cuenta |

### Estadísticas

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## Puntos finales API

| Método | Punto final | Descripción |
|--------|----------|-------------|
| PUBLICAR | `/api/newsletter` | Suscríbete al boletín |
| BORRAR | `/api/newsletter` | Darse de baja del boletín |
| OBTENER | `/api/newsletter/stats` | Obtener estadísticas de suscripción (admin) |

## Mensajes de error

El sistema proporciona mensajes de error consistentes y fáciles de usar:

| Código | Mensaje |
|------|---------|
| `INVALID_EMAIL` | Por favor introduzca una dirección de correo electrónico válida |
| `ALREADY_SUBSCRIBED` | El correo electrónico ya está suscrito a la newsletter |
| `NOT_SUBSCRIBED` | El correo electrónico no está suscrito al boletín |
| `SUBSCRIPTION_FAILED` | No se pudo crear la suscripción. Por favor inténtalo de nuevo. |

## Funciones de utilidad

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
