---
id: routing
title: Architettura di instradamento
sidebar_label: Instradamento
sidebar_position: 6
---

# Architettura di instradamento

Il modello Ever Works utilizza il router dell'app Next.js con internazionalizzazione tramite `next-intl`, fornendo route con prefisso locale, gruppi di route per l'organizzazione logica e un livello API completo.

## Router dell'app con segmento locale

Tutte le pagine rivolte all'utente sono nidificate in un segmento dinamico `[locale]`, consentendo il supporto multilingue per 6 versioni locali: `en`, `fr`, `es`, `de`, `ar` e `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

Gli URL seguono lo schema `/{locale}/path`, ad esempio:
- `/en/pricing` -- Pagina dei prezzi in inglese
- `/fr/admin/items` -- Pagina degli elementi amministrativi in francese
- `/de/categories` -- Pagina delle categorie tedesche

## Configurazione Next.js

`next.config.ts` configura diversi comportamenti di routing:

### Riscrive

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Queste riscritture reindirizzano il percorso locale root e `/discover` alla prima pagina dell'elenco di rilevamento (`/discover/1`), fornendo un URL predefinito pulito.

### Intestazioni di sicurezza

Tutti i percorsi ricevono intestazioni di sicurezza tra cui:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` con un'età massima di 2 anni
- `Content-Security-Policy` con impostazioni predefinite restrittive
- `Referrer-Policy: strict-origin-when-cross-origin`

### plugin next-intl

Il plugin `next-intl` viene applicato alla configurazione Next.js, che punta a `./i18n/request.ts` per la risoluzione locale:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Gruppi di percorsi

La directory `[locale]` utilizza diversi raggruppamenti logici per organizzare le pagine:

### (elenco) - Pagine di elenco principali

Il gruppo di instradamenti `(listing)` è un gruppo tra parentesi (nessun segmento URL) che racchiude le pagine dell'elenco delle directory principali con un layout condiviso.

### admin/-Pannello di amministrazione

La sezione di amministrazione fornisce un'interfaccia di back-office completa:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Pagine di autenticazione

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ -- Pannello di controllo del client

La sezione client fornisce funzionalità utente autenticato per la gestione dei propri invii e account.

### dashboard/-Dashboard utente

Dashboard utente generale con panoramica dell'account, attività e impostazioni.

## Percorsi API (29 gruppi)

I percorsi API risiedono all'esterno del segmento `[locale]` in `app/api/` e non hanno prefisso locale. Fungono da backend per il recupero dei dati lato client.

|Gruppo di percorsi|Scopo|Endpoint chiave|
|-------------|---------|---------------|
|`admin/`|Operazioni di amministrazione|Elementi, utenti, categorie, impostazioni|
|`auth/`|Autenticazione|Sessione, callback OAuth|
|`categories/`|Dati di categoria|Elenca, cerca|
|`client/`|Operazioni del cliente|Profilo, invii, dashboard|
|`collections/`|Dati di raccolta|Elenco, dettaglio|
|`config/`|Configurazione del sito|Flag di funzionalità, impostazioni|
|`cron/`|Attività pianificate|Controlli sugli abbonamenti, pulizia|
|`current-user/`|Informazioni sull'utente corrente|Profilo, dati della sessione|
|`extract/`|Estrazione dell'URL|Estrazione di metadati dagli URL|
|`favorites/`|Preferiti|Aggiungi, rimuovi, elenca|
|`featured-items/`|Articoli in evidenza|Elenca gli elementi in primo piano attivi|
|`geocode/`|Geocodifica|Ricerca indirizzi, geocodifica inversa|
|`health/`|Controllo sanitario|Database e stato del servizio|
|`internal/`|Operazioni interne|Endpoint a livello di sistema|
|`items/`|Dati dell'articolo|Elenco, dettaglio, ricerca|
|`lemonsqueezy/`|LemonSqueezy|Gestore del webhook|
|`location/`|Dati sulla posizione|Articoli nelle vicinanze, ricerca della posizione|
|`payment/`|Operazioni di pagamento|Checkout, metodi di pagamento|
|`polar/`|Polare|Gestore del webhook|
|`reference/`|Dati di riferimento|Enumerazioni, valori di ricerca|
|`reports/`|Rapporti sui contenuti|Invia, esamina i rapporti|
|`solidgate/`|Solidgate|Gestore del webhook|
|`sponsor-ads/`|Annunci sponsorizzati|CRUD, attivazione|
|`stripe/`|Striscia|Gestore webhook, checkout|
|`surveys/`|Sondaggi|Elenca, rispondi, risultati|
|`user/`|Operazioni dell'utente|Profilo, impostazioni|
|`verify-recaptcha/`|reCAPTCHA|Verifica del token|
|`version/`|Informazioni sulla versione|Versione dell'app e informazioni sulla build|

## Middleware

L'applicazione utilizza il middleware `next-intl` per il rilevamento e il routing delle impostazioni locali. Il middleware gestisce:

1. **Rilevamento locale**: determina il locale dell'utente dal percorso URL, dai cookie o dall'intestazione `Accept-Language`
2. **Reindirizzamenti locali**: reindirizza le richieste senza prefisso locale alle impostazioni locali appropriate
3. **Impostazioni locali predefinite**: torna all'inglese (`en`) quando non viene rilevata alcuna preferenza locale

Il middleware è configurato nella directory `i18n/` con le regole di routing locale definite in `i18n/routing.ts` e la gestione delle richieste in `i18n/request.ts`.

## Generazione statica e percorsi dinamici

Il modello utilizza diverse strategie di recupero dei dati:

- **Generazione statica**: pagine come l'informativa sulla privacy, i termini di servizio e le informazioni su vengono generate staticamente
- **Rendering dinamico**: le pagine di amministrazione, i dashboard e le pagine autenticate vengono visualizzate in modo dinamico
- **ISR (rigenerazione statica incrementale)**: le pagine di elenco di categorie e tag utilizzano ISR con riconvalida
- **Generazione della mappa del sito**: `app/sitemap.ts` genera dinamicamente la mappa del sito dai dati del contenuto

`staticPageGenerationTimeout` è impostato su 180 secondi in `next.config.ts` per ospitare repository di contenuti di grandi dimensioni durante le build.
