---
id: overview
title: Przegląd Wdrożenia
sidebar_label: Przegląd
sidebar_position: 1
---

# Przegląd Wdrożenia

Szablon Ever Works obsługuje wiele platform wdrożeniowych z pierwszorzędnym wsparciem dla Vercel. Ten przewodnik omawia konfigurację produkcyjną, strategie wdrożenia i najlepsze praktyki.

## Obsługiwane Platformy

### Zalecane

| Platforma | Opis | Najlepsza Dla |
|-----------|------|--------------|
| **Vercel** | Oficjalna platforma Next.js | Najprostsze wdrożenie, wbudowane edge functions |
| **Netlify** | Platforma Jamstack | Dobre narzędzia, łatwe CI/CD |
| **Railway** | Prosty PaaS | Baza danych + aplikacja w jednym miejscu |
| **Render** | Nowoczesny PaaS | Dobry balans funkcji i kosztów |

### Samodzielny Hosting

| Platforma | Opis |
|-----------|------|
| **Docker** | Oparty na kontenerach, przenośny |
| **VPS (Ubuntu/Debian)** | Pełna kontrola, więcej konfiguracji |
| **AWS EC2 / ECS** | Skalowalny, ekosystem AWS |
| **Google Cloud Run** | Serverless kontenerowy |

## Lista Kontrolna Przed Wdrożeniem

### Kod & Build

- [ ] Wszystkie testy przechodzą: `pnpm lint && pnpm tsc --noEmit`
- [ ] Build zakończony sukcesem: `pnpm build`
- [ ] Zmienne środowiskowe zweryfikowane
- [ ] Schemat bazy danych zaktualizowany

### Baza Danych

- [ ] `DATABASE_URL` wskazuje na produkcyjną bazę danych
- [ ] Migracje przetestowane w środowisku staging
- [ ] Kopia zapasowa wykonana przed wdrożeniem
- [ ] Pula połączeń skonfigurowana prawidłowo

### Bezpieczeństwo

- [ ] `AUTH_SECRET` to silny losowy ciąg (32+ znaków)
- [ ] `COOKIE_SECRET` to silny losowy ciąg (32+ znaków)
- [ ] `COOKIE_SECURE=true` w produkcji
- [ ] Wszystkie dane uwierzytelniające OAuth skonfigurowane
- [ ] `CRON_SECRET` ustawiony jeśli używasz Vercel Crons

### Monitorowanie

- [ ] Sentry DSN skonfigurowany (jeśli używasz Sentry)
- [ ] Klucz PostHog skonfigurowany (jeśli używasz PostHog)
- [ ] Endpoint sprawdzania stanu przetestowany

## Konfiguracja Środowiska Produkcyjnego

### Niezbędne Zmienne Środowiskowe

```bash
# ===== REQUIRED =====
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com

# Auth secrets (generate with: openssl rand -base64 32)
AUTH_SECRET=your-auth-secret-here
COOKIE_SECRET=your-cookie-secret-here
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_POOL_SIZE=20

# ===== RECOMMENDED =====

# OAuth (at least one)
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Exception tracking
EXCEPTION_PROVIDER=posthog  # or sentry, both, none
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Cron jobs (required for Vercel Crons)
CRON_SECRET=your-cron-secret-here

# ===== OPTIONAL =====

# Content repo
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Bezpieczeństwo Środowiska

- Nigdy nie commituj `.env` ani `.env.local` do repozytorium
- Używaj zmiennych per środowisko (produkcja vs. preview vs. deweloperskie)
- Regularnie rotuj secrets
- Używaj skarbca secrets platformy (Vercel Encrypted Env, AWS Secrets Manager)
- Sprawdź, które zmienne zaczynają się od `NEXT_PUBLIC_` — są ujawniane po stronie klienta
- Regularnie audytuj dostęp do zmiennych środowiskowych

## Konfiguracja Build

### next.config.js

```typescript
// next.config.ts
const nextConfig = {
  output: 'standalone',  // for Docker deployments
  experimental: {
    instrumentationHook: true,  // for auto db initialization
  },
};
```

### Skrypty Build

```json
{
  "scripts": {
    "build": "next build",
    "build:migrate": "tsx scripts/build-migrate.ts && next build",
    "postbuild": "next-sitemap"
  }
}
```

Użyj `build:migrate` jeśli chcesz automatycznie uruchomić migracje bazy danych podczas buildu (przydatne dla platform, które nie obsługują osobnych komend wydania).

## Wdrożenie Bazy Danych

### Strategia Migracji

```bash
# Option 1: Run during build (automatic)
pnpm build:migrate

# Option 2: Run as release command
pnpm db:migrate

# Option 3: Run manually before deployment
cd apps/web && pnpm db:migrate
```

### Dostawcy Bazy Danych

| Dostawca | Najlepszy Dla | Notatki |
|---------|--------------|---------|
| **Supabase** | Szybki rozwój | Zarządzany PostgreSQL + Auth + Storage |
| **PlanetScale** | Globalna skala | Serverless PostgreSQL, branching |
| **Neon** | Serverless | Serverless PostgreSQL, dobry dla Vercel |
| **Railway** | Prosty | Dobry dla małych/średnich projektów |
| **AWS RDS** | Korporacyjny | Pełna kontrola, wyższy koszt |

### Strategia Kopii Zapasowych

Skonfiguruj automatyczne codzienne kopie zapasowe u dostawcy bazy danych. Przed większymi wdrożeniami:

```bash
# Backup manual via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or via provider CLI
supabase db dump -f backup.sql
```

## CDN & Zasoby Statyczne

### Vercel (Automatyczny)

Vercel automatycznie serwuje zasoby statyczne przez swoją globalną CDN — żadna konfiguracja nie jest potrzebna.

### Cloudflare

```javascript
// next.config.ts additions for Cloudflare
assetPrefix: process.env.CDN_URL,
```

### Amazon CloudFront

```javascript
// next.config.ts additions for CloudFront
assetPrefix: `https://${process.env.CLOUDFRONT_DISTRIBUTION}.cloudfront.net`,
```

## SSL/TLS

Vercel i Netlify automatycznie provisionują certyfikaty SSL przez Let's Encrypt dla niestandardowych domen.

Dla samodzielnego hostingu, użyj **Nginx** z certbotem:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Monitorowanie Produkcji

```bash
# Essential monitoring variables
EXCEPTION_PROVIDER=posthog  # or sentry
NEXT_PUBLIC_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...@sentry.io/...

# Log level
LOG_LEVEL=info  # debug | info | warn | error
```

## Strategie Wdrożenia

### Wdrożenie Blue-Green

Używane do aktualizacji bez przestojów:

1. Utrzymuj aktualną instancję produkcyjną (**blue**) działającą
2. Wdroż nową wersję na identycznej instancji (**green**)
3. Uruchom smoke testy w środowisku green
4. Przełącz ruch z blue na green przez load balancer
5. Utrzymuj blue aktywne przez 30 min. jako fallback
6. Zakończ instancję blue po potwierdzeniu

### Wdrożenie Rolling (Domyślne Vercel)

Vercel automatycznie przeprowadza rolling deployments — stare instancje obsługują ruch dopóki nowe nie będą gotowe.

### Wdrożenie Canary

```bash
# Example using Vercel
vercel --prod --target production  # 100% traffic

# Or split traffic (requires Enterprise/Pro)
# Route 10% to new version first
```

## Rollback

### Vercel

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → select old deployment → Promote to Production
```

### Rollback Oparty na Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit (careful with shared repos)
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

## Bezpieczeństwo Produkcji

- Używaj HTTPS na wszystkich trasach (Vercel: automatycznie)
- Ustaw nagłówki bezpieczeństwa (CSP, HSTS, X-Frame-Options) w `next.config.ts`
- Włącz rate limiting na endpointach API
- Sanityzuj wszystkie dane wejściowe użytkownika przed zapisaniem
- Używaj prepared statements (Drizzle obsługuje to automatycznie)
- Przejrzyj uprawnienia bazy danych — użytkownik aplikacji powinien mieć minimalnie niezbędny dostęp
- Rotuj secrets po każdym podejrzeniu kompromitacji
- Monitoruj logi uwierzytelniania pod kątem podejrzanych włamań
