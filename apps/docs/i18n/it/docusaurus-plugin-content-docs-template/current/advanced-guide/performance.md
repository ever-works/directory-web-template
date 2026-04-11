---
id: performance
title: Ottimizzazione delle prestazioni
sidebar_label: Prestazione
sidebar_position: 5
---

# Ottimizzazione delle prestazioni

Questa guida illustra le ottimizzazioni delle prestazioni integrate nel modello Ever Works e le tecniche per mantenere tempi di caricamento rapidi man mano che la tua applicazione cresce.

## Configurazione Next.js

Il `next.config.ts` del modello include diverse impostazioni incentrate sulle prestazioni:

### Uscita autonoma

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

La modalità di output `standalone` crea una build autonoma che include solo i file necessari per eseguire l'applicazione. Ciò riduce le dimensioni del contenitore e i tempi di avvio della produzione.

### Ottimizzazione dell'importazione dei pacchetti

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

Questa impostazione abilita lo scuotimento degli alberi per i pacchetti pesanti con file di barili. Invece di importare l'intera libreria `@heroui/react` o `lucide-react` , nel bundle vengono inclusi solo i componenti effettivamente utilizzati.

### Ottimizzazione dell'orologio Webpack

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

La directory `.content/` (CMS basato su Git con oltre 220 file markdown) è esclusa dal file watcher del webpack in fase di sviluppo. Ciò impedisce ricostruzioni non necessarie quando i file di contenuto cambiano e riduce significativamente l'utilizzo della CPU durante lo sviluppo.

### Avvisi soppressi

La registrazione dettagliata dell'infrastruttura viene eliminata negli ambienti CI e Vercel:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Ottimizzazione dell'immagine

### Modelli remoti

Il modello genera dinamicamente modelli di immagini remote consentite utilizzando `generateImageRemotePatterns()` . Ciò garantisce che le immagini provenienti da CDN configurati e da fonti esterne siano ottimizzate tramite la pipeline di immagini integrata di Next.js.

### Gestione SVG

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Le immagini SVG sono consentite ma protette da una rigorosa politica di sicurezza dei contenuti che disabilita l'esecuzione degli script. Ciò consente loghi e icone SVG prevenendo l'XSS tramite l'iniezione SVG.

### Migliori pratiche per le immagini

| Tecnica | Attuazione | Impatto |
|---|---|---|
| Utilizzare `next/image` | Componente integrato con caricamento lento | WebP/AVIF automatico, dimensioni reattive |
| Imposta dimensioni esplicite | `width` e `height` oggetti di scena | Impedisce lo spostamento cumulativo del layout (CLS) |
| Utilizzare `priority` per LCP | `<Image priority />` per le immagini degli eroi | Precarica l'immagine Paint con contenuto più grande |
| Usa `sizes` oggetto | `sizes="(max-width: 768px) 100vw, 50vw"` | Impedisce il download di immagini di grandi dimensioni |
| Segnaposto sfocatura | `placeholder="blur"` con `blurDataURL` | Migliora la velocità di caricamento percepita |

## Strategie di memorizzazione nella cache

### Intestazioni HTTP

Il modello imposta le intestazioni relative alla cache in `next.config.ts` :

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

La prelettura DNS è abilitata a livello globale per ridurre la latenza di ricerca DNS per risorse esterne.

### Generazione statica

Il modello utilizza un timeout generoso per la generazione di pagine statiche:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Ciò è adatto alle pagine che recuperano dati da API esterne o dal CMS basato su Git durante la fase di creazione.

### Configurazione ETag

```typescript
generateEtags: false,
```

Gli ETag sono disabilitati a livello Next.js perché il proxy CDN/inverso (Vercel Edge Network o Cloudflare) gestisce la convalida della cache in modo più efficiente.

### Cache a livello di applicazione

Il processore in background di analisi preriscalda le cache a intervalli regolari:

| Tipo di cache | Intervallo di aggiornamento | Dati |
|---|---|---|
| Tendenze di crescita degli utenti | 10 minuti | Crescita mensile degli utenti per 6, 12, 24 mesi |
| Andamento dell'attività | 5 minuti | Dati di attività per finestre di 7, 14, 30 giorni |
| Classifica degli articoli principali | 15 minuti | Primi 10, 20, 50 articoli |
| Attività recente | 2 minuti | Ultime 10 e 20 voci di attività |
| Metriche delle prestazioni | 30 secondi | Statistiche sulle prestazioni delle query |
| Pulizia della cache | 1 ora | Rimozione della voce cache scaduta |

## Caricamento lento

### Caricamento lento a livello di componente

Utilizzare `next/dynamic` per componenti pesanti che non sono necessari nel rendering iniziale:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### Suddivisione del codice a livello di percorso

Next.js App Router suddivide automaticamente il codice in base al percorso. Ogni pagina in `app/[locale]/` riceve il proprio bundle, quindi gli utenti scaricano solo il JavaScript necessario per la pagina corrente.

### Importazioni dinamiche nei processi in background

Il modello utilizza importazioni dinamiche all'interno delle richiamate dei lavori per impedire al webpack di inserire moduli solo server nel pacchetto client:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Ottimizzazione delle dimensioni del pacchetto

### Analisi del pacchetto

Eseguire quanto segue per controllare la composizione del bundle:

```bash
ANALYZE=true pnpm build
```

Se è configurato `@next/bundle-analyzer` , viene prodotta una mappa ad albero interattiva che mostra quali moduli contribuiscono alla dimensione del bundle.

### Tecniche comuni di ottimizzazione

| Tecnica | Esempio | Risparmio |
|---|---|---|
| Ottimizzazione del file barile | `optimizePackageImports` nella configurazione | Impedisce l'importazione di intere librerie di icone/interfaccia utente |
| Moduli solo server | `import 'server-only'` nei file lib | Impedisce il raggruppamento accidentale dei client |
| Importazioni dinamiche | `await import('@/lib/services/...')` | Rimanda il caricamento finché non è necessario |
| Pacchetti esterni | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Escluso dal raggruppamento di webpack |

La configurazione `serverExternalPackages` è particolarmente importante:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Questi pacchetti sono esclusi dal raggruppamento di webpack e caricati in modo nativo in fase di esecuzione, riducendo i tempi di compilazione ed evitando problemi di compatibilità con i moduli nativi.

## Suggerimenti per l'ottimizzazione del faro

### Obiettivi fondamentali dei parametri web vitali

| Metrico | Obiettivo | Fattori chiave |
|---|---|---|
| **LCP** (Dipinto con contenuto più grande) | < 2,5 s | Ottimizzazione delle immagini, caricamento prioritario, tempo di risposta del server |
| **FID** (Primo ritardo di ingresso) | < 100 ms | Suddivisione del codice, blocco minimo del thread principale |
| **CLS** (Spostamento cumulativo del layout) | < 0,1 | Dimensioni esplicite dell'immagine, strategia di caricamento dei caratteri |
| **TTFB** (Tempo al primo byte) | < 800 ms | Caching CDN, funzioni edge, ottimizzazione delle query del database |

### Lista di controllo pratica

1. **Immagini**: usa `next/image` con oggetti di scena espliciti `width` , `height` e `sizes` . Contrassegnare le immagini sopra la piega con `priority` .
2. **Caratteri**: utilizzare `next/font` per ospitare autonomamente i caratteri con `display: swap` e precaricare i file dei caratteri critici.
3. **JavaScript**: rivedi `optimizePackageImports` e aggiungi eventuali librerie di grandi dimensioni che utilizzano file barile.
4. **CSS**: il modello utilizza Tailwind CSS, che è già eliminato nelle build di produzione. Evita di importare moduli CSS inutilizzati.
5. **Script di terze parti**: rinvia gli script non critici utilizzando `next/script` con `strategy="lazyOnload"` .
6. **Componenti server**: l'impostazione predefinita è React Server Components (RSC) e utilizza solo `"use client"` dove è richiesta l'interattività.

### Faro in corsa

Il modello include una configurazione `lighthouse-test.json` . Esegui test Lighthouse automatizzati:

```bash
npx lhci autorun --config=lighthouse-test.json
```

Oppure utilizza il pannello Lighthouse di Chrome DevTools per i controlli manuali.

## Prestazioni delle query sul database

### Pool di connessioni

Utilizzare il pool di connessioni per evitare di aprire una nuova connessione al database per richiesta. Consulta la [guida alla scalabilità](/deployment/scaling) per i dettagli sulla configurazione.

### Ottimizzazione delle query

- Utilizza il modello di repository ( `lib/repositories/` ) per centralizzare e ottimizzare le query.
- Il repository di analisi include livelli di cache integrati con TTL configurabile.
- Monitorare le query lente tramite il processo in background delle metriche delle prestazioni.

### Strategia di indicizzazione

Rivedere `lib/db/schema.ts` per gli indici esistenti. Aggiungi indici per:
- Colonne utilizzate nelle clausole `WHERE` - Colonne di chiave esterna
- Colonne utilizzate nelle clausole `ORDER BY` - Indici compositi per ricerche su più colonne

## Monitoraggio delle prestazioni

### Integrazione sentinella

Il modello integra Sentry per il monitoraggio delle prestazioni in `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Le tracce vengono campionate al 10% in produzione e al 100% in sviluppo. Regola `tracesSampleRate` in base al volume di traffico e ai limiti del piano Sentry.

### Indicatori di prestazione personalizzati

Utilizza l'API Web Performance per tempistiche personalizzate:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Riepilogo

| Zona | Ottimizzazione incorporata | Passaggi aggiuntivi |
|---|---|---|
| Immagini | WebP/AVIF automatico, sandbox SVG | Aggiungi `priority` alle immagini LCP, usa `sizes` |
| JavaScript | Ottimizzazione dei pacchetti, suddivisione del codice | Aggiungi librerie a `optimizePackageImports` |
| Memorizzazione nella cache | Riscaldamento della cache in background, prelettura DNS | Configurare le regole della cache CDN |
| Banca dati | Pool di connessioni, modello di repository | Aggiungi indici, monitora query lente |
| Costruisci | Output autonomo, pacchetti esterni | Abilita analizzatore bundle |
| Monitoraggio | Tracce sentinella, lavoro di misurazione delle prestazioni | Imposta avvisi per metriche degradate |
