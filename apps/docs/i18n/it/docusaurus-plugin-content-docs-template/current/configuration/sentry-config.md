---
id: sentry-config
title: Configurazione Sentry
sidebar_label: Conf. Sentry
sidebar_position: 10
---

# Configurazione Sentry

Questa pagina documenta l'integrazione Sentry per il tracciamento degli errori, il monitoraggio delle prestazioni e la riproduzione delle sessioni nel template. La configurazione è suddivisa in tre file: `sentry.config.ts` (plugin webpack), `instrumentation.ts` (inizializzazione lato server) e `instrumentation-client.ts` (inizializzazione lato client).

## Panoramica

Il template utilizza l'SDK `@sentry/nextjs` per acquisire errori e dati sulle prestazioni sia sul server che sul client. Sentry è completamente opt-in -- se non è configurato alcun DSN, tutta l'inizializzazione di Sentry viene saltata.

## Configurazione del Plugin Webpack

Il file `sentry.config.ts` nella directory radice del progetto configura il plugin webpack di Sentry utilizzato durante la build:

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

### Opzioni del Plugin

| Opzione | Predefinito | Descrizione |
|---------|---------|-------------|
| `silent` | `true` | Sopprime l'output della console del plugin webpack durante le build |
| `org` | variabile d'ambiente `SENTRY_ORG` | Il tuo slug dell'organizzazione Sentry |
| `project` | variabile d'ambiente `SENTRY_PROJECT` | Il tuo slug del progetto Sentry |
| `widenClientFileUpload` | `true` | Carica un insieme più ampio di file sorgente lato client per migliori stack trace |
| `transpileClientSDK` | `true` | Transpila l'SDK Sentry per una compatibilità browser più ampia |
| `tunnelRoute` | `"/monitoring"` | Fa il proxy delle richieste Sentry attraverso la tua app per evitare gli ad blocker |
| `hideSourceMaps` | `true` | Impedisce che le source map siano pubblicamente accessibili in produzione |
| `disableLogger` | `true` | Disabilita il logger Sentry per ridurre la dimensione del bundle |

### Integrazione con la Configurazione Next.js

Le opzioni del plugin vengono utilizzate in `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Variabili d'Ambiente

Sentry si basa su queste variabili d'ambiente, definite in `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variabile | Richiesta | Descrizione |
|-----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | Il DSN Sentry (Data Source Name). Se non impostato, Sentry è disabilitato. |
| `SENTRY_ORG` | No | Slug dell'organizzazione Sentry per il caricamento delle source map |
| `SENTRY_PROJECT` | No | Slug del progetto Sentry per il caricamento delle source map |
| `SENTRY_AUTH_TOKEN` | No | Token di autenticazione per il caricamento delle source map durante le build |
| `SENTRY_ENABLE_DEV` | No | Imposta su `"true"` per abilitare Sentry in modalità sviluppo |
| `SENTRY_DEBUG` | No | Imposta su `"true"` per abilitare il logging di debug dell'SDK Sentry |

## Inizializzazione Lato Server

Sentry lato server viene inizializzato in `instrumentation.ts`, che viene eseguito una volta all'avvio del server Next.js:

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

### Frequenze di Campionamento Server

- **Produzione:** campionamento trace al 10% (`0.1`) per bilanciare costi e visibilità
- **Sviluppo:** campionamento trace al 100% (`1.0`) per piena visibilità di debug

### Segnalazione degli Errori

I fallimenti di inizializzazione del database vengono segnalati a Sentry con tag contestuali:

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

## Inizializzazione Lato Client

Sentry lato client viene inizializzato in `instrumentation-client.ts`:

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

### Funzionalità Lato Client

La **Riproduzione delle Sessioni** è configurata con impostazioni predefinite orientate alla privacy:

- `maskAllText: true` -- Tutto il contenuto di testo è mascherato nelle riproduzioni
- `blockAllMedia: true` -- Tutti gli elementi multimediali sono bloccati nelle riproduzioni
- Le riproduzioni di errori vengono acquisite al 100% (`replaysOnErrorSampleRate: 1.0`)
- Le riproduzioni di sessioni generali vengono acquisite al 10% in produzione

Le **Transizioni del Router** vengono instrumentate tramite `onRouterTransitionStart` per tracciare le prestazioni di navigazione delle pagine.

## Route Tunnel

L'opzione `tunnelRoute: "/monitoring"` fa il proxy delle trasmissioni di eventi Sentry attraverso la tua applicazione all'endpoint `/monitoring`. Questo aiuta a bypassare gli ad blocker e le politiche di sicurezza dei contenuti che potrebbero bloccare le richieste dirette ai server di Sentry.

## Riepilogo delle Frequenze di Campionamento

| Metrica | Sviluppo | Produzione |
|---------|----------|------------|
| Frequenza campionamento trace (server) | 100% | 10% |
| Frequenza campionamento trace (client) | 100% | 10% |
| Frequenza replay errori | 100% | 100% |
| Frequenza replay sessioni | 100% | 10% |

## Abilitazione di Sentry

Per abilitare Sentry nella tua distribuzione:

1. Crea un progetto Sentry su [sentry.io](https://sentry.io)
2. Imposta le variabili d'ambiente richieste:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Per lo sviluppo, imposta anche:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Risorse Correlate

- [Guida all'Instrumentazione](/template/guides/instrumentation) -- Documentazione completa del ciclo di vita dell'instrumentazione
- [Pattern di Gestione degli Errori](/template/guides/error-handler-patterns) -- Come gli errori vengono strutturati e registrati
- [Riferimento all'Ambiente](/template/configuration/environment-reference) -- Tutte le variabili d'ambiente
