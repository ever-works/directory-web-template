---
id: glossary
title: Glossario dei Termini
sidebar_label: Glossario
---

# Glossario dei Termini

Termini e concetti chiave utilizzati in tutta la documentazione del Directory Web Template.

## Concetti Core del Dominio

### Directory

Una raccolta di elenchi organizzati (item) attorno a un argomento o nicchia specifici. Una directory è l'entità di livello superiore. Esempi: una "SaaS Tools Directory," una "Developer Resources Directory," o una "Local Business Directory."

### Item

Una singola voce o listato all'interno di una directory. Un item rappresenta un'entità catalogata (uno strumento, un'azienda, una risorsa o un servizio). Gli item hanno campi strutturati (nome, descrizione, URL, logo), appartengono a categorie e possono essere taggati.

### Categoria

Una classificazione gerarchica utilizzata per organizzare gli item. Le categorie formano una struttura ad albero (relazioni genitore/figlio) e forniscono il meccanismo principale di navigazione e filtraggio.

### Tag

Un'etichetta piatta e non gerarchica allegata agli item per una classificazione trasversale. I tag vengono utilizzati per il filtraggio secondario e la scoperta. Un item può avere più tag come "open-source," "freemium," o "API-available."

### Collezione

Un raggruppamento curato di item, indipendente da categorie o tag. Le collezioni sono set curati dall'utente o editorialmente, come "Top 10 Selezioni" o "Novità di questo Mese."

### Tassonomia

Il sistema di classificazione complessivo per una directory, che comprende categorie, tag e qualsiasi altra struttura organizzativa.

### Slug

Un identificatore URL-friendly e leggibile dall'uomo derivato dal nome di un'entità. Gli slug sono usati negli URL invece degli ID numerici. Ad esempio, "Visual Studio Code" diventa `visual-studio-code`.

## Pattern Architetturali

### Repository

Una classe del livello di accesso ai dati che incapsula le query e le mutazioni del database per un'entità specifica. I repository astraggono Drizzle ORM e forniscono un'interfaccia pulita per i services. Si trova in `lib/repositories/`.

### Service

Una classe del livello di logica di business che orchestra le operazioni tra repository, API esterne e altri service. I service contengono la logica applicativa principale e vengono chiamati dai gestori delle route API. Si trova in `lib/services/`.

### Webhook

Un callback HTTP attivato da un evento. Il Template utilizza i webhook per le notifiche dei provider di pagamento (Stripe, LemonSqueezy, Polar) e gli aggiornamenti dello stato di deployment. Gli endpoint webhook convalidano le richieste in arrivo utilizzando firme o segreti condivisi.

## Gestione dei Contenuti

### CMS Basato su Git

L'approccio di gestione dei contenuti utilizzato dal Template. I dati della directory (item, categorie, metadati) sono archiviati come file strutturati (YAML, Markdown) in un repository Git. Il Template clona questo repository in fase di build e legge i contenuti dal filesystem locale. Le modifiche vengono apportate tramite commit e pull request.

### Community PR

Una pull request inviata da un membro della community per aggiungere o aggiornare item nel repository CMS basato su Git di una directory. Le Community PR vengono sottoposte a un processo di revisione prima di essere unite.

## Database

### Drizzle ORM

L'ORM leggero e TypeScript-first utilizzato dal Template. Drizzle fornisce un query builder simile a SQL con piena sicurezza dei tipi. Le definizioni dello schema sono scritte come codice TypeScript e le migrazioni vengono generate come semplici file SQL tramite Drizzle Kit.

### Migration

Una modifica dello schema del database con versione. Le migrazioni vengono generate con `pnpm db:generate` e applicate con `pnpm db:migrate`. I file di migrazione sono archiviati in `lib/db/migrations/`.

## Autenticazione

### NextAuth.js

La libreria di autenticazione (v5) utilizzata dal Template. Fornisce supporto OAuth per più provider (Google, GitHub, Facebook, Twitter, Microsoft) con gestione delle sessioni e token JWT.

### Supabase Auth

Un backend di autenticazione alternativo supportato dal Template. Supabase Auth fornisce autenticazione email/password, magic link e OAuth social attraverso il servizio gestito di Supabase.

## Pagamenti

### Abbonamento

Un accordo di pagamento ricorrente gestito tramite uno dei provider di pagamento supportati (Stripe, LemonSqueezy o Polar). Il Template gestisce la creazione, la gestione e l'elaborazione dei webhook degli abbonamenti.

## Deployment

### Vercel

La piattaforma di deployment principale per il Template. Vercel fornisce deployment senza configurazione per le applicazioni Next.js, inclusi deployment di anteprima automatici, edge function e distribuzione CDN.

### Docker

Un metodo di deployment alternativo. Il Template può essere containerizzato e distribuito in qualsiasi ambiente di hosting compatibile con Docker.
