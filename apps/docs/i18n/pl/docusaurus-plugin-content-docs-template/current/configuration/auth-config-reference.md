---
id: auth-config-reference
title: Dokumentacja Konfiguracji Auth.js
sidebar_label: Dokumentacja Konfiguracji Auth
sidebar_position: 11
---

# Dokumentacja Konfiguracji Auth.js

Ta strona dokumentuje konfigurację NextAuth (Auth.js) zdefiniowaną w `auth.config.ts`. Ten plik konfiguruje dostawców uwierzytelniania, strategię sesji i obsługę błędów dla szablonu.

## Przegląd

Szablon obsługuje wiele strategii uwierzytelniania poprzez ujednoliconą konfigurację:

- **NextAuth (Auth.js)** -- Uwierzytelnianie oparte na OAuth i danych uwierzytelniających
- **Supabase Auth** -- Natywne uwierzytelnianie Supabase
- **Oba** -- Tryb podwójnego dostawcy dla maksymalnej elastyczności

Plik `auth.config.ts` konfiguruje konkretnie stronę NextAuth tego systemu.

## Plik Konfiguracyjny

Plik root `auth.config.ts` eksportuje obiekt `NextAuthConfig`:

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## Kluczowe Właściwości

### `trustHost`

Ustawione na `true`, aby ufać nagłówkowi hosta podczas działania za odwrotnym proxy (np. Vercel). Jest to wymagane do prawidłowego generowania adresów URL przekierowań w środowiskach produkcyjnych.

### `providers`

Tablica dostawców jest budowana dynamicznie na podstawie tego, którzy dostawcy OAuth mają skonfigurowane prawidłowe dane uwierzytelniające. Funkcja `configureProviders()`:

1. Wywołuje `configureOAuthProviders()` w celu walidacji zmiennych środowiskowych
2. Mapuje każdego włączonego dostawcę na jego konfigurację NextAuth
3. Zawsze dołącza dostawcę danych uwierzytelniających jako fallback

## Obsługiwani Dostawcy

| Dostawca | Wymagane Zmienne Środowiskowe | Uwagi |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Łączenie kont e-mail domyślnie wyłączone |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Standardowy przepływ OAuth |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Standardowy przepływ OAuth |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Przepływ OAuth 2.0 |
| Credentials | Brak (zawsze włączony) | Uwierzytelnianie e-mail/hasło |

## Architektura Dostawcy

Pipeline tworzenia dostawców obejmuje kilka plików współpracujących ze sobą.

### Factory Dostawcy (`lib/auth/providers.ts`)

Funkcja `createNextAuthProviders` mapuje obiekty konfiguracji na rzeczywiste instancje dostawców NextAuth:

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
```

### Obsługa Błędów Auth (`lib/auth/error-handler.ts`)

Procedura obsługi błędów auth waliduje zmienne środowiskowe i dostarcza czytelne komunikaty o błędach:

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## Łagodna Degradacja

Kluczową zasadą projektową jest łagodna degradacja. Jeśli konfiguracja OAuth zawiedzie podczas uruchamiania:

1. Błąd jest przechwytywany jako strukturyzowany `AppError` z typem `CONFIG` i kodem `OAUTH_CONFIG_FAILED`
2. Błąd jest rejestrowany z kontekstem `"Auth Config"`
3. System przełącza się na uwierzytelnianie tylko przez dane uwierzytelniające
4. Aplikacja kontynuuje normalne uruchamianie

Oznacza to, że błędnie skonfigurowany sekret OAuth Google nie uniemożliwi działania całej aplikacji -- użytkownicy nadal mogą logować się za pomocą e-maila i hasła.

## Częściowo Skonfigurowane Dostawcy

Gdy dostawca ma niektóre, ale nie wszystkie wymagane zmienne środowiskowe, rejestrowane jest ostrzeżenie:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Pomaga to zidentyfikować problemy z konfiguracją bez awarii aplikacji.

## Wymagane Zmienne Środowiskowe

Skonfiguruj co najmniej te zmienne, aby NextAuth działał:

```env
# Wymagane dla wszystkich konfiguracji NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opcjonalne: dodaj dane uwierzytelniające dostawcy, aby włączyć OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Wygeneruj `AUTH_SECRET` używając:

```bash
openssl rand -base64 32
```

## Powiązane Zasoby

- [Konfiguracja Dostawcy](/template/configuration/provider-config) -- Wybór między NextAuth, Supabase lub oboma
- [Dokumentacja Środowiska](/template/configuration/environment-reference) -- Pełna lista zmiennych środowiskowych
- [Wzorce Obsługi Błędów](/template/guides/error-handler-patterns) -- Jak są ustrukturyzowane błędy auth
