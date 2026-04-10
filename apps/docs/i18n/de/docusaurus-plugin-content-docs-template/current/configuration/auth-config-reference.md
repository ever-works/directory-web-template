---
id: auth-config-reference
title: Auth.js Konfigurationsreferenz
sidebar_label: Auth-Konfigurationsreferenz
sidebar_position: 11
---

# Auth.js Konfigurationsreferenz

Diese Seite dokumentiert die NextAuth (Auth.js)-Konfiguration, die in `auth.config.ts` definiert ist. Diese Datei richtet Authentifizierungsanbieter, Sitzungsstrategie und Fehlerbehandlung für das Template ein.

## Übersicht

Das Template unterstützt mehrere Authentifizierungsstrategien über eine einheitliche Konfiguration:

- **NextAuth (Auth.js)** -- OAuth- und anmeldedatenbasierte Authentifizierung
- **Supabase Auth** -- Supabase-native Authentifizierung
- **Beide** -- Dual-Anbieter-Modus für maximale Flexibilität

Die Datei `auth.config.ts` konfiguriert speziell die NextAuth-Seite dieses Systems.

## Konfigurationsdatei

Die Root-Datei `auth.config.ts` exportiert ein `NextAuthConfig`-Objekt:

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

## Schlüsseleigenschaften

### `trustHost`

Auf `true` gesetzt, um dem Host-Header beim Betrieb hinter einem Reverse-Proxy (wie Vercel) zu vertrauen. Dies ist für die korrekte Generierung von Redirect-URLs in Produktionsumgebungen erforderlich.

### `providers`

Das Providers-Array wird dynamisch basierend darauf erstellt, welche OAuth-Anbieter gültige konfigurierte Zugangsdaten haben. Die Funktion `configureProviders()`:

1. Ruft `configureOAuthProviders()` auf, um Umgebungsvariablen zu validieren
2. Ordnet jeden aktivierten Anbieter seiner NextAuth-Anbieterkonfiguration zu
3. Bezieht immer den Credentials-Anbieter als Fallback ein

## Unterstützte Anbieter

| Anbieter | Erforderliche Umgebungsvariablen | Hinweise |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | E-Mail-Kontoverknüpfung standardmäßig deaktiviert |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Standard-OAuth-Flow |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Standard-OAuth-Flow |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | OAuth 2.0-Flow |
| Credentials | Keine (immer aktiviert) | E-Mail/Passwort-Authentifizierung |

## Anbieter-Architektur

Die Anbieter-Erstellungspipeline umfasst mehrere zusammenwirkende Dateien.

### Anbieter-Factory (`lib/auth/providers.ts`)

Die Funktion `createNextAuthProviders` ordnet Konfigurationsobjekte tatsächlichen NextAuth-Anbieterinstanzen zu:

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

### Auth-Fehlerbehandler (`lib/auth/error-handler.ts`)

Der Auth-Fehlerbehandler validiert Umgebungsvariablen und stellt benutzerfreundliche Fehlermeldungen bereit:

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

Ein zentrales Designprinzip ist die graceful Degradation. Wenn die OAuth-Konfiguration beim Start fehlschlägt:

1. Der Fehler wird als strukturierter `AppError` mit Typ `CONFIG` und Code `OAUTH_CONFIG_FAILED` erfasst
2. Der Fehler wird mit dem Kontext `"Auth Config"` protokolliert
3. Das System fällt auf ausschließliche Credentials-Authentifizierung zurück
4. Die Anwendung startet normal weiter

Das bedeutet, dass ein falsch konfiguriertes Google OAuth-Secret nicht verhindert, dass die gesamte Anwendung ausgeführt wird -- Benutzer können sich weiterhin mit E-Mail und Passwort anmelden.

## Teilweise konfigurierte Anbieter

Wenn ein Anbieter nur einige der erforderlichen Umgebungsvariablen hat, wird eine Warnung protokolliert:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Dies hilft, Konfigurationsprobleme zu identifizieren, ohne die Anwendung zum Absturz zu bringen.

## Erforderliche Umgebungsvariablen

Konfigurieren Sie mindestens diese Variablen, damit NextAuth funktioniert:

```env
# Erforderlich für alle NextAuth-Konfigurationen
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Anbieter-Zugangsdaten hinzufügen, um OAuth zu aktivieren
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Generieren Sie `AUTH_SECRET` mit:

```bash
openssl rand -base64 32
```

## Verwandte Ressourcen

- [Anbieterkonfiguration](/template/configuration/provider-config) -- Auswahl zwischen NextAuth, Supabase oder beiden
- [Umgebungsreferenz](/template/configuration/environment-reference) -- Vollständige Liste der Umgebungsvariablen
- [Fehlerbehandlungsmuster](/template/guides/error-handler-patterns) -- Wie Auth-Fehler strukturiert sind
