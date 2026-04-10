---
id: ssl-domains
title: "SSL i Własne Domeny"
sidebar_label: "SSL & Domeny"
sidebar_position: 2
---

# SSL i Własne Domeny

Ten przewodnik obejmuje konfigurację własnych domen, zarządzanie certyfikatami SSL, konfigurację DNS i obsługę wielu domen dla Ever Works Template. Szablon zawiera nagłówki bezpieczeństwa na poziomie produkcyjnym i jest zoptymalizowany do wdrożenia na Vercel z automatycznym HTTPS, ale obsługuje również środowiska self-hosted z ręczną konfiguracją SSL.

## Wbudowane Nagłówki Bezpieczeństwa

Szablon konfiguruje kompleksowy zestaw nagłówków bezpieczeństwa w `next.config.ts`, które są automatycznie stosowane do każdej trasy. Te nagłówki wymuszają HTTPS, zapobiegają typowym atakom webowym i kontrolują ładowanie zasobów.

### Pełna Konfiguracja Nagłówków

Pełny blok nagłówków z `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### Opis Nagłówków

| Nagłówek | Wartość | Cel |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Zapobiega atakom MIME type sniffing |
| `X-Frame-Options` | `DENY` | Blokuje clickjacking poprzez uniemożliwienie osadzania w iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kontroluje ile informacji o refererze jest udostępnianych |
| `X-DNS-Prefetch-Control` | `on` | Włącza prefetching DNS dla szybszego ładowania |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Wymusza HTTPS przez 2 lata na wszystkich subdomenach |
| `Content-Security-Policy` | Patrz wyżej | Ogranicza, jakie zasoby może ładować przeglądarka |

### Szczegóły HSTS

Nagłówek Strict-Transport-Security używa maksymalnej zalecanej konfiguracji:

- **max-age=63072000** – przeglądarki pamiętają o używaniu HTTPS przez 2 lata
- **includeSubDomains** – wszystkie subdomeny muszą również używać HTTPS
- **preload** – kwalifikuje się do включenia na liście preload HSTS przeglądarek

:::caution
Gdy HSTS z preload jest aktywny i Twoja domena zostanie dodana do listy preload, jest bardzo trudno to cofnąć. Upewnij się, że Twój certyfikat SSL jest poprawnie skonfigurowany i z auto-odnowieniem przed włączeniem preload.
:::

### Opis Content Security Policy

| Dyrektywa | Wartość | Efekt |
|-----------|-------|--------|
| `default-src` | `'self'` | Ładuj zasoby tylko z tej samej domeny domyślnie |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Skrypty z tej samej domeny, skrypty inline i SDK płatności LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Style z tej samej domeny plus style inline (wymagane dla CSS-in-JS) |
| `img-src` | `'self' data: https:` | Obrazy z tej samej domeny, data URI i dowolne źródło HTTPS |
| `font-src` | `'self'` | Czcionki tylko z tej samej domeny |
| `connect-src` | `'self' https:` | Wywołania API do tej samej domeny i dowolnego punktu końcowego HTTPS |
| `frame-ancestors` | `'none'` | Zapobiega osadzaniu strony w ramkach |

## Konfiguracja Własnej Domeny

### Zmienne Środowiskowe dla Konfiguracji Domeny

Przy konfiguracji własnej domeny zaktualizuj te zmienne w środowisku wdrożenia:

```bash
# URL aplikacji – używany dla callbacków OAuth, kanonicznych URL, hreflang, sitemap
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Domena ciasteczka – musi odpowiadać Twojej domenie, aby cookies sesji działały
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL uwierzytelniania – używany przez NextAuth dla callbacków
NEXTAUTH_URL=https://yourdomain.com
```

Zmienna `NEXT_PUBLIC_APP_URL` jest zadeklarowana jako krytyczna w `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Automatyczny SSL

Przy wdrożeniu na Vercel certyfikaty SSL są automatycznie provisioned i odnawiane przy użyciu Let's Encrypt. Proces nie wymaga ręcznej konfiguracji:

1. **Dodaj domenę** w panelu projektu Vercel w Ustawienia → Domeny
2. **Skonfiguruj DNS** aby wskazywał na Vercel (patrz Konfiguracja DNS poniżej)
3. **Zweryfikuj** – Vercel automatycznie provisioning certyfikatu po rozwiązaniu DNS

Vercel obsługuje:

- Automatyczne provisioning certyfikatów Let's Encrypt
- Certyfikaty wildcard dla subdomen
- Automatyczne odnawianie certyfikatów przed wygaśnięciem
- Przekierowanie HTTP na HTTPS (automatyczne)

### Konfiguracja DNS

**Dla domeny głównej** (np. `example.com`):

```
Typ:  A
Nazwa:  @
Wartość: 76.76.21.21
```

**Dla subdomeny www** (np. `www.example.com`):

```
Typ:  CNAME
Nazwa:  www
Wartość: cname.vercel-dns.com
```

**Weryfikacja DNS** po ustawieniu rekordów:

```bash
# Sprawdź rekord A
dig yourdomain.com A +short

# Sprawdź rekord CNAME
dig www.yourdomain.com CNAME +short

# Weryfikacja propagacji z wielu lokalizacji
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

Propagacja DNS może potrwać do 48 godzin, chociaż większość zmian wchodzi w życie w ciągu minut.

### Self-Hosted: Nginx z Let's Encrypt

Dla wdrożeń self-hosted za Nginx, skonfiguruj terminację SSL na poziomie proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Zainstaluj i skonfiguruj Certbot dla automatycznego zarządzania certyfikatami:

```bash
# Zainstaluj Certbot
sudo apt install certbot python3-certbot-nginx

# Uzyskaj i zainstaluj certyfikat
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Sprawdź automatyczne odnawianie
sudo certbot renew --dry-run
```

## URL-e Callback OAuth

Przy przejściu na własną domenę zaktualizuj URL-e callback w konsoli każdego dostawcy OAuth:

| Dostawca | URL Callback |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Szablon automatycznie waliduje konfigurację OAuth podczas startu. Z `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... inne dostawcy
    });
  } catch (error) {
    // Fallback do tylko poświadczeń
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Jeśli dostawca jest nieprawidłowo skonfigurowany, szablon wraca do uwierzytelniania tylko z poświadczeniami.

## Obsługa Wielu Domen

Szablon obsługuje wiele domen poprzez konfigurację optymalizacji obrazów Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Narzędzie `generateImageRemotePatterns()` dynamicznie generuje wzorce zdalnych obrazów, pozwalając na optymalizację obrazów ze skonfigurowanych zewnętrznych domen przez Next.js.

## Konfiguracja Ciasteczek

Ustawienia ciasteczek muszą być zgodne z konfiguracją domeny:

```bash
# Środowisko deweloperskie (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Produkcja (własna domena)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Ustawienie `COOKIE_SECURE=true` zapewnia, że ciasteczka są przesyłane tylko przez połączenia HTTPS. Jest to niezbędne do zapobiegania przejęciu sesji. Skrypt weryfikacji środowiska waliduje konfigurację ciasteczek jako część kategorii bezpieczeństwa.

## Rozwiązywanie Problemów

### Certyfikat SSL Nie Provisioned

1. Sprawdź czy rekordy DNS wskazują na poprawny cel
2. Wyłącz dowolny proxy DNS (np. tryb proxy Cloudflare), który może przechwytywać wyzwanie ACME
3. Poczekaj na pełną propagację DNS (sprawdź poleceniami `dig` powyżej)
4. Przejrzyj panel platformy pod kątem konkretnych błędów certyfikatu

### Ostrzeżenia o Mieszanej Treści

Jeśli przeglądarka zgłasza mieszaną zawartość po włączeniu HTTPS:

1. Upewnij się, że `NEXT_PUBLIC_APP_URL` zaczyna się od `https://`
2. Sprawdź czy wszystkie zewnętrzne URL zasobów używają HTTPS
3. Dyrektywy CSP `img-src` i `connect-src` zawierają `https:` domyślnie

### Niezgodność Przekierowania OAuth

Jeśli logowanie OAuth nie działa z błędem niezgodności URI przekierowania:

1. Zaktualizuj URL callback w konsoli dewelopera każdego dostawcy OAuth
2. Upewnij się, że `NEXTAUTH_URL` odpowiada dokładnej domenie wraz z protokołem
3. Wyczyść ciasteczka przeglądarki i magazyn sesji przed ponowną próbą

## Powiązane Pliki

| Plik | Cel |
|------|---------|
| `next.config.ts` | Nagłówki bezpieczeństwa, CSP, wzorce obrazów zdalnych |
| `auth.config.ts` | Konfiguracja dostawcy OAuth i konfiguracja callback |
| `scripts/check-env.js` | Walidacja zmiennych środowiskowych dla konfiguracji domeny |
| `lib/seo/hreflang.ts` | Generowanie linków alternatywnych hreflang dla i18n |
| `lib/utils/url-cleaner.ts` | Narzędzie URL bazy używające `NEXT_PUBLIC_APP_URL` |
