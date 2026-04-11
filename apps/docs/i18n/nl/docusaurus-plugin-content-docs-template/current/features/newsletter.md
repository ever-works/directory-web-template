---
id: newsletter
title: Nieuwsbriefsysteem
sidebar_label: Nieuwsbrief
sidebar_position: 5
---

# Nieuwsbriefsysteem

De Ever Works-sjabloon bevat een nieuwsbriefabonnementssysteem met e-mailintegratie, meerdere abonnementsbronnen en beheerdersstatistieken.

## Configuratie

Het nieuwsbriefsysteem, gelegen op `lib/newsletter/config.ts` , biedt gecentraliseerde configuratie:

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

### E-mailprovider instellen

De nieuwsbrief gebruikt dezelfde e-mailprovider als het notificatiesysteem:

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

De configuratie wordt opgelost vanuit de siteconfiguratie met terugval naar omgevingsvariabelen:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Abonnementsbeheer

### Validatie

E-mailadressen worden gevalideerd en genormaliseerd met behulp van Zod-schema's:

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

E-mails worden tijdens de validatie automatisch in kleine letters weergegeven en ingekort.

### Abonnementsbronnen

Bij elk abonnement wordt vastgelegd waar de gebruiker zich heeft aangemeld:

| Bron | Locatie | Beschrijving |
|--------|----------|------------|
| `footer` | Voettekst van site | Altijd zichtbaar abonnementsformulier |
| `popup` | Modaal/pop-up | Geactiveerde abonnementsprompt |
| `signup` | Registratie | Opt-in tijdens het aanmaken van een account |

### Statistieken

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## API-eindpunten

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| POST | `/api/newsletter` | Abonneer u op nieuwsbrief |
| VERWIJDEREN | `/api/newsletter` | Afmelden nieuwsbrief |
| KRIJG | `/api/newsletter/stats` | Abonnementsstatistieken opvragen (admin) |

## Foutmeldingen

Het systeem biedt consistente, gebruiksvriendelijke foutmeldingen:

| Code | Bericht |
|------|---------|
| `INVALID_EMAIL` | Voer een geldig e-mailadres in |
| `ALREADY_SUBSCRIBED` | E-mail is al geabonneerd op de nieuwsbrief |
| `NOT_SUBSCRIBED` | E-mail is niet geabonneerd op de nieuwsbrief |
| `SUBSCRIPTION_FAILED` | Kan abonnement niet maken. Probeer het opnieuw. |

## Hulpprogramma's

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
