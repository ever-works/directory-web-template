---
id: scaling
title: Skalierung & Hochverfügbarkeit
sidebar_label: Skalierung
sidebar_position: 4
---

# Skalierung & Hochverfügbarkeit

Dieser Leitfaden behandelt Strategien zur Skalierung des Ever Works Template von einer Einzelinstanz-Bereitstellung hin zu einem hochverfügbaren Produktionssetup, einschließlich Serverless-Konfiguration, Connection-Pooling, CDN-Optimierung und Edge-Funktionen.

## Deployment-Architektur

Das Template unterstützt mehrere Deployment-Architekturen:

| Architektur | Geeignet für | Skalierungsmodell |
|---|---|---|
| Vercel (Serverless) | Die meisten Deployments | Automatische horizontale Skalierung |
| Docker (Standalone) | Self-hosted, On-Premise | Manuelle oder Orchestrator-basierte Skalierung |
| Node.js (Direkt) | Entwicklung, einfache Deployments | Einzelinstanz oder PM2-Cluster |

## Serverless-Konfiguration (Vercel)

### Standalone-Ausgabe

Das Template ist mit Standalone-Ausgabe für optimales Serverless-Deployment konfiguriert:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

Der Standalone-Modus erstellt einen eigenständigen Build in `.next/standalone/`, der nur die zum Ausführen der Anwendung notwendigen Dateien enthält. Dies minimiert die Kaltstart-Zeiten durch Reduzierung der Deployment-Paketgröße.

### Funktionskonfiguration

Konfigurieren Sie Serverless-Funktionseinstellungen in `vercel.json` oder über Routen-Level-Konfiguration:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // Sekunden (Pro-Plan: bis zu 300s)
export const dynamic = 'force-dynamic';
```

### Empfohlene Funktionseinstellungen

| Routentyp | Max. Dauer | Speicher | Hinweise |
|---|---|---|---|
| API-Routen (einfach) | 10s | 1024 MB | Standard für die meisten Endpunkte |
| API-Routen (Datenverarbeitung) | 30s | 1024 MB | Für Batch-Operationen |
| Cron-Jobs | 60s | 1024 MB | Hintergrundaufgaben-Ausführung |
| Webhook-Handler | 30s | 1024 MB | Zahlungs-, OAuth-Callbacks |
| Statische Seiten | N/A | N/A | Zur Build-Zeit vorgerendert |

### Kaltstart-Optimierung

Minimieren Sie Kaltstarts mit diesen Techniken:

| Technik | Implementierung | Auswirkung |
|---|---|---|
| Funktionsgröße minimieren | `serverExternalPackages` in der Konfiguration | Reduziert Initialisierungszeit |
| Top-Level-Importe vermeiden | Dynamischer `import()` für schwere Module | Verzögert Laden bis benötigt |
| Edge-Runtime verwenden wo möglich | `export const runtime = 'edge'` | Nahezu kein Kaltstart |
| Funktionen warm halten | Health-Check-Endpunkte mit Monitoring | Hält Funktionen aktiv |

## Datenbank-Connection-Pooling

### Das Problem

In Serverless-Umgebungen kann jede Funktionsaufrufung eine neue Datenbankverbindung öffnen. Ohne Pooling kann dies das Verbindungslimit der Datenbank erschöpfen.

### Lösung: Connection-Pooler

Verwenden Sie einen Connection-Pooler zwischen Anwendung und Datenbank:

| Pooler | Anbieter | Einrichtung |
|---|---|---|
| PgBouncer | Supabase (integriert) | Gepoolten Verbindungsstring verwenden (Port 6543) |
| Neon Pooler | Neon (integriert) | `-pooler`-Verbindungsstring verwenden |
| PgBouncer | Self-hosted | PgBouncer neben PostgreSQL deployen |

### Konfiguration

Verwenden Sie verschiedene Verbindungsstrings für gepoolte und direkte Verbindungen:

```bash
# Gepoolte Verbindung für Anwendungsabfragen (serverless-sicher)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Direkte Verbindung nur für Migrationen
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Aktualisieren Sie `drizzle.config.ts`, um die direkte Verbindung für Migrationen zu verwenden:

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

### Verbindungslimits

| Stufe | Max. Verbindungen | Empfohlene Pool-Größe |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Verbindungsverwaltung im Code

Das Datenbankmodul des Templates sollte einen einzelnen Connection-Pool pro Funktionsinstanz wiederverwenden:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Verbindungspool einmal pro Serverless-Instanz erstellen
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Maximale Verbindungen im Pool
  idle_timeout: 20, // Inaktive Verbindungen nach 20s schließen
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN und Caching

### Vercel Edge Network

Bei Deployment auf Vercel bietet das Edge Network automatisch:

- Globale CDN-Verteilung über 30+ Regionen
- Automatisches Caching statischer Assets
- Edge-Caching für ISR-Seiten (Incremental Static Regeneration)
- DDoS-Schutz

### Cache-Control-Header

Konfigurieren Sie Caching für verschiedene Inhaltstypen:

```typescript
// API-Route mit Cache-Headern
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Caching-Strategie nach Inhaltstyp

| Inhaltstyp | Cache-Strategie | TTL | Hinweise |
|---|---|---|---|
| Statische Assets (JS, CSS, Bilder) | Unveränderlich | 1 Jahr | Content-gehashte Dateinamen |
| Öffentliche Seiten | ISR | 60–300s | Bei Bedarf neu validieren |
| API-Antworten (öffentlich) | `s-maxage` | 10–60s | CDN-Level-Caching |
| API-Antworten (authentifiziert) | `no-store` | 0 | Nutzerspezifische Daten nie cachen |
| CMS-Inhaltsseiten | ISR | 300s | Nach Inhaltssynchronisierung neu validieren |

### ISR (Incremental Static Regeneration)

Verwenden Sie ISR für inhaltslastige Seiten, die sich selten ändern:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Alle 5 Minuten neu generieren

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### On-Demand-Revalidierung

Revalidierung nach Inhaltsaktualisierungen auslösen:

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

## Edge-Funktionen

### Wann Edge-Runtime verwenden

Edge-Funktionen laufen auf Cloudflare Workers (über Vercel) und bieten nahezu keine Kaltstart-Zeiten. Verwenden Sie sie für:

| Anwendungsfall | Beispiel |
|---|---|
| Geolokalisierungs-basiertes Routing | Benutzer zu regionalen Inhalten weiterleiten |
| A/B-Tests | Zu Experimentvarianten weiterleiten |
| Authentifizierungsprüfungen | Schnelle Session-Validierung |
| Antwort-Transformation | Header hinzufügen, Antworten modifizieren |
| Einfache API-Endpunkte | Leichtgewichtige Datenabrufe |

### Edge-Runtime-Einschränkungen

| Einschränkung | Detail |
|---|---|
| Keine Node.js-APIs | Kann `fs`, `child_process` etc. nicht verwenden |
| Keine nativen Module | Kann `bcryptjs`, `postgres` nicht direkt verwenden |
| Begrenzte Ausführungszeit | Max. 30 Sekunden (Vercel Pro) |
| Begrenzter Speicher | 128 MB |
| Kein Drizzle ORM | Edge-kompatible Datenbankclients verwenden |

### Beispiel-Edge-Funktion

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

## Horizontale Skalierungsstrategien

### Zustandsloses Anwendungsdesign

Das Template ist auf der Anwendungsebene zustandslos ausgelegt:

| Komponente | Status-Speicherort | Skalierungsauswirkung |
|---|---|---|
| Sessions | Datenbank oder JWT | Kein gemeinsamer Status zwischen Instanzen |
| Hintergrundjobs | Job-Manager (pro Instanz oder Trigger.dev) | Trigger.dev für Mehrinstanz-Betrieb verwenden |
| Datei-Uploads | Externer Speicher (S3, Supabase) | Keine lokale Dateisystemabhängigkeit |
| CMS-Inhalte | Git-Repository (geklont beim Build/Start) | Nur-Lese, identisch pro Instanz |
| Cache | In-Memory (pro Instanz) oder Redis | Redis für gemeinsamen Cache erwägen |

### Mehrinstanz-Überlegungen

Beim Betrieb mehrerer Instanzen (Docker Swarm, Kubernetes oder mehrere Vercel-Funktionen):

1. **Hintergrundjobs**: Trigger.dev oder Vercel Cron statt `LocalJobManager` verwenden, um doppelte Ausführungen zu vermeiden.
2. **Datenbankverbindungen**: Connection-Pooling aktivieren, um Verbindungserschöpfung zu verhindern.
3. **Session-Speicher**: Datenbankbasierte Sessions statt In-Memory-Stores verwenden.
4. **Cache-Invalidierung**: Gemeinsamen Cache (Redis) implementieren oder eventual consistency mit pro-Instanz-Caches akzeptieren.

## Monitoring bei Skalierung

### Wichtige zu verfolgende Metriken

| Metrik | Tool | Schwellenwert |
|---|---|---|
| Antwortzeit (p95) | Sentry, Vercel Analytics | < 500ms |
| Fehlerrate | Sentry | < 1% |
| Datenbankverbindungsanzahl | Datenbank-Dashboard | < 80% des Maximums |
| Funktions-Kaltstarts | Vercel Analytics | Häufigkeit überwachen |
| Cache-Trefferrate | Anwendungslogs | > 80% |
| Speichernutzung | Vercel/Docker-Metriken | < 80% des Limits |

### Sentry Performance Monitoring

Das Template konfiguriert Sentry mit Trace-Sampling:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Passen Sie `tracesSampleRate` basierend auf dem Traffic-Volumen an:

| Tägliche Anfragen | Empfohlene Sample-Rate |
|---|---|
| < 10.000 | 1,0 (100%) |
| 10.000–100.000 | 0,1 (10%) |
| 100.000–1.000.000 | 0,01 (1%) |
| > 1.000.000 | 0,001 (0,1%) |

## Lasttests

### Empfohlene Tools

| Tool | Anwendungsfall | Komplexität |
|---|---|---|
| `autocannon` | Schnelle HTTP-Benchmarks | Niedrig |
| `k6` | Geskriptete Lasttests | Mittel |
| `Artillery` | Komplexe Szenarien | Mittel |
| `Locust` | Python-basiert, verteilt | Hoch |

### Beispiel-Lasttest

```bash
# Schneller Benchmark mit autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# k6-Skript für detailliertere Tests
k6 run load-test.js
```

### Test-Checkliste

| Test | Ziel | Bestehungskriterium |
|---|---|---|
| Startseiten-Last | 100 gleichzeitige Benutzer | p95 < 1s |
| API-Endpunkt | 200 Anfragen/Sekunde | p95 < 500ms, 0% Fehler |
| Suchabfrage | 50 gleichzeitige Benutzer | p95 < 2s |
| Auth-Flow | 20 gleichzeitige Benutzer | Alle erfolgreich, keine Timeouts |

## Skalierungs-Checkliste

| Kategorie | Element | Priorität |
|---|---|---|
| **Datenbank** | Connection-Pooling aktivieren | Kritisch |
| **Datenbank** | Read-Replicas für hohe Leselast verwenden | Hoch |
| **Datenbank** | Indizes für langsame Abfragen hinzufügen | Hoch |
| **Caching** | CDN-Caching-Header konfigurieren | Kritisch |
| **Caching** | ISR für Inhaltsseiten implementieren | Hoch |
| **Caching** | Redis für gemeinsamen Cache hinzufügen (bei Mehrinstanz) | Mittel |
| **Compute** | Edge-Runtime für leichtgewichtige Routen verwenden | Mittel |
| **Compute** | Kaltstarts mit externen Paketen optimieren | Hoch |
| **Jobs** | Auf Trigger.dev für Mehrinstanz-Betrieb wechseln | Hoch |
| **Jobs** | Vercel Cron für geplante Aufgaben konfigurieren | Hoch |
| **Monitoring** | Sentry mit angemessenem Sampling einrichten | Kritisch |
| **Monitoring** | Alerts für Fehlerrate und Latenz konfigurieren | Hoch |
| **Testing** | Lasttests vor größeren Launches durchführen | Hoch |
