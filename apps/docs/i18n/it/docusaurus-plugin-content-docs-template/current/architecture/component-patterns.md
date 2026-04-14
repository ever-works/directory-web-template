---
id: component-patterns
title: Architettura e modelli dei componenti
sidebar_label: Modelli di componenti
sidebar_position: 7
---

# Architettura e modelli dei componenti

Il modello Ever Works organizza i suoi componenti React utilizzando una struttura di directory basata su funzionalità, con una chiara separazione tra componenti di funzionalità, componenti condivisi e primitive dell'interfaccia utente di base.

## Organizzazione delle directory

La directory `components/` segue un'organizzazione basata sulle funzionalità in cui ogni dominio principale ha la propria sottodirectory, insieme a componenti condivisi e a livello di interfaccia utente.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Componenti basati su funzionalità

Ciascuna directory di funzionalità contiene tutti i componenti relativi a quel dominio. Ciò mantiene il codice correlato nella stessa posizione e semplifica la ricerca dei componenti per una determinata funzionalità.

### amministratore/

Contiene tutti i componenti del pannello di amministrazione, comprese tabelle dati, moduli, moduli e interfacce di gestione. Questi sono componenti client che utilizzano hook specifici dell'amministratore da `hooks/use-admin-*.ts`.

### autorizzazione/

Componenti di autenticazione tra cui moduli di accesso, moduli di iscrizione, flussi di reimpostazione della password, pulsanti OAuth e schermate di verifica della posta elettronica.

### fatturazione/

Componenti di fatturazione e gestione degli abbonamenti tra cui selezione del piano, moduli dei metodi di pagamento, visualizzazione delle fatture e indicatori dello stato dell'abbonamento.

### filtri/

Cerca e filtra i componenti utilizzati nelle pagine dell'elenco. Questi interagiscono con i parametri di ricerca dell'URL e lo stato del filtro Zustand per fornire un filtraggio in tempo reale.

### prezzi/

Componenti della pagina dei prezzi, tra cui schede di confronto dei piani, matrici di funzionalità e integrazione del checkout.

## Componenti condivisi

### condiviso/

La directory `shared/` contiene componenti riutilizzabili utilizzati in più funzionalità. Si tratta di elementi costitutivi indipendenti dal dominio che combinano le primitive dell'interfaccia utente in modelli funzionali.

### carta condivisa/

Componenti delle carte condivise utilizzati per visualizzare elementi, raccolte e altri contenuti nei layout delle carte nell'applicazione.

## Componenti a livello root

Esistono diversi file di componenti autonomi nella radice di `components/`:

|Componente|Scopo|
|-----------|---------|
|`categories-grid.tsx`|Visualizzazione della griglia per le categorie|
|`custom-hero.tsx`|Sezione eroe personalizzabile|
|`error-boundary.tsx`|Limite di errore con l'interfaccia utente di fallback|
|`error-provider.tsx`|Provider del contesto di errore|
|`favorite-button.tsx`|Pulsante di attivazione/disattivazione preferito|
|`hero.tsx`|Sezione eroe predefinita|
|`item.tsx`|Componente della scheda articolo|
|`items-categories.tsx`|Articoli organizzati per categorie|
|`item-skeleton.tsx`|Scheletro di caricamento degli articoli|
|`item-tags.tsx`|Visualizzazione dei tag per gli articoli|
|`language-switcher.tsx`|Componente di cambio lingua|
|`layout-switcher.tsx`|Attiva/disattiva il layout della griglia/elenco|
|`report-button.tsx`|Pulsante di segnalazione del contenuto|
|`sort-menu.tsx`|Elenco a discesa delle opzioni di ordinamento|
|`tags-cards.tsx`|Visualizzazione della scheda tag|
|`tags-items.tsx`|Visualizzazione degli elementi in base al tag|
|`theme-toggler.tsx`|Alterna il tema chiaro/scuro|
|`universal-pagination.tsx`|Componente di impaginazione riutilizzabile|
|`view-toggle.tsx`|Commuta la modalità di visualizzazione|

## Primitive dell'interfaccia utente (components/ui/)

La directory `ui/` contiene componenti dell'interfaccia utente di livello base che forniscono le basi del sistema di progettazione. Questi sono basati su HeroUI (precedentemente NextUI) e Tailwind CSS.

Le principali primitive dell'interfaccia utente includono:

|Componente|Descrizione|
|-----------|-------------|
|`button.tsx`|Pulsante con varianti (primario, secondario, fantasma, ecc.)|
|`card.tsx`|Contenitore per carte con sezioni di intestazione, corpo e piè di pagina|
|`input.tsx`|Inserimento di testo con supporto di convalida|
|`label.tsx`|Componente etichetta modulo|
|`modal.tsx`|Dialogo modale con sovrapposizione|
|`select.tsx`|Seleziona il menu a discesa con funzionalità di ricerca|
|`pagination.tsx`|Componente di navigazione della pagina|
|`badge.tsx`|Componente badge di stato|
|`accordion.tsx`|Sezioni di contenuto espandibili|
|`alert.tsx`|Banner di avviso/notifica|
|`breadcrumb.tsx`|Navigazione breadcrumb|
|`loading-spinner.tsx`|Indicatore di caricamento|
|`password-strength.tsx`|Misuratore di forza della password|
|`rating.tsx`|Visualizzazione/immissione della valutazione in stelle|
|`infinity-scroll.tsx`|Wrapper di scorrimento infinito|
|`searchable-select.tsx`|Seleziona con filtro di ricerca|
|`animations.tsx`|Componenti dell'utilità di animazione|
|`auth-illustrations.tsx`|Illustrazioni della pagina di autenticazione|

## Componenti server e client

Il modello segue le convenzioni Next.js per la separazione dei componenti server e client:

### Componenti del server

I componenti server sono predefiniti nell'App Router. Sono utilizzati per:
- Layout di pagina e wrapper
- Recupero dei dati a livello di pagina
- Rendering del contenuto statico
- Contenuti critici per la SEO

I componenti server risiedono principalmente nei file di pagina e layout `app/[locale]/`. Possono importare direttamente funzioni di query del database e metodi di repository.

### Componenti del cliente

I componenti client sono contrassegnati con `'use client'` e vengono utilizzati per:
- Elementi dell'interfaccia utente interattivi (moduli, pulsanti, interruttori)
- Componenti che utilizzano hook React (useState, useEffect, hook personalizzati)
- Componenti che utilizzano le API del browser
- Componenti che dipendono da React Query o Zustand

La maggior parte dei componenti nella directory `components/` sono componenti client poiché gestiscono l'interazione e lo stato dell'utente.

## Provider di contesto

### componenti/contesto/

Provider di contesto React per la condivisione dello stato tra alberi dei componenti:
- Contesto di errore per lo stato al contorno dell'errore
- Contesto del flag di funzionalità per il gating delle funzionalità di runtime

### componenti/fornitori/

Componenti wrapper del provider che compongono più provider:
- Eseguire query sul provider client (query TanStack)
- Fornitore di temi
- Provider di sessione (NextAuth)
- Fornitore di toast

Il wrapper dei provider root in `app/[locale]/providers.tsx` compone tutti i provider necessari per l'applicazione.

## Convenzioni dei componenti

1. **Nome dei file**: i componenti utilizzano nomi di file kebab-case (ad esempio, `favorite-button.tsx`)
2. **Modello di esportazione**: i componenti utilizzano esportazioni denominate, file barile (`index.ts`) nelle directory delle funzionalità
3. **Co-ubicazione degli hook**: gli hook specifici delle funzionalità risiedono nella directory `hooks/` di livello superiore, non all'interno delle directory dei componenti
4. **Stile**: i componenti utilizzano le classi di utilità CSS Tailwind; alcuni utilizzano moduli SCSS per stili complessi
5. **Tipi**: i tipi di prop del componente sono definiti in linea o in file di tipo adiacenti all'interno della directory `types/`
6. **Icone**: le icone personalizzate sono centralizzate in `components/icons/`; le icone standard utilizzano `lucide-react`
