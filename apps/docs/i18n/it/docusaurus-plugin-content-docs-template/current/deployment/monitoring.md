---
id: monitoring
title: Monitoraggio & Analisi
sidebar_label: Monitoraggio
sidebar_position: 6
---

# Monitoraggio & Analisi

Monitora le prestazioni, gli errori e il comportamento degli utenti del tuo deployment Ever Works.

## Monitoraggio dell'Applicazione

## Tracciamento delle Eccezioni

Ever Works fornisce un tracciamento flessibile delle eccezioni che consente di scegliere tra **PostHog**, **Sentry** o **entrambi** per il monitoraggio degli errori.

### Opzioni di Configurazione

L'applicazione supporta quattro modalità di tracciamento delle eccezioni:

- **PostHog**: Tracciamento eccezioni leggero integrato con l'analisi
- **Sentry**: Monitoraggio errori completo e tracciamento delle prestazioni
- **Entrambi**: Usare entrambi i servizi simultaneamente (utile durante la migrazione)
- **Nessuno**: Disabilitare il tracciamento delle eccezioni

### Variabili d'Ambiente

Aggiungere queste variabili al file `.env.local`:

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

---

### Tracciamento Errori con Sentry

Sentry fornisce un monitoraggio completo degli errori con stack trace dettagliati, tracciamento dei rilasci e monitoraggio delle prestazioni.

#### Installazione

```bash
npm install @sentry/nextjs
```

#### Configurazione

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

#### Vantaggi di Sentry

- ✅ Raggruppamento e deduplicazione avanzati degli errori
- ✅ Supporto source map per il debug in produzione
- ✅ Integrazione con controllo versione (GitHub, GitLab)
- ✅ Regole di allerta sofisticate
- ✅ Tracciamento rilasci e rilevamento regressioni
- ✅ Monitoraggio delle prestazioni
- ✅ Breadcrumb per il contesto di debug

---

### Tracciamento Errori con PostHog

PostHog cattura le eccezioni come eventi `$exception` integrati nella tua analisi di prodotto.

#### Vantaggi di PostHog

- ✅ Integrato con la tua analisi di prodotto
- ✅ Visualizza le eccezioni nel contesto delle sessioni utente
- ✅ Leggero, nessun SDK aggiuntivo richiesto
- ✅ Correlazione errori con l'utilizzo delle funzionalità
- ✅ La registrazione della sessione mostra cosa ha portato agli errori

---

### Catturare le Eccezioni

Il servizio di analisi fornisce un'API unificata per il tracciamento delle eccezioni:

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

### Tracciamento Automatico delle Eccezioni

Quando il tracciamento delle eccezioni è abilitato, vengono catturate automaticamente:

- ✅ Errori JavaScript non gestiti (`window.onerror`)
- ✅ Rifiuti di promesse non gestiti
- ✅ Boundary di errore React (quando integrati)
- ✅ Errori delle route API (quando si usano gli error handler)

---

### Best Practice

#### 1. Scegliere il Provider Giusto

- Usare **PostHog** per un tracciamento delle eccezioni semplice e integrato
- Usare **Sentry** per un monitoraggio e debug completo degli errori
- Usare **entrambi** durante la migrazione o per una copertura completa

#### 2. Aggiungere Contesto

Includere sempre il contesto rilevante quando si catturano eccezioni:

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

#### 3. Gestire i Dati Sensibili

- Entrambi i servizi supportano lo scrubbing dei dati
- Configurare la rimozione PII nei dashboard dei servizi
- Non registrare mai password, token o numeri di carta di credito

---

### Guida alla Migrazione

#### Da Solo Sentry a PostHog

1. Impostare `EXCEPTION_TRACKING_PROVIDER=both`
2. Monitorare entrambi i dashboard per alcuni giorni
3. Una volta soddisfatti, impostare `EXCEPTION_TRACKING_PROVIDER=posthog`

```bash
# Step 1: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 2: After testing, switch to PostHog only
EXCEPTION_TRACKING_PROVIDER=posthog
```

---

### Monitoraggio delle Prestazioni

#### Core Web Vitals

Monitorare automaticamente i Core Web Vitals:

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

#### Metriche di Prestazioni Personalizzate

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

## Monitoraggio dell'Infrastruttura

### Controlli di Salute

Creare endpoint di controllo dello stato di salute:

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

### Monitoraggio Uptime

Usare servizi come:

- **Pingdom** – Monitoraggio uptime del sito web
- **UptimeRobot** – Monitoraggio uptime gratuito
- **StatusCake** – Monitoraggio sito web
