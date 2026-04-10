---
id: vercel
title: Vercel-implementatie
sidebar_label: Vercel
sidebar_position: 3
---

# Vercel-implementatie

Implementeer uw Ever Works directory-website op Vercel voor snelle, wereldwijde distributie.

## Vereisten

- Vercel-account
- GitHub-repository met uw Ever Works-project

## Snelle implementatie

### 1. Repository verbinden

1. Bezoek [vercel.com](https://vercel.com)
2. Klik op "Nieuw project"
3. Importeer uw GitHub-repository
4. Selecteer de `website`-map als hoofdmap

### 2. Build-instellingen configureren

Vercel detecteert Next.js automatisch. Controleer deze instellingen:

- **Framework Preset**: Next.js
- **Hoofdmap**: `website`
- **Build-commando**: `npm run build`
- **Uitvoermap**: `.next`

### 3. Omgevingsvariabelen

Voeg uw omgevingsvariabelen toe in het Vercel-dashboard:

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

### 4. Implementeren

Klik op "Deploy" en Vercel bouwt en implementeert uw site automatisch.

## Aangepast domein

### 1. Domein toevoegen

In uw Vercel-projectdashboard:
1. Ga naar "Instellingen" → "Domeinen"
2. Voeg uw aangepaste domein toe
3. Volg de DNS-configuratie-instructies

### 2. SSL-certificaat

Vercel verstrekt automatisch SSL-certificaten voor alle domeinen.

## Geavanceerde configuratie

### Vercel-configuratiebestand

Maak `vercel.json` aan in uw projecthoofdmap:

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

### Build-optimalisatie

Optimaliseer uw build voor Vercel:

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

## Bewaking en analyses

### Vercel Analytics

Vercel Analytics inschakelen in uw project:

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

### Prestatiebewaking

Bewaak uw implementatieprestaties:
- Core Web Vitals
- Uitvoeringstijden van functies
- Buildprestaties

## Probleemoplossing

### Veelvoorkomende problemen

1. **Buildfouten**: Bouwlogs controleren in het Vercel-dashboard
2. **Omgevingsvariabelen**: Controleer of alle vereiste variabelen zijn ingesteld
3. **Domeinproblemen**: DNS-configuratie verifiëren

### Foutopsporingsmodus

Foutopsporingsmodus inschakelen voor gedetailleerde logs:

```bash
# In your environment variables
DEBUG=1
```

## Volgende stappen

- [Omgevingsvariabelen](/docs/deployment/environment-variables) - Uw implementatie configureren
- [Bewaking](/docs/deployment/monitoring) - Uw applicatie bewaken
- [Ondersteuning](/docs/advanced-guide/support) - Hulp bij implementatie krijgen
