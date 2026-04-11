---
id: sentry-config
title: Sentry Konfiguration
sidebar_label: Sentry Konf.
sidebar_position: 10
---

# Sentry Konfiguration

Diese Seite dokumentiert die Sentry-Integration für Fehlerverfolgung, Leistungsüberwachung und Sitzungswiederholung im Template. Die Konfiguration ist auf drei Dateien aufgeteilt: `sentry.config.ts` (Webpack-Plugin), `instrumentation.ts` (serverseitige Initialisierung) und `instrumentation-client.ts` (clientseitige Initialisierung).

## Übersicht

Das Template verwendet das `@sentry/nextjs`-SDK, um Fehler und Leistungsdaten sowohl auf dem Server als auch auf dem Client zu erfassen. Sentry ist vollständig optional -- wenn kein DSN konfiguriert ist, wird die gesamte Sentry-Initialisierung übersprungen.

## Webpack-Plugin-Konfiguration

Die Datei `sentry.config.ts` im Projektstamm konfiguriert das Sentry-Webpack-Plugin, das während des Builds verwendet wird:

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### Plugin-Optionen

| Option | Standard | Beschreibung |
|--------|---------|-------------|
| `silent` | `true` | Unterdrückt die Webpack-Plugin-Konsolenausgabe während der Builds |
| `org` | `SENTRY_ORG` Umgebungsvariable | Ihr Sentry-Organisations-Slug |
| `project` | `SENTRY_PROJECT` Umgebungsvariable | Ihr Sentry-Projekt-Slug |
| `widenClientFileUpload` | `true` | Lädt eine breitere Menge clientseitiger Quelldateien für bessere Stack-Traces hoch |
| `transpileClientSDK` | `true` | Transpiliert das Sentry-SDK für breitere Browser-Kompatibilität |
| `tunnelRoute` | `"/monitoring"` | Leitet Sentry-Anfragen durch Ihre App, um Werbeblocker zu umgehen |
| `hideSourceMaps` | `true` | Verhindert, dass Source-Maps in der Produktion öffentlich zugänglich sind |
| `disableLogger` | `true` | Deaktiviert den Sentry-Logger zur Reduzierung der Bundle-Größe |

### Integration mit Next.js-Konfiguration

Die Plugin-Optionen werden in `next.config.ts` verwendet:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Umgebungsvariablen

Sentry basiert auf folgenden Umgebungsvariablen, die in `lib/constants.ts` definiert sind:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variable | Erforderlich | Beschreibung |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Nein | Das Sentry-DSN (Data Source Name). Wenn nicht gesetzt, ist Sentry deaktiviert. |
| `SENTRY_ORG` | Nein | Sentry-Organisations-Slug für Source-Map-Uploads |
| `SENTRY_PROJECT` | Nein | Sentry-Projekt-Slug für Source-Map-Uploads |
| `SENTRY_AUTH_TOKEN` | Nein | Auth-Token für das Hochladen von Source-Maps während der Builds |
| `SENTRY_ENABLE_DEV` | Nein | Auf `"true"` setzen, um Sentry im Entwicklungsmodus zu aktivieren |
| `SENTRY_DEBUG` | Nein | Auf `"true"` setzen, um das Sentry-SDK-Debug-Logging zu aktivieren |

## Serverseitige Initialisierung

Die serverseitige Sentry-Initialisierung erfolgt in `instrumentation.ts`, die einmal beim Start des Next.js-Servers ausgeführt wird:

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### Server-Samplingraten

- **Produktion:** 10% Trace-Sampling (`0.1`) für ausgewogene Kosten und Sichtbarkeit
- **Entwicklung:** 100% Trace-Sampling (`1.0`) für vollständige Debug-Sichtbarkeit

### Fehlerberichterstattung

Datenbankinitialisierungsfehler werden mit Kontexttags an Sentry gemeldet:

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## Clientseitige Initialisierung

Die clientseitige Sentry-Initialisierung erfolgt in `instrumentation-client.ts`:

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### Clientseitige Funktionen

**Sitzungswiederholung** ist mit datenschutzorientierten Standardeinstellungen konfiguriert:

- `maskAllText: true` -- Alle Textinhalte werden in Wiederholungen maskiert
- `blockAllMedia: true` -- Alle Medienelemente werden in Wiederholungen blockiert
- Fehler-Replays werden zu 100% erfasst (`replaysOnErrorSampleRate: 1.0`)
- Allgemeine Sitzungs-Replays werden in der Produktion zu 10% erfasst

**Router-Übergänge** werden über `onRouterTransitionStart` instrumentiert, um die Seitennavigationsleistung zu verfolgen.

## Tunnel-Route

Die Option `tunnelRoute: "/monitoring"` leitet Sentry-Event-Übermittlungen durch Ihre Anwendung am `/monitoring`-Endpunkt. Dies hilft, Werbeblocker und Content-Security-Policies zu umgehen, die direkte Anfragen an Sentrys Server blockieren könnten.

## Zusammenfassung der Samplingraten

| Metrik | Entwicklung | Produktion |
|--------|-------------|------------|
| Trace-Samplingsrate (Server) | 100% | 10% |
| Trace-Samplingsrate (Client) | 100% | 10% |
| Fehler-Replay-Rate | 100% | 100% |
| Sitzungs-Replay-Rate | 100% | 10% |

## Sentry aktivieren

Um Sentry in Ihrer Bereitstellung zu aktivieren:

1. Erstellen Sie ein Sentry-Projekt unter [sentry.io](https://sentry.io)
2. Setzen Sie die erforderlichen Umgebungsvariablen:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Für die Entwicklung setzen Sie außerdem:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Verwandte Ressourcen

- [Instrumentierungsleitfaden](/template/guides/instrumentation) -- Vollständige Dokumentation des Instrumentierungslebenszyklus
- [Fehlerbehandlungsmuster](/template/guides/error-handler-patterns) -- Wie Fehler strukturiert und protokolliert werden
- [Umgebungsreferenz](/template/configuration/environment-reference) -- Alle Umgebungsvariablen
