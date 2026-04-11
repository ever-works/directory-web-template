---
id: deployment-introduction
title: Einführung in die Bereitstellung
sidebar_label: Einführung in die Bereitstellung
sidebar_position: 1
---

# Einführung in die Bereitstellung

Dieser Leitfaden bietet einen umfassenden Überblick über das Deployen des Ever Works Templates in Produktionsumgebungen. Das Template basiert auf Next.js 16 mit einem Standalone-Output-Modus, was es mit einer Vielzahl von Hosting-Plattformen und containerisierten Deployments kompatibel macht.

## Architektur-Übersicht

Das Ever Works Template erzeugt einen **Standalone Next.js Build**, der alle Abhängigkeiten in eine einzige deploybare Einheit bündelt. Dies ist in `next.config.ts` konfiguriert:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

Die Einstellung `output: "standalone"` erstellt ein eigenständiges Deployment-Artefakt, das nur die notwendigen `node_modules`-Dateien enthält und so die Deployment-Größe erheblich reduziert.

## Unterstützte Plattformen

### Empfohlen: Vercel

Vercel ist die empfohlene Deployment-Plattform für das Template. Es bietet:

- Zero-Configuration-Deployment für Next.js-Anwendungen
- Automatische SSL-Zertifikatsbereitstellung
- Integrierte Cron-Job-Planung über `vercel.json`
- Serverlose Funktionsunterstützung für API-Routen
- Vorschau-Deployments für Pull-Requests

Das Template enthält eine `vercel.json`-Konfiguration mit vordefinierten Cron-Zeitplänen:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Self-Hosted: Docker

Der Standalone-Output unterstützt Docker-Containerisierung. Ein typisches Deployment verwendet die Node.js-Runtime, um die erstellte Anwendung bereitzustellen. Die wichtigste Anforderung ist sicherzustellen, dass das `standalone`-Output-Verzeichnis sowie die `public`- und `.next/static`-Ordner in das Container-Image kopiert werden.

### Andere Cloud-Plattformen

Das Template kann auf jeder Plattform deployt werden, die Node.js-Anwendungen unterstützt:

- **Railway** -- Einfaches Full-Stack-Deployment mit integriertem PostgreSQL
- **DigitalOcean App Platform** -- Verwaltete Container-Deployments
- **AWS (EC2, ECS oder App Runner)** -- Skalierbare Cloud-Infrastruktur
- **Google Cloud Run** -- Serverlose Container-Plattform
- **Azure App Service** -- Verwaltetes Node.js-Hosting

## Voraussetzungen

### Systemanforderungen

- **Node.js**: Version 20.19.0 oder höher (definiert im `engines`-Feld der `package.json`)
- **Paketmanager**: pnpm (das Projekt verwendet `pnpm-lock.yaml`)
- **Datenbank**: PostgreSQL (erforderlich für Produktionsfunktionen wie Auth, Abonnements, Analysen)
- **Arbeitsspeicher**: Mindestens 8 GB RAM empfohlen für den Build-Prozess

Das Build-Skript weist explizit zusätzlichen Speicher zu:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Erforderliche Umgebungsvariablen

Stellen Sie vor dem Deployment sicher, dass diese kritischen Variablen konfiguriert sind. Das `scripts/check-env.js`-Skript validiert sie automatisch:

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Das Umgebungsprüfskript kategorisiert Variablen nach Integration:

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### Optionale Integrationen

Diese Umgebungsvariablen aktivieren optionale Funktionen:

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## Schnell-Deploy-Leitfaden

### Schritt 1: Build vorbereiten

Führen Sie den vollständigen Build-Prozess lokal aus, um sicherzustellen, dass alles kompiliert:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Das `build`-Skript führt mehrere Schritte nacheinander aus:

1. **Umgebungsprüfung** (`scripts/check-env.js`) -- validiert erforderliche Variablen
2. **OpenAPI-Generierung** (`scripts/generate-openapi.ts`) -- generiert API-Dokumentation
3. **Datenbankmigrationen** (`scripts/build-migrate.ts`) -- wendet ausstehende Schemaänderungen an
4. **Next.js-Build** (`next build`) -- kompiliert die Anwendung

### Schritt 2: Build-Zeit-Datenbankmigration

Das `scripts/build-migrate.ts`-Skript läuft automatisch während des Builds. Es behandelt verschiedene Umgebungen:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Wesentliche Verhaltensweisen:

- **Produktions-Builds**: Migrationsfehler führen zum Build-Fehler (verhindert fehlerhafte Deployments)
- **Vorschau-Deployments**: Verbindungsfehler werden toleriert (die Datenbank ist möglicherweise nicht bereitgestellt)
- **CI-Builds** (nicht-Vercel): Migrationen werden vollständig übersprungen

### Schritt 3: Laufzeit-Initialisierung

Wenn die Anwendung startet, löst die `instrumentation.ts`-Datei die Datenbankinitialisierung aus:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

Die Initialisierungssequenz:

1. Alle ausstehenden Migrationen ausführen (Drizzle behandelt Idempotenz)
2. Prüfen, ob die Datenbank geseedet ist
3. Falls nicht geseedet, einen PostgreSQL-Advisory-Lock erwerben und das Seed-Skript ausführen
4. Lock nach dem Seeding freigeben

### Schritt 4: Auf Vercel deployen

Für Vercel-Deployments verbinden Sie Ihr Repository und konfigurieren:

1. Das **Framework Preset** auf Next.js setzen
2. Den **Build-Befehl** auf `pnpm build` setzen
3. Den **Installationsbefehl** auf `pnpm install` setzen
4. Alle erforderlichen Umgebungsvariablen im Vercel-Dashboard hinzufügen
5. Deployen

### Schritt 5: Deployment verifizieren

Verifizieren Sie nach dem Deployment:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Sicherheits-Header

Das Template konfiguriert Sicherheits-Header automatisch in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## Connection-Pool-Konfiguration

Der Datenbankverbindungspool ist über die `DB_POOL_SIZE`-Umgebungsvariable konfigurierbar:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **Produktionsstandard**: 20 Verbindungen
- **Entwicklungsstandard**: 10 Verbindungen
- **Konfigurierbarer Bereich**: 1 bis 50 Verbindungen
- **Leerlauf-Timeout**: 20 Sekunden
- **Verbindungs-Timeout**: 30 Sekunden

## Nächste Schritte

- [SSL und benutzerdefinierte Domains](./ssl-domains.md) -- Benutzerdefinierte Domains und SSL-Zertifikate konfigurieren
- [Datenbankverwaltung](./database-management.md) -- Produktionsdatenbankoperationen
- [Backup und Wiederherstellung](./backup-recovery.md) -- Datenbank-Backup-Strategien
- [Überwachung](./monitoring.md) -- Fehler-Tracking und Leistungsüberwachung einrichten
