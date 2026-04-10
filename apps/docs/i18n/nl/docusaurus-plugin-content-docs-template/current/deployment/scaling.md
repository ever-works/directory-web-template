---
id: scaling
title: Schaalvergroting & Hoge Beschikbaarheid
sidebar_label: Schaalvergroting
sidebar_position: 4
---

# Schaalvergroting & Hoge Beschikbaarheid

Deze gids behandelt strategieën voor het schalen van het Ever Works Template van een enkele instantie-implementatie naar een hoog-beschikbare productie-opstelling, inclusief serverless configuratie, connection pooling, CDN-optimalisatie en edge-functies.

## Implementatiearchitectuur

Het template ondersteunt meerdere implementatiearchitecturen:

| Architectuur | Geschikt voor | Schaalmodel |
|---|---|---|
| Vercel (Serverless) | De meeste implementaties | Automatische horizontale schaling |
| Docker (Standalone) | Self-hosted, on-premise | Handmatige of orchestrator-gebaseerde schaling |
| Node.js (Direct) | Ontwikkeling, eenvoudige implementaties | Enkele instantie of PM2-cluster |

## Serverless-configuratie (Vercel)

### Standalone-uitvoer

Het template is geconfigureerd met standalone-uitvoer voor optimale serverless implementatie:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

Standalone-modus produceert een zelfstandige build in `.next/standalone/` die alleen de bestanden bevat die nodig zijn om de applicatie uit te voeren. Dit minimaliseert cold start-tijden door de implementatiepakketgrootte te verkleinen.

### Functieconfiguratie

Configureer serverless functie-instellingen in `vercel.json` of via route-niveau configuratie:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // seconden (Pro-plan: tot 300s)
export const dynamic = 'force-dynamic';
```

### Aanbevolen functie-instellingen

| Routetype | Max. duur | Geheugen | Opmerkingen |
|---|---|---|---|
| API-routes (eenvoudig) | 10s | 1024 MB | Standaard voor de meeste eindpunten |
| API-routes (gegevensverwerking) | 30s | 1024 MB | Voor batchbewerkingen |
| Cron-taken | 60s | 1024 MB | Uitvoering van achtergrondtaken |
| Webhook-handlers | 30s | 1024 MB | Betaling-, OAuth-callbacks |
| Statische pagina's | N.v.t. | N.v.t. | Vooraf gerenderd tijdens build |

### Cold start-optimalisatie

Minimaliseer cold starts met deze technieken:

| Techniek | Implementatie | Impact |
|---|---|---|
| Functiegrootte minimaliseren | `serverExternalPackages` in configuratie | Vermindert initialisatietijd |
| Top-level imports vermijden | Dynamische `import()` voor zware modules | Stelt laden uit tot nodig |
| Edge-runtime gebruiken waar mogelijk | `export const runtime = 'edge'` | Bijna geen cold start |
| Functies warm houden | Health check-eindpunten met monitoring | Houdt functies actief |

## Database Connection Pooling

### Het probleem

In serverless omgevingen kan elke functieaanroep een nieuwe databaseverbinding openen. Zonder pooling kan dit de verbindingslimiet van de database uitputten.

### Oplossing: Connection Pooler

Gebruik een connection pooler tussen uw applicatie en database:

| Pooler | Provider | Instelling |
|---|---|---|
| PgBouncer | Supabase (ingebouwd) | Gebruik de gepoolde verbindingsstring (poort 6543) |
| Neon Pooler | Neon (ingebouwd) | Gebruik de `-pooler` verbindingsstring |
| PgBouncer | Self-hosted | Implementeer PgBouncer naast PostgreSQL |

### Configuratie

Gebruik verschillende verbindingsstrings voor gepoolde en directe verbindingen:

```bash
# Gepoolde verbinding voor applicatiequery's (serverless-veilig)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Directe verbinding alleen voor migraties
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Werk `drizzle.config.ts` bij om de directe verbinding voor migraties te gebruiken:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Verbindingslimieten

| Laag | Max. verbindingen | Aanbevolen poolgrootte |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Verbindingsbeheer in code

De databasemodule van het template moet één verbindingspool per functie-instantie hergebruiken:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Verbindingspool eenmalig aanmaken per serverless-instantie
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Maximale verbindingen in pool
  idle_timeout: 20, // Sluit inactieve verbindingen na 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN en Caching

### Vercel Edge Network

Bij implementatie op Vercel biedt het Edge Network automatisch:

- Globale CDN-distributie over 30+ regio's
- Automatisch cachen van statische bestanden
- Edge-caching voor ISR-pagina's (Incremental Static Regeneration)
- DDoS-bescherming

### Cache-Control-headers

Configureer caching voor verschillende inhoudstypen:

```typescript
// API-route met cache-headers
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Cachingstrategie per inhoudstype

| Inhoudstype | Cachingstrategie | TTL | Opmerkingen |
|---|---|---|---|
| Statische bestanden (JS, CSS, afbeeldingen) | Onveranderlijk | 1 jaar | Content-gehashte bestandsnamen |
| Openbare pagina's | ISR | 60–300s | Op aanvraag her valideren |
| API-reacties (openbaar) | `s-maxage` | 10–60s | CDN-niveau caching |
| API-reacties (geauthenticeerd) | `no-store` | 0 | Gebruikersspecifieke gegevens nooit cachen |
| CMS-inhoudspagina's | ISR | 300s | Her valideren na inhoudssynchronisatie |

### ISR (Incremental Static Regeneration)

Gebruik ISR voor inhoudsrijke pagina's die zelden veranderen:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Elke 5 minuten opnieuw genereren

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### On-demand revalidering

Revalidering activeren na inhoudsupdates:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Edge-functies

### Wanneer Edge-runtime te gebruiken

Edge-functies draaien op Cloudflare Workers (via Vercel) en bieden bijna geen cold start-tijden. Gebruik ze voor:

| Gebruik | Voorbeeld |
|---|---|
| Geolocatie-gebaseerde routing | Gebruikers omleiden naar regionale inhoud |
| A/B-testen | Omleiden naar experimentvarianten |
| Authenticatiecontroles | Snelle sessievalidatie |
| Responstransformatie | Headers toevoegen, reacties wijzigen |
| Eenvoudige API-eindpunten | Lichtgewicht gegevensopzoekingen |

### Edge-runtime-beperkingen

| Beperking | Detail |
|---|---|
| Geen Node.js-API's | Kan `fs`, `child_process` etc. niet gebruiken |
| Geen native modules | Kan `bcryptjs`, `postgres` niet direct gebruiken |
| Beperkte uitvoeringstijd | Max. 30 seconden (Vercel Pro) |
| Beperkt geheugen | 128 MB |
| Geen Drizzle ORM | Edge-compatibele databaseclients gebruiken |

### Voorbeeld edge-functie

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## Horizontale schalingstrategieën

### Staatloze applicatieontwerp

Het template is ontworpen om staatsloos te zijn op de applicatielaag:

| Component | Statuslocatie | Schaalimpact |
|---|---|---|
| Sessies | Database of JWT | Geen gedeelde status tussen instanties |
| Achtergrondtaken | Taakbeheerder (per instantie of Trigger.dev) | Trigger.dev gebruiken voor meerdere instanties |
| Bestandsuploads | Externe opslag (S3, Supabase) | Geen lokale bestandssysteemafhankelijkheid |
| CMS-inhoud | Git-repository (geklond bij build/start) | Alleen-lezen, identiek per instantie |
| Cache | In-memory (per instantie) of Redis | Redis overwegen voor gedeelde cache |

### Overwegingen bij meerdere instanties

Bij het uitvoeren van meerdere instanties (Docker Swarm, Kubernetes of meerdere Vercel-functies):

1. **Achtergrondtaken**: Gebruik Trigger.dev of Vercel Cron in plaats van `LocalJobManager` om dubbele uitvoeringen te vermijden.
2. **Databaseverbindingen**: Schakel connection pooling in om uitputting van verbindingen te voorkomen.
3. **Sessieopslag**: Gebruik databasesessies in plaats van in-memory opslag.
4. **Cache-invalidatie**: Implementeer een gedeelde cache (Redis) of accepteer uiteindelijke consistentie met per-instantie caches.

## Monitoring op schaal

### Belangrijke te volgen statistieken

| Statistiek | Tool | Drempelwaarde |
|---|---|---|
| Responstijd (p95) | Sentry, Vercel Analytics | < 500ms |
| Foutpercentage | Sentry | < 1% |
| Aantal databaseverbindingen | Database-dashboard | < 80% van maximum |
| Functie cold starts | Vercel Analytics | Frequentie bewaken |
| Cache-trefferpercentage | Applicatielogs | > 80% |
| Geheugengebruik | Vercel/Docker-statistieken | < 80% van limiet |

### Sentry Prestatiemonitoring

Het template configureert Sentry met trace-sampling:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Pas `tracesSampleRate` aan op basis van verkeersvolume:

| Dagelijkse verzoeken | Aanbevolen sample-rate |
|---|---|
| < 10.000 | 1,0 (100%) |
| 10.000–100.000 | 0,1 (10%) |
| 100.000–1.000.000 | 0,01 (1%) |
| > 1.000.000 | 0,001 (0,1%) |

## Belastingstests

### Aanbevolen tools

| Tool | Gebruiksscenario | Complexiteit |
|---|---|---|
| `autocannon` | Snelle HTTP-benchmarks | Laag |
| `k6` | Gescripte belastingstests | Gemiddeld |
| `Artillery` | Complexe scenario's | Gemiddeld |
| `Locust` | Python-gebaseerd, gedistribueerd | Hoog |

### Voorbeeld belastingstest

```bash
# Snelle benchmark met autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# k6-script voor gedetailleerdere tests
k6 run load-test.js
```

### Testchecklist

| Test | Doel | Slaagcriterium |
|---|---|---|
| Startpagina laden | 100 gelijktijdige gebruikers | p95 < 1s |
| API-eindpunt | 200 verzoeken/seconde | p95 < 500ms, 0% fouten |
| Zoekquery | 50 gelijktijdige gebruikers | p95 < 2s |
| Auth-stroom | 20 gelijktijdige gebruikers | Alle geslaagd, geen timeouts |

## Schalingschecklist

| Categorie | Item | Prioriteit |
|---|---|---|
| **Database** | Connection pooling inschakelen | Kritiek |
| **Database** | Read replica's gebruiken voor zware leeslast | Hoog |
| **Database** | Indexen toevoegen voor trage query's | Hoog |
| **Caching** | CDN-caching-headers configureren | Kritiek |
| **Caching** | ISR implementeren voor inhoudspagina's | Hoog |
| **Caching** | Redis toevoegen voor gedeelde cache (bij meerdere instanties) | Gemiddeld |
| **Compute** | Edge-runtime gebruiken voor lichte routes | Gemiddeld |
| **Compute** | Cold starts optimaliseren met externe pakketten | Hoog |
| **Taken** | Overstappen op Trigger.dev voor meerdere instanties | Hoog |
| **Taken** | Vercel Cron configureren voor geplande taken | Hoog |
| **Monitoring** | Sentry instellen met geschikte sampling | Kritiek |
| **Monitoring** | Waarschuwingen configureren voor foutpercentage en latentie | Hoog |
| **Testen** | Belastingstests uitvoeren voor grote lanceringen | Hoog |
