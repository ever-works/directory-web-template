---
id: monitoring
title: Überwachung & Analytik
sidebar_label: Überwachung
sidebar_position: 6
---

# Überwachung & Analytik

Überwachen Sie die Leistung, Fehler und das Benutzerverhalten Ihres Ever Works-Deployments.

## Anwendungsüberwachung

## Ausnahme-Tracking

Ever Works bietet flexibles Ausnahme-Tracking, das Ihnen ermöglicht, zwischen **PostHog**, **Sentry** oder **beiden** für die Fehlerüberwachung zu wählen.

### Konfigurationsoptionen

Die Anwendung unterstützt vier Ausnahme-Tracking-Modi:

- **PostHog**: Leichtgewichtiges Ausnahme-Tracking, integriert in Ihre Analytik
- **Sentry**: Vollständige Fehlerüberwachung und Performance-Tracking
- **Beide**: Beide Dienste gleichzeitig verwenden (nützlich beim Migrieren)
- **Keine**: Ausnahme-Tracking deaktivieren

### Umgebungsvariablen

Diese Variablen zu Ihrer `.env.local`-Datei hinzufügen:

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

#### Konfiguration erklärt

**EXCEPTION_TRACKING_PROVIDER**:

- `"sentry"`: Nur Sentry für Ausnahme-Tracking verwenden
- `"posthog"`: Nur PostHog für Ausnahme-Tracking verwenden
- `"both"`: Beide Dienste verwenden (Fehler an beide gesendet)
- `"none"`: Gesamtes Ausnahme-Tracking deaktivieren

**Dienstspezifische Schalter**:

- `POSTHOG_EXCEPTION_TRACKING`: PostHog-Ausnahme-Tracking aktivieren/deaktivieren
- `SENTRY_EXCEPTION_TRACKING`: Sentry-Ausnahme-Tracking aktivieren/deaktivieren

Diese Schalter funktionieren zusammen mit `EXCEPTION_TRACKING_PROVIDER`. Wenn Sie z. B. `EXCEPTION_TRACKING_PROVIDER=both` setzen, aber `POSTHOG_EXCEPTION_TRACKING=false`, werden Ausnahmen nur an Sentry gesendet.

---

### Fehler-Tracking mit Sentry

Sentry bietet umfassende Fehlerüberwachung mit detaillierten Stack-Traces, Release-Tracking und Performance-Monitoring.

#### Installation

```bash
npm install @sentry/nextjs
```

#### Konfiguration

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

#### Vorteile von Sentry

- ✅ Erweiterte Fehlergruppierung und -deduplizierung
- ✅ Source-Map-Unterstützung für Produktions-Debugging
- ✅ Integration mit Versionskontrolle (GitHub, GitLab)
- ✅ Ausgefeilte Alarmierungsregeln
- ✅ Release-Tracking und Regressionserkennung
- ✅ Performance-Monitoring
- ✅ Breadcrumbs für Debugging-Kontext

---

### Fehler-Tracking mit PostHog

PostHog erfasst Ausnahmen als `$exception`-Ereignisse, integriert in Ihre Produktanalytik.

#### Vorteile von PostHog

- ✅ In Ihre Produktanalytik integriert
- ✅ Ausnahmen im Kontext von Benutzersitzungen sehen
- ✅ Leichtgewichtig, kein zusätzliches SDK erforderlich
- ✅ Fehler mit Feature-Nutzung korrelieren
- ✅ Sitzungsaufzeichnung zeigt, was zu Fehlern geführt hat

#### PostHog-Ausnahmeeigenschaften

PostHog erfasst Ausnahmen mit folgenden Eigenschaften:

- `$exception_message`: Fehlermeldung
- `$exception_type`: Fehlertyp/-name
- `$exception_stack_trace_raw`: Vollständiger Stack-Trace
- `$exception_handled`: Ob der Fehler behandelt wurde
- Beliebiger zusätzlicher Kontext, den Sie bereitstellen

#### PostHog-Dashboard-Einrichtung

1. Zu Ihrem PostHog-Dashboard gehen
2. Ein neues Dashboard für Ausnahmen erstellen
3. Insights mit Filter für `$exception`-Ereignisse hinzufügen
4. Nach `$exception_type` oder `$exception_message` gruppieren

---

### Ausnahmen erfassen

Der Analytics-Dienst bietet eine einheitliche API für Ausnahme-Tracking:

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

### Automatisches Ausnahme-Tracking

Wenn das Ausnahme-Tracking aktiviert ist, werden folgende Ereignisse automatisch erfasst:

- ✅ Nicht behandelte JavaScript-Fehler (`window.onerror`)
- ✅ Nicht behandelte Promise-Ablehnungen
- ✅ React-Fehlergrenzen (wenn integriert)
- ✅ API-Routen-Fehler (bei Verwendung von Fehlerhandlern)

---

### Beide Dienste verwenden

Wenn `EXCEPTION_TRACKING_PROVIDER=both`, werden Ausnahmen an beide Dienste gesendet. Dies ist nützlich für:

- **Übergang zwischen Diensten**: Schrittweise von einem zum anderen migrieren
- **Produktanalytik-Korrelation**: PostHog verwenden, um Fehler im Benutzerkontext zu sehen
- **Detailliertes Debugging**: Sentry für umfassende Fehleranalyse verwenden
- **A/B-Tests**: Verschiedene Fehler-Tracking-Ansätze vergleichen

---

### Best Practices

#### 1. Den richtigen Anbieter wählen

- **PostHog** verwenden für einfaches, integriertes Ausnahme-Tracking
- **Sentry** für umfassende Fehlerüberwachung und Debugging
- **Beide** während der Migration oder für vollständige Abdeckung

#### 2. Kontext hinzufügen

Beim Erfassen von Ausnahmen immer relevanten Kontext einschließen:

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

#### 3. Sensible Daten behandeln

- Beide Dienste unterstützen Daten-Scrubbing
- PII-Entfernung in Service-Dashboards konfigurieren
- Niemals Passwörter, Token oder Kreditkartennummern protokollieren

#### 4. Performance überwachen

- Ausnahme-Tracking hat minimalen Overhead
- PostHog: ~0,5 KB Bundle-Größe
- Sentry: ~30 KB (gzipped)
- Sample-Raten können für Apps mit hohem Traffic konfiguriert werden

#### 5. Alarme einrichten

Alarme für kritische Fehler konfigurieren:

- **Sentry**: Problem- und Metrik-Alarme verwenden
- **PostHog**: Insights erstellen und Webhooks einrichten
- Bei Fehlerratespitzen alarmieren, nicht bei einzelnen Fehlern

---

### Fehlerbehebung beim Ausnahme-Tracking

#### Ausnahmen erscheinen nicht

Wenn Ausnahmen nicht in Ihrem Dashboard angezeigt werden:

1. **Prüfen Sie, ob Umgebungsvariablen korrekt gesetzt sind**

   ```bash
   # Verify in your terminal
   echo $EXCEPTION_TRACKING_PROVIDER
   echo $NEXT_PUBLIC_SENTRY_DSN
   echo $NEXT_PUBLIC_POSTHOG_KEY
   ```

2. **Dienste initialisiert prüfen**
   - Browser-Konsole öffnen
   - Nach Initialisierungsmeldungen suchen
   - Auf Fehlermeldungen prüfen

3. **Sicherstellen, dass Sie nicht im Entwicklungsmodus sind** (sofern nicht aktiviert)
   - `SENTRY_ENABLE_DEV=true` setzen, um in der Entwicklung zu testen
   - PostHog funktioniert standardmäßig in der Entwicklung

4. **Browser-Werbeblocker prüfen**
   - Werbeblocker können Analytik-/Tracking-Anfragen blockieren
   - Mit deaktiviertem Werbeblocker testen
   - Proxy für Produktion in Betracht ziehen

#### Anbieter-Fallback

Das System fällt automatisch zurück, wenn ein angeforderter Anbieter nicht verfügbar ist:

- Wenn **Sentry** angefordert, aber nicht konfiguriert → fällt auf **PostHog** zurück
- Wenn **PostHog** angefordert, aber nicht konfiguriert → fällt auf **Sentry** zurück
- Wenn **keiner** verfügbar → Ausnahme-Tracking deaktiviert

Prüfen Sie die Browser-Konsole auf Warnungen zum Anbieter-Fallback.

---

### Migrationshandbuch

#### Von Nur-Sentry zu PostHog

1. `EXCEPTION_TRACKING_PROVIDER=both` setzen
2. Beide Dashboards einige Tage überwachen
3. Wenn zufrieden, `EXCEPTION_TRACKING_PROVIDER=posthog` setzen
4. Optional Sentry-Konfiguration entfernen

```bash
# Step 1: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 2: After testing, switch to PostHog only
EXCEPTION_TRACKING_PROVIDER=posthog
```

#### Von Nur-PostHog zu Sentry

1. Sentry-Konfigurationsvariablen hinzufügen
2. `EXCEPTION_TRACKING_PROVIDER=both` setzen
3. Prüfen, ob Sentry Ereignisse empfängt
4. `EXCEPTION_TRACKING_PROVIDER=sentry` setzen

```bash
# Step 1: Add Sentry config
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Step 2: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 3: After testing, switch to Sentry only
EXCEPTION_TRACKING_PROVIDER=sentry
```

---

### Performance-Monitoring

#### Core Web Vitals

Core Web Vitals automatisch überwachen:

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

#### Benutzerdefinierte Performance-Metriken

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

## Infrastrukturüberwachung

### Gesundheitsprüfungen

Gesundheitsprüfungs-Endpunkte erstellen:

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

### Uptime-Monitoring

Dienste wie folgende verwenden:

- **Pingdom** – Website-Uptime-Monitoring
- **UptimeRobot** – Kostenloses Uptime-Monitoring
- **StatusCake** – Website-Monitoring
