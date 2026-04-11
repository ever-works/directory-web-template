---
id: monitoring
title: Monitoring & Analyse
sidebar_label: Monitoring
sidebar_position: 6
---

# Monitoring & Analyse

Bewaak de prestaties, fouten en het gebruikersgedrag van uw Ever Works-implementatie.

## Toepassingsbewaking

## Uitzonderingstracking

Ever Works biedt flexibele uitzonderingstracking waarmee u kunt kiezen tussen **PostHog**, **Sentry** of **beide** voor foutbewaking.

### Configuratieopties

De toepassing ondersteunt vier modi voor uitzonderingstracking:

- **PostHog**: Lichtgewicht uitzonderingstracking geïntegreerd met uw analyse
- **Sentry**: Volledige foutbewaking en prestatietracking
- **Beide**: Beide services tegelijkertijd gebruiken (nuttig tijdens migratie)
- **Geen**: Uitzonderingstracking uitschakelen

### Omgevingsvariabelen

Voeg deze variabelen toe aan uw `.env.local`-bestand:

```bash
# Exception Tracking Configuration
# Options: "sentry", "posthog", "both", or "none"
EXCEPTION_TRACKING_PROVIDER=both

# Enable/disable exception tracking for each service
POSTHOG_EXCEPTION_TRACKING=true
SENTRY_EXCEPTION_TRACKING=true

# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_DEBUG=false
POSTHOG_SESSION_RECORDING_ENABLED=true
POSTHOG_AUTO_CAPTURE=false

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ENABLE_DEV=false
SENTRY_DEBUG=false
```

#### Configuratie uitgelegd

**EXCEPTION_TRACKING_PROVIDER**:

- `"sentry"`: Alleen Sentry gebruiken voor uitzonderingstracking
- `"posthog"`: Alleen PostHog gebruiken voor uitzonderingstracking
- `"both"`: Beide services gebruiken (fouten naar beide gestuurd)
- `"none"`: Alle uitzonderingstracking uitschakelen

**Servicespecifieke schakelaars**:

- `POSTHOG_EXCEPTION_TRACKING`: PostHog-uitzonderingstracking in-/uitschakelen
- `SENTRY_EXCEPTION_TRACKING`: Sentry-uitzonderingstracking in-/uitschakelen

---

### Fouttracking met Sentry

Sentry biedt uitgebreide foutbewaking met gedetailleerde stack-traces, release-tracking en prestatietracking.

#### Installatie

```bash
npm install @sentry/nextjs
```

#### Configuratie

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  // Enable performance monitoring
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  // Sample rate for performance monitoring
  tracesSampleRate: 0.1,
  // Capture 100% of errors
  sampleRate: 1.0,
});
```

#### Voordelen van Sentry

- ✅ Geavanceerde foutgroepering en deduplicatie
- ✅ Source-map-ondersteuning voor productiedebugging
- ✅ Integratie met versiebeheer (GitHub, GitLab)
- ✅ Geavanceerde waarschuwingsregels
- ✅ Release-tracking en regressiedetectie
- ✅ Prestatietracking
- ✅ Breadcrumbs voor debuggingcontext

---

### Fouttracking met PostHog

PostHog legt uitzonderingen vast als `$exception`-gebeurtenissen geïntegreerd in uw productanalyse.

#### Voordelen van PostHog

- ✅ Geïntegreerd met uw productanalyse
- ✅ Uitzonderingen zien in context van gebruikerssessies
- ✅ Lichtgewicht, geen extra SDK vereist
- ✅ Fouten correleren met functiepgebruik
- ✅ Sessie-opname toont wat tot fouten heeft geleid

---

### Uitzonderingen vastleggen

De analyseservice biedt een uniforme API voor uitzonderingstracking:

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
try {
  // Your code here
  await processPayment(order);
} catch (error) {
  analytics.captureException(error, {
    // Optional context
    userId: user.id,
    action: 'checkout',
    metadata: { cartTotal: 100 }
  });
  throw error; // Re-throw if needed
}

// Capture a string error
analytics.captureException('Something went wrong', {
  severity: 'warning'
});

// Check current provider
const provider = analytics.getExceptionTrackingProvider();
console.log(`Currently using: ${provider}`);
```

### Automatische uitzonderingstracking

Wanneer uitzonderingstracking is ingeschakeld, worden de volgende gebeurtenissen automatisch vastgelegd:

- ✅ Niet-afgehandelde JavaScript-fouten (`window.onerror`)
- ✅ Niet-afgehandelde promise-afwijzingen
- ✅ React-foutgrenzen (wanneer geïntegreerd)
- ✅ API-routefouten (bij gebruik van fouthandlers)

---

### Best Practices

#### 1. Kies de juiste provider

- Gebruik **PostHog** voor eenvoudige, geïntegreerde uitzonderingstracking
- Gebruik **Sentry** voor uitgebreide foutbewaking en debugging
- Gebruik **beide** tijdens migratie of voor volledige dekking

#### 2. Voeg context toe

Voeg altijd relevante context toe bij het vastleggen van uitzonderingen:

```typescript
analytics.captureException(error, {
  userId: user.id,
  featureFlags: getActiveFlags(),
  sessionId: session.id,
  route: router.pathname,
  metadata: {
    itemId: item.id,
    action: 'submit'
  }
});
```

#### 3. Behandel gevoelige gegevens

- Beide services ondersteunen gegevensscrubbering
- Configureer PII-verwijdering in servicedashboards
- Log nooit wachtwoorden, tokens of creditcardnummers

#### 4. Bewaak prestaties

- Uitzonderingstracking heeft minimale overhead
- PostHog: ~0,5 KB bundelgrootte
- Sentry: ~30 KB (gzipped)
- Samplepercentages kunnen worden geconfigureerd voor drukbezochte apps

---

### Migratiehandleiding

#### Van alleen Sentry naar PostHog

1. Stel `EXCEPTION_TRACKING_PROVIDER=both` in
2. Bewaak beide dashboards een paar dagen
3. Zodra tevreden, stel `EXCEPTION_TRACKING_PROVIDER=posthog` in
4. Verwijder optioneel de Sentry-configuratie

```bash
# Step 1: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 2: After testing, switch to PostHog only
EXCEPTION_TRACKING_PROVIDER=posthog
```

---

### Prestatietracking

#### Core Web Vitals

Core Web Vitals automatisch bewaken:

```javascript
// pages/_app.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

export function reportWebVitals(metric) {
  sendToAnalytics(metric);
}
```

#### Aangepaste prestatiestatistieken

```javascript
// utils/performance.js
export function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
}
```

## Infrastructuurbewaking

### Gezondheidscontroles

Gezondheidscontrole-eindpunten aanmaken:

```javascript
// pages/api/health.js
export default function handler(req, res) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  try {
    // Add database connectivity check
    // Add external service checks
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      ...healthCheck,
      status: 'unhealthy',
      error: error.message,
    });
  }
}
```

### Uptime-bewaking

Gebruik services zoals:

- **Pingdom** – Website uptime-bewaking
- **UptimeRobot** – Gratis uptime-bewaking
- **StatusCake** – Websitebewaking
