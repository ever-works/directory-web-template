---
id: architecture
title: Panoramica dell'architettura
sidebar_label: Panoramica
sidebar_position: 0
---

# Panoramica dell'architettura

Questa pagina fornisce una mappa di alto livello dell'architettura del modello Ever Works. Usatelo come punto di partenza prima di immergervi nelle pagine dettagliate che seguono.

## Fondazione tecnologica

Il modello è un'applicazione **Next.js 16** che utilizza l'**App Router** con **React 19**. Produce un output `standalone` per distribuzioni containerizzate e applica diverse ottimizzazioni a livello di framework in `next.config.ts`:

|Strato|Tecnologia|Scopo|
|---|---|---|
|**Quadro**|Next.js 16 (router dell'app)|Rendering server e client, routing, percorsi API|
|**IU**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Libreria di componenti, primitive, styling|
|**Banca dati**|Drizzle ORM + PostgreSQL (o SQLite localmente)|Gestione schemi, migrazioni, query|
|**Autenticazione**|NextAuth.js v5 (beta)|Autenticazione multiprovider con memorizzazione nella cache della sessione|
|**Internazionalizzazione**|prossimo-intl|Routing e bundle di messaggi compatibili con le impostazioni locali|
|**Pagamenti**|Stripe, Polar, LemonSqueezy, Solidgate|Flussi di abbonamento e pagamento una tantum|
|**Contenuto**|CMS basato su Git (`.content/` directory)|Contenuto Markdown/YAML clonato da un repository di dati|
|**Monitoraggio**|Sentry, PostHog, Vercel Analytics|Monitoraggio degli errori, analisi del prodotto, prestazioni|
|**E-mail**|Invia nuovamente|Consegna di e-mail transazionali|
|**Testo ricco**|Tip-tap|Editor WYSIWYG per contenuti di amministrazione|

## Struttura del progetto

Il modello segue un'organizzazione a più livelli basata su funzionalità. Ecco le directory di livello superiore e le relative responsabilità:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

Per una panoramica completa della directory, vedere la pagina [Struttura del progetto](/architecture/project-structure).

## Architettura a strati

La base di codice impone una chiara separazione delle preoccupazioni su tre livelli:

### Livello di presentazione

I componenti React in `components/` e i file di paging in `app/[locale]/` gestiscono il rendering e l'interazione dell'utente. I componenti server recuperano i dati direttamente; I componenti client utilizzano gli hook React Query da `hooks/` per lo stato lato client.

### Livello della logica aziendale

I servizi in `lib/services/` contengono le regole aziendali principali. Il modello viene fornito con oltre 30 file di servizio che coprono analisi, abbonamenti, moderazione, sincronizzazione CRM, geocodifica, notifiche e altro ancora. I servizi vengono chiamati dai gestori di route API e dai componenti server, ma mai direttamente dal codice dell'interfaccia utente nel browser.

### Livello di accesso ai dati

I repository in `lib/repositories/` incapsulano tutte le query del database utilizzando Drizzle ORM. Ogni entità del dominio (elementi, categorie, raccolte, utenti, ruoli, tag, annunci sponsor) ha il proprio file di repository. Ciò mantiene i dettagli a livello SQL fuori dal livello di servizio.

Per uno sguardo più approfondito al flusso di dati tra questi livelli, vedere [Flusso di dati](/architecture/data-flow).

## Router e routing dell'app Next.js

Tutti i percorsi rivolti all'utente risiedono in `app/[locale]/`, che abilita gli URL con prefisso locale immediatamente tramite `next-intl`. L'applicazione utilizza diverse funzionalità dell'App Router:

- **Layout** -- file `layout.tsx` nidificati per amministrazione, dashboard cliente e aree pubbliche.
- **Gruppi di percorsi** -- il gruppo `(listing)` gestisce l'elenco della directory principale e l'esplorazione dei tag senza influenzare la struttura dell'URL.
- **Percorsi dinamici** -- `[page]`, `[...tag]` e segmenti denominati per elementi, categorie e raccolte.
- **Riscrive** -- definito in `next.config.ts` per reindirizzare i percorsi delle categorie semplici alla visualizzazione di individuazione impaginata.

Vedi [Routing](/architecture/routing) per la mappa completa del percorso.

## Sistema di autenticazione

L'autenticazione si basa su **NextAuth.js v5** con un sistema di configurazione del provider in `lib/auth/`. Il file `auth.config.ts` nella root del progetto orchestra:

- **Provider OAuth**: Google e GitHub, configurati tramite variabili di ambiente e abilitati/disabilitati dinamicamente.
- **Fornitore di credenziali**: autenticazione e-mail/password con hashing bcrypt.
- **Adattatore Supabase** -- archiviazione di sessioni supportata da Supabase opzionale.
- **Caching delle sessioni** -- `lib/auth/cached-session.ts` riduce le ricerche ridondanti delle sessioni.
- **Sistema di guardia** -- `lib/auth/guards.ts` e `lib/guards/` applicano l'accesso basato sui ruoli a livello di percorso.

Per dettagli sul sistema di guardia e sui permessi basati sui ruoli, vedere [Sistema Guards](/architecture/guards-system) e [Sistema permessi](/architecture/permissions-system).

## Drizzle ORM e database

Il livello del database utilizza **Drizzle ORM** con lo schema definito in `lib/db/schema.ts`. Aspetti chiave:

- **Le migrazioni** vengono generate con `drizzle-kit generate` e applicate con `drizzle-kit migrate`.
- Gli script **Seeding** in `lib/db/seed.ts` e `scripts/cli-seed.ts` popolano i dati iniziali inclusi i ruoli.
- **Configurazione** risiede in `drizzle.config.ts` alla radice del progetto.
- Per la produzione è richiesto PostgreSQL; SQLite è supportato per lo sviluppo locale.

Consulta [Modelli di repository](/architecture/repository-patterns) per sapere come è strutturato il livello di accesso ai dati.

## Catena del middleware

Il modello utilizza il middleware Next.js (tramite il plugin `next-intl` applicato in `next.config.ts`) combinato con controlli di autorizzazione personalizzati in `lib/middleware/permission-check.ts`. La pipeline del middleware gestisce:

- Rilevamento e routing della localizzazione
- Verifica dello stato di autenticazione
- Protezione del percorso basata sui ruoli
- Intestazioni di sicurezza (HSTS, CSP, X-Frame-Options e altro - configurate in `next.config.ts`)

Per un'analisi dettagliata, vedere [Middleware](/architecture/middleware) e [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Configurazione e sicurezza

Il file `next.config.ts` imposta diverse impostazioni predefinite di sicurezza e prestazioni:

- **Output autonomo** per distribuzioni compatibili con Docker.
- **Intestazioni di sicurezza** tra cui Content-Security-Policy, HSTS, X-Content-Type-Options e X-Frame-Options.
- **Ottimizzazione delle immagini** con supporto di modelli remoti e politiche di sicurezza SVG.
- **Integrazione Sentry** applicata come wrapper di configurazione più esterno per il tracciamento degli errori.
- **Ottimizzazione del pacchetto** per HeroUI e Lucide React per ridurre le dimensioni del pacchetto.

## Pagine di architettura dettagliate

Esplora queste pagine per una copertura più approfondita dei singoli sistemi:

|Pagina|Cosa copre|
|---|---|
|[Stack tecnologico](/architettura/stack tecnologico)|Inventario completo delle dipendenze e dettagli della versione|
|[Struttura del progetto](/architettura/struttura-progetto)|Procedura dettagliata directory per directory|
|[Flusso di dati](/architettura/flusso di dati)|Richiedi il ciclo di vita dal browser al database|
|[Routing](/architettura/routing)|Struttura dell'App Router e pattern URL|
|[Modelli di componenti](/architettura/component-patterns)|Componenti server e client, modelli di composizione|
|[Gestione dello Stato](/architettura/gestione-dello-stato)|Reagire a query, Zustand e stato del server|
|[Livello API](/architettura/livello API)|Progettazione dell'API REST e modelli di gestione del percorso|
|[Middleware](/architettura/middleware)|Pipeline del middleware ed elaborazione delle richieste|
|[Sistema di guardie](/architecture/guards-system)|Controllo degli accessi basato sui ruoli a livello di percorso|
|[Sistema di permessi](/architecture/permissions-system)|Definizioni di autorizzazioni a grana fine|
|[Modelli di repository](/architettura/repository-patterns)|Convenzioni del livello di accesso ai dati|
|[Modelli di convalida](/architecture/validation-patterns)|Schemi Zod e validazione dell'input|
|[Sistema di temi](/architettura/sistema-di-temi)|Architettura tematica e gestione del colore|
|[Sistema colore](/architettura/sistema-colore)|Pipeline di generazione dinamica del colore|
|[Sistema SEO](/architettura/sistema-seo)|Metadati, mappe del sito e dati strutturati|
|[Libreria di pagamento](/architecture/libreria-di-pagamento)|Integrazione dei pagamenti multi-provider|
|[Libreria di contenuti](/architecture/content-library)|Pipeline di contenuti CMS basati su Git|
|[Sistema editor](/architettura/sistema-editor)|Integrazione dell'editor RTF Tiptap|
|[Modelli di Mapper](/architecture/mapper-patterns)|Trasformazione dei dati tra livelli|
|[Confini degli errori](/architecture/error-boundaries)|Gestione e ripristino degli errori|
|[Livello analitico](/architettura/livello-analitico)|Monitoraggio degli eventi e pipeline di analisi|
|[Sistema spavalderia](/architecture/swagger-system)|Generazione di documentazione OpenAPI|

## Dove andare dopo

- **Nuovo nel progetto?** Inizia con [Introduzione](/getting-started) per installare ed eseguire il modello.
- **Pronto per la personalizzazione?** Vai alla sezione [Guide](/guides) per tutorial passo passo.
- **Vuoi l'inventario tecnologico completo?** Vedi [Stack tecnologico](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
