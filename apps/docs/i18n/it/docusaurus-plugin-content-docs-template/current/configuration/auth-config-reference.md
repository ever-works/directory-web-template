---
id: auth-config-reference
title: Riferimento Configurazione Auth.js
sidebar_label: Riferimento Configurazione Auth
sidebar_position: 11
---

# Riferimento Configurazione Auth.js

Questa pagina documenta la configurazione NextAuth (Auth.js) definita in `auth.config.ts`. Questo file configura i provider di autenticazione, la strategia di sessione e la gestione degli errori per il template.

## Panoramica

Il template supporta più strategie di autenticazione tramite una configurazione unificata:

- **NextAuth (Auth.js)** -- Autenticazione basata su OAuth e credenziali
- **Supabase Auth** -- Autenticazione nativa di Supabase
- **Entrambi** -- Modalità dual-provider per la massima flessibilità

Il file `auth.config.ts` configura specificamente il lato NextAuth di questo sistema.

## File di Configurazione

Il file root `auth.config.ts` esporta un oggetto `NextAuthConfig`:

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

## Proprietà Principali

### `trustHost`

Impostato su `true` per fidarsi dell'intestazione host quando si esegue dietro un reverse proxy (come Vercel). Questo è necessario per la corretta generazione degli URL di reindirizzamento negli ambienti di produzione.

### `providers`

L'array dei provider viene costruito dinamicamente in base a quali provider OAuth hanno credenziali configurate valide. La funzione `configureProviders()`:

1. Chiama `configureOAuthProviders()` per validare le variabili d'ambiente
2. Mappa ogni provider abilitato alla sua configurazione di provider NextAuth
3. Include sempre il provider di credenziali come fallback

## Provider Supportati

| Provider | Variabili d'Ambiente Richieste | Note |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Collegamento account e-mail disabilitato per impostazione predefinita |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Flusso OAuth standard |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Flusso OAuth standard |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Flusso OAuth 2.0 |
| Credentials | Nessuna (sempre abilitato) | Autenticazione e-mail/password |

## Architettura del Provider

La pipeline di creazione del provider coinvolge diversi file che lavorano insieme.

### Factory del Provider (`lib/auth/providers.ts`)

La funzione `createNextAuthProviders` mappa gli oggetti di configurazione alle istanze effettive del provider NextAuth:

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

### Gestore degli Errori Auth (`lib/auth/error-handler.ts`)

Il gestore degli errori auth valida le variabili d'ambiente e fornisce messaggi di errore comprensibili:

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

## Degradazione Controllata

Un principio di progettazione fondamentale è la degradazione controllata. Se la configurazione OAuth fallisce all'avvio:

1. L'errore viene catturato come `AppError` strutturato con tipo `CONFIG` e codice `OAUTH_CONFIG_FAILED`
2. L'errore viene registrato con il contesto `"Auth Config"`
3. Il sistema ricade sull'autenticazione solo tramite credenziali
4. L'applicazione continua ad avviarsi normalmente

Ciò significa che un segreto OAuth di Google mal configurato non impedirà all'intera applicazione di funzionare -- gli utenti possono ancora accedere con e-mail e password.

## Provider Parzialmente Configurati

Quando un provider ha alcune ma non tutte le variabili d'ambiente richieste, viene registrato un avviso:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Questo aiuta a identificare problemi di configurazione senza far crashare l'applicazione.

## Variabili d'Ambiente Richieste

Configura almeno queste variabili per far funzionare NextAuth:

```env
# Richiesto per tutte le configurazioni NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opzionale: aggiungi credenziali del provider per abilitare OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Genera `AUTH_SECRET` usando:

```bash
openssl rand -base64 32
```

## Risorse Correlate

- [Configurazione del Provider](/template/configuration/provider-config) -- Scelta tra NextAuth, Supabase o entrambi
- [Riferimento Ambiente](/template/configuration/environment-reference) -- Elenco completo delle variabili d'ambiente
- [Pattern di Gestione degli Errori](/template/guides/error-handler-patterns) -- Come sono strutturati gli errori auth
