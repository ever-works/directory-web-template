---
id: deployment-introduction
title: Introductie Implementatie
sidebar_label: Introductie Implementatie
sidebar_position: 1
---

# Introductie Implementatie

Deze gids biedt een uitgebreid overzicht van het implementeren van het Ever Works Template in productieomgevingen. Het template is gebouwd op Next.js 16 met een standalone uitvoermodus, waardoor het compatibel is met een breed scala aan hostingplatforms en gecontaineriseerde implementaties.

## Architectuuroverzicht

Het Ever Works Template produceert een **standalone Next.js-build** die alle afhankelijkheden bundelt in één implementeerbare eenheid. Dit is geconfigureerd in `next.config.ts`:

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

De instelling `output: "standalone"` maakt een zelfstandig implementatieartefact dat alleen de noodzakelijke `node_modules`-bestanden bevat, waardoor de implementatiegrootte aanzienlijk wordt verkleind.

## Ondersteunde platforms

### Aanbevolen: Vercel

Vercel is het aanbevolen implementatieplatform voor het template. Het biedt:

- Zero-configuratie-implementatie voor Next.js-applicaties
- Automatische SSL-certificaatinrichting
- Ingebouwde cron-jobplanning via `vercel.json`
- Serverloze functieondersteuning voor API-routes
- Voorbeeldimplementaties voor pull requests

Het template bevat een `vercel.json`-configuratie met vooraf gedefinieerde cron-schema's:

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

### Zelfgehost: Docker

De standalone uitvoer ondersteunt Docker-containerisatie. Een typische implementatie gebruikt de Node.js-runtime om de gebouwde applicatie te bedienen. De belangrijkste vereiste is ervoor te zorgen dat de `standalone`-uitvoermap en de `public`- en `.next/static`-mappen in de container-image worden gekopieerd.

### Andere cloudplatforms

Het template kan worden geïmplementeerd op elk platform dat Node.js-applicaties ondersteunt:

- **Railway** -- Eenvoudige full-stack-implementatie met ingebouwde PostgreSQL
- **DigitalOcean App Platform** -- Beheerde containerimplementaties
- **AWS (EC2, ECS of App Runner)** -- Schaalbare cloudinfrastructuur
- **Google Cloud Run** -- Serverloos containerplatform
- **Azure App Service** -- Beheerd Node.js-hosting

## Vereisten

### Systeemvereisten

- **Node.js**: versie 20.19.0 of hoger (gedefinieerd in het `engines`-veld van `package.json`)
- **Pakketbeheerder**: pnpm (het project gebruikt `pnpm-lock.yaml`)
- **Database**: PostgreSQL (vereist voor productiefuncties zoals authenticatie, abonnementen, analyses)
- **Geheugen**: Minimaal 8 GB RAM aanbevolen voor het bouwproces

Het bouwscript wijst expliciet extra geheugen toe:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Vereiste omgevingsvariabelen

Zorg ervoor dat deze kritieke variabelen zijn geconfigureerd vóór implementatie. Het `scripts/check-env.js`-script valideert ze automatisch:

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

Het omgevingscontrolescript categoriseert variabelen per integratie:

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

### Optionele integraties

Deze omgevingsvariabelen schakelen optionele functies in:

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

## Snelle implementatiegids

### Stap 1: De build voorbereiden

Voer het volledige bouwproces lokaal uit om te verifiëren dat alles compileert:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Het `build`-script voert meerdere stappen achtereenvolgens uit:

1. **Omgevingscontrole** (`scripts/check-env.js`) -- valideert vereiste variabelen
2. **OpenAPI-generatie** (`scripts/generate-openapi.ts`) -- genereert API-documentatie
3. **Databasemigraties** (`scripts/build-migrate.ts`) -- past ausstehende schemawijzigingen toe
4. **Next.js-build** (`next build`) -- compileert de applicatie

### Stap 2: Build-tijd databasemigratie

Het `scripts/build-migrate.ts`-script wordt automatisch uitgevoerd tijdens de build. Het verwerkt verschillende omgevingen:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Kerngedrag:

- **Productiebuilds**: Migratiefouten zorgen ervoor dat de build mislukt (voorkomt defecte implementaties)
- **Voorbeeldimplementaties**: Verbindingsfouten worden getolereerd (de database is mogelijk niet ingericht)
- **CI-builds** (niet-Vercel): Migraties worden volledig overgeslagen

### Stap 3: Runtime-initialisatie

Wanneer de applicatie start, triggert het `instrumentation.ts`-bestand de database-initialisatie:

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

De initialisatievolgorde:

1. Alle openstaande migraties uitvoeren (Drizzle verwerkt idempotentie)
2. Controleren of de database is gevuld
3. Als niet gevuld, een PostgreSQL-advisory lock verwerven en het seed-script uitvoeren
4. De lock vrijgeven na het vullen

### Stap 4: Implementeren op Vercel

Voor Vercel-implementaties verbindt u uw repository en configureert u:

1. Stel het **Framework Preset** in op Next.js
2. Stel het **Build-commando** in op `pnpm build`
3. Stel het **Install-commando** in op `pnpm install`
4. Voeg alle vereiste omgevingsvariabelen toe in het Vercel-dashboard
5. Implementeer

### Stap 5: De implementatie verifiëren

Verifieer na implementatie:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Beveiligingsheaders

Het template configureert beveiligingsheaders automatisch in `next.config.ts`:

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

## Verbindingspoolconfiguratie

De databaseverbindingspool is configureerbaar via de `DB_POOL_SIZE`-omgevingsvariabele:

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

- **Productiestandaard**: 20 verbindingen
- **Ontwikkelingsstandaard**: 10 verbindingen
- **Configureerbaar bereik**: 1 tot 50 verbindingen
- **Inactief time-out**: 20 seconden
- **Verbindingstime-out**: 30 seconden

## Volgende stappen

- [SSL en aangepaste domeinen](./ssl-domains.md) -- Aangepaste domeinen en SSL-certificaten configureren
- [Databasebeheer](./database-management.md) -- Productiedatabasebewerkingen
- [Back-up en herstel](./backup-recovery.md) -- Strategieën voor databaseback-ups
- [Bewaking](./monitoring.md) -- Foutopsporing en prestatiebewaking instellen
