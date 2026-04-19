---
id: tech-stack
title: Technologie-Stack
sidebar_label: Tech-Stack
sidebar_position: 2
---

# Technologie-Stack

Dieses Dokument bietet einen umfassenden Überblick über alle in Ever Works verwendeten Technologien.

## Systemanforderungen

- **Node.js**: 20.19.0 oder höher
- **PostgreSQL**: 14.0 oder höher
- **Paketmanager**: npm, pnpm, Garn oder Brötchen

## Frontend-Technologien {#frontend}

### Kern-Framework

- **[Next.js 15.4.7](https://nextjs.org/)** – React-Framework mit App Router
  - Serverseitiges Rendering (SSR)
  - Statische Site-Generierung (SSG)
  - Inkrementelle statische Regeneration (ISR)
  - Serveraktionen für Mutationen
  - Integrierte Optimierung
  - Dateibasiertes Routing mit `[locale]` dynamischen Segmenten

- **[React 19.1.0](https://react.dev/)** – UI-Bibliothek
  - Neueste Funktionen und Verbesserungen
  - Gleichzeitiges Rendern
  - Automatisches Batchieren
  - Spannung beim Datenabruf
  - Standardmäßig Serverkomponenten

### Sprach- und Typsicherheit

- **[TypeScript 5.x](https://www.typescriptlang.org/)** – Statische Typprüfung
  - Strikter Modus aktiviert
  - Pfadzuordnung konfiguriert (`@/` Alias)
  - Benutzerdefinierte Typdefinitionen
  - Vollständige Typinferenz

### Styling und Benutzeroberfläche

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** – Utility-first CSS-Framework
  - Kundenspezifisches Designsystem
  - Unterstützung für den Dunkelmodus
  - Responsive Design-Dienstprogramme
  - JIT-Kompilierung
  - Dynamisches Farbsystem (50-950 Farbtöne)

- **[HeroUI React 2.6](https://www.heroui.com/)** – Moderne React-Komponenten
  - Zugängliche Komponenten
  - Anpassbare Themen
  - TypeScript-Unterstützung
  - Baumschüttelbar

- **[Radix UI](https://www.radix-ui.com/)** – Nicht gestylte barrierefreie Komponenten
  - Kopflose UI-Grundelemente
  - Vollständige Tastaturnavigation
  - ARIA-konform
  - Zusammensetzbar

- **[Framer Motion 12.x](https://www.framer.com/motion/)** – Animationsbibliothek
  - Deklarative Animationen
  - Gestenunterstützung
  - Layout-Animationen
  - SVG-Animationen

### Rich-Text-Bearbeitung

- **[TipTap](https://tiptap.dev/)** – Kopfloser Rich-Text-Editor
  - Erweiterbare Architektur
  - Markdown-Unterstützung
  - Bereit für die gemeinsame Bearbeitung
  - Benutzerdefinierte Erweiterungen

### Staatsmanagement

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Leichtes Zustandsmanagement
  - Einfache API
  - TypeScript-Unterstützung
  - Minimaler Boilerplate
  - DevTools-Integration
  - Middleware-Unterstützung

- **[TanStack React Query 5](https://tanstack.com/query/)** – Serverstatusverwaltung
  - Caching und Synchronisierung
  - Hintergrundaktualisierungen
  - Optimistische Updates
  - Fehlerbehandlung
  - Unendliche Abfragen

### Datenvisualisierung

- **[TanStack Table](https://tanstack.com/table/)** – Headless-Tabellenbibliothek
  - Sortieren, Filtern, Paginierung
  - Größenänderung der Spalte
  - Zeilenauswahl
  - TypeScript-Unterstützung

- **[TanStack Virtual](https://tanstack.com/virtual/)** – Virtualisierungsbibliothek
  - Virtuelles Scrollen
  - Leistungsoptimierung
  - Dynamische Zeilenhöhen

### Formularhandhabung

- **[React Hook Form 7](https://react-hook-form.com/)** – Performante Formulare
  - Minimale Nachrenderungen
  - Integrierte Validierung
  - TypeScript-Unterstützung
  - Einfache Integration
  - Unterstützung für Feldarrays

- **[Zod 4](https://zod.dev/)** – Schemavalidierung
  - TypeScript-first
  - Laufzeitvalidierung
  - Typinferenz
  - Fehlerbehandlung
  - Benutzerdefinierte Validatoren

## Backend-Technologien

### Datenbank und ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** – Relationale Datenbank
  - ACID-Konformität
  - Erweiterte Funktionen (JSONB, Volltextsuche)
  - Hervorragende Leistung
  - JSON-Unterstützung
  - Trigger und gespeicherte Prozeduren

- **[Drizzle ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - Typsichere Abfragen
  - Minimaler Overhead
  - SQL-ähnliche Syntax
  - Migrationssystem
  - Beziehungsabfragen
  - Vorbereitete Aussagen

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service (optional)
  - Gehostetes PostgreSQL
  - Echtzeit-Abonnements
  - Sicherheit auf Zeilenebene
  - Integrierte Authentifizierung
  - Aufbewahrungseimer
  - Kantenfunktionen

### Authentifizierung

- **[NextAuth.js 5.0 (Beta)](https://authjs.dev/)** – Authentifizierungsbibliothek
  - Mehrere OAuth-Anbieter (Google, GitHub, Facebook, Twitter)
  - JWT- und Datenbanksitzungen
  - TypeScript-Unterstützung
  - Best Practices für die Sicherheit
  - Anmeldedatenbasierte Authentifizierung
  - Sitzungsverwaltung

- **[Supabase Auth](https://supabase.com/auth)** – Alternative Authentifizierungslösung
  - Integrierte Benutzerverwaltung
  - Soziale Anbieter
  - E-Mail-Bestätigung
  - Passwort zurücksetzen
  - Magische Links
  - Telefonauthentifizierung

### Duale Auth-Architektur

Ever Works unterstützt **sowohl NextAuth.js als auch Supabase Auth** gleichzeitig:

- NextAuth für traditionelle OAuth-Flows
- Supabase Auth für Echtzeitfunktionen
- Einheitliche Sitzungsverwaltung
- Reibungsloser Anbieterwechsel

## Content-Management

### Git-basiertes CMS

- **[isomorphic-git](https://isomorphic-git.org/)** – Git-Operationen in JavaScript
  - Klonen Sie Repositorys
  - Pull-Änderungen
  - Commit-Dateien
  - Filialleitung

- **[js-yaml](https://github.com/nodeca/js-yaml)** – YAML-Parser
  - YAML-Dateien analysieren
  - Generieren Sie YAML
  - Schemavalidierung
  - Fehlerbehandlung

### Dateiverarbeitung

- **[graue Materie](https://github.com/jonschlinkert/gray-matter)** – Frontmatter-Parser
  - Markdown-Dateien analysieren
  - Metadaten extrahieren
  - Unterstützt mehrere Formate

## Internationalisierung

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n für Next.js
  - App-Router-Unterstützung
  - Typsichere Übersetzungen
  - Pluralisierung
  - Datums-/Zahlenformatierung

### Unterstützte Sprachen

Ever Works unterstützt standardmäßig **13+ Sprachen**:

- 🇬🇧 Englisch (en)
- 🇫🇷 Französisch (fr)
- 🇪🇸 Spanisch (es)
- 🇨🇳 Chinesisch (zh)
- 🇩🇪 Deutsch (de)
- 🇸🇦 Arabisch (ar) – mit RTL-Unterstützung
- 🇮🇹 Italienisch (es)
- 🇵🇹 Portugiesisch (pt)
- 🇯🇵 Japanisch (ja)
- 🇰🇷 Koreanisch (ko)
- 🇷🇺 Russisch (ru)
- 🇳🇱 Niederländisch (nl)
- 🇵🇱 Polnisch (pl)

[Erfahren Sie mehr über Internationalisierung →](/Internationalisierung)

## Analytik und Überwachung

### Analytik

- **[PostHog](https://posthog.com/)** – Produktanalyse
  - Ereignisverfolgung
  - Benutzeridentifikation
  - Feature-Flags
  - Sitzungsaufzeichnung

### Fehlerverfolgung

- **[Sentry 9.38](https://sentry.io/)** - Fehlerüberwachung
  - Fehlerverfolgung
  - Leistungsüberwachung
  - Release-Tracking
  - Benutzer-Feedback

### Leistung

- **[Vercel Analytics](https://vercel.com/analytics)** – Web-Vitaldaten
  - Kern-Web-Vitals
  - Echte Benutzerüberwachung
  - Einblicke in die Leistung

## Zahlungsabwicklung

### Zahlungsanbieter

- **[Stripe](https://stripe.com/)** – Umfassende Zahlungsplattform
  - Einmalige Zahlungen
  - Wiederkehrende Abonnements
  - Mehrere Zahlungsmethoden (Karten, Apple Pay, Google Pay)
  - Mehrere Währungen
  - Erweiterte Analysen und Berichte
  - Kundenportal
  - Rechnungsstellung
  - Webhooks

- **[LemonSqueezy](https://lemonsqueezy.com/)** – Merchant of Record-Plattform
  - Automatische Steuerkonformität
  - Globale Zahlungen (über 135 Länder)
  - Abonnements
  - Betrugsprävention
  - Vereinfachte Einrichtung
  - Unterstützung für Partnerprogramme

[Erfahren Sie mehr über die Zahlungsintegration →](/zahlung)

### Zahlungs-SDKs

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** – Stripe-Client-SDK
- **[Stripe 18.1.0](https://github.com/stripe/stripe-node)** – Stripe-Server-SDK
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - LemonSqueezy SDK

## CRM-Integration

- **[Twenty CRM](https://twenty.com/)** – Open-Source-CRM
  - Kundenbeziehungsmanagement
  - Kontaktsynchronisierung
  - Aktivitätsverfolgung
  - Benutzerdefinierte Felder
  - API-Integration
  - Selbstgehostet oder in der Cloud

### CRM-Funktionen

- Automatische Kontakterstellung aus Benutzerregistrierungen
- Synchronisieren Sie Benutzeraktivitäten und -interaktionen
- Verfolgen Sie Abonnements und Zahlungen
- Benutzerdefinierte Feldzuordnung
- Webhook-basierte Synchronisierung

## E-Mail-Dienste

- **[4 erneut senden](https://resend.com/)** – E-Mail-API
  - Transaktions-E-Mails
  - Vorlagenunterstützung
  - Sendungsverfolgung
  - Entwicklerfreundlich

- **[Novu 2.6](https://novu.co/)** – Benachrichtigungsinfrastruktur
  - Mehrkanal-Benachrichtigungen
  - Vorlagenverwaltung
  - Workflow-Automatisierung
  - Analytik

## Umfragesystem

- **[SurveyJS](https://surveyjs.io/)** – Umfrage- und Formularersteller
  - Mehrere Fragetypen (Multiple Choice, Text, Bewertung, Matrix)
  - Bedingte Logik
  - Umfragevorschau
  - Antwortanalyse
  - Export nach CSV/Excel
  - Anonyme oder authentifizierte Antworten
  - Benutzerdefinierte Themen

[Erfahren Sie mehr über Umfragen →](/guides/survey-system)

## Sicherheit

### Authentifizierungssicherheit

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** – Passwort-Hashing
  - Sichere Passwortspeicherung
  - Salzerzeugung
  - Schutz vor Timing-Angriffen

- **[jose 6](https://github.com/panva/jose)** – JWT-Operationen
  - Token-Generierung
  - Token-Verifizierung
  - Verschlüsselungsunterstützung

### Eingabevalidierung

- **[React Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** – Bot-Schutz
  - Formularschutz
  - Unsichtbares reCAPTCHA
  - Punktebasierte Verifizierung

## Entwicklungstools

### Codequalität

- **[ESLint 9](https://eslint.org/)** – JavaScript-Linter
  - Code-Qualitätsregeln
  - Benutzerdefinierte Konfigurationen
  - TypeScript-Unterstützung
  - Next.js-Regeln

- **[Prettier 3.5](https://prettier.io/)** - Codeformatierer
  - Konsistente Formatierung
  - Editor-Integration
  - Benutzerdefinierte Regeln

### Build-Tools

- **[PostCSS 8](https://postcss.org/)** – CSS-Prozessor
  - Rückenwind-CSS-Verarbeitung
  - Autoprefixer
  - CSS-Optimierung

- **[Webpack 5](https://webpack.js.org/)** – Modul-Bundler (über Next.js)
  - Codeaufteilung
  - Baum zittert
  - Vermögensoptimierung

## Bereitstellung und Infrastruktur

### Hosting-Plattformen

- **[Vercel](https://vercel.com/)** – Empfohlene Plattform
  - Next.js-Optimierung
  - Kantenfunktionen
  - Globales CDN
  - Automatische Bereitstellungen

- **[Netlify](https://netlify.com/)** – Alternative Plattform
  - Statisches Site-Hosting
  - Serverlose Funktionen
  - Formularbearbeitung

### Datenbank-Hosting

- **[Supabase](https://supabase.com/)** – Verwaltetes PostgreSQL
  - Automatische Backups
  - Verbindungspooling
  - Echtzeitfunktionen

- **[PlanetScale](https://planetscale.com/)** – Serverloses MySQL
  - Verzweigungsworkflow
  - Automatische Skalierung
  - Schemaverwaltung

- **[Neon](https://neon.tech/)** – Serverloses PostgreSQL
  - Sofortige Verzweigung
  - Automatische Skalierung
  - Wiederherstellung zu einem bestimmten Zeitpunkt

## Paketverwaltung

- **[pnpm](https://pnpm.io/)** – Schneller, platzsparender Paketmanager
  - Schnellere Installationen
  - Gemeinsame Abhängigkeiten
  - Strikte Abhängigkeitsauflösung

- **[npm](https://npmjs.com/)** – Standard-Node.js-Paketmanager
  - Weithin unterstützt
  - Großes Ökosystem
  - Sicherheitsüberprüfung

## Versionsanforderungen

### Node.js

- **Minimum**: Node.js 20.19.0
- **Empfohlen**: Neueste LTS-Version
- **Paketmanager**: npm 10+, Yarn 1.13+ oder pnpm 8+

### Browser-Unterstützung

- **Moderne Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobil**: iOS Safari 14+, Chrome Mobile 90+
- **Keine IE-Unterstützung**: Nur moderne Funktionen

## Leistungsüberlegungen

### Bündelgröße

- **Kernpaket**: ~200 KB komprimiert
- **Code-Splitting**: Routenbasiert und komponentenbasiert
- **Baumschütteln**: Eliminierung von ungenutztem Code
- **Dynamische Importe**: Lazy Loading für nicht kritische Komponenten

### Laufzeitleistung

- **React 19**: Gleichzeitige Funktionen für bessere UX
- **Next.js 15**: Optimiertes Rendering und Caching
- **Bildoptimierung**: WebP/AVIF-Unterstützung mit Lazy Loading
- **Schriftoptimierung**: Selbstgehostete Schriftarten mit Vorladung

### Datenbankleistung

- **Verbindungspooling**: Effiziente Datenbankverbindungen
- **Abfrageoptimierung**: Indizierte Abfragen und effiziente Verknüpfungen
- **Caching**: Caching auf Anwendungsebene und Datenbankebene

## Sicherheitsstapel

### Anwendungssicherheit

- **HTTPS**: In der Produktion erzwungen
- **CSRF-Schutz**: In NextAuth.js integriert
- **XSS-Schutz**: Inhaltsbereinigung
- **SQL-Injection**: Parametrisierte Abfragen über Drizzle

### Infrastruktursicherheit

- **Umgebungsvariablen**: Sichere Geheimnisverwaltung
- **Ratenbegrenzung**: API-Endpunktschutz
- **Eingabevalidierung**: Zod-Schemavalidierung
- **Sicherheit beim Hochladen von Dateien**: Typ- und Größenbeschränkungen

## Überwachungsstapel

### Anwendungsüberwachung

- **Fehlerverfolgung**: Wachposten zur Fehlerüberwachung
- **Leistung**: Core Web Vitals-Tracking
- **Analytics**: PostHog für Benutzerverhalten
- **Betriebszeit**: Externe Überwachungsdienste

### Infrastrukturüberwachung

- **Datenbank**: Verbindungs- und Abfrageüberwachung
- **API**: Reaktionszeit- und Fehlerratenverfolgung
- **CDN**: Cache-Trefferraten und Leistung
- **Bereitstellung**: Build- und Bereitstellungsüberwachung

## Zukünftige Überlegungen

### Geplante Upgrades

- **Reaktion 19**: Stabile Release-Akzeptanz
- **Next.js 16**: Wenn verfügbar
- **TypeScript 5.x**: Neueste Funktionen
- **Node.js 22**: LTS-Upgrade

### Mögliche Ergänzungen

- **GraphQL**: Für komplexe Datenanforderungen
- **WebSockets**: Echtzeitfunktionen
- **PWA**: Progressive Web-App-Funktionen
- **Edge Computing**: Verbesserte Leistung

## Technologie-Entscheidungsmatrix

|Anforderung|Technologiewahl|Begründung|
|-------------|-------------------|-----------|
|**Rahmen**|Next.js 15|Klassenbestes React-Framework mit App Router|
|**Datenbank**|PostgreSQL + Nieselregen|Typsicher, performant, skalierbar|
|**Auth**|NextAuth.js + Supabase|Flexibilität bei zwei Anbietern|
|**Styling**|Rückenwind CSS + HeroUI|Schnelle Entwicklung, einheitliches Design|
|**Staat**|Zustand + Reaktionsabfrage|Einfacher Client-Status + leistungsstarker Server-Status|
|**Formulare**|React Hook Form + Zod|Leistung + Typsicherheit|
|**i18n**|next-intl|Beste Next.js App Router-Unterstützung|
|**Zahlung**|Streifen + LemonSqueezy|Flexibilität + globale Compliance|
|**E-Mail**|Erneut senden + Novu|Entwicklerfreundlich + Multichannel|
|**Analyse**|PostHog + Sentry|Produkteinblicke + Fehlerverfolgung|

## Nächste Schritte

- [Architekturübersicht](./overview) – Verstehen Sie die Systemarchitektur
- [Plattformfunktionen](./features) – Entdecken Sie alle Plattformfunktionen
- [Entwicklungssetup](/development/local-setup) – Richten Sie Ihre Umgebung ein

## Ressourcen

### Offizielle Dokumentation

- [Next.js-Dokumentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript-Handbuch](https://www.typescriptlang.org/docs/)
- [Tailwind CSS-Dokumente](https://tailwindcss.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)

### Community-Ressourcen

- [Next.js GitHub](https://github.com/vercel/next.js)
- [GitHub reagieren](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Ever Works Community](https://github.com/ever-co/ever-works)
