---
id: scaling
title: Scalabilità & Alta Disponibilità
sidebar_label: Scalabilità
sidebar_position: 4
---

# Scalabilità & Alta Disponibilità

Questa guida tratta le strategie per scalare il Ever Works Template da una distribuzione a singola istanza a una configurazione di produzione ad alta disponibilità, inclusa la configurazione serverless, il connection pooling, l'ottimizzazione CDN e le funzioni edge.

## Architettura di Distribuzione

Il template supporta più architetture di distribuzione:

| Architettura | Ideale per | Modello di Scalabilità |
|---|---|---|
| Vercel (Serverless) | La maggior parte delle distribuzioni | Scalabilità orizzontale automatica |
| Docker (Standalone) | Self-hosted, on-premise | Scalabilità manuale o basata su orchestratore |
| Node.js (Diretto) | Sviluppo, distribuzioni semplici | Istanza singola o cluster PM2 |

## Configurazione Serverless (Vercel)

### Output Standalone

Il template è configurato con output standalone per una distribuzione serverless ottimale:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

La modalità standalone produce un build autonomo in `.next/standalone/` che include solo i file necessari per eseguire l'applicazione. Questo minimizza i tempi di cold start riducendo la dimensione del pacchetto di distribuzione.

### Configurazione delle Funzioni

Configura le impostazioni delle funzioni serverless in `vercel.json` o tramite configurazione a livello di route:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // secondi (Piano Pro: fino a 300s)
export const dynamic = 'force-dynamic';
```

### Impostazioni Consigliate per le Funzioni

| Tipo di Route | Durata Max | Memoria | Note |
|---|---|---|---|
| Route API (semplici) | 10s | 1024 MB | Predefinito per la maggior parte degli endpoint |
| Route API (elaborazione dati) | 30s | 1024 MB | Per operazioni batch |
| Cron job | 60s | 1024 MB | Esecuzione di task in background |
| Handler webhook | 30s | 1024 MB | Callback pagamento, OAuth |
| Pagine statiche | N/A | N/A | Pre-renderizzate al momento del build |

### Ottimizzazione dei Cold Start

Minimizza i cold start con queste tecniche:

| Tecnica | Implementazione | Impatto |
|---|---|---|
| Minimizzare la dimensione della funzione | `serverExternalPackages` nella configurazione | Riduce il tempo di inizializzazione |
| Evitare import top-level | `import()` dinamico per moduli pesanti | Posticipa il caricamento fino al momento del bisogno |
| Usare edge runtime dove possibile | `export const runtime = 'edge'` | Cold start quasi nullo |
| Mantenere le funzioni attive | Endpoint health check con monitoraggio | Mantiene le funzioni attive |

## Connection Pooling del Database

### Il Problema

Negli ambienti serverless, ogni invocazione di funzione può aprire una nuova connessione al database. Senza pooling, questo può esaurire il limite di connessioni del database.

### Soluzione: Connection Pooler

Usa un connection pooler tra la tua applicazione e il database:

| Pooler | Provider | Configurazione |
|---|---|---|
| PgBouncer | Supabase (integrato) | Usa la stringa di connessione pooled (porta 6543) |
| Neon Pooler | Neon (integrato) | Usa la stringa di connessione `-pooler` |
| PgBouncer | Self-hosted | Distribuisci PgBouncer accanto a PostgreSQL |

### Configurazione

Usa diverse stringhe di connessione per connessioni pooled e dirette:

```bash
# Connessione pooled per le query dell'applicazione (sicura per serverless)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Connessione diretta solo per le migrazioni
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Aggiorna `drizzle.config.ts` per usare la connessione diretta per le migrazioni:

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

### Limiti di Connessione

| Livello | Max Connessioni | Dimensione Pool Consigliata |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Gestione delle Connessioni nel Codice

Il modulo database del template dovrebbe riutilizzare un singolo connection pool per istanza di funzione:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Crea il connection pool una volta per istanza serverless
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Connessioni massime nel pool
  idle_timeout: 20, // Chiudi connessioni inattive dopo 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN e Caching

### Vercel Edge Network

Quando distribuito su Vercel, la rete Edge fornisce automaticamente:

- Distribuzione CDN globale in oltre 30 regioni
- Caching automatico degli asset statici
- Edge caching per pagine ISR (Incremental Static Regeneration)
- Protezione DDoS

### Header Cache-Control

Configura il caching per diversi tipi di contenuto:

```typescript
// Route API con header cache
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Strategia di Caching per Tipo di Contenuto

| Tipo di Contenuto | Strategia Cache | TTL | Note |
|---|---|---|---|
| Asset statici (JS, CSS, immagini) | Immutabile | 1 anno | Nomi file con hash del contenuto |
| Pagine pubbliche | ISR | 60–300s | Rivalidazione su richiesta |
| Risposte API (pubbliche) | `s-maxage` | 10–60s | Caching a livello CDN |
| Risposte API (autenticate) | `no-store` | 0 | Non mettere mai in cache dati specifici dell'utente |
| Pagine di contenuto CMS | ISR | 300s | Rivalidare dopo la sincronizzazione dei contenuti |

### ISR (Incremental Static Regeneration)

Usa ISR per pagine ricche di contenuto che cambiano raramente:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Rigenera ogni 5 minuti

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### Rivalidazione On-Demand

Attiva la rivalidazione dopo gli aggiornamenti dei contenuti:

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

## Funzioni Edge

### Quando Usare l'Edge Runtime

Le funzioni edge girano su Cloudflare Workers (tramite Vercel) e forniscono tempi di cold start quasi nulli. Usale per:

| Caso d'Uso | Esempio |
|---|---|
| Routing basato sulla geolocalizzazione | Reindirizza gli utenti a contenuti regionali |
| Test A/B | Indirizza alle varianti dell'esperimento |
| Controlli di autenticazione | Validazione rapida della sessione |
| Trasformazione delle risposte | Aggiunta di header, modifica delle risposte |
| Endpoint API semplici | Ricerche di dati leggere |

### Limitazioni dell'Edge Runtime

| Limitazione | Dettaglio |
|---|---|
| Nessuna API Node.js | Non può usare `fs`, `child_process`, ecc. |
| Nessun modulo nativo | Non può usare `bcryptjs`, `postgres` direttamente |
| Tempo di esecuzione limitato | Max 30 secondi (Vercel Pro) |
| Memoria limitata | 128 MB |
| Nessun Drizzle ORM | Usa client database compatibili con edge |

### Esempio di Funzione Edge

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

## Strategie di Scalabilità Orizzontale

### Design dell'Applicazione Stateless

Il template è progettato per essere stateless a livello di applicazione:

| Componente | Posizione dello Stato | Impatto sulla Scalabilità |
|---|---|---|
| Sessioni | Database o JWT | Nessuno stato condiviso tra le istanze |
| Job in background | Job manager (per istanza o Trigger.dev) | Usa Trigger.dev per multi-istanza |
| Upload di file | Archiviazione esterna (S3, Supabase) | Nessuna dipendenza dal filesystem locale |
| Contenuto CMS | Repository Git (clonato al build/avvio) | Sola lettura, identico per istanza |
| Cache | In-memory (per istanza) o Redis | Considera Redis per cache condivisa |

### Considerazioni Multi-Istanza

Quando si eseguono più istanze (Docker Swarm, Kubernetes o più funzioni Vercel):

1. **Job in background**: Usa Trigger.dev o Vercel Cron invece di `LocalJobManager` per evitare esecuzioni duplicate.
2. **Connessioni database**: Abilita il connection pooling per evitare l'esaurimento delle connessioni.
3. **Archiviazione sessioni**: Usa sessioni basate su database invece di store in-memory.
4. **Invalidazione cache**: Implementa una cache condivisa (Redis) o accetta la consistenza eventuale con cache per istanza.

## Monitoraggio in Scala

### Metriche Chiave da Tracciare

| Metrica | Tool | Soglia |
|---|---|---|
| Tempo di risposta (p95) | Sentry, Vercel Analytics | < 500ms |
| Tasso di errore | Sentry | < 1% |
| Numero connessioni database | Dashboard database | < 80% del massimo |
| Cold start delle funzioni | Vercel Analytics | Monitorare la frequenza |
| Tasso di hit della cache | Log applicazione | > 80% |
| Utilizzo memoria | Metriche Vercel/Docker | < 80% del limite |

### Monitoraggio delle Prestazioni Sentry

Il template configura Sentry con campionamento delle trace:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Regola `tracesSampleRate` in base al volume di traffico:

| Richieste Giornaliere | Frequenza di Campionamento Consigliata |
|---|---|
| < 10.000 | 1,0 (100%) |
| 10.000–100.000 | 0,1 (10%) |
| 100.000–1.000.000 | 0,01 (1%) |
| > 1.000.000 | 0,001 (0,1%) |

## Test di Carico

### Strumenti Consigliati

| Strumento | Caso d'Uso | Complessità |
|---|---|---|
| `autocannon` | Benchmark HTTP rapidi | Bassa |
| `k6` | Test di carico scriptati | Media |
| `Artillery` | Scenari complessi | Media |
| `Locust` | Python-based, distribuito | Alta |

### Esempio di Test di Carico

```bash
# Benchmark rapido con autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# Script k6 per test più dettagliati
k6 run load-test.js
```

### Checklist dei Test

| Test | Obiettivo | Criterio di Superamento |
|---|---|---|
| Caricamento homepage | 100 utenti concorrenti | p95 < 1s |
| Endpoint API | 200 richieste/secondo | p95 < 500ms, 0% errori |
| Query di ricerca | 50 utenti concorrenti | p95 < 2s |
| Flusso di autenticazione | 20 utenti concorrenti | Tutti riusciti, nessun timeout |

## Checklist di Scalabilità

| Categoria | Elemento | Priorità |
|---|---|---|
| **Database** | Abilitare il connection pooling | Critico |
| **Database** | Usare repliche di lettura per carichi intensi | Alto |
| **Database** | Aggiungere indici per query lente | Alto |
| **Caching** | Configurare header di caching CDN | Critico |
| **Caching** | Implementare ISR per pagine di contenuto | Alto |
| **Caching** | Aggiungere Redis per cache condivisa (se multi-istanza) | Medio |
| **Compute** | Usare edge runtime per route leggere | Medio |
| **Compute** | Ottimizzare cold start con pacchetti esterni | Alto |
| **Job** | Passare a Trigger.dev per multi-istanza | Alto |
| **Job** | Configurare Vercel Cron per task pianificati | Alto |
| **Monitoraggio** | Configurare Sentry con campionamento appropriato | Critico |
| **Monitoraggio** | Configurare avvisi per tasso di errore e latenza | Alto |
| **Testing** | Eseguire test di carico prima dei lanci principali | Alto |
