---
id: component-patterns
title: Komponentenarchitektur und -muster
sidebar_label: Komponentenmuster
sidebar_position: 7
---

# Komponentenarchitektur und -muster

Die Ever Works-Vorlage organisiert ihre React-Komponenten mithilfe einer funktionsbasierten Verzeichnisstruktur mit klarer Trennung zwischen Funktionskomponenten, gemeinsam genutzten Komponenten und Basis-UI-Primitiven.

## Verzeichnisorganisation

Das `components/`-Verzeichnis folgt einer funktionsorientierten Organisation, in der jede Hauptdomäne neben gemeinsam genutzten Komponenten und Komponenten auf UI-Ebene über ein eigenes Unterverzeichnis verfügt.

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

## Funktionsbasierte Komponenten

Jedes Feature-Verzeichnis enthält alle Komponenten, die sich auf diese Domäne beziehen. Dadurch bleibt der zugehörige Code am selben Ort und erleichtert das Auffinden von Komponenten für eine bestimmte Funktion.

### Administrator/

Enthält alle Admin-Panel-Komponenten, einschließlich Datentabellen, Formulare, Modalitäten und Verwaltungsschnittstellen. Dies sind Client-Komponenten, die admin-spezifische Hooks von `hooks/use-admin-*.ts` verwenden.

### auth./

Authentifizierungskomponenten, einschließlich Anmeldeformulare, Registrierungsformulare, Abläufe zum Zurücksetzen von Passwörtern, OAuth-Schaltflächen und E-Mail-Verifizierungsbildschirme.

### Abrechnung/

Komponenten zur Abrechnung und Abonnementverwaltung, einschließlich Planauswahl, Zahlungsmethodenformulare, Rechnungsanzeige und Abonnementstatusanzeigen.

### Filter/

Such- und Filterkomponenten, die auf den Angebotsseiten verwendet werden. Diese interagieren mit URL-Suchparametern und dem Status des Zustandsfilters, um eine Echtzeitfilterung zu ermöglichen.

### Preise/

Komponenten der Preisseite, einschließlich Planvergleichskarten, Funktionsmatrizen und Checkout-Integration.

## Gemeinsame Komponenten

### geteilt/

Das Verzeichnis `shared/` enthält wiederverwendbare Komponenten, die in mehreren Funktionen verwendet werden. Hierbei handelt es sich um domänenunabhängige Bausteine, die UI-Primitive zu Funktionsmustern kombinieren.

### Shared-Card/

Gemeinsam genutzte Kartenkomponenten, die zum Anzeigen von Elementen, Sammlungen und anderen Inhalten in Kartenlayouts in der gesamten Anwendung verwendet werden.

## Komponenten auf Stammebene

Im Stammverzeichnis von `components/` sind mehrere eigenständige Komponentendateien vorhanden:

|Komponente|Zweck|
|-----------|---------|
|`categories-grid.tsx`|Rasteranzeige für Kategorien|
|`custom-hero.tsx`|Anpassbarer Heldenbereich|
|`error-boundary.tsx`|Fehlergrenze mit Fallback-Benutzeroberfläche|
|`error-provider.tsx`|Fehlerkontextanbieter|
|`favorite-button.tsx`|Schaltfläche zum Umschalten der Favoriten|
|`hero.tsx`|Standard-Heldenbereich|
|`item.tsx`|Elementkartenkomponente|
|`items-categories.tsx`|Nach Kategorien geordnete Artikel|
|`item-skeleton.tsx`|Ladegerüst für Artikel|
|`item-tags.tsx`|Tag-Anzeige für Artikel|
|`language-switcher.tsx`|Komponente zum Wechseln des Gebietsschemas|
|`layout-switcher.tsx`|Umschalten zwischen Raster- und Listenlayout|
|`report-button.tsx`|Schaltfläche „Inhaltsbericht“.|
|`sort-menu.tsx`|Dropdown-Liste mit den Sortieroptionen|
|`tags-cards.tsx`|Tag-Kartenanzeige|
|`tags-items.tsx`|Elemente nach Tag-Anzeige|
|`theme-toggler.tsx`|Umschalten zwischen hellem und dunklem Design|
|`universal-pagination.tsx`|Wiederverwendbare Paginierungskomponente|
|`view-toggle.tsx`|Ansichtsmodus umschalten|

## UI-Primitive (components/ui/)

Das Verzeichnis `ui/` enthält UI-Basiskomponenten, die die Grundlage des Designsystems bilden. Diese basieren auf HeroUI (ehemals NextUI) und Tailwind CSS.

Zu den wichtigsten UI-Grundelementen gehören:

|Komponente|Beschreibung|
|-----------|-------------|
|`button.tsx`|Schaltfläche mit Varianten (primär, sekundär, Ghost usw.)|
|`card.tsx`|Kartencontainer mit Kopf-, Text- und Fußzeilenabschnitten|
|`input.tsx`|Texteingabe mit Validierungsunterstützung|
|`label.tsx`|Formularbeschriftungskomponente|
|`modal.tsx`|Modaler Dialog mit Overlay|
|`select.tsx`|Dropdown-Menü mit Suchfunktion auswählen|
|`pagination.tsx`|Seitennavigationskomponente|
|`badge.tsx`|Status-Badge-Komponente|
|`accordion.tsx`|Erweiterbare Inhaltsabschnitte|
|`alert.tsx`|Warn-/Benachrichtigungsbanner|
|`breadcrumb.tsx`|Breadcrumb-Navigation|
|`loading-spinner.tsx`|Ladeanzeige|
|`password-strength.tsx`|Messgerät für die Passwortstärke|
|`rating.tsx`|Anzeige/Eingabe der Sternebewertung|
|`infinity-scroll.tsx`|Unendlicher Scroll-Wrapper|
|`searchable-select.tsx`|Mit Suchfilter auswählen|
|`animations.tsx`|Komponenten des Animationsdienstprogramms|
|`auth-illustrations.tsx`|Abbildungen der Authentifizierungsseite|

## Server- vs. Client-Komponenten

Die Vorlage folgt den Next.js-Konventionen für die Trennung von Server- und Clientkomponenten:

### Serverkomponenten

Serverkomponenten sind die Standardkomponenten im App Router. Sie werden verwendet für:
- Seitenlayouts und Wrapper
- Datenabruf auf Seitenebene
- Statische Inhaltswiedergabe
- SEO-kritische Inhalte

Serverkomponenten befinden sich hauptsächlich in `app/[locale]/` Seiten- und Layoutdateien. Sie können Datenbankabfragefunktionen und Repository-Methoden direkt importieren.

### Client-Komponenten

Client-Komponenten sind mit `'use client'` gekennzeichnet und werden verwendet für:
- Interaktive UI-Elemente (Formulare, Schaltflächen, Umschalter)
- Komponenten, die React-Hooks verwenden (useState, useEffect, benutzerdefinierte Hooks)
- Komponenten, die Browser-APIs verwenden
- Komponenten, die von React Query oder Zustand abhängen

Die meisten Komponenten im Verzeichnis `components/` sind Clientkomponenten, da sie Benutzerinteraktionen und -status verarbeiten.

## Kontextanbieter

### Komponenten/Kontext/

React-Kontextanbieter für die Statusfreigabe über Komponentenbäume hinweg:
- Fehlerkontext für den Fehlergrenzzustand
- Feature-Flag-Kontext für Laufzeit-Feature-Gating

### Komponenten/Anbieter/

Anbieter-Wrapper-Komponenten, aus denen mehrere Anbieter bestehen:
- Client-Anbieter abfragen (TanStack Query)
- Theme-Anbieter
- Sitzungsanbieter (NextAuth)
- Toastanbieter

Der Root-Provider-Wrapper bei `app/[locale]/providers.tsx` stellt alle notwendigen Provider für die Anwendung zusammen.

## Komponentenkonventionen

1. **Dateibenennung**: Komponenten verwenden Kebab-Dateinamen (z. B. `favorite-button.tsx`)
2. **Exportmuster**: Komponenten verwenden benannte Exporte, Barrel-Dateien (`index.ts`) in Feature-Verzeichnissen
3. **Colocation von Hooks**: Funktionsspezifische Hooks befinden sich im `hooks/`-Verzeichnis der obersten Ebene, nicht in Komponentenverzeichnissen
4. **Styling**: Komponenten verwenden Tailwind CSS-Dienstprogrammklassen; einige verwenden SCSS-Module für komplexes Styling
5. **Typen**: Komponenten-Requisitentypen werden inline oder in angrenzenden Typdateien im Verzeichnis `types/` definiert
6. **Symbole**: Benutzerdefinierte Symbole sind in `components/icons/` zentralisiert; Standardsymbole verwenden `lucide-react`
