---
id: ssl-domains
title: "SSL & Eigene Domains"
sidebar_label: "SSL & Domains"
sidebar_position: 2
---

# SSL & Eigene Domains

Dieser Leitfaden behandelt die Einrichtung benutzerdefinierter Domains, SSL-Zertifikatsverwaltung, DNS-Konfiguration und Multi-Domain-Unterstützung für das Ever Works Template. Das Template wird mit produktionsreifen Sicherheits-Headern ausgeliefert und ist für Vercel-Deployment mit automatischem HTTPS optimiert, unterstützt aber auch selbst gehostete Umgebungen mit manueller SSL-Konfiguration.

## Integrierte Sicherheits-Header

Das Template konfiguriert in `next.config.ts` einen umfassenden Satz von Sicherheits-Headern, der automatisch auf alle Routen angewendet wird. Diese Header erzwingen HTTPS, verhindern häufige Web-Angriffe und kontrollieren das Laden von Ressourcen.

### Vollständige Header-Konfiguration

Der vollständige Header-Block aus `next.config.ts`:

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

### Header-Übersicht

| Header | Wert | Zweck |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Verhindert MIME-Type-Sniffing-Angriffe |
| `X-Frame-Options` | `DENY` | Blockiert Clickjacking durch Verhinderung von iframe-Einbettung |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Steuert, wie viele Referrer-Informationen geteilt werden |
| `X-DNS-Prefetch-Control` | `on` | Aktiviert DNS-Prefetching für schnellere Seitenladevorgänge |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Erzwingt HTTPS für 2 Jahre über alle Subdomains |
| `Content-Security-Policy` | Siehe oben | Beschränkt, welche Ressourcen der Browser laden kann |

### HSTS-Details

Der Strict-Transport-Security-Header verwendet die maximal empfohlene Konfiguration:

- **max-age=63072000** – Browser merken sich für 2 Jahre, HTTPS zu verwenden
- **includeSubDomains** – Alle Subdomains müssen ebenfalls HTTPS verwenden
- **preload** – Geeignet für die Aufnahme in Browser-HSTS-Preload-Listen

:::caution
Sobald HSTS mit Preload aktiv ist und Ihre Domain in die Preload-Liste eingetragen wurde, ist es sehr schwer rückgängig zu machen. Stellen Sie sicher, dass Ihr SSL-Zertifikat ordnungsgemäß konfiguriert ist und automatisch erneuert wird, bevor Sie Preload aktivieren.
:::

### Content Security Policy Übersicht

| Direktive | Wert | Wirkung |
|-----------|-------|--------|
| `default-src` | `'self'` | Standardmäßig nur Ressourcen vom selben Ursprung laden |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Skripte vom selben Ursprung, Inline-Skripte und LemonSqueezy-Zahlungs-SDK |
| `style-src` | `'self' 'unsafe-inline'` | Styles vom selben Ursprung plus Inline-Styles (benötigt für CSS-in-JS) |
| `img-src` | `'self' data: https:` | Bilder vom selben Ursprung, Daten-URIs und jede HTTPS-Quelle |
| `font-src` | `'self'` | Schriften nur vom selben Ursprung |
| `connect-src` | `'self' https:` | API-Aufrufe zum selben Ursprung und jedem HTTPS-Endpunkt |
| `frame-ancestors` | `'none'` | Verhindert die Einbettung der Seite in Frames |

## Einrichtung benutzerdefinierter Domains

### Umgebungsvariablen für die Domain-Konfiguration

Aktualisieren Sie beim Konfigurieren einer benutzerdefinierten Domain diese Variablen in Ihrer Deployment-Umgebung:

```bash
# Anwendungs-URL – wird für OAuth-Callbacks, kanonische URLs, Hreflang, Sitemaps verwendet
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cookie-Domain – muss Ihrer Domain entsprechen, damit Session-Cookies funktionieren
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Auth-URL – von NextAuth für Callbacks verwendet
NEXTAUTH_URL=https://yourdomain.com
```

Die Variable `NEXT_PUBLIC_APP_URL` ist in `scripts/check-env.js` als kritisch deklariert:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Automatisches SSL

Bei Deployment auf Vercel werden SSL-Zertifikate automatisch über Let's Encrypt bereitgestellt und erneuert. Der Prozess erfordert keine manuelle Konfiguration:

1. **Domain hinzufügen** im Vercel-Projekt-Dashboard unter Einstellungen → Domains
2. **DNS konfigurieren**, um auf Vercel zu zeigen (siehe DNS-Konfiguration unten)
3. **Verifizieren** – Vercel stellt das Zertifikat automatisch bereit, sobald DNS aufgelöst ist

Vercel unterstützt:

- Automatische Let's Encrypt-Zertifikatsbereitstellung
- Wildcard-Zertifikate für Subdomains
- Automatische Zertifikatserneuerung vor Ablauf
- HTTP-zu-HTTPS-Weiterleitung (automatisch)

### DNS-Konfiguration

**Für eine Root-Domain** (z.B. `example.com`):

```
Typ:   A
Name:  @
Wert:  76.76.21.21
```

**Für eine www-Subdomain** (z.B. `www.example.com`):

```
Typ:   CNAME
Name:  www
Wert:  cname.vercel-dns.com
```

**DNS-Verifizierung** nach dem Setzen der Einträge:

```bash
# A-Eintrag prüfen
dig yourdomain.com A +short

# CNAME-Eintrag prüfen
dig www.yourdomain.com CNAME +short

# Mehrstandort-Ausbreitungsprüfung
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

Die DNS-Ausbreitung kann bis zu 48 Stunden dauern, obwohl die meisten Änderungen innerhalb weniger Minuten wirksam werden.

### Self-Hosted: Nginx mit Let's Encrypt

Für selbst gehostete Deployments hinter Nginx konfigurieren Sie SSL-Terminierung auf Proxy-Ebene:

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

Installieren und konfigurieren Sie Certbot für automatisches Zertifikatsmanagement:

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# Zertifikat erhalten und installieren
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Automatische Erneuerung verifizieren
sudo certbot renew --dry-run
```

## OAuth-Callback-URLs

Beim Wechsel zu einer benutzerdefinierten Domain aktualisieren Sie die Callback-URLs in der Konsole jedes OAuth-Anbieters:

| Anbieter | Callback-URL |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Das Template validiert die OAuth-Konfiguration beim Start automatisch. Aus `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... other providers
    });
  } catch (error) {
    // Fallback auf nur Anmeldedaten
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Falls ein Anbieter falsch konfiguriert ist, greift das Template auf die Nur-Anmeldedaten-Authentifizierung zurück.

## Multi-Domain-Unterstützung

Das Template unterstützt mehrere Domains durch die Next.js-Bildoptimierungskonfiguration:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Das Dienstprogramm `generateImageRemotePatterns()` generiert dynamisch Remote-Bildmuster und ermöglicht die Optimierung von Bildern aus konfigurierten externen Domains durch Next.js.

## Cookie-Konfiguration

Cookie-Einstellungen müssen mit Ihrer Domain-Konfiguration übereinstimmen:

```bash
# Entwicklung (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Produktion (benutzerdefinierte Domain)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Das Setzen von `COOKIE_SECURE=true` stellt sicher, dass Cookies nur über HTTPS-Verbindungen übertragen werden. Dies ist essentiell zur Verhinderung von Session-Hijacking. Das Umgebungscheck-Skript validiert die Cookie-Konfiguration als Teil der Sicherheitskategorie.

## Fehlerbehebung

### SSL-Zertifikat wird nicht bereitgestellt

1. Überprüfen Sie, ob DNS-Einträge auf das richtige Ziel zeigen
2. Deaktivieren Sie jeden DNS-Proxy (z.B. Cloudflare-Proxy-Modus), der die ACME-Challenge abfangen könnte
3. Warten Sie auf vollständige DNS-Ausbreitung (mit `dig`-Befehlen oben prüfen)
4. Überprüfen Sie das Plattform-Dashboard auf spezifische Zertifikatsfehler

### Mixed-Content-Warnungen

Falls der Browser nach HTTPS-Aktivierung Mixed-Content meldet:

1. Stellen Sie sicher, dass `NEXT_PUBLIC_APP_URL` mit `https://` beginnt
2. Verifizieren Sie, dass alle externen Ressourcen-URLs HTTPS verwenden
3. Die CSP-Direktiven `img-src` und `connect-src` enthalten standardmäßig `https:`

### OAuth-Redirect-Mismatch

Falls OAuth-Login mit einem Redirect-URI-Mismatch-Fehler fehlschlägt:

1. Aktualisieren Sie die Callback-URL in der Entwicklerkonsole jedes OAuth-Anbieters
2. Stellen Sie sicher, dass `NEXTAUTH_URL` der exakten Domain einschließlich Protokoll entspricht
3. Löschen Sie Browser-Cookies und Session-Storage, bevor Sie es erneut versuchen

## Zugehörige Dateien

| Datei | Zweck |
|------|---------|
| `next.config.ts` | Sicherheits-Header, CSP, Remote-Bildmuster |
| `auth.config.ts` | OAuth-Anbieter-Konfiguration und Callback-Einrichtung |
| `scripts/check-env.js` | Umgebungsvariablen-Validierung für Domain-Einstellungen |
| `lib/seo/hreflang.ts` | Hreflang-Alternativlink-Generierung für i18n |
| `lib/utils/url-cleaner.ts` | Basis-URL-Dienstprogramm mit `NEXT_PUBLIC_APP_URL` |
