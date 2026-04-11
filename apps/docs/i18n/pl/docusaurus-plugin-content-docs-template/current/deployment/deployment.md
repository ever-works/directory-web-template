---
id: deployment-introduction
title: Wprowadzenie do Wdrożeń
sidebar_label: Wprowadzenie do Wdrożeń
sidebar_position: 1
---

# Wprowadzenie do Wdrożeń

Ten przewodnik zawiera kompleksowy przegląd wdrażania szablonu Ever Works w środowiskach produkcyjnych. Szablon jest zbudowany na Next.js 16 z trybem wyjścia standalone, co czyni go kompatybilnym z szeroką gamą platform hostingowych i skonteneryzowanych wdrożeń.

## Przegląd Architektury

Szablon Ever Works tworzy **samodzielny build Next.js**, który pakuje wszystkie zależności w jedną wdrażalną jednostkę. Jest to skonfigurowane w `next.config.ts`:

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

Ustawienie `output: "standalone"` tworzy samowystarczalny artefakt wdrożenia, który zawiera tylko niezbędne pliki `node_modules`, znacznie redukując rozmiar wdrożenia.

## Obsługiwane Platformy

### Zalecana: Vercel

Vercel jest zalecaną platformą wdrożeniową dla szablonu. Oferuje:

- Wdrożenie zero-konfiguracyjne dla aplikacji Next.js
- Automatyczne udostępnianie certyfikatów SSL
- Wbudowane planowanie zadań cron przez `vercel.json`
- Obsługę funkcji bezserwerowych dla tras API
- Wdrożenia podglądu dla pull requestów

Szablon zawiera konfigurację `vercel.json` z predefiniowanymi harmonogramami cron:

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

### Samodzielnie Hostowane: Docker

Wyjście standalone obsługuje konteneryzację Docker. Typowe wdrożenie używa środowiska uruchomieniowego Node.js do obsługi zbudowanej aplikacji. Kluczowym wymaganiem jest zapewnienie, że katalog wyjściowy `standalone` oraz foldery `public` i `.next/static` zostaną skopiowane do obrazu kontenera.

### Inne Platformy Chmurowe

Szablon może być wdrożony na dowolnej platformie obsługującej aplikacje Node.js:

- **Railway** -- Proste wdrożenie full-stack z wbudowanym PostgreSQL
- **DigitalOcean App Platform** -- Zarządzane wdrożenia kontenerów
- **AWS (EC2, ECS lub App Runner)** -- Skalowalna infrastruktura chmurowa
- **Google Cloud Run** -- Bezserwerowa platforma kontenerów
- **Azure App Service** -- Zarządzany hosting Node.js

## Wymagania Wstępne

### Wymagania Systemowe

- **Node.js**: wersja 20.19.0 lub wyższa (zdefiniowana w polu `engines` `package.json`)
- **Menedżer Pakietów**: pnpm (projekt używa `pnpm-lock.yaml`)
- **Baza Danych**: PostgreSQL (wymagana dla funkcji produkcyjnych jak auth, subskrypcje, analityka)
- **Pamięć**: Co najmniej 8 GB RAM zalecane dla procesu budowania

Skrypt budowania jawnie przydziela dodatkową pamięć:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### Wymagane Zmienne Środowiskowe

Przed wdrożeniem upewnij się, że te krytyczne zmienne są skonfigurowane. Skrypt `scripts/check-env.js` sprawdza je automatycznie:

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

Skrypt sprawdzania środowiska kategoryzuje zmienne według integracji:

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

### Opcjonalne Integracje

Te zmienne środowiskowe włączają opcjonalne funkcje:

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

## Przewodnik Szybkiego Wdrożenia

### Krok 1: Przygotowanie Buildu

Uruchom pełny proces budowania lokalnie, aby sprawdzić, czy wszystko się kompiluje:

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

Skrypt `build` wykonuje kilka kroków kolejno:

1. **Sprawdzenie środowiska** (`scripts/check-env.js`) -- weryfikuje wymagane zmienne
2. **Generowanie OpenAPI** (`scripts/generate-openapi.ts`) -- generuje dokumentację API
3. **Migracje bazy danych** (`scripts/build-migrate.ts`) -- stosuje oczekujące zmiany schematu
4. **Build Next.js** (`next build`) -- kompiluje aplikację

### Krok 2: Migracja Bazy Danych Podczas Budowania

Skrypt `scripts/build-migrate.ts` uruchamia się automatycznie podczas budowania. Obsługuje różne środowiska:

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

Kluczowe zachowania:

- **Buildy produkcyjne**: Błędy migracji powodują niepowodzenie buildu (zapobiega uszkodzonym wdrożeniom)
- **Wdrożenia podglądu**: Błędy połączenia są tolerowane (baza danych może nie być jeszcze skonfigurowana)
- **Buildy CI** (nie-Vercel): Migracje są całkowicie pomijane

### Krok 3: Inicjalizacja Środowiska Uruchomieniowego

Gdy aplikacja startuje, plik `instrumentation.ts` inicjuje inicjalizację bazy danych:

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

Sekwencja inicjalizacji:

1. Uruchom oczekujące migracje (Drizzle obsługuje idempotencję)
2. Sprawdź czy baza danych jest zasiana
3. Jeśli nie, zdobądź blokadę doradczą PostgreSQL i uruchom skrypt seedowania
4. Zwolnij blokadę po seedowaniu

### Krok 4: Wdrożenie na Vercel

Dla wdrożeń Vercel połącz swoje repozytorium i skonfiguruj:

1. Ustaw **Framework Preset** na Next.js
2. Ustaw **Polecenie Buildu** na `pnpm build`
3. Ustaw **Polecenie Instalacji** na `pnpm install`
4. Dodaj wszystkie wymagane zmienne środowiskowe w panelu Vercel
5. Wdróż

### Krok 5: Weryfikacja Wdrożenia

Po wdrożeniu sprawdź:

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## Nagłówki Bezpieczeństwa

Szablon automatycznie konfiguruje nagłówki bezpieczeństwa w `next.config.ts`:

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

## Konfiguracja Puli Połączeń

Pula połączeń bazy danych jest konfigurowalna przez zmienną środowiskową `DB_POOL_SIZE`:

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

- **Domyślna produkcja**: 20 połączeń
- **Domyślna deweloperska**: 10 połączeń
- **Konfigurowalny zakres**: 1 do 50 połączeń
- **Limit czasu bezczynności**: 20 sekund
- **Limit czasu połączenia**: 30 sekund

## Następne Kroki

- [SSL i Domeny Niestandardowe](./ssl-domains.md) -- Konfiguruj domeny niestandardowe i certyfikaty SSL
- [Zarządzanie Bazą Danych](./database-management.md) -- Operacje na produkcyjnej bazie danych
- [Kopia Zapasowa i Odzysk](./backup-recovery.md) -- Strategie kopii zapasowych bazy danych
- [Monitorowanie](./monitoring.md) -- Konfiguruj śledzenie błędów i monitorowanie wydajności
