---
id: features
title: Plattformfunktionen
sidebar_label: Funktionen
sidebar_position: 3
---

# Plattformfunktionen

Dieses Dokument bietet einen umfassenden Überblick über alle in der Ever Works-Plattform verfügbaren Funktionen, geordnet nach Funktionsbereichen.

## Benutzerauthentifizierung und Kontoverwaltung

### Benutzerregistrierung

**Beschreibung**: Ermöglicht neuen Benutzern das Erstellen von Konten auf der Plattform.

**So funktioniert es**:

- Benutzer können sich per E-Mail/Passwort oder über OAuth-Anbieter (Google, GitHub, Facebook, Twitter) registrieren.
- Bei der Registrierung wird eine E-Mail-Bestätigung gesendet
- Das Passwort wird vor der Speicherung mit bcrypt gehasht
- Nach erfolgreicher Registrierung wird automatisch ein Kundenprofil erstellt

**Benutzerfluss**:

1. Der Benutzer klickt auf der Startseite auf „Anmelden“.
2. Wählt die Registrierungsmethode (E-Mail oder OAuth)
3. Füllt die erforderlichen Informationen aus (Name, E-Mail, Passwort)
4. Erhält eine Bestätigungs-E-Mail
5. Klicken Sie auf den Bestätigungslink, um das Konto zu aktivieren
6. Weitergeleitet zum Kunden-Dashboard

**Schlüsseldateien**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Erfahren Sie mehr über die Authentifizierungseinrichtung →](/authentication/setup-guide)

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

### Passwortverwaltung

**Beschreibung**: Ermöglicht Benutzern das Ändern oder Zurücksetzen ihrer Passwörter.

**Eigenschaften**:

- **Passwort ändern**: Authentifizierte Benutzer können ihr Passwort über die Einstellungen aktualisieren
- **Passwort vergessen**: Benutzer erhalten eine E-Mail mit einem Link zum Zurücksetzen
- **Reset-Token**: Zeitlich begrenzter Token zum sicheren Zurücksetzen des Passworts

**So funktioniert es**:

1. Der Benutzer fordert das Zurücksetzen des Passworts an
2. Das System generiert ein sicheres Token, das in der Tabelle `passwordResetTokens` gespeichert ist
3. E-Mail mit Reset-Link mit Token gesendet
4. Der Benutzer klickt auf den Link und gibt ein neues Passwort ein
5. Der Token wird nach der Verwendung ungültig

**Schlüsseldateien**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

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

### Suchen und Filtern

**Beschreibung**: Ermöglicht Benutzern die Suche nach bestimmten Artikeln anhand verschiedener Kriterien.

**Filtertypen**:

- **Textsuche**: Volltextsuche über Artikelnamen und Beschreibungen hinweg
- **Kategoriefilter**: Filtern Sie nach einzelnen oder mehreren Kategorien
- **Tag-Filter**: Filtern Sie nach Tags, die Elementen zugewiesen sind
- **Kombinierte Filter**: Wenden Sie mehrere Filter gleichzeitig an

**So funktioniert es**:

1. Filter werden zur gemeinsamen Nutzung in URL-Parametern gespeichert
2. `FilterProvider` Kontext verwaltet den Filterstatus
3. `FilterURLParser` synchronisiert die URL mit dem Filterstatus
4. Elemente werden serverseitig gefiltert und an den Client zurückgegeben

**Benutzererfahrung**:

- Filter bleiben in der URL bestehen (markierbar/freigabebar)
- Aktualisierung der Ergebnisse in Echtzeit
- Option „Alle Filter löschen“.

**Schlüsseldateien**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

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

### Tag-System

**Beschreibung**: Flache Taxonomie für die kategorieübergreifende Artikelorganisation.

**Eigenschaften**:

- Mehrere Tags pro Artikel
- Tag-Cloud-Anzeige
- Tagbasierte Filterung
- Kann über Admin-Einstellungen aktiviert/deaktiviert werden

**So funktioniert es**:

- In `.content/tags/` gespeicherte Tags als Markdown-Dateien
- Viele-zu-viele-Beziehung mit Elementen
- Anklickbare Tags filtern die Artikelliste

**Schlüsseldateien**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

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

### Bewertungssystem

**Beschreibung**: Benutzer können Artikel auf einer Skala von 1 bis 5 Sternen bewerten.

**So funktioniert es**:

- Die Bewertung ist Teil des Kommentarsystems
- Jeder Kommentar kann eine Bewertung enthalten
- Durchschnittliche Bewertung berechnet und angezeigt
- Angezeigte Bewertungsverteilung (wie viele 5-Sterne, 4-Sterne usw.)

**Anzeige**:

- Sternsymbole zeigen die durchschnittliche Bewertung an
- Bewertungsanzahl neben Sternen
- Bewertungsaufschlüsselung auf der Artikeldetailseite

**Schlüsseldateien**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (Kommentartabelle)

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

### Favoritensystem

**Beschreibung**: Benutzer können Elemente für den schnellen Zugriff in ihrer Favoritenliste speichern.

**So funktioniert es**:

1. Der Benutzer klickt auf das Herz-/Favoritensymbol des Elements
2. Element zur Tabelle `favorites` hinzugefügt
3. Favoriten, auf die über das Benutzerprofil zugegriffen werden kann
4. Aktion umschalten (zum Entfernen erneut klicken)

**Eigenschaften**:

- Favoritenliste im Kundenportal
- Schnelle ungünstige Aktion
- Favoriten zählen auf Artikel (optional)
- Favoritenliste exportieren

**Schlüsseldateien**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

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

## Artikeleinreichung

**Beschreibung**: Ermöglicht Benutzern das Einreichen neuer Artikel an die Plattform.

**So funktioniert es**:

1. Der Benutzer navigiert zur Absendeseite
2. Füllt Artikeldetails aus (Name, Beschreibung, URL, Logo)
3. Wählt Kategorie und Tags aus
4. Wird zur Überprüfung eingereicht
5. Der Administrator erhält eine Benachrichtigung über eine neue Einreichung
6. Der Administrator prüft und genehmigt/ablehnt ab
7. Genehmigte Artikel werden auf der Plattform angezeigt

**Formularfelder**:

- Artikelname (erforderlich)
- Beschreibung (erforderlich)
- Website-URL
- Logo-/Bild-Upload
- Kategorieauswahl
- Tag-Auswahl
- Zusätzliche Metadaten

**Workflow-Status**:

- Entwurf → Ausstehende Überprüfung → Genehmigt/Abgelehnt

**Schlüsseldateien**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

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

## Abonnement- und Zahlungssystem

**Beschreibung**: Monetarisierung durch abonnementbasierten Zugriff oder Premium-Funktionen.

**Unterstützte Anbieter**:

- **Stripe**: Vollständige Abonnementverwaltung, Rechnungsstellung, Kundenportal
- **LemonSqueezy**: Alternativer Zahlungsabwickler mit Steuerkonformität

**So funktioniert es**:

1. Im Zahlungsanbieter definierte Pläne (Stripe/LemonSqueezy)
2. Benutzer wählen den Plan auf der Preisseite aus
3. Weiterleitung zur Kasse des Zahlungsanbieters
4. Webhook übernimmt die erfolgreiche Zahlung
5. In der Datenbank erstellter Abonnementdatensatz
6. Der Benutzer erhält Zugriff auf Premium-Funktionen

**Schlüsseldateien**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Erfahren Sie mehr über die Zahlungsintegration →](/zahlung)

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

## Benachrichtigungssystem

**Beschreibung**: Vom System generierte Benachrichtigungen für wichtige Ereignisse.

**Benachrichtigungstypen**:

- Neue Kommentare zu den Artikeln des Benutzers
- Abonnementaktualisierungen
- Admin-Ankündigungen
- Genehmigung/Ablehnung des Artikels

**Lieferkanäle**:

- In-App-Benachrichtigungen
- E-Mail-Benachrichtigungen (über Resend/Novu)
- Push-Benachrichtigungen (optional)

**Schlüsseldateien**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

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

## CRM-Integration (Twenty CRM)

**Beschreibung**: Synchronisieren Sie Plattformdaten mit Twenty CRM für das Kundenbeziehungsmanagement.

**Eigenschaften**:

- Automatische Kontakterstellung aus Benutzerregistrierungen
- Synchronisieren Sie Benutzeraktivitäten und -interaktionen
- Verfolgen Sie Abonnements und Zahlungen
- Benutzerdefinierte Feldzuordnung
- Webhook-basierte Synchronisierung

**Schlüsseldateien**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

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

## Internationalisierung (i18n)

**Beschreibung**: Mehrsprachige Unterstützung für die Plattform.

**Unterstützte Sprachen**: Über 13 Sprachen, darunter Englisch, Französisch, Spanisch, Chinesisch, Deutsch, Arabisch (RTL) und mehr.

**Eigenschaften**:

- Automatische Standorterkennung
- URL-basierter Gebietsschemawechsel
- RTL-Unterstützung für Arabisch
- Datums-/Zahlenformatierung pro Gebietsschema
- Pluralisierungsregeln

**Schlüsseldateien**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Erfahren Sie mehr über Internationalisierung →](/Internationalisierung)

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

## Admin-Dashboard

**Beschreibung**: Zentraler Hub für Administratoren zur Überwachung und Verwaltung der Plattform.

**Dashboard-Widgets**:

- Gesamtzahl der Benutzer, Artikel, Abonnements
- Aktueller Aktivitätsfeed
- Ausstehende Einreichungen
- Systemgesundheitsstatus
- Analytics-Übersicht

**Hauptmerkmale**:

- Echtzeitstatistiken
- Schnelle Aktionen
- Systembenachrichtigungen
- Leistungskennzahlen

**Schlüsseldateien**: `/app/[locale]/admin/dashboard/`

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

## Kundenmanagement

**Beschreibung**: Admin-Verwaltung von Kundenprofilen.

**Eigenschaften**:

- Alle Kundenprofile anzeigen
- Kundeninformationen bearbeiten
- Verknüpfen Sie Kunden mit Unternehmen
- Kundenbeiträge anzeigen
- Kundenabonnements verwalten

**Schlüsseldateien**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

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

## Einstellungsverwaltung

**Beschreibung**: Plattformweite Konfigurationsoptionen.

**Einstellungskategorien**:

- **Allgemein**: Site-Name, Beschreibung, Logo
- **Funktionen**: Funktionen aktivieren/deaktivieren (Kategorien, Tags, Abstimmungen usw.)
- **E-Mail**: SMTP-Konfiguration, E-Mail-Vorlagen
- **Zahlung**: Stripe/LemonSqueezy-API-Schlüssel
- **Analytics**: PostHog, Sentry-Konfiguration
- **Sicherheit**: ReCAPTCHA, Ratenbegrenzung

**Schlüsseldateien**: `/app/[locale]/admin/settings/`, `/lib/config/`

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

## Zusätzliche Funktionen

### E-Mail-Vorlagen

Anpassbare E-Mail-Vorlagen für:

- Willkommens-E-Mails
- Passwort zurücksetzen
- E-Mail-Bestätigung
- Abonnementbestätigungen
- Newsletter

[Erfahren Sie mehr über E-Mail-Vorlagen →](/guides/email-templates)

### Themensystem

Mehrere vorgefertigte Themes:

- EverWorks (Standard)
- Unternehmen
- Material
- Lustig

[Erfahren Sie mehr über Theming →](/guides/theming)

### Dynamisches Farbsystem

Automatische Generierung einer Farbpalette (Farbtöne 50–950) aus Grundfarben.

[Erfahren Sie mehr über dynamische Farben →](/guides/dynamic-colors)

### Responsive Tests

Richtlinien und Best Practices für geräteübergreifende Tests.

[Erfahren Sie mehr über das Testen →](/development/testing)

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

## Nächste Schritte

- [Tech Stack](./tech-stack) – Entdecken Sie den Technologie-Stack
- [Architekturübersicht](./overview) – Verstehen Sie die Architektur

## Ressourcen

- [Entwicklungssetup](/development/local-setup) – Richten Sie Ihre Umgebung ein
- [Bereitstellungshandbuch](/deployment/overview) – Bereitstellung in der Produktion
- [API-Dokumentation](/development/api-documentation) – API-Referenz
