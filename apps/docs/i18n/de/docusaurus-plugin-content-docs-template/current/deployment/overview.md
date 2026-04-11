---
id: overview
title: Bereitstellungsübersicht
sidebar_label: Übersicht
sidebar_position: 1
---

# Bereitstellungsübersicht

Dieser Leitfaden behandelt die Bereitstellung von Ever Works in Produktionsumgebungen, einschließlich plattformspezifischer Anweisungen und Best Practices.

## Bereitstellungsplattformen

### Empfohlene Plattformen

1. **[Vercel](https://vercel.com/)** – Am besten für Next.js (Empfohlen)
2. **[Netlify](https://netlify.com/)** – Ideal für statische Websites
3. **[Railway](https://railway.app/)** – Einfaches Full-Stack-Deployment
4. **[DigitalOcean App Platform](https://digitalocean.com/products/app-platform/)** – Verwaltete Container

### Selbst-gehostete Optionen

1. **Docker** – Containerisiertes Deployment
2. **PM2** – Prozessverwaltung für Node.js
3. **Nginx** – Reverse-Proxy-Einrichtung
4. **Kubernetes** – Container-Orchestrierung

## Vor-Deployment-Checkliste

### Code-Vorbereitung
- [ ] Alle Tests bestehen
- [ ] TypeScript-Kompilierung erfolgreich
- [ ] ESLint-Prüfungen bestehen
- [ ] Build-Prozess ohne Fehler abgeschlossen
- [ ] Umgebungsvariablen konfiguriert

### Datenbankeinrichtung
- [ ] Produktionsdatenbank erstellt
- [ ] Migrationen angewandt
- [ ] Verbindungszeichenfolge konfiguriert
- [ ] Backup-Strategie implementiert

### Externe Dienste
- [ ] OAuth-Anwendungen konfiguriert
- [ ] Zahlungsanbieter eingerichtet
- [ ] E-Mail-Dienst konfiguriert
- [ ] Analyse-Tools integriert
- [ ] Fehler-Tracking aktiviert

### Sicherheit
- [ ] Secrets ordnungsgemäß konfiguriert
- [ ] HTTPS aktiviert
- [ ] CORS-Einstellungen konfiguriert
- [ ] Rate-Limiting aktiviert
- [ ] Eingabevalidierung implementiert

## Umgebungskonfiguration

### Produktions-Umgebungsvariablen

```bash
# Basic Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_API_BASE_URL="https://yourdomain.com/api"

# Security
AUTH_SECRET="your-production-secret-32-chars-min"
NEXTAUTH_URL="https://yourdomain.com"
COOKIE_SECURE=true
COOKIE_SAME_SITE="strict"

# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# GitHub Integration
GH_TOKEN="your-github-token"
DATA_REPOSITORY="https://github.com/your-org/awesome-data"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Payment Processing
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_live_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Monitoring
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
NEXT_PUBLIC_POSTHOG_KEY="phc_your_posthog_key"

# Email
RESEND_API_KEY="re_your_resend_api_key"
SUPPORT_EMAIL="support@yourdomain.com"
```

### Umgebungssicherheit

1. **Secrets niemals** in die Versionskontrolle committen
2. **Unterschiedliche Secrets** für jede Umgebung verwenden
3. **Secrets regelmäßig rotieren**
4. **Umgebungsspezifische OAuth-Apps** verwenden
5. **Secret-Scanning** in Ihrem Repository aktivieren
6. **Sichere Passwortgeneratoren** für alle Secrets verwenden
7. **Secrets in sicheren Umgebungsvariablen-Managementsystemen** speichern
8. **Zugriffsberechtigungen regelmäßig prüfen und überprüfen**

## Build-Konfiguration

### Next.js-Konfiguration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true
      }
    ]
  }
}

module.exports = nextConfig
```

### Build-Skripte

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "build:analyze": "ANALYZE=true next build",
    "build:standalone": "next build && next export"
  }
}
```

## Datenbank-Deployment

### Migrationsstrategie

```bash
# Production migration workflow
npm run db:generate    # Generate migration files
npm run db:migrate     # Apply migrations
npm run db:seed        # Seed initial data (if needed)
```

### Datenbankanbieter

#### Supabase (Empfohlen)
```bash
# Connection string format
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

#### PlanetScale
```bash
# Connection string format
DATABASE_URL="mysql://[username]:[password]@[host]/[database]?sslaccept=strict"
```

#### Neon
```bash
# Connection string format
DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"
```

### Backup-Strategie

1. **Automatisierte Backups** – Tägliche Snapshots
2. **Point-in-Time-Wiederherstellung** – Transaktionslog-Backups
3. **Cross-Region-Replikation** – Notfallwiederherstellung
4. **Backup-Tests** – Regelmäßige Wiederherstellungstests

## CDN und statische Assets

### Vercel (Automatisch)
- Globales CDN inklusive
- Automatische Bildoptimierung
- Edge-Caching

### Cloudflare-Einrichtung
```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'cloudflare',
    path: 'https://yourdomain.com/cdn-cgi/image/',
  },
}
```

### AWS CloudFront
```javascript
// next.config.js
module.exports = {
  assetPrefix: 'https://d1234567890.cloudfront.net',
  images: {
    domains: ['d1234567890.cloudfront.net'],
  },
}
```

## SSL/TLS-Konfiguration

### Automatisches SSL (Empfohlen)
Die meisten Plattformen bieten automatisches SSL:
- Vercel: Automatisches Let's Encrypt
- Netlify: Automatisches SSL
- Railway: Automatische Zertifikate

### Benutzerdefiniertes SSL-Zertifikat
Für benutzerdefinierte Domains:

1. **SSL-Zertifikat kaufen** vom Anbieter
2. **Zertifikat hochladen** auf die Plattform
3. **DNS-Einträge** konfigurieren
4. **HTTPS** überprüfen

## Performance-Optimierung

### Build-Optimierungen

```javascript
// next.config.js
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize bundles
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroui/react'],
  },
  
  // Compression
  compress: true,
}
```

### Caching-Strategie

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=60'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}
```

## Überwachung und Protokollierung

### Fehler-Tracking
```bash
# Sentry configuration
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
```

### Analytik
```bash
# PostHog configuration
NEXT_PUBLIC_POSTHOG_KEY="phc_your_key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

### Uptime-Monitoring
Monitoring einrichten mit:
- UptimeRobot
- Pingdom
- StatusCake
- New Relic

## Skalierungsüberlegungen

### Horizontale Skalierung
- **Load Balancing** – Mehrere Serverinstanzen
- **Datenbankskalierung** – Lesereplikate
- **CDN-Nutzung** – Globale Inhaltsverteilung

### Vertikale Skalierung
- **Serverressourcen** – CPU- und Speicher-Upgrades
- **Datenbankoptimierung** – Abfrage-Performance
- **Caching-Schichten** – Redis/Memcached

### Auto-Skalierung
```yaml
# Example auto-scaling configuration
scaling:
  min_instances: 2
  max_instances: 10
  target_cpu: 70
  target_memory: 80
```

## Deployment-Strategien

### Blue-Green-Deployment
1. **In der grünen Umgebung bereitstellen**
2. **Grüne Umgebung testen**
3. **Traffic auf Grün umschalten**
4. **Blau als Rollback behalten**

### Rolling-Deployment
1. **Auf einer Teilmenge von Servern bereitstellen**
2. **Deployment-Gesundheit überprüfen**
3. **Rolling-Deployment fortsetzen**
4. **Auf Probleme überwachen**

### Canary-Deployment
1. **Auf kleinem Prozentsatz bereitstellen**
2. **Metriken und Fehler überwachen**
3. **Traffic schrittweise erhöhen**
4. **Vollständiges Deployment oder Rollback**

## Rollback-Strategie

### Vorbereitung
1. **Vorherige Version verfügbar halten**
2. **Datenbankmigrations-Rollback**-Skripte
3. **DNS-Failover**-Konfiguration
4. **Monitoring-Alarme** für Probleme

### Rollback-Prozess
```bash
# Quick rollback steps
1. Switch DNS to previous version
2. Rollback database migrations (if needed)
3. Verify application health
4. Investigate and fix issues
```

## Sicherheitshärtung

### Anwendungssicherheit
- **HTTPS-Durchsetzung**
- **Sicherheitsheader**
- **Eingabevalidierung**
- **Rate-Limiting**
- **CSRF-Schutz**

### Infrastruktursicherheit
- **Firewall-Konfiguration**
