---
id: vercel
title: Vercel-Bereitstellung
sidebar_label: Vercel
sidebar_position: 3
---

# Vercel-Bereitstellung

Stellen Sie Ihre Ever Works Verzeichnis-Website auf Vercel für schnelle, globale Verteilung bereit.

## Voraussetzungen

- Vercel-Konto
- GitHub-Repository mit Ihrem Ever Works-Projekt

## Schnell-Deployment

### 1. Repository verbinden

1. Besuchen Sie [vercel.com](https://vercel.com)
2. Klicken Sie auf „Neues Projekt"
3. Importieren Sie Ihr GitHub-Repository
4. Wählen Sie den `website`-Ordner als Stammverzeichnis

### 2. Build-Einstellungen konfigurieren

Vercel erkennt Next.js automatisch. Überprüfen Sie diese Einstellungen:

- **Framework Preset**: Next.js
- **Stammverzeichnis**: `website`
- **Build-Befehl**: `npm run build`
- **Ausgabeverzeichnis**: `.next`

### 3. Umgebungsvariablen

Fügen Sie Ihre Umgebungsvariablen im Vercel-Dashboard hinzu:

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

### 4. Deployen

Klicken Sie auf „Deploy", und Vercel erstellt und deployt Ihre Website automatisch.

## Benutzerdefinierte Domain

### 1. Domain hinzufügen

In Ihrem Vercel-Projekt-Dashboard:
1. Gehen Sie zu „Einstellungen" → „Domains"
2. Fügen Sie Ihre benutzerdefinierte Domain hinzu
3. Folgen Sie den DNS-Konfigurationsanweisungen

### 2. SSL-Zertifikat

Vercel stellt automatisch SSL-Zertifikate für alle Domains bereit.

## Erweiterte Konfiguration

### Vercel-Konfigurationsdatei

Erstellen Sie `vercel.json` im Projektstammverzeichnis:

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

### Build-Optimierung

Optimieren Sie Ihren Build für Vercel:

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

## Überwachung und Analytik

### Vercel Analytics

Aktivieren Sie Vercel Analytics in Ihrem Projekt:

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

### Leistungsüberwachung

Überwachen Sie Ihre Deployment-Leistung:
- Core Web Vitals
- Funktions-Ausführungszeiten
- Build-Leistung

## Fehlerbehebung

### Häufige Probleme

1. **Build-Fehler**: Build-Protokolle im Vercel-Dashboard prüfen
2. **Umgebungsvariablen**: Sicherstellen, dass alle erforderlichen Variablen gesetzt sind
3. **Domain-Probleme**: DNS-Konfiguration verifizieren

### Debug-Modus

Debug-Modus für detaillierte Protokolle aktivieren:

```bash
# In your environment variables
DEBUG=1
```

## Nächste Schritte

- [Umgebungsvariablen](/docs/deployment/environment-variables) - Deployment konfigurieren
- [Überwachung](/docs/deployment/monitoring) - Anwendung überwachen
- [Support](/docs/advanced-guide/support) - Deployment-Hilfe erhalten
