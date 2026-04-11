---
id: sentry-config
title: Sentry Configuratie
sidebar_label: Sentry Conf.
sidebar_position: 10
---

# Sentry Configuratie

Deze pagina documenteert de Sentry-integratie voor foutopsporing, prestatiecontrole en sessieherhaling in het template. De configuratie is verdeeld over drie bestanden: `sentry.config.ts` (webpack-plugin), `instrumentation.ts` (serverinitialisatie) en `instrumentation-client.ts` (clientinitialisatie).

## Overzicht

Het template gebruikt de `@sentry/nextjs`-SDK om fouten en prestatiegegevens vast te leggen op zowel de server als de client. Sentry is volledig optioneel -- als er geen DSN geconfigureerd is, wordt alle Sentry-initialisatie overgeslagen.

## Webpack-pluginconfiguratie

Het bestand `sentry.config.ts` in de projectroot configureert de Sentry webpack-plugin die tijdens de build wordt gebruikt:

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

### Plugin-opties

| Optie | Standaard | Beschrijving |
|-------|---------|-------------|
| `silent` | `true` | Onderdrukt de webpack-plugin-console-uitvoer tijdens builds |
| `org` | `SENTRY_ORG` omgevingsvariabele | Uw Sentry-organisatieslug |
| `project` | `SENTRY_PROJECT` omgevingsvariabele | Uw Sentry-projectslug |
| `widenClientFileUpload` | `true` | Uploadt een breder set clientbronbestanden voor betere stack traces |
| `transpileClientSDK` | `true` | Transpileert de Sentry-SDK voor bredere browsercompatibiliteit |
| `tunnelRoute` | `"/monitoring"` | Proxyt Sentry-verzoeken via uw app om advertentieblokkers te omzeilen |
| `hideSourceMaps` | `true` | Voorkomt dat bronbestanden publiek toegankelijk zijn in productie |
| `disableLogger` | `true` | Schakelt de Sentry-logger uit om de bundelgrootte te verminderen |

### Integratie met Next.js-configuratie

De plugin-opties worden gebruikt in `next.config.ts`:

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## Omgevingsvariabelen

Sentry vertrouwt op deze omgevingsvariabelen, gedefinieerd in `lib/constants.ts`:

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| Variabele | Vereist | Beschrijving |
|-----------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Nee | De Sentry-DSN (Data Source Name). Als niet ingesteld, is Sentry uitgeschakeld. |
| `SENTRY_ORG` | Nee | Sentry-organisatieslug voor bronbestanduploads |
| `SENTRY_PROJECT` | Nee | Sentry-projectslug voor bronbestanduploads |
| `SENTRY_AUTH_TOKEN` | Nee | Auth-token voor het uploaden van bronbestanden tijdens builds |
| `SENTRY_ENABLE_DEV` | Nee | Stel in op `"true"` om Sentry in ontwikkelingsmodus in te schakelen |
| `SENTRY_DEBUG` | Nee | Stel in op `"true"` om Sentry SDK-foutopsporingslogging in te schakelen |

## Serverinitialisatie

Server-side Sentry wordt geïnitialiseerd in `instrumentation.ts`, die eenmalig wordt uitgevoerd wanneer de Next.js-server start:

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

### Server-samplerates

- **Productie:** 10% trace-sampling (`0.1`) voor een balans tussen kosten en zichtbaarheid
- **Ontwikkeling:** 100% trace-sampling (`1.0`) voor volledige foutopsporingszichtbaarheid

### Foutrapportage

Databaseinitialisatiefouten worden aan Sentry gerapporteerd met contextuele tags:

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

## Clientinitialisatie

Client-side Sentry wordt geïnitialiseerd in `instrumentation-client.ts`:

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

### Clientfunctionaliteiten

**Sessieherhaling** is geconfigureerd met privacygerichte standaardinstellingen:

- `maskAllText: true` -- Alle tekstinhoud wordt gemaskeerd in herhalingen
- `blockAllMedia: true` -- Alle media-elementen worden geblokkeerd in herhalingen
- Foutherhalingen worden voor 100% vastgelegd (`replaysOnErrorSampleRate: 1.0`)
- Algemene sessieherhalingen worden in productie voor 10% vastgelegd

**Router-overgangen** worden geïnstrumenteerd via `onRouterTransitionStart` om navigatieprestaties te volgen.

## Tunnelroute

De optie `tunnelRoute: "/monitoring"` proxyt Sentry-eventverzendingen via uw applicatie op het `/monitoring`-eindpunt. Dit helpt advertentieblokkers en beveiligingsbeleidsregels te omzeilen die directe verzoeken naar Sentry's servers zouden blokkeren.

## Samenvatting van samplerates

| Metriek | Ontwikkeling | Productie |
|---------|-------------|-----------|
| Trace-samplerate (server) | 100% | 10% |
| Trace-samplerate (client) | 100% | 10% |
| Foutherhaalrate | 100% | 100% |
| Sessieherhaalrate | 100% | 10% |

## Sentry inschakelen

Om Sentry in te schakelen in uw implementatie:

1. Maak een Sentry-project aan op [sentry.io](https://sentry.io)
2. Stel de vereiste omgevingsvariabelen in:

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. Stel voor ontwikkeling ook in:

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## Gerelateerde resources

- [Instrumentatiegids](/template/guides/instrumentation) -- Volledige documentatie van de instrumentatielevenscyclus
- [Foutafhandelingspatronen](/template/guides/error-handler-patterns) -- Hoe fouten worden gestructureerd en gelogd
- [Omgevingsreferentie](/template/configuration/environment-reference) -- Alle omgevingsvariabelen
