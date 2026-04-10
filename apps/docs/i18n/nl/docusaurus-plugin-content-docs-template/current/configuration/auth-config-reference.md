---
id: auth-config-reference
title: Auth.js Configuratiereferentie
sidebar_label: Auth Configuratiereferentie
sidebar_position: 11
---

# Auth.js Configuratiereferentie

Deze pagina documenteert de NextAuth (Auth.js)-configuratie gedefinieerd in `auth.config.ts`. Dit bestand stelt authenticatieproviders, sessiestrategie en foutafhandeling in voor het template.

## Overzicht

Het template ondersteunt meerdere authenticatiestrategieën via een uniforme configuratie:

- **NextAuth (Auth.js)** -- OAuth- en op referenties gebaseerde authenticatie
- **Supabase Auth** -- Supabase-native authenticatie
- **Beide** -- Dual-provider modus voor maximale flexibiliteit

Het bestand `auth.config.ts` configureert specifiek de NextAuth-kant van dit systeem.

## Configuratiebestand

Het root-bestand `auth.config.ts` exporteert een `NextAuthConfig`-object:

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

## Belangrijkste Eigenschappen

### `trustHost`

Ingesteld op `true` om de host-header te vertrouwen bij gebruik achter een reverse proxy (zoals Vercel). Dit is vereist voor correcte redirect-URL-generatie in productieomgevingen.

### `providers`

De providers-array wordt dynamisch opgebouwd op basis van welke OAuth-providers geldige geconfigureerde referenties hebben. De functie `configureProviders()`:

1. Roept `configureOAuthProviders()` aan om omgevingsvariabelen te valideren
2. Koppelt elke ingeschakelde provider aan zijn NextAuth-providerconfiguratie
3. Bevat altijd de credentials-provider als fallback

## Ondersteunde Providers

| Provider | Vereiste Omgevingsvariabelen | Opmerkingen |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | E-mailkoppelingen standaard uitgeschakeld |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Standaard OAuth-flow |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Standaard OAuth-flow |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | OAuth 2.0-flow |
| Credentials | Geen (altijd ingeschakeld) | E-mail/wachtwoord-authenticatie |

## Provider Architectuur

De provider-aanmakpijplijn omvat meerdere bestanden die samenwerken.

### Provider Factory (`lib/auth/providers.ts`)

De functie `createNextAuthProviders` koppelt configuratieobjecten aan eigenlijke NextAuth-providerinstanties:

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

### Auth Foutafhandelaar (`lib/auth/error-handler.ts`)

De auth-foutafhandelaar valideert omgevingsvariabelen en geeft begrijpelijke foutmeldingen:

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

## Graceful Degradation

Een belangrijk ontwerpprincipe is graceful degradation. Als de OAuth-configuratie bij het opstarten mislukt:

1. De fout wordt vastgelegd als een gestructureerde `AppError` met type `CONFIG` en code `OAUTH_CONFIG_FAILED`
2. De fout wordt gelogd met de context `"Auth Config"`
3. Het systeem valt terug op uitsluitend credentials-authenticatie
4. De applicatie blijft normaal starten

Dit betekent dat een verkeerd geconfigureerd Google OAuth-secret niet voorkomt dat de hele applicatie wordt uitgevoerd -- gebruikers kunnen nog steeds inloggen met e-mail en wachtwoord.

## Gedeeltelijk Geconfigureerde Providers

Wanneer een provider slechts enkele van de vereiste omgevingsvariabelen heeft, wordt een waarschuwing gelogd:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Dit helpt configuratieproblemen te identificeren zonder de applicatie te laten crashen.

## Vereiste Omgevingsvariabelen

Configureer minimaal deze variabelen om NextAuth te laten functioneren:

```env
# Vereist voor alle NextAuth-configuraties
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optioneel: voeg providercredentials toe om OAuth in te schakelen
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Genereer `AUTH_SECRET` met:

```bash
openssl rand -base64 32
```

## Gerelateerde Bronnen

- [Providerconfiguratie](/template/configuration/provider-config) -- Kiezen tussen NextAuth, Supabase of beide
- [Omgevingsreferentie](/template/configuration/environment-reference) -- Volledige lijst met omgevingsvariabelen
- [Foutafhandelingspatronen](/template/guides/error-handler-patterns) -- Hoe auth-fouten zijn gestructureerd
