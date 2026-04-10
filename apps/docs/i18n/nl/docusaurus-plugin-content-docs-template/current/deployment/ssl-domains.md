---
id: ssl-domains
title: "SSL & Aangepaste Domeinen"
sidebar_label: "SSL & Domeinen"
sidebar_position: 2
---

# SSL & Aangepaste Domeinen

Deze gids behandelt het instellen van aangepaste domeinen, SSL-certificaatbeheer, DNS-configuratie en multi-domeinondersteuning voor het Ever Works Template. Het template wordt geleverd met productieklare beveiligingsheaders en is geoptimaliseerd voor Vercel-implementatie met automatische HTTPS, maar ondersteunt ook self-hosted omgevingen met handmatige SSL-configuratie.

## Ingebouwde beveiligingsheaders

Het template configureert een uitgebreide set beveiligingsheaders in `next.config.ts` die automatisch worden toegepast op elke route. Deze headers dwingen HTTPS af, voorkomen veelvoorkomende webaanvallen en beheersen het laden van bronnen.

### Volledige headerconfiguratie

Het volledige headersblok uit `next.config.ts`:

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

### Header-overzicht

| Header | Waarde | Doel |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Voorkomt MIME-type sniffing-aanvallen |
| `X-Frame-Options` | `DENY` | Blokkeert clickjacking door iframe-inbedding te verhinderen |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Bepaalt hoeveel referrer-informatie wordt gedeeld |
| `X-DNS-Prefetch-Control` | `on` | Schakelt DNS-prefetching in voor sneller laden van pagina's |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Dwingt HTTPS af voor 2 jaar voor alle subdomeinen |
| `Content-Security-Policy` | Zie boven | Beperkt welke bronnen de browser kan laden |

### HSTS-details

De Strict-Transport-Security-header gebruikt de maximaal aanbevolen configuratie:

- **max-age=63072000** – browsers onthouden voor 2 jaar HTTPS te gebruiken
- **includeSubDomains** – alle subdomeinen moeten ook HTTPS gebruiken
- **preload** – in aanmerking voor opname in browser HSTS preload-lijsten

:::caution
Zodra HSTS met preload actief is en uw domein is ingediend bij de preload-lijst, is het zeer moeilijk ongedaan te maken. Zorg ervoor dat uw SSL-certificaat correct is geconfigureerd en automatisch wordt vernieuwd voordat u preload inschakelt.
:::

### Content Security Policy overzicht

| Richtlijn | Waarde | Effect |
|-----------|-------|--------|
| `default-src` | `'self'` | Laad standaard alleen bronnen van dezelfde oorsprong |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Scripts van dezelfde oorsprong, inline scripts en LemonSqueezy-betaal-SDK |
| `style-src` | `'self' 'unsafe-inline'` | Stijlen van dezelfde oorsprong plus inline stijlen (nodig voor CSS-in-JS) |
| `img-src` | `'self' data: https:` | Afbeeldingen van dezelfde oorsprong, data-URI's en elke HTTPS-bron |
| `font-src` | `'self'` | Lettertypen alleen van dezelfde oorsprong |
| `connect-src` | `'self' https:` | API-aanroepen naar dezelfde oorsprong en elk HTTPS-eindpunt |
| `frame-ancestors` | `'none'` | Voorkomt dat de pagina wordt ingesloten in frames |

## Aangepast domein instellen

### Omgevingsvariabelen voor domeinconfiguratie

Werk bij het configureren van een aangepast domein deze variabelen bij in uw implementatieomgeving:

```bash
# Applicatie-URL – gebruikt voor OAuth-callbacks, canonieke URL's, hreflang, sitemaps
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cookie-domein – moet overeenkomen met uw domein opdat sessiecookies werken
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# Auth-URL – door NextAuth gebruikt voor callbacks
NEXTAUTH_URL=https://yourdomain.com
```

De variabele `NEXT_PUBLIC_APP_URL` is gedeclareerd als kritiek in `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: Automatisch SSL

Bij implementatie op Vercel worden SSL-certificaten automatisch ingericht en vernieuwd via Let's Encrypt. Het proces vereist geen handmatige configuratie:

1. **Voeg uw domein toe** in het Vercel-projectdashboard onder Instellingen → Domeinen
2. **Configureer DNS** om naar Vercel te wijzen (zie DNS-configuratie hieronder)
3. **Verifieer** – Vercel richt automatisch het certificaat in zodra DNS is opgelost

Vercel ondersteunt:

- Automatisch inrichten van Let's Encrypt-certificaten
- Wildcard-certificaten voor subdomeinen
- Automatisch vernieuwen van certificaten voor vervaldatum
- HTTP-naar-HTTPS-omleiding (automatisch)

### DNS-configuratie

**Voor een rootdomein** (bijv. `example.com`):

```
Type:  A
Naam:  @
Waarde: 76.76.21.21
```

**Voor een www-subdomein** (bijv. `www.example.com`):

```
Type:  CNAME
Naam:  www
Waarde: cname.vercel-dns.com
```

**DNS-verificatie** na het instellen van records:

```bash
# A-record controleren
dig yourdomain.com A +short

# CNAME-record controleren
dig www.yourdomain.com CNAME +short

# Meerdere locaties doorgifte controleren
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

DNS-doorgifte kan tot 48 uur duren, hoewel de meeste wijzigingen binnen enkele minuten van kracht worden.

### Self-hosted: Nginx met Let's Encrypt

Voor self-hosted implementaties achter Nginx configureert u SSL-beëindiging op proxyniveau:

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

Installeer en configureer Certbot voor automatisch certificaatbeheer:

```bash
# Certbot installeren
sudo apt install certbot python3-certbot-nginx

# Certificaat verkrijgen en installeren
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Automatische vernieuwing verifiëren
sudo certbot renew --dry-run
```

## OAuth callback-URL's

Bij het overstappen naar een aangepast domein werkt u de callback-URL's bij in de console van elke OAuth-provider:

| Provider | Callback-URL |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Het template valideert de OAuth-configuratie automatisch bij het opstarten. Uit `auth.config.ts`:

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
    // Terugvallen op alleen inloggegevens
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Als een provider verkeerd is geconfigureerd, valt het template terug op alleen-inloggegevens authenticatie.

## Multi-domeinondersteuning

Het template ondersteunt meerdere domeinen via de Next.js beeldoptimalisatieconfiguratie:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Het hulpprogramma `generateImageRemotePatterns()` genereert dynamisch externe beeldpatronen, waardoor afbeeldingen van geconfigureerde externe domeinen door Next.js kunnen worden geoptimaliseerd.

## Cookie-configuratie

Cookie-instellingen moeten overeenkomen met uw domeinconfiguratie:

```bash
# Ontwikkeling (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Productie (aangepast domein)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Het instellen van `COOKIE_SECURE=true` zorgt ervoor dat cookies alleen via HTTPS-verbindingen worden verzonden. Dit is essentieel voor het voorkomen van sessiekaping. Het omgevingscontrolescript valideert cookie-configuratie als onderdeel van de beveiligingscategorie.

## Probleemoplossing

### SSL-certificaat wordt niet ingericht

1. Verifieer dat DNS-records naar de juiste bestemming wijzen
2. Schakel elke DNS-proxy uit (bijv. Cloudflare-proxymodus) die de ACME-uitdaging kan onderscheppen
3. Wacht op volledige DNS-doorgifte (controleer met `dig`-opdrachten hierboven)
4. Bekijk het platformdashboard voor specifieke certificaatfouten

### Gemengde inhoud waarschuwingen

Als de browser gemengde inhoud meldt na HTTPS inschakelen:

1. Zorg dat `NEXT_PUBLIC_APP_URL` begint met `https://`
2. Verifieer dat alle externe bron-URL's HTTPS gebruiken
3. De CSP `img-src` en `connect-src`-richtlijnen bevatten standaard `https:`

### OAuth-redirect niet overeenkomend

Als OAuth-aanmelding mislukt met een redirect-URI niet overeenkomstig fout:

1. Werk de callback-URL bij in de ontwikkelaarsconsole van elke OAuth-provider
2. Zorg dat `NEXTAUTH_URL` overeenkomt met het exacte domein inclusief het protocol
3. Wis browsercookies en sessieopslag voor het opnieuw proberen

## Gerelateerde bestanden

| Bestand | Doel |
|------|---------|
| `next.config.ts` | Beveiligingsheaders, CSP, externe beeldpatronen |
| `auth.config.ts` | OAuth-providerconfiguratie en callback-instelling |
| `scripts/check-env.js` | Omgevingsvariabelen-validatie voor domeininstellingen |
| `lib/seo/hreflang.ts` | Hreflang-alternatieve linkgeneratie voor i18n |
| `lib/utils/url-cleaner.ts` | Basis-URL-hulpprogramma met `NEXT_PUBLIC_APP_URL` |
