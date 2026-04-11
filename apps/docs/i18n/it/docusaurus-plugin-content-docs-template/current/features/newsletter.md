---
id: newsletter
title: Sistema di newsletter
sidebar_label: Notiziario
sidebar_position: 5
---

# Sistema di newsletter

Il modello Ever Works include un sistema di iscrizione alla newsletter con integrazione e-mail, più origini di iscrizione e statistiche di amministrazione.

##Configurazione

Situato a `lib/newsletter/config.ts` , il sistema di newsletter fornisce una configurazione centralizzata:

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

### Configurazione del provider di posta elettronica

La newsletter utilizza lo stesso provider di posta elettronica del sistema di notifica:

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

La configurazione viene risolta dalla configurazione del sito con fallback alle variabili di ambiente:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Gestione degli abbonamenti

### Convalida

Gli indirizzi email vengono convalidati e normalizzati utilizzando gli schemi Zod:

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

Le email vengono automaticamente minuscole e tagliate durante la convalida.

### Origini dell'abbonamento

Ogni abbonamento registra dove l'utente si è registrato:

| Fonte | Posizione | Descrizione |
|--------|----------|-------------|
| `footer` | Piè di pagina del sito | Modulo di iscrizione sempre visibile |
| `popup` | Modale/popup | Richiesta di iscrizione attivata |
| `signup` | Registrazione | Attivazione durante la creazione dell'account |

### Statistiche

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## Endpoint API

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| POST | `/api/newsletter` | Iscriviti alla newsletter |
| ELIMINA | `/api/newsletter` | Cancellati dalla newsletter |
| OTTIENI | `/api/newsletter/stats` | Ottieni statistiche sugli abbonamenti (amministratore) |

## Messaggi di errore

Il sistema fornisce messaggi di errore coerenti e intuitivi:

| Codice | Messaggio |
|------|---------|
| `INVALID_EMAIL` | Inserisci un indirizzo email valido |
| `ALREADY_SUBSCRIBED` | L'email è già iscritta alla newsletter |
| `NOT_SUBSCRIBED` | L'email non è iscritta alla newsletter |
| `SUBSCRIPTION_FAILED` | Impossibile creare l'abbonamento. Per favore riprova. |

## Funzioni di utilità

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
