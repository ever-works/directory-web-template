---
id: features
title: Platformfuncties
sidebar_label: Kenmerken
sidebar_position: 3
---

# Platformfuncties

Dit document geeft een uitgebreid overzicht van alle functies die beschikbaar zijn in het Ever Works-platform, gerangschikt per functioneel gebied.

## Gebruikersauthenticatie en accountbeheer

### Gebruikersregistratie

**Beschrijving**: Hiermee kunnen nieuwe gebruikers accounts op het platform aanmaken.

**Hoe het werkt**:

- Gebruikers kunnen zich registreren via e-mail/wachtwoord of OAuth-providers (Google, GitHub, Facebook, Twitter)
- Bij registratie wordt een e-mailverificatie verzonden
- Het wachtwoord wordt vóór opslag gehasht met behulp van bcrypt
- Bij succesvolle registratie wordt er automatisch een klantprofiel aangemaakt

**Gebruikersstroom**:

1. Gebruiker klikt op "Aanmelden" op de startpagina
2. Kiest de registratiemethode (e-mail of OAuth)
3. Vult de vereiste informatie in (naam, e-mailadres, wachtwoord)
4. Ontvangt verificatie-e-mail
5. Klikt op de verificatielink om het account te activeren
6. Omgeleid naar het klantendashboard

**Sleutelbestanden**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Meer informatie over het instellen van authenticatie →](/authentication/setup-guide)

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

### Wachtwoordbeheer

**Beschrijving**: Hiermee kunnen gebruikers hun wachtwoord wijzigen of opnieuw instellen.

**Kenmerken**:

- **Wachtwoord wijzigen**: Geauthenticeerde gebruikers kunnen hun wachtwoord bijwerken via de instellingen
- **Wachtwoord vergeten**: gebruikers ontvangen een e-mail met een resetlink
- **Reset-token**: in de tijd beperkte token voor het veilig opnieuw instellen van het wachtwoord

**Hoe het werkt**:

1. Gebruiker vraagt wachtwoordreset aan
2. Het systeem genereert een beveiligd token dat is opgeslagen in de tabel `passwordResetTokens`
3. E-mail verzonden met resetlink met token
4. Gebruiker klikt op de link en voert een nieuw wachtwoord in
5. Token wordt na gebruik ongeldig verklaard

**Sleutelbestanden**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

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

### Zoeken en filteren

**Beschrijving**: Hiermee kunnen gebruikers specifieke items vinden op basis van verschillende criteria.

**Filtertypen**:

- **Tekst zoeken**: zoeken in volledige tekst op itemnamen en beschrijvingen
- **Categoriefilter**: filter op enkele of meerdere categorieën
- **Tagfilter**: filter op tags die aan items zijn toegewezen
- **Gecombineerde filters**: meerdere filters tegelijkertijd toepassen

**Hoe het werkt**:

1. Filters worden opgeslagen in URL-parameters voor deelbaarheid
2. `FilterProvider` context beheert de filterstatus
3. `FilterURLParser` synchroniseert de URL met de filterstatus
4. Items worden aan de serverzijde gefilterd en teruggestuurd naar de client

**Gebruikerservaring**:

- Filters blijven bestaan in URL (bladwijzerbaar/deelbaar)
- Realtime resultatenupdate
- Wis alle filtersoptie

**Sleutelbestanden**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

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

### Tag-systeem

**Beschrijving**: Platte taxonomie voor itemorganisatie binnen meerdere categorieën.

**Kenmerken**:

- Meerdere labels per item
- Tagwolk-weergave
- Op tags gebaseerde filtering
- Kan worden in-/uitgeschakeld via beheerdersinstellingen

**Hoe het werkt**:

- Tags opgeslagen in `.content/tags/` als markdown-bestanden
- Veel-op-veel-relatie met items
- Klikbare tags filteren de itemlijst

**Sleutelbestanden**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

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

### Beoordelingssysteem

**Beschrijving**: Gebruikers kunnen items beoordelen op een schaal van 1-5 sterren.

**Hoe het werkt**:

- Beoordeling maakt deel uit van het commentaarsysteem
- Elke opmerking kan een beoordeling bevatten
- Gemiddelde beoordeling berekend en weergegeven
- Getoonde beoordelingsverdeling (hoeveel 5-sterren, 4-sterren, etc.)

**Weergave**:

- Sterpictogrammen die de gemiddelde beoordeling weergeven
- Waarderingstelling naast sterren
- Uitsplitsing van de beoordeling op de itemdetailpagina

**Sleutelbestanden**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tabel met opmerkingen)

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

### Favorietensysteem

**Beschrijving**: Gebruikers kunnen items opslaan in hun favorietenlijst voor snelle toegang.

**Hoe het werkt**:

1. Gebruiker klikt op het hart/favorietpictogram op het item
2. Item toegevoegd aan `favorites` tabel
3. Favorieten toegankelijk via het profiel van de gebruiker
4. Schakelactie (klik opnieuw om te verwijderen)

**Kenmerken**:

- Favorietenlijst in klantenportaal
- Snelle onfavoriete actie
- Favorieten tellen op items (optioneel)
- Favorietenlijst exporteren

**Sleutelbestanden**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

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

## Artikelinzending

**Beschrijving**: Hiermee kunnen gebruikers nieuwe items op het platform indienen.

**Hoe het werkt**:

1. Gebruiker navigeert naar de verzendpagina
2. Vult itemdetails in (naam, beschrijving, URL, logo)
3. Selecteert categorie en tags
4. Wordt ter beoordeling ingediend
5. De beheerder ontvangt een melding van een nieuwe inzending
6. De beheerder beoordeelt en keurt goed/af
7. Goedgekeurde items verschijnen op het platform

**Formuliervelden**:

- Artikelnaam (verplicht)
- Beschrijving (verplicht)
- Website-URL
- Logo/afbeelding uploaden
- Categorie selectie
- Tagselectie
- Aanvullende metagegevens

**Werkstroomstatussen**:

- Concept → In afwachting van beoordeling → Goedgekeurd/afgewezen

**Sleutelbestanden**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

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

## Abonnement- en betalingssysteem

**Beschrijving**: Inkomsten genereren via abonnementsgebaseerde toegang of premiumfuncties.

**Ondersteunde providers**:

- **Stripe**: Volledig abonnementsbeheer, facturatie, klantenportaal
- **LemonSqueezy**: alternatieve betalingsverwerker met belastingnaleving

**Hoe het werkt**:

1. Plannen gedefinieerd in betalingsprovider (Stripe/LemonSqueezy)
2. Gebruikers selecteren het abonnement op de prijspagina
3. Doorgestuurd naar de kassa van de betalingsprovider
4. Webhook zorgt voor de succesvolle betaling
5. Abonnementrecord gemaakt in de database
6. Gebruiker krijgt toegang tot premiumfuncties

**Sleutelbestanden**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Meer informatie over betalingsintegratie →](/betaling)

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

## Meldingssysteem

**Beschrijving**: Door het systeem gegenereerde meldingen voor belangrijke gebeurtenissen.

**Meldingstypen**:

- Nieuwe reacties op items van gebruikers
- Abonnementsupdates
- Beheerderaankondigingen
- Goedkeuring/afwijzing van artikel

**Bezorgkanalen**:

- In-app-meldingen
- E-mailmeldingen (via Resend/Novu)
- Pushmeldingen (optioneel)

**Sleutelbestanden**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

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

## CRM-integratie (Twintig CRM)

**Beschrijving**: Synchroniseer platformgegevens met Twenty CRM voor klantrelatiebeheer.

**Kenmerken**:

- Automatisch contact maken op basis van gebruikersregistraties
- Synchroniseer gebruikersactiviteiten en interacties
- Volg abonnementen en betalingen
- Aangepaste veldtoewijzing
- Webhook-gebaseerde synchronisatie

**Sleutelbestanden**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

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

## Internationalisering (i18n)

**Beschrijving**: Meertalige ondersteuning voor het platform.

**Ondersteunde talen**: 13+ talen, waaronder Engels, Frans, Spaans, Chinees, Duits, Arabisch (RTL) en meer.

**Kenmerken**:

- Automatische locale detectie
- Op URL gebaseerde landinstelling
- RTL-ondersteuning voor Arabisch
- Datum-/getalnotatie per landinstelling
- Pluralisatieregels

**Sleutelbestanden**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Lees meer over internationalisering →](/internationalisering)

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

## Beheerdashboard

**Beschrijving**: Centrale hub voor beheerders om het platform te monitoren en te beheren.

**Dashboardwidgets**:

- Totaal aantal gebruikers, items, abonnementen
- Recente activiteitenfeed
- Inzendingen in behandeling
- Systeemstatus
- Analytics-overzicht

**Belangrijkste kenmerken**:

- Realtime statistieken
- Snelle acties
- Systeemmeldingen
- Prestatiestatistieken

**Sleutelbestanden**: `/app/[locale]/admin/dashboard/`

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

## Klantenbeheer

**Beschrijving**: Beheerder beheer van klantprofielen.

**Kenmerken**:

- Bekijk alle klantprofielen
- Klantgegevens bewerken
- Koppel klanten aan bedrijven
- Bekijk klantinzendingen
- Beheer klantabonnementen

**Sleutelbestanden**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

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

## Instellingenbeheer

**Beschrijving**: Platformbrede configuratieopties.

**Instellingencategorieën**:

- **Algemeen**: sitenaam, beschrijving, logo
- **Functies**: functies in-/uitschakelen (categorieën, tags, stemmen, enz.)
- **E-mail**: SMTP-configuratie, e-mailsjablonen
- **Betaling**: Stripe/LemonSqueezy API-sleutels
- **Analytics**: PostHog, Sentry-configuratie
- **Beveiliging**: ReCAPTCHA, snelheidsbeperking

**Sleutelbestanden**: `/app/[locale]/admin/settings/`, `/lib/config/`

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

## Extra functies

### E-mailsjablonen

Aanpasbare e-mailsjablonen voor:

- Welkomstmails
- Wachtwoord opnieuw instellen
- E-mailverificatie
- Abonnementsbevestigingen
- Nieuwsbrief

[Meer informatie over e-mailsjablonen →](/guides/email-templates)

### Thema Systeem

Meerdere vooraf gebouwde thema's:

- EverWorks (standaard)
- Zakelijk
- Materiaal
- Grappig

[Meer informatie over thema's →](/guides/theming)

### Dynamisch kleurensysteem

Automatische generatie van kleurenpaletten (tinten 50-950) op basis van basiskleuren.

[Meer informatie over dynamische kleuren →](/guides/dynamic-colors)

### Responsief testen

Richtlijnen voor testen op verschillende apparaten en best practices.

[Meer informatie over testen →](/ontwikkeling/testen)

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

## Volgende stappen

- [Tech Stack](./tech-stack) - Ontdek de technologiestapel
- [Architectuuroverzicht](./overview) - Begrijp de architectuur

## Hulpbronnen

- [Ontwikkelingsinstellingen](/development/local-setup) - Stel uw omgeving in
- [Implementatiehandleiding](/deployment/overview) - Implementeren naar productie
- [API-documentatie](/development/api-documentation) - API-referentie
