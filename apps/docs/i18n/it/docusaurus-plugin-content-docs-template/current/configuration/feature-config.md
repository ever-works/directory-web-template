---
id: feature-config
title: "Configurazione Funzionalità"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Configurazione Funzionalità

Il template utilizza un sistema di flag di funzionalità per abilitare o disabilitare le funzionalità in modo controllato in base alla configurazione del sistema. Questo permette all'applicazione di funzionare senza database (servendo solo contenuto statico) mentre le funzionalità si abilitano progressivamente man mano che l'infrastruttura diventa disponibile.

## Modulo flag di funzionalità

I flag di funzionalità sono definiti in `lib/config/feature-flags.ts`.

### Interfaccia FeatureFlags

```ts
interface FeatureFlags {
  /** Funzionalità di valutazioni e recensioni degli utenti */
  ratings: boolean;
  /** Commenti degli utenti sugli elementi */
  comments: boolean;
  /** Raccolta di elementi preferiti degli utenti */
  favorites: boolean;
  /** Visualizzazione degli elementi in evidenza gestita dall'amministratore */
  featuredItems: boolean;
  /** Sondaggi utente e raccolta di feedback */
  surveys: boolean;
}
```

### Come vengono determinati i flag

Tutte le funzionalità attuali dipendono dalla disponibilità del database. Una funzionalità è abilitata quando `DATABASE_URL` è configurato:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Questo design consente al template di servire contenuto dal CMS basato su Git senza alcun database, mentre le funzionalità interattive dipendenti dal database (valutazioni, commenti, preferiti) vengono disabilitate automaticamente.

### Funzioni di utilità

Il modulo fornisce diverse funzioni helper:

```ts
// Controllare una singola funzionalità
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Renderizzare il componente commenti
}

// Ottenere tutte le funzionalità abilitate
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// es. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Ottenere tutte le funzionalità disabilitate (utile per il debug)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Controllare se tutto è pronto
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Riferimento API completo

| Funzione | Restituisce | Descrizione |
|----------|-------------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | Tutti i flag come oggetto booleano |
| `isFeatureEnabled(name)` | `boolean` | Controllare una singola funzionalità per nome |
| `getEnabledFeatures()` | `string[]` | Array di nomi di funzionalità abilitate |
| `getDisabledFeatures()` | `string[]` | Array di nomi di funzionalità disabilitate |
| `areAllFeaturesEnabled()` | `boolean` | Vero se ogni funzionalità è abilitata |

## Rendering dipendente dalle funzionalità

### Nei Server Component

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### Nelle route API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Gestire la creazione del commento...
}
```

## Configurazione del sito (siteConfig)

Oltre ai flag di funzionalità, il template fornisce un oggetto `siteConfig` in `lib/config.ts` per la personalizzazione di branding e metadati. Ogni valore può essere sovrascritto tramite variabili d'ambiente:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Personalizzazione tramite variabili d'ambiente

| Variabile | Predefinito | Scopo |
|-----------|-------------|-------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Nome del sito nei metadati e nelle immagini OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | Predefinito del template | Tagline della homepage |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | URL completo del sito (senza barra finale) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Percorso logo relativo a `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Nome organizzazione Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Predefinito del template | Meta descrizione SEO |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Predefiniti del template | Parole chiave SEO separate da virgola |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Colore di inizio gradiente immagine OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Colore di fine gradiente immagine OG |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | URL Ever Works | Link profilo GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | URL Ever Works | Link profilo X (Twitter) |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Link footer "Realizzato con" |

### Validazione

La funzione `validateSiteConfig()` controlla la presenza di variabili critiche per la produzione:

```ts
import { validateSiteConfig } from '@/lib/config';

// Restituisce true se tutte le variabili richieste sono impostate, altrimenti false con avvisi
const isValid = validateSiteConfig();
```

Gli avvisi vengono registrati per `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_SITE_NAME` mancanti.

## ConfigManager (Configurazione YAML)

La classe `ConfigManager` in `lib/config-manager.ts` gestisce il file `config.yml` dal repository CMS basato su Git. Gestisce la lettura, la scrittura e il commit delle modifiche alla configurazione.

### Lettura della configurazione

```ts
import { configManager } from '@/lib/config-manager';

// Ottenere l'intera configurazione
const config = configManager.getConfig();

// Ottenere una chiave specifica
const pagination = configManager.getPaginationConfig();
// Restituisce: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Ottenere un valore annidato
const value = configManager.getNestedValue('pagination.type');
```

### Scrittura della configurazione

Tutte le scritture vengono automaticamente committate e inviate al repository Git:

```ts
// Aggiornare la paginazione
await configManager.updatePagination('infinite', 24);

// Aggiornare qualsiasi chiave di livello superiore
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Aggiornare una chiave annidata
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Integrazione Git

Il ConfigManager esegue automaticamente:
1. Scrittura del file YAML nella directory dei contenuti
2. Accodamento di un commit Git con un messaggio descrittivo
3. Push al repository GitHub configurato
4. Serializzazione delle operazioni Git per prevenire conflitti di scrittura concorrenti

I messaggi di commit sono contestualizzati:

```ts
// Per le modifiche alla paginazione:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Per la navigazione dell'intestazione:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Per le chiavi generiche:
"Update config.yml: myKey - 2024-01-20T..."
```

### Sicurezza

Il ConfigManager include la protezione dalla contaminazione dei prototipi:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

I tentativi di aggiornare le chiavi `__proto__`, `constructor` o `prototype` vengono silenziosamente rifiutati.

## File correlati

| Percorso | Descrizione |
|----------|-------------|
| `lib/config/feature-flags.ts` | Definizioni dei flag di funzionalità e funzioni di utilità |
| `lib/config.ts` | siteConfig sicuro per il client e ri-esportazioni dei tipi |
| `lib/config-manager.ts` | Lettore/scrittore configurazione YAML con integrazione Git |
| `lib/config/index.ts` | Barrel export per il modulo di configurazione |
| `lib/config/config-service.ts` | Singleton ConfigService lato server |
| `lib/config/types.ts` | Definizioni di tipi TypeScript per la configurazione |
| `.env.example` | Elenco completo delle opzioni delle variabili d'ambiente |
