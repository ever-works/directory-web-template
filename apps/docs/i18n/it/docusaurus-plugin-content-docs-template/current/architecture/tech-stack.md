---
id: tech-stack
title: Pila tecnologica
sidebar_label: Pila tecnologica
sidebar_position: 2
---

# Pila tecnologica

Questo documento fornisce una panoramica completa di tutte le tecnologie utilizzate in Ever Works.

## Requisiti di sistema

- **Node.js**: 20.19.0 o successiva
- **PostgreSQL**: 14.0 o successiva
- **Gestione pacchetti**: npm, pnpm, filato o panino

## Tecnologie frontend {#frontend}

### Quadro fondamentale

- **[Next.js 15.4.7](https://nextjs.org/)** - Framework React con router app
  - Rendering lato server (SSR)
  - Generazione di siti statici (SSG)
  - Rigenerazione statica incrementale (ISR)
  - Azioni del server per le mutazioni
  - Ottimizzazione integrata
  - Routing basato su file con segmenti dinamici `[locale]`

- **[React 19.1.0](https://react.dev/)** - Libreria interfaccia utente
  - Ultime funzionalità e miglioramenti
  - Rendering simultaneo
  - Dosaggio automatico
  - Suspense per il recupero dei dati
  - Componenti server per impostazione predefinita

### Sicurezza della lingua e del tipo

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Controllo del tipo statico
  - Modalità rigorosa abilitata
  - Mappatura del percorso configurata (`@/` alias)
  - Definizioni di tipo personalizzato
  - Inferenza di tipo completo

### Stile e interfaccia utente

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Framework CSS basato sull'utilità
  - Sistema di progettazione personalizzato
  - Supporto per la modalità oscura
  - Utilità di progettazione reattiva
  - Compilazione JIT
  - Sistema di colore dinamico (50-950 tonalità)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Componenti di Modern React
  - Componenti accessibili
  - Temi personalizzabili
  - Supporto dattiloscritto
  - Scuotibile dall'albero

- **[Radix UI](https://www.radix-ui.com/)** - Componenti accessibili senza stile
  - Primitive dell'interfaccia utente senza testa
  - Navigazione completa tramite tastiera
  - Conforme ad ARIA
  - Componibile

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Libreria di animazioni
  - Animazioni dichiarative
  - Supporto gestuale
  - Animazioni di layout
  - Animazioni SVG

### Modifica del testo ricco

- **[TipTap](https://tiptap.dev/)** - Editor di testo RTF senza testa
  - Architettura estensibile
  - Supporto per il ribasso
  - Modifica collaborativa pronta
  - Estensioni personalizzate

### Gestione statale

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Gestione leggera dello stato
  - API semplice
  - Supporto dattiloscritto
  - Boiler minimo
  - Integrazione con DevTools
  - Supporto del middleware

- **[TanStack React Query 5](https://tanstack.com/query/)** - Gestione dello stato del server
  - Caching e sincronizzazione
  - Aggiornamenti in background
  - Aggiornamenti ottimistici
  - Gestione degli errori
  - Domande infinite

### Visualizzazione dei dati

- **[Tabella TanStack](https://tanstack.com/table/)** - Libreria di tabelle senza testa
  - Ordinamento, filtraggio, impaginazione
  - Ridimensionamento delle colonne
  - Selezione riga
  - Supporto dattiloscritto

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Libreria di virtualizzazione
  - Scorrimento virtuale
  - Ottimizzazione delle prestazioni
  - Altezze delle righe dinamiche

### Gestione dei moduli

- **[React Hook Form 7](https://react-hook-form.com/)** - Moduli esecutivi
  - Re-render minimi
  - Convalida integrata
  - Supporto dattiloscritto
  - Integrazione semplice
  - Supporto per array di campi

- **[Zod 4](https://zod.dev/)** - Convalida dello schema
  - Prima TypeScript
  - Convalida in fase di esecuzione
  - Digitare l'inferenza
  - Gestione degli errori
  - Validatori personalizzati

## Tecnologie di back-end

### Banca dati e ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Database relazionale
  - Conformità ACID
  - Funzionalità avanzate (JSONB, ricerca full-text)
  - Prestazioni eccellenti
  - Supporto JSON
  - Trigger e procedure memorizzate

- **[Drizzle ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - Query indipendenti dai tipi
  - Spese generali minime
  - Sintassi simile a SQL
  - Sistema migratorio
  - Domande di relazione
  - Dichiarazioni preparate

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service (facoltativo)
  - PostgreSQL ospitato
  - Abbonamenti in tempo reale
  - Sicurezza a livello di riga
  - Aut. incorporata
  - Secchi di stoccaggio
  - Funzioni del bordo

### Autenticazione

- **[NextAuth.js 5.0 (beta)](https://authjs.dev/)** - Libreria di autenticazione
  - Più provider OAuth (Google, GitHub, Facebook, Twitter)
  - JWT e sessioni di database
  - Supporto dattiloscritto
  - Migliori pratiche di sicurezza
  - Aut. basata su credenziali
  - Gestione della sessione

- **[Supabase Auth](https://supabase.com/auth)** - Soluzione di autenticazione alternativa
  - Gestione utenti integrata
  - Fornitori sociali
  - Verifica e-mail
  - Reimpostazione della password
  - Collegamenti magici
  - Aut. telefono

### Architettura a doppia autenticazione

Ever Works supporta **contemporaneamente sia NextAuth.js che Supabase Auth**:

- NextAuth per i flussi OAuth tradizionali
- Supabase Auth per funzionalità in tempo reale
- Gestione unificata delle sessioni
- Cambio fornitore senza soluzione di continuità

## Gestione dei contenuti

### CMS basato su Git

- **[isomorphic-git](https://isomorphic-git.org/)** - Operazioni Git in JavaScript
  - Repository clonati
  - Apporta modifiche
  - Salva i file
  - Gestione filiale

- **[js-yaml](https://github.com/nodeca/js-yaml)** - Analizzatore YAML
  - Analizza i file YAML
  - Genera YAML
  - Convalida dello schema
  - Gestione degli errori

### Elaborazione dei file

- **[materia grigia](https://github.com/jonschlinkert/gray-matter)** - Parser di frontmatter
  - Analizzare i file di markdown
  - Estrai metadati
  - Supporta più formati

## Internazionalizzazione

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n per Next.js
  - Supporto per router dell'app
  - Traduzioni indipendenti dai tipi
  - Pluralizzazione
  - Formattazione data/numero

### Lingue supportate

Ever Works supporta **oltre 13 lingue** immediatamente:

- 🇬🇧 Inglese (it)
- 🇫🇷 Francese (fr)
- 🇪🇸 Spagnolo (es)
- 🇨🇳 Cinese (zh)
- 🇩🇪 tedesco (de)
- 🇸🇦 Arabo (ar) - con supporto RTL
- 🇮🇹 Italiano (it)
- 🇵🇹 Portoghese (pt)
- 🇯🇵 giapponese (ja)
- 🇰🇷 Coreano (ko)
- 🇷🇺 Russo (ru)
- 🇳🇱 Olandese (nl)
- 🇵🇱 Polacco (pl)

[Scopri di più sull'internazionalizzazione →](/internazionalizzazione)

## Analisi e monitoraggio

### Analitica

- **[PostHog](https://posthog.com/)** - Analisi del prodotto
  - Monitoraggio degli eventi
  - Identificazione dell'utente
  - Flag di funzionalità
  - Registrazione della sessione

### Monitoraggio degli errori

- **[Sentry 9.38](https://sentry.io/)** - Monitoraggio degli errori
  - Tracciamento degli errori
  - Monitoraggio delle prestazioni
  - Monitoraggio del rilascio
  - Feedback degli utenti

### Prestazioni

- **[Vercel Analytics](https://vercel.com/analytics)** - Web vitals
  - Segnali Web fondamentali
  - Monitoraggio dell'utente reale
  - Approfondimenti sulle prestazioni

## Elaborazione dei pagamenti

### Fornitori di pagamenti

- **[Stripe](https://stripe.com/)** - Piattaforma di pagamento completa
  - Pagamenti una tantum
  - Abbonamenti ricorrenti
  - Diversi metodi di pagamento (carte, Apple Pay, Google Pay)
  - Valute multiple
  - Analisi e reporting avanzati
  - Portale clienti
  - Fatturazione
  - Webhook

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Piattaforma del commerciante di dischi
  - Adempimenti fiscali automatici
  - Pagamenti globali (oltre 135 paesi)
  - Abbonamenti
  - Prevenzione delle frodi
  - Configurazione semplificata
  - Supporto al programma di affiliazione

[Ulteriori informazioni sull'integrazione dei pagamenti →](/pagamento)

### SDK di pagamento

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - SDK client Stripe
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - SDK del server Stripe
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - LemonSqueezy SDK

## Integrazione CRM

- **[Twenty CRM](https://twenty.com/)** - CRM open source
  - Gestione delle relazioni con i clienti
  - Sincronizzazione dei contatti
  - Monitoraggio delle attività
  - Campi personalizzati
  - Integrazione dell'API
  - Self-hosted o cloud

### Funzionalità del CRM

- Creazione automatica dei contatti dalle registrazioni degli utenti
- Sincronizza le attività e le interazioni degli utenti
- Tieni traccia degli abbonamenti e dei pagamenti
- Mappatura dei campi personalizzata
- Sincronizzazione basata su webhook

## Servizi di posta elettronica

- **[Rinvia 4](https://resend.com/)** - API email
  - E-mail transazionali
  - Supporto modello
  - Monitoraggio della consegna
  - Facile per gli sviluppatori

- **[Novu 2.6](https://novu.co/)** - Infrastruttura di notifica
  - Notifiche multicanale
  - Gestione dei modelli
  - Automazione del flusso di lavoro
  - Analitica

## Sistema di indagine

- **[SurveyJS](https://surveyjs.io/)** - Generatore di sondaggi e moduli
  - Tipi di domande multiple (scelta multipla, testo, valutazione, matrice)
  - Logica condizionale
  - Anteprima del sondaggio
  - Analisi della risposta
  - Esporta in CSV/Excel
  - Risposte anonime o autenticate
  - Temi personalizzati

[Ulteriori informazioni sui sondaggi →](/guides/survey-system)

## Sicurezza

### Sicurezza dell'autenticazione

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Hashing della password
  - Memorizzazione sicura delle password
  - Generazione del sale
  - Protezione dagli attacchi temporali

- **[jose 6](https://github.com/panva/jose)** - Operazioni JWT
  - Generazione di token
  - Verifica del token
  - Supporto per la crittografia

### Convalida dell'input

- **[React Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - Protezione bot
  - Protezione della forma
  - ReCAPTCHA invisibile
  - Verifica basata sul punteggio

## Strumenti di sviluppo

### Qualità del codice

- **[ESLint 9](https://eslint.org/)** - linter JavaScript
  - Regole di qualità del codice
  - Configurazioni personalizzate
  - Supporto dattiloscritto
  - Regole Next.js

- **[Prettier 3.5](https://prettier.io/)** - Formattatore di codici
  - Formattazione coerente
  - Integrazione dell'editore
  - Regole personalizzate

### Costruisci strumenti

- **[PostCSS 8](https://postcss.org/)** - Processore CSS
  - Elaborazione CSS Tailwind
  - Prefisso automatico
  - Ottimizzazione CSS

- **[Webpack 5](https://webpack.js.org/)** - Bundler di moduli (tramite Next.js)
  - Suddivisione del codice
  - Tremore dell'albero
  - Ottimizzazione delle risorse

## Distribuzione e infrastruttura

### Piattaforme di hosting

- **[Vercel](https://vercel.com/)** - Piattaforma consigliata
  - Ottimizzazione Next.js
  - Funzioni del bordo
  - CDN globale
  - Distribuzioni automatiche

- **[Netlify](https://netlify.com/)** - Piattaforma alternativa
  - Hosting di siti statici
  - Funzioni senza server
  - Gestione dei moduli

### Hosting di database

- **[Supabase](https://supabase.com/)** - PostgreSQL gestito
  - Backup automatici
  - Raggruppamento delle connessioni
  - Funzionalità in tempo reale

- **[PlanetScale](https://planetscale.com/)** - MySQL senza server
  - Flusso di lavoro ramificato
  - Ridimensionamento automatico
  - Gestione dello schema

- **[Neon](https://neon.tech/)** - PostgreSQL senza server
  - Ramificazione istantanea
  - Scalabilità automatica
  - Recupero puntuale

## Gestione dei pacchetti

- **[pnpm](https://pnpm.io/)** - Gestore di pacchetti veloce ed efficiente in termini di spazio su disco
  - Installazioni più veloci
  - Dipendenze condivise
  - Risoluzione rigorosa delle dipendenze

- **[npm](https://npmjs.com/)** - Gestore pacchetti Node.js predefinito
  - Ampiamente supportato
  - Grande ecosistema
  - Controllo della sicurezza

## Requisiti di versione

### Node.js

- **Minimo**: Node.js 20.19.0
- **Consigliato**: ultima versione LTS
- **Gestore pacchetti**: npm 10+, filato 1.13+ o pnpm 8+

### Supporto del browser

- **Browser moderni**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Dispositivi mobili**: iOS Safari 14+, Chrome Mobile 90+
- **Nessun supporto IE**: solo funzionalità moderne

## Considerazioni sulle prestazioni

### Dimensione del pacchetto

- **Pacchetto principale**: ~200KB compressi con gzip
- **Suddivisione del codice**: basata su percorso e basata su componenti
- **Scuotimento albero**: Eliminazione del codice inutilizzato
- **Importazioni dinamiche**: caricamento lento per componenti non critici

### Prestazioni in fase di esecuzione

- **React 19**: funzionalità simultanee per una migliore UX
- **Next.js 15**: rendering e memorizzazione nella cache ottimizzati
- **Ottimizzazione delle immagini**: supporto WebP/AVIF con caricamento lento
- **Ottimizzazione dei caratteri**: caratteri self-hosted con precaricamento

### Prestazioni del database

- **Pool di connessione**: connessioni efficienti al database
- **Ottimizzazione delle query**: query indicizzate e join efficienti
- **Caching**: caching a livello di applicazione e a livello di database

## Pila di sicurezza

### Sicurezza delle applicazioni

- **HTTPS**: applicato in produzione
- **Protezione CSRF**: integrata in NextAuth.js
- **Protezione XSS**: sanificazione dei contenuti
- **Iniezione SQL**: query parametrizzate tramite Drizzle

### Sicurezza delle infrastrutture

- **Variabili d'ambiente**: gestione sicura dei segreti
- **Limitazione della velocità**: protezione endpoint API
- **Convalida dell'input**: convalida dello schema Zod
- **Sicurezza nel caricamento dei file**: limitazioni di tipo e dimensione

## Stack di monitoraggio

### Monitoraggio dell'applicazione

- **Tracciamento degli errori**: sentinella per il monitoraggio degli errori
- **Prestazioni**: monitoraggio dei principali parametri web vitali
- **Analisi**: PostHog per il comportamento degli utenti
- **Uptime**: servizi di monitoraggio esterni

### Monitoraggio delle infrastrutture

- **Database**: monitoraggio della connessione e delle query
- **API**: monitoraggio dei tempi di risposta e del tasso di errore
- **CDN**: percentuali di riscontri e prestazioni della cache
- **Distribuzione**: monitoraggio della creazione e della distribuzione

## Considerazioni future

### Aggiornamenti pianificati

- **React 19**: adozione del rilascio stabile
- **Next.js 16**: quando disponibile
- **TypeScript 5.x**: funzionalità più recenti
- **Node.js 22**: aggiornamento LTS

### Potenziali aggiunte

- **GraphQL**: per requisiti di dati complessi
- **WebSocket**: funzionalità in tempo reale
- **PWA**: funzionalità progressive dell'app Web
- **Edge computing**: prestazioni migliorate

## Matrice decisionale tecnologica

|Requisito|Scelta tecnologica|Motivazione|
|-------------|-------------------|-----------|
|**Quadro**|Next.js 15|Framework React migliore della categoria con App Router|
|**Banca dati**|PostgreSQL+Drizzle|Indipendente dai tipi, performante, scalabile|
|**Autentica**|NextAuth.js + Supabase|Flessibilità del doppio fornitore|
|**Stile**|CSS Tailwind + HeroUI|Sviluppo rapido, design coerente|
|**Stato**|Zustand + Reagisci alla query|Stato client semplice + stato server potente|
|**Moduli**|Reagisci Forma Gancio + Zod|Prestazioni + sicurezza del tipo|
|**i18n**|prossimo-intl|Il miglior supporto per il router dell'app Next.js|
|**Pagamento**|Striscia + LemonSqueezy|Flessibilità + conformità globale|
|**E-mail**|Invia nuovamente + Nuovo|Facile per gli sviluppatori e multicanale|
|**Analisi**|PostHog + Sentinella|Approfondimenti sul prodotto + tracciamento degli errori|

## Passaggi successivi

- [Panoramica dell'architettura](./overview) - Comprendere l'architettura del sistema
- [Funzionalità della piattaforma](./features): esplora tutte le funzionalità della piattaforma
- [Configurazione sviluppo](/development/local-setup) - Configura il tuo ambiente

## Risorse

### Documentazione ufficiale

- [Documentazione Next.js](https://nextjs.org/docs)
- [Documentazione Reagire](https://react.dev/)
- [Manuale di TypeScript](https://www.typescriptlang.org/docs/)
- [Documenti CSS Tailwind](https://tailwindcss.com/docs)
- [Documenti Drizzle ORM](https://orm.drizzle.team/docs/overview)

### Risorse comunitarie

- [Next.js GitHub](https://github.com/vercel/next.js)
- [Reagisci su GitHub](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Comunità Ever Works](https://github.com/ever-co/ever-works)
