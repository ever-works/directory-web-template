---
id: features
title: Funzionalità della piattaforma
sidebar_label: Caratteristiche
sidebar_position: 3
---

# Funzionalità della piattaforma

Questo documento fornisce una panoramica completa di tutte le funzionalità disponibili nella piattaforma Ever Works, organizzate per area funzionale.

## Autenticazione utente e gestione account

### Registrazione utente

**Descrizione**: Consente ai nuovi utenti di creare account sulla piattaforma.

**Come funziona**:

- Gli utenti possono registrarsi tramite email/password o provider OAuth (Google, GitHub, Facebook, Twitter)
- La verifica via email viene inviata al momento della registrazione
- La password viene sottoposta ad hashing utilizzando bcrypt prima dell'archiviazione
- Una volta effettuata la registrazione, viene creato automaticamente un profilo cliente

**Flusso utenti**:

1. L'utente fa clic su "Iscriviti" nella home page
2. Sceglie il metodo di registrazione (e-mail o OAuth)
3. Compila le informazioni richieste (nome, email, password)
4. Riceve un'e-mail di verifica
5. Fare clic sul collegamento di verifica per attivare l'account
6. Reindirizzato al dashboard del cliente

**File chiave**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Ulteriori informazioni sulla configurazione dell'autenticazione →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Gestione delle password

**Descrizione**: Consente agli utenti di modificare o reimpostare le proprie password.

**Caratteristiche**:

- **Cambia password**: gli utenti autenticati possono aggiornare la propria password dalle impostazioni
- **Password dimenticata**: gli utenti ricevono un'e-mail con il collegamento per la reimpostazione
- **Token di ripristino**: token limitato nel tempo per la reimpostazione sicura della password

**Come funziona**:

1. L'utente richiede la reimpostazione della password
2. Il sistema genera un token sicuro archiviato nella tabella `passwordResetTokens`
3. E-mail inviata con collegamento di reimpostazione contenente token
4. L'utente fa clic sul collegamento e inserisce la nuova password
5. Il token viene invalidato dopo l'uso

**File chiave**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Ricerca e filtraggio

**Descrizione**: Consente agli utenti di trovare elementi specifici utilizzando vari criteri.

**Tipi di filtro**:

- **Ricerca testo**: ricerca del testo completo tra nomi e descrizioni degli elementi
- **Filtro categoria**: filtra per categorie singole o multiple
- **Filtro tag**: filtra in base ai tag assegnati agli articoli
- **Filtri combinati**: applica più filtri contemporaneamente

**Come funziona**:

1. I filtri vengono archiviati nei parametri URL per la condivisibilità
2. Il contesto `FilterProvider` gestisce lo stato del filtro
3. `FilterURLParser` sincronizza l'URL con lo stato del filtro
4. Gli elementi vengono filtrati lato server e restituiti al client

**Esperienza utente**:

- I filtri persistono nell'URL (aggiungibile ai segnalibri/condivisibile)
- Aggiornamento dei risultati in tempo reale
- Opzione Cancella tutti i filtri

**File chiave**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### Sistema di etichette

**Descrizione**: tassonomia piatta per l'organizzazione di articoli in più categorie.

**Caratteristiche**:

- Tag multipli per articolo
- Visualizzazione della nuvola di tag
- Filtraggio basato su tag
- Può essere abilitato/disabilitato tramite le impostazioni dell'amministratore

**Come funziona**:

- Tag archiviati in `.content/tags/` come file di ribasso
- Relazione molti-a-molti con gli elementi
- I tag cliccabili filtrano l'elenco degli articoli

**File chiave**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### Sistema di valutazione

**Descrizione**: gli utenti possono valutare gli articoli su una scala da 1 a 5 stelle.

**Come funziona**:

- La valutazione fa parte del sistema di commenti
- Ogni commento può includere una valutazione
- Voto medio calcolato e visualizzato
- Distribuzione della valutazione mostrata (quanti 5 stelle, 4 stelle, ecc.)

**Visualizzazione**:

- Icone a stella che mostrano la valutazione media
- Conteggio della valutazione accanto alle stelle
- Ripartizione della valutazione nella pagina dei dettagli dell'articolo

**File chiave**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tabella dei commenti)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### Sistema Preferiti

**Descrizione**: Gli utenti possono salvare gli elementi nell'elenco dei preferiti per un accesso rapido.

**Come funziona**:

1. L'utente fa clic sull'icona del cuore/preferito sull'elemento
2. Elemento aggiunto alla tabella `favorites`
3. Preferiti accessibili dal profilo dell'utente
4. Attiva/disattiva l'azione (fai nuovamente clic per rimuovere)

**Caratteristiche**:

- Elenco dei preferiti nel portale clienti
- Azione rapida sfavorevole
- I preferiti contano sugli articoli (facoltativo)
- Esporta l'elenco dei preferiti

**File chiave**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Invio dell'articolo

**Descrizione**: Consente agli utenti di inviare nuovi elementi alla piattaforma.

**Come funziona**:

1. L'utente accede alla pagina di invio
2. Compila i dettagli dell'articolo (nome, descrizione, URL, logo)
3. Seleziona la categoria e i tag
4. Invia per la revisione
5. L'amministratore riceve la notifica del nuovo invio
6. L'amministratore esamina e approva/rifiuta
7. Gli elementi approvati vengono visualizzati sulla piattaforma

**Campi modulo**:

- Nome dell'articolo (richiesto)
- Descrizione (richiesto)
- URL del sito web
- Caricamento logo/immagine
- Selezione della categoria
- Selezione dell'etichetta
- Metadati aggiuntivi

**Stati del flusso di lavoro**:

- Bozza → In attesa di revisione → Approvato/Rifiutato

**File chiave**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## Sistema di abbonamento e pagamento

**Descrizione**: Monetizzazione tramite accesso basato su abbonamento o funzionalità premium.

**Fornitori supportati**:

- **Stripe**: gestione completa degli abbonamenti, fatturazione, portale clienti
- **LemonSqueezy**: processore di pagamento alternativo con conformità fiscale

**Come funziona**:

1. Piani definiti nel fornitore di servizi di pagamento (Stripe/LemonSqueezy)
2. Gli utenti selezionano il piano nella pagina dei prezzi
3. Reindirizzato al pagamento del fornitore di servizi di pagamento
4. Il webhook gestisce il pagamento andato a buon fine
5. Record di abbonamento creato nel database
6. L'utente ottiene l'accesso alle funzionalità premium

**File chiave**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Ulteriori informazioni sull'integrazione dei pagamenti →](/pagamento)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## Sistema di notifica

**Descrizione**: Notifiche generate dal sistema per eventi importanti.

**Tipi di notifica**:

- Nuovi commenti sugli articoli dell'utente
- Aggiornamenti sull'abbonamento
- Annunci dell'amministratore
- Approvazione/rifiuto dell'articolo

**Canali di consegna**:

- Notifiche nell'app
- Notifiche e-mail (tramite Resend/Novu)
- Notifiche push (facoltative)

**File chiave**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## Integrazione CRM (Twenty CRM)

**Descrizione**: Sincronizza i dati della piattaforma con Twenty CRM per la gestione delle relazioni con i clienti.

**Caratteristiche**:

- Creazione automatica dei contatti dalle registrazioni degli utenti
- Sincronizza le attività e le interazioni degli utenti
- Tieni traccia degli abbonamenti e dei pagamenti
- Mappatura dei campi personalizzata
- Sincronizzazione basata su webhook

**File chiave**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Internazionalizzazione (i18n)

**Descrizione**: Supporto multilingue per la piattaforma.

**Lingue supportate**: oltre 13 lingue tra cui inglese, francese, spagnolo, cinese, tedesco, arabo (RTL) e altre.

**Caratteristiche**:

- Rilevamento automatico delle impostazioni locali
- Commutazione locale basata su URL
- Supporto RTL per l'arabo
- Formattazione data/numero in base alle impostazioni locali
- Regole di pluralizzazione

**File chiave**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Scopri di più sull'internazionalizzazione →](/internazionalizzazione)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Pannello di amministrazione

**Descrizione**: Hub centrale per gli amministratori per monitorare e gestire la piattaforma.

**Widget della dashboard**:

- Utenti totali, articoli, abbonamenti
- Feed attività recenti
- Presentazioni in sospeso
- Stato di integrità del sistema
- Panoramica dell'analisi

**Caratteristiche principali**:

- Statistiche in tempo reale
- Azioni rapide
- Notifiche di sistema
- Metriche delle prestazioni

**File chiave**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Gestione del cliente

**Descrizione**: Gestione amministrativa dei profili cliente.

**Caratteristiche**:

- Visualizza tutti i profili dei clienti
- Modifica le informazioni del cliente
- Collegare i clienti alle aziende
- Visualizza gli invii dei clienti
- Gestire gli abbonamenti dei clienti

**File chiave**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Gestione delle impostazioni

**Descrizione**: opzioni di configurazione a livello di piattaforma.

**Categorie di impostazioni**:

- **Generale**: nome del sito, descrizione, logo
- **Funzionalità**: attiva/disattiva funzionalità (categorie, tag, votazione, ecc.)
- **E-mail**: configurazione SMTP, modelli di posta elettronica
- **Pagamento**: Chiavi API Stripe/LemonSqueezy
- **Analisi**: PostHog, configurazione Sentry
- **Sicurezza**: ReCAPTCHA, limitazione della velocità

**File chiave**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Funzionalità aggiuntive

### Modelli di posta elettronica

Modelli di email personalizzabili per:

- E-mail di benvenuto
- Reimpostazione della password
- Verifica e-mail
- Conferme di abbonamento
- Notiziario

[Ulteriori informazioni sui modelli di posta elettronica →](/guides/email-templates)

### Sistema tematico

Temi multipli predefiniti:

- EverWorks (predefinito)
- Aziendale
- Materiale
- Divertente

[Ulteriori informazioni sui temi →](/guides/theming)

### Sistema di colore dinamico

Generazione automatica della tavolozza dei colori (tonalità 50-950) dai colori base.

[Ulteriori informazioni sui colori dinamici →](/guides/dynamic-colors)

### Test reattivo

Linee guida e best practice per i test cross-device.

[Ulteriori informazioni sui test →](/development/testing)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Passaggi successivi

- [Stack tecnologico](./tech-stack): esplora lo stack tecnologico
- [Panoramica dell'architettura](./overview) - Comprendere l'architettura

## Risorse

- [Configurazione sviluppo](/development/local-setup) - Configura il tuo ambiente
- [Guida alla distribuzione](/deployment/overview) - Distribuisci in produzione
- [Documentazione API](/development/api-documentation) - Riferimento API
