---
id: newsletter
title: Newsletter-System
sidebar_label: Newsletter
sidebar_position: 5
---

# Newsletter-System

Die Ever Works-Vorlage umfasst ein Newsletter-Abonnementsystem mit E-Mail-Integration, mehrere Abonnementquellen und Administratorstatistiken.

## Konfiguration

Das Newsletter-System befindet sich bei `lib/newsletter/config.ts` und bietet eine zentrale Konfiguration:

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

### Einrichtung des E-Mail-Anbieters

Der Newsletter nutzt denselben E-Mail-Anbieter wie das Benachrichtigungssystem:

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

Die Konfiguration wird aus der Site-Konfiguration mit Fallbacks auf Umgebungsvariablen aufgelöst:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Abonnementverwaltung

### Validierung

E-Mail-Adressen werden mithilfe von Zod-Schemas validiert und normalisiert:

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

E-Mails werden bei der Validierung automatisch in Kleinbuchstaben geschrieben und gekürzt.

### Abonnementquellen

Bei jedem Abonnement wird aufgezeichnet, wo sich der Benutzer angemeldet hat:

| Quelle | Standort | Beschreibung |
|--------|----------|-------------|
| `footer` | Site-Fußzeile | Immer sichtbares Anmeldeformular |
| `popup` | Modal/Popup | Ausgelöste Abonnementaufforderung |
| `signup` | Registrierung | Opt-in bei der Kontoerstellung |

### Statistik

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| POST | `/api/newsletter` | Newsletter abonnieren |
| LÖSCHEN | `/api/newsletter` | Newsletter abbestellen |
| GET | `/api/newsletter/stats` | Abonnementstatistiken abrufen (admin) |

## Fehlermeldungen

Das System liefert konsistente, benutzerfreundliche Fehlermeldungen:

| Code | Nachricht |
|------|---------|
| `INVALID_EMAIL` | Bitte geben Sie eine gültige E-Mail-Adresse ein |
| `ALREADY_SUBSCRIBED` | E-Mail ist bereits für den Newsletter abonniert |
| `NOT_SUBSCRIBED` | E-Mail ist nicht für den Newsletter angemeldet |
| `SUBSCRIPTION_FAILED` | Das Abonnement konnte nicht erstellt werden. Bitte versuchen Sie es erneut. |

## Utility-Funktionen

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
