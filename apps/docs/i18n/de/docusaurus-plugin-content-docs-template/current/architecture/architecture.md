---
id: architecture
title: Architekturübersicht
sidebar_label: Übersicht
sidebar_position: 0
---

# Architekturübersicht

Diese Seite bietet eine Übersichtskarte der Ever Works-Vorlagenarchitektur. Nutzen Sie es als Ausgangspunkt, bevor Sie sich mit den folgenden Detailseiten befassen.

## Technologiestiftung

Die Vorlage ist eine **Next.js 16**-Anwendung, die den **App Router** mit **React 19** verwendet. Es erzeugt eine `standalone` Ausgabe für containerisierte Bereitstellungen und wendet mehrere Optimierungen auf Framework-Ebene in `next.config.ts` an:

|Schicht|Technologie|Zweck|
|---|---|---|
|**Rahmen**|Next.js 16 (App-Router)|Server- und Client-Rendering, Routing, API-Routen|
|**Benutzeroberfläche**|React 19, HeroUI, Radix UI, Tailwind CSS 4|Komponentenbibliothek, Grundelemente, Stil|
|**Datenbank**|Drizzle ORM + PostgreSQL (oder SQLite lokal)|Schemaverwaltung, Migrationen, Abfragen|
|**Authentifizierung**|NextAuth.js v5 (Beta)|Multi-Provider-Authentifizierung mit Sitzungs-Caching|
|**Internationalisierung**|next-intl|Gebietsschemaspezifisches Routing und Nachrichtenpakete|
|**Zahlungen**|Stripe, Polar, LemonSqueezy, Solidgate|Abonnement- und einmalige Zahlungsströme|
|**Inhalt**|Git-basiertes CMS (`.content/` Verzeichnis)|Aus einem Datenrepository geklonte Markdown-/YAML-Inhalte|
|**Überwachung**|Sentry, PostHog, Vercel Analytics|Fehlerverfolgung, Produktanalyse, Leistung|
|**E-Mail**|Erneut senden|Transaktionale E-Mail-Zustellung|
|**Rich-Text**|Tiptap|WYSIWYG-Editor für Admin-Inhalte|

## Projektstruktur

Die Vorlage folgt einer mehrschichtigen, funktionsbasierten Organisation. Hier sind die Verzeichnisse der obersten Ebene und ihre Verantwortlichkeiten:

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

Eine vollständige Anleitung zum Verzeichnis finden Sie auf der Seite [Projektstruktur](/architecture/project-structure).

## Geschichtete Architektur

Die Codebasis erzwingt eine klare Trennung der Anliegen auf drei Ebenen:

### Präsentationsebene

React-Komponenten in `components/` und Seitendateien in `app/[locale]/` übernehmen das Rendering und die Benutzerinteraktion. Serverkomponenten rufen Daten direkt ab; Client-Komponenten verwenden React Query-Hooks von `hooks/` für den clientseitigen Status.

### Geschäftslogikschicht

Dienste in `lib/services/` enthalten die Kerngeschäftsregeln. Die Vorlage wird mit über 30 Servicedateien geliefert, die Analysen, Abonnements, Moderation, CRM-Synchronisierung, Geokodierung, Benachrichtigungen und mehr abdecken. Dienste werden von API-Routenhandlern und Serverkomponenten aufgerufen, jedoch niemals direkt vom UI-Code im Browser.

### Datenzugriffsschicht

Repositorys in `lib/repositories/` kapseln alle Datenbankabfragen mithilfe von Drizzle ORM. Jede Domain-Entität (Artikel, Kategorien, Sammlungen, Benutzer, Rollen, Tags, Sponsor-Anzeigen) verfügt über eine eigene Repository-Datei. Dadurch bleiben Details auf SQL-Ebene von der Serviceschicht fern.

Weitere Informationen zum Datenfluss zwischen diesen Ebenen finden Sie unter [Datenfluss](/architecture/data-flow).

## Next.js App Router und Routing

Alle benutzerorientierten Routen laufen unter `app/[locale]/`, wodurch über `next-intl` sofort URLs mit lokalem Präfix möglich sind. Die Anwendung nutzt mehrere App Router-Funktionen:

- **Layouts** – verschachtelte `layout.tsx` Dateien für Admin, Client-Dashboard und öffentliche Bereiche.
- **Routengruppen** – die Gruppe `(listing)` übernimmt die Auflistung des Hauptverzeichnisses und das Durchsuchen von Tags, ohne die URL-Struktur zu beeinflussen.
- **Dynamische Routen** – `[page]`, `[...tag]` und benannte Segmente für Elemente, Kategorien und Sammlungen.
- **Umschreibungen** – definiert in `next.config.ts`, um bloße Kategoriepfade zu ihrer paginierten Entdeckungsansicht umzuleiten.

Die vollständige Routenkarte finden Sie unter [Routing](/architecture/routing).

## Authentifizierungssystem

Die Authentifizierung basiert auf **NextAuth.js v5** mit einem Anbieterkonfigurationssystem in `lib/auth/`. Die Datei `auth.config.ts` im Projektstamm orchestriert Folgendes:

- **OAuth-Anbieter** – Google und GitHub, über Umgebungsvariablen konfiguriert und dynamisch aktiviert/deaktiviert.
- **Anmeldeinformationsanbieter** – E-Mail-/Passwort-Authentifizierung mit bcrypt-Hashing.
- **Supabase-Adapter** – optionaler, von Supabase unterstützter Sitzungsspeicher.
- **Sitzungscaching** – `lib/auth/cached-session.ts` reduziert redundante Sitzungssuchen.
- **Schutzsystem** – `lib/auth/guards.ts` und `lib/guards/` erzwingen rollenbasierten Zugriff auf Routenebene.

Einzelheiten zum Wächtersystem und zu rollenbasierten Berechtigungen finden Sie unter [Wächtersystem](/architecture/guards-system) und [Berechtigungssystem](/architecture/permissions-system).

## Nieselregen Sie ORM und Datenbank

Die Datenbankschicht verwendet **Drizzle ORM** mit dem in `lib/db/schema.ts` definierten Schema. Hauptaspekte:

- **Migrationen** werden mit `drizzle-kit generate` generiert und mit `drizzle-kit migrate` angewendet.
- **Seeding**-Skripte in `lib/db/seed.ts` und `scripts/cli-seed.ts` füllen Anfangsdaten einschließlich Rollen.
- **Konfiguration** befindet sich in `drizzle.config.ts` im Projektstamm.
- Für die Produktion ist PostgreSQL erforderlich; SQLite wird für die lokale Entwicklung unterstützt.

Informationen zur Struktur der Datenzugriffsebene finden Sie unter [Repository-Muster](/architecture/repository-patterns).

## Middleware-Kette

Die Vorlage verwendet Next.js-Middleware (über das in `next.config.ts` angewendete Plugin `next-intl`) kombiniert mit benutzerdefinierten Berechtigungsprüfungen in `lib/middleware/permission-check.ts`. Die Middleware-Pipeline verarbeitet Folgendes:

- Lokale Erkennung und Weiterleitung
- Überprüfung des Authentifizierungsstatus
- Rollenbasierter Routenschutz
- Sicherheitsheader (HSTS, CSP, X-Frame-Options und mehr – konfiguriert in `next.config.ts`)

Eine detaillierte Aufschlüsselung finden Sie unter [Middleware](/architecture/middleware) und [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Konfiguration und Sicherheit

Die Datei `next.config.ts` legt mehrere Sicherheits- und Leistungsstandards fest:

- **Eigenständige Ausgabe** für Docker-freundliche Bereitstellungen.
- **Sicherheitsheader** einschließlich Content-Security-Policy, HSTS, X-Content-Type-Options und X-Frame-Options.
- **Bildoptimierung** mit Remote-Musterunterstützung und SVG-Sicherheitsrichtlinien.
- **Sentry-Integration** wird als äußerster Konfigurations-Wrapper zur Fehlerverfolgung verwendet.
- **Paketoptimierung** für HeroUI und Lucide React zur Reduzierung der Bundle-Größe.

## Detaillierte Architekturseiten

Erkunden Sie diese Seiten für eine ausführlichere Abdeckung einzelner Systeme:

|Seite|Was es abdeckt|
|---|---|
|[Tech Stack](/architecture/tech-stack)|Vollständiges Abhängigkeitsinventar und Versionsdetails|
|[Projektstruktur](/architecture/project-structure)|Exemplarische Vorgehensweise für jedes Verzeichnis|
|[Datenfluss](/architecture/data-flow)|Fordern Sie den Lebenszyklus vom Browser bis zur Datenbank an|
|[Routing](/architecture/routing)|App Router-Struktur und URL-Muster|
|[Komponentenmuster](/architecture/component-patterns)|Server- vs. Client-Komponenten, Kompositionsmuster|
|[Staatsverwaltung](/architecture/state-management)|Reagieren Sie auf Abfrage, Zustand und Serverstatus|
|[API-Schicht](/architecture/api-layer)|REST-API-Design- und Routenhandlermuster|
|[Middleware](/architecture/middleware)|Middleware-Pipeline und Anforderungsverarbeitung|
|[Guards-System](/architecture/guards-system)|Rollenbasierte Zugriffskontrolle auf Routenebene|
|[Berechtigungssystem](/architecture/permissions-system)|Detaillierte Berechtigungsdefinitionen|
|[Repository-Muster](/architecture/repository-patterns)|Konventionen der Datenzugriffsschicht|
|[Validierungsmuster](/architecture/validation-patterns)|Zod-Schemata und Eingabevalidierung|
|[Themensystem](/architecture/theme-system)|Theming-Architektur und Farbmanagement|
|[Farbsystem](/architecture/color-system)|Dynamische Farbgenerierungspipeline|
|[SEO-System](/architecture/seo-system)|Metadaten, Sitemaps und strukturierte Daten|
|[Zahlungsbibliothek](/architecture/zahlungsbibliothek)|Zahlungsintegration mehrerer Anbieter|
|[Inhaltsbibliothek](/architecture/content-library)|Git-basierte CMS-Content-Pipeline|
|[Editorsystem](/architecture/editor-system)|Tiptap Rich-Text-Editor-Integration|
|[Mapper-Muster](/architecture/mapper-patterns)|Datentransformation zwischen Ebenen|
|[Fehlergrenzen](/architecture/error-boundaries)|Fehlerbehandlung und -wiederherstellung|
|[Analyseschicht](/architecture/analytics-layer)|Ereignisverfolgungs- und Analysepipeline|
|[Swagger-System](/architecture/swagger-system)|Generierung der OpenAPI-Dokumentation|

## Wohin als nächstes gehen?

- **Neu im Projekt?** Beginnen Sie mit [Getting Started](/getting-started), um die Vorlage zu installieren und auszuführen.
- **Bereit zur Anpassung?** Wechseln Sie zum Abschnitt [Anleitungen](/guides), um Schritt-für-Schritt-Anleitungen zu erhalten.
- **Möchten Sie das vollständige Tech-Inventar?** Siehe [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
