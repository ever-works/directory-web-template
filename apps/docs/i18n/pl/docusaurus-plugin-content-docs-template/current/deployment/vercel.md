---
id: vercel
title: Wdrożenie na Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Wdrożenie na Vercel

Wdróż swoją witrynę katalogu Ever Works na Vercel dla szybkiej, globalnej dystrybucji.

## Wymagania Wstępne

- Konto Vercel
- Repozytorium GitHub z Twoim projektem Ever Works

## Szybkie Wdrożenie

### 1. Połącz Repozytorium

1. Odwiedź [vercel.com](https://vercel.com)
2. Kliknij „New Project"
3. Zaimportuj swoje repozytorium GitHub
4. Wybierz folder `website` jako katalog główny

### 2. Skonfiguruj Ustawienia Buildu

Vercel automatycznie wykryje Next.js. Sprawdź te ustawienia:

- **Framework Preset**: Next.js
- **Katalog Główny**: `website`
- **Polecenie Buildu**: `npm run build`
- **Katalog Wyjściowy**: `.next`

### 3. Zmienne Środowiskowe

Dodaj swoje zmienne środowiskowe w panelu Vercel:

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

### 4. Wdróż

Kliknij „Deploy", a Vercel automatycznie zbuduje i wdroży Twoją stronę.

## Domena Niestandardowa

### 1. Dodaj Domenę

W panelu Twojego projektu Vercel:
1. Przejdź do „Ustawień" → „Domeny"
2. Dodaj swoją domenę niestandardową
3. Postępuj zgodnie z instrukcjami konfiguracji DNS

### 2. Certyfikat SSL

Vercel automatycznie udostępnia certyfikaty SSL dla wszystkich domen.

## Zaawansowana Konfiguracja

### Plik Konfiguracyjny Vercel

Utwórz `vercel.json` w katalogu głównym projektu:

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

### Optymalizacja Buildu

Zoptymalizuj swój build dla Vercel:

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

## Monitorowanie i Analityka

### Vercel Analytics

Włącz Vercel Analytics w swoim projekcie:

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

### Monitorowanie Wydajności

Monitoruj wydajność swojego wdrożenia:
- Core Web Vitals
- Czasy wykonywania funkcji
- Wydajność buildu

## Rozwiązywanie Problemów

### Typowe Problemy

1. **Błędy Buildu**: Sprawdź logi buildu w panelu Vercel
2. **Zmienne Środowiskowe**: Upewnij się, że wszystkie wymagane zmienne są ustawione
3. **Problemy z Domeną**: Zweryfikuj konfigurację DNS

### Tryb Debugowania

Włącz tryb debugowania dla szczegółowych logów:

```bash
# In your environment variables
DEBUG=1
```

## Następne Kroki

- [Zmienne Środowiskowe](/docs/deployment/environment-variables) - Skonfiguruj swoje wdrożenie
- [Monitorowanie](/docs/deployment/monitoring) - Monitoruj swoją aplikację
- [Wsparcie](/docs/advanced-guide/support) - Uzyskaj pomoc z wdrożeniem
