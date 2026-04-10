---
id: vercel
title: Distribuzione su Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Distribuzione su Vercel

Distribuisci il tuo sito web directory Ever Works su Vercel per una distribuzione rapida e globale.

## Prerequisiti

- Account Vercel
- Repository GitHub con il tuo progetto Ever Works

## Deploy Rapido

### 1. Connetti il Repository

1. Visita [vercel.com](https://vercel.com)
2. Clicca su "New Project"
3. Importa il tuo repository GitHub
4. Seleziona la cartella `website` come directory radice

### 2. Configura le Impostazioni di Build

Vercel rileverà automaticamente Next.js. Verifica queste impostazioni:

- **Framework Preset**: Next.js
- **Directory Radice**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Variabili d'Ambiente

Aggiungi le tue variabili d'ambiente nel dashboard Vercel:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Deploy

Clicca su "Deploy" e Vercel costruirà e distribuirà il tuo sito automaticamente.

## Dominio Personalizzato

### 1. Aggiungi Dominio

Nel dashboard del tuo progetto Vercel:
1. Vai a "Impostazioni" → "Domini"
2. Aggiungi il tuo dominio personalizzato
3. Segui le istruzioni di configurazione DNS

### 2. Certificato SSL

Vercel fornisce automaticamente certificati SSL per tutti i domini.

## Configurazione Avanzata

### File di Configurazione Vercel

Crea `vercel.json` nella radice del tuo progetto:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Ottimizzazione della Build

Ottimizza la tua build per Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## Monitoraggio e Analytics

### Vercel Analytics

Abilita Vercel Analytics nel tuo progetto:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### Monitoraggio delle Prestazioni

Monitora le prestazioni del tuo deploy:
- Core Web Vitals
- Tempi di esecuzione delle funzioni
- Prestazioni della build

## Risoluzione dei Problemi

### Problemi Comuni

1. **Fallimenti della Build**: Controlla i log di build nel dashboard Vercel
2. **Variabili d'Ambiente**: Assicurati che tutte le variabili richieste siano impostate
3. **Problemi di Dominio**: Verifica la configurazione DNS

### Modalità Debug

Abilita la modalità debug per log dettagliati:

```bash
# In your environment variables
DEBUG=1
```

## Prossimi Passi

- [Variabili d'Ambiente](/docs/deployment/environment-variables) - Configura il tuo deploy
- [Monitoraggio](/docs/deployment/monitoring) - Monitora la tua applicazione
- [Supporto](/docs/advanced-guide/support) - Ottieni aiuto con il deploy
