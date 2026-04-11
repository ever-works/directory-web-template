---
id: newsletter
title: System biuletynów
sidebar_label: Biuletyn
sidebar_position: 5
---

# System biuletynów

Szablon Ever Works zawiera system subskrypcji biuletynów z integracją poczty e-mail, wieloma źródłami subskrypcji i statystykami administracyjnymi.

## Konfiguracja

Zlokalizowany pod adresem `lib/newsletter/config.ts` system biuletynów zapewnia scentralizowaną konfigurację:

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

### Konfiguracja dostawcy poczty e-mail

Newsletter korzysta z tego samego dostawcy poczty e-mail, co system powiadomień:

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

Konfiguracja jest rozwiązywana na podstawie konfiguracji witryny z rezerwami na zmienne środowiskowe:

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## Zarządzanie subskrypcjami

### Walidacja

Adresy e-mail są sprawdzane i normalizowane przy użyciu schematów Zod:

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

Podczas sprawdzania poprawności wiadomości e-mail są automatycznie pisane małymi literami i przycinane.

### Źródła subskrypcji

Każda subskrypcja rejestruje, gdzie użytkownik się zarejestrował:

| Źródło | Lokalizacja | Opis |
|--------|----------|------------|
| `footer` | Stopka witryny | Zawsze widoczny formularz subskrypcji |
| `popup` | Modalne/wyskakujące | Wywołany monit o subskrypcję |
| `signup` | Rejestracja | Zapisz się podczas tworzenia konta |

### Statystyki

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## Punkty końcowe interfejsu API

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| POST | `/api/newsletter` | Zapisz się do newslettera |
| USUŃ | `/api/newsletter` | Wypisz się z newslettera |
| OTRZYMAJ | `/api/newsletter/stats` | Uzyskaj statystyki subskrypcji (administrator) |

## Komunikaty o błędach

System dostarcza spójne, przyjazne dla użytkownika komunikaty o błędach:

| Kod | Wiadomość |
|------|-------------|
| `INVALID_EMAIL` | Proszę podać poprawny adres e-mail |
| `ALREADY_SUBSCRIBED` | Email jest już zapisany do newslettera |
| `NOT_SUBSCRIBED` | E-mail nie jest zapisany do newslettera |
| `SUBSCRIPTION_FAILED` | Nie udało się utworzyć subskrypcji. Spróbuj ponownie. |

## Funkcje użytkowe

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
