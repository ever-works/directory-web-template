---
id: ssl-domains
title: "SSL & Domini Personalizzati"
sidebar_label: "SSL & Domini"
sidebar_position: 2
---

# SSL & Domini Personalizzati

Questa guida tratta la configurazione di domini personalizzati, la gestione dei certificati SSL, la configurazione DNS e il supporto multi-dominio per il Ever Works Template. Il template viene fornito con header di sicurezza di livello produzione ed è ottimizzato per la distribuzione su Vercel con HTTPS automatico, ma supporta anche ambienti self-hosted con configurazione SSL manuale.

## Header di Sicurezza Integrati

Il template configura un set completo di header di sicurezza in `next.config.ts` che vengono applicati automaticamente a ogni route. Questi header applicano HTTPS, prevengono gli attacchi web più comuni e controllano il caricamento delle risorse.

### Configurazione Completa degli Header

Il blocco completo degli header da `next.config.ts`:

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

### Panoramica degli Header

| Header | Valore | Scopo |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Previene gli attacchi di MIME type sniffing |
| `X-Frame-Options` | `DENY` | Blocca il clickjacking impedendo l'incorporamento in iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controlla quante informazioni referrer vengono condivise |
| `X-DNS-Prefetch-Control` | `on` | Abilita il DNS prefetching per caricamenti più veloci |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Applica HTTPS per 2 anni su tutti i sottodomini |
| `Content-Security-Policy` | Vedi sopra | Limita le risorse che il browser può caricare |

### Dettagli HSTS

L'header Strict-Transport-Security usa la configurazione massima raccomandata:

- **max-age=63072000** – i browser ricordano di usare HTTPS per 2 anni
- **includeSubDomains** – tutti i sottodomini devono usare HTTPS
- **preload** – idoneo per l'inclusione nelle liste HSTS preload dei browser

:::caution
Una volta che HSTS con preload è attivo e il tuo dominio è stato inviato alla lista preload, è molto difficile annullarlo. Assicurati che il tuo certificato SSL sia correttamente configurato e in auto-rinnovo prima di abilitare il preload.
:::

### Panoramica della Content Security Policy

| Direttiva | Valore | Effetto |
|-----------|-------|--------|
| `default-src` | `'self'` | Carica solo risorse dallo stesso origine per impostazione predefinita |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Script dallo stesso origine, script inline e SDK pagamento LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Stili dallo stesso origine più stili inline (necessari per CSS-in-JS) |
| `img-src` | `'self' data: https:` | Immagini dallo stesso origine, data URI e qualsiasi fonte HTTPS |
| `font-src` | `'self'` | Font solo dallo stesso origine |
| `connect-src` | `'self' https:` | Chiamate API allo stesso origine e qualsiasi endpoint HTTPS |
| `frame-ancestors` | `'none'` | Impedisce l'incorporamento della pagina in frame |

## Configurazione del Dominio Personalizzato

### Variabili d'Ambiente per la Configurazione del Dominio

Quando si configura un dominio personalizzato, aggiorna queste variabili nel tuo ambiente di distribuzione:

```bash
# URL dell'applicazione – usato per callback OAuth, URL canonici, hreflang, sitemap
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Dominio cookie – deve corrispondere al tuo dominio per il funzionamento dei cookie di sessione
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL di autenticazione – usato da NextAuth per i callback
NEXTAUTH_URL=https://yourdomain.com
```

La variabile `NEXT_PUBLIC_APP_URL` è dichiarata come critica in `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: SSL Automatico

Quando si distribuisce su Vercel, i certificati SSL vengono forniti e rinnovati automaticamente usando Let's Encrypt. Il processo non richiede configurazione manuale:

1. **Aggiungi il tuo dominio** nel dashboard del progetto Vercel sotto Impostazioni → Domini
2. **Configura il DNS** per puntare a Vercel (vedi Configurazione DNS di seguito)
3. **Verifica** – Vercel fornisce automaticamente il certificato una volta risolto il DNS

Vercel supporta:

- Provisioning automatico di certificati Let's Encrypt
- Certificati wildcard per i sottodomini
- Rinnovo automatico del certificato prima della scadenza
- Redirect HTTP a HTTPS (automatico)

### Configurazione DNS

**Per un dominio root** (es. `example.com`):

```
Tipo:  A
Nome:  @
Valore: 76.76.21.21
```

**Per un sottodominio www** (es. `www.example.com`):

```
Tipo:  CNAME
Nome:  www
Valore: cname.vercel-dns.com
```

**Verifica DNS** dopo aver impostato i record:

```bash
# Verificare il record A
dig yourdomain.com A +short

# Verificare il record CNAME
dig www.yourdomain.com CNAME +short

# Controllo propagazione multi-location
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

La propagazione DNS può richiedere fino a 48 ore, anche se la maggior parte delle modifiche ha effetto entro pochi minuti.

### Self-Hosted: Nginx con Let's Encrypt

Per distribuzioni self-hosted dietro Nginx, configura la terminazione SSL a livello proxy:

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

Installa e configura Certbot per la gestione automatica dei certificati:

```bash
# Installare Certbot
sudo apt install certbot python3-certbot-nginx

# Ottenere e installare il certificato
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verificare il rinnovo automatico
sudo certbot renew --dry-run
```

## URL di Callback OAuth

Quando si passa a un dominio personalizzato, aggiorna gli URL di callback nella console di ogni provider OAuth:

| Provider | URL di Callback |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

Il template valida automaticamente la configurazione OAuth all'avvio. Da `auth.config.ts`:

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
    // Fallback alle sole credenziali
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Se un provider è configurato erroneamente, il template effettua un fallback all'autenticazione con sole credenziali.

## Supporto Multi-Dominio

Il template supporta più domini tramite la configurazione di ottimizzazione delle immagini di Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

L'utilità `generateImageRemotePatterns()` genera dinamicamente pattern di immagini remote, permettendo l'ottimizzazione da parte di Next.js delle immagini provenienti da domini esterni configurati.

## Configurazione dei Cookie

Le impostazioni dei cookie devono essere allineate con la configurazione del dominio:

```bash
# Sviluppo (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Produzione (dominio personalizzato)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Impostare `COOKIE_SECURE=true` garantisce che i cookie vengano trasmessi solo su connessioni HTTPS. Questo è essenziale per prevenire il session hijacking. Lo script di verifica dell'ambiente valida la configurazione dei cookie come parte della categoria di sicurezza.

## Risoluzione dei Problemi

### Certificato SSL Non Fornito

1. Verifica che i record DNS puntino alla destinazione corretta
2. Disabilita eventuali proxy DNS (es. modalità proxy Cloudflare) che potrebbero intercettare la sfida ACME
3. Attendi la propagazione DNS completa (verifica con i comandi `dig` sopra)
4. Rivedi il dashboard della piattaforma per errori specifici del certificato

### Avvisi di Contenuto Misto

Se il browser segnala contenuto misto dopo l'abilitazione di HTTPS:

1. Assicurati che `NEXT_PUBLIC_APP_URL` inizi con `https://`
2. Verifica che tutti gli URL delle risorse esterne usino HTTPS
3. Le direttive CSP `img-src` e `connect-src` includono `https:` per impostazione predefinita

### Mancata Corrispondenza del Redirect OAuth

Se il login OAuth fallisce con un errore di mancata corrispondenza dell'URI di redirect:

1. Aggiorna l'URL di callback nella console sviluppatori di ogni provider OAuth
2. Assicurati che `NEXTAUTH_URL` corrisponda al dominio esatto incluso il protocollo
3. Cancella i cookie del browser e la session storage prima di riprovare

## File Correlati

| File | Scopo |
|------|---------|
| `next.config.ts` | Header di sicurezza, CSP, pattern immagini remote |
| `auth.config.ts` | Configurazione provider OAuth e setup dei callback |
| `scripts/check-env.js` | Validazione variabili d'ambiente per le impostazioni del dominio |
| `lib/seo/hreflang.ts` | Generazione link alternativi hreflang per i18n |
| `lib/utils/url-cleaner.ts` | Utilità URL base usando `NEXT_PUBLIC_APP_URL` |
