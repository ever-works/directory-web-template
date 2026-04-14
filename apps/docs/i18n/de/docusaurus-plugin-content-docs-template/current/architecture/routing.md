---
id: routing
title: Routing-Architektur
sidebar_label: Routenführung
sidebar_position: 6
---

# Routing-Architektur

Die Ever Works-Vorlage verwendet den Next.js App Router mit Internationalisierung über `next-intl` und stellt Routen mit Gebietsschema-Präfix, Routengruppen für die logische Organisation und eine umfassende API-Ebene bereit.

## App-Router mit Gebietsschema-Segment

Alle benutzerseitigen Seiten sind unter einem dynamischen Segment `[locale]` verschachtelt, was die Unterstützung mehrerer Sprachen für 6 Gebietsschemas ermöglicht: `en`, `fr`, `es`, `de`, `ar` und `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

URLs folgen dem Muster `/{locale}/path`, zum Beispiel:
- `/en/pricing` – Englische Preisseite
- `/fr/admin/items` – Seite mit französischen Admin-Elementen
- `/de/categories` – Deutsche Kategorienseite

## Next.js-Konfiguration

Der `next.config.ts` konfiguriert verschiedene Routing-Verhalten:

### Umschreibt

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Diese Umschreibungen leiten den Root-Gebietsschemapfad und `/discover` auf die erste Seite der Erkennungsliste (`/discover/1`) um und stellen eine saubere Standard-URL bereit.

### Sicherheitsheader

Alle Routen erhalten Sicherheitsheader, einschließlich:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` mit einem Höchstalter von 2 Jahren
- `Content-Security-Policy` mit restriktiven Standardwerten
- `Referrer-Policy: strict-origin-when-cross-origin`

### next-intl-Plugin

Das `next-intl`-Plugin wird auf die Next.js-Konfiguration angewendet und verweist auf `./i18n/request.ts` für die Gebietsschemaauflösung:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Routengruppen

Das Verzeichnis `[locale]` verwendet mehrere logische Gruppierungen zum Organisieren von Seiten:

### (Eintrag) – Haupteintragsseiten

Die Routengruppe `(listing)` ist eine Gruppe in Klammern (kein URL-Segment), die die Hauptverzeichnisseiten mit einem gemeinsamen Layout umschließt.

### admin/ – Admin-Panel

Der Admin-Bereich bietet eine vollständige Backoffice-Schnittstelle:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ – Authentifizierungsseiten

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### client/ – Kunden-Dashboard

Der Client-Bereich bietet authentifizierten Benutzern Funktionen zur Verwaltung ihrer eigenen Einsendungen und ihres Kontos.

### Dashboard/ – Benutzer-Dashboard

Allgemeines Benutzer-Dashboard mit Kontoübersicht, Aktivität und Einstellungen.

## API-Routen (29 Gruppen)

API-Routen liegen außerhalb des `[locale]`-Segments bei `app/api/` und haben kein Gebietsschema-Präfix. Sie dienen als Backend für den clientseitigen Datenabruf.

|Routengruppe|Zweck|Wichtige Endpunkte|
|-------------|---------|---------------|
|`admin/`|Admin-Operationen|Elemente, Benutzer, Kategorien, Einstellungen|
|`auth/`|Authentifizierung|Sitzung, OAuth-Rückrufe|
|`categories/`|Kategoriedaten|Auflisten, suchen|
|`client/`|Kundenoperationen|Profil, Einreichungen, Dashboard|
|`collections/`|Sammlungsdaten|Liste, Detail|
|`config/`|Site-Konfiguration|Feature-Flags, Einstellungen|
|`cron/`|Geplante Aufgaben|Abonnementprüfungen, Bereinigung|
|`current-user/`|Aktuelle Benutzerinformationen|Profil, Sitzungsdaten|
|`extract/`|URL-Extraktion|Metadatenextraktion aus URLs|
|`favorites/`|Favoriten|Hinzufügen, entfernen, auflisten|
|`featured-items/`|Ausgewählte Artikel|Aktive vorgestellte Artikel auflisten|
|`geocode/`|Geokodierung|Adresssuche, umgekehrte Geokodierung|
|`health/`|Gesundheitscheck|Datenbank- und Dienststatus|
|`internal/`|Interne Operationen|Endpunkte auf Systemebene|
|`items/`|Artikeldaten|Auflisten, Detail, Suche|
|`lemonsqueezy/`|LemonSqueezy|Webhook-Handler|
|`location/`|Standortdaten|Objekte in der Nähe, Standortsuche|
|`payment/`|Zahlungsvorgänge|Zur Kasse, Zahlungsarten|
|`polar/`|Polar|Webhook-Handler|
|`reference/`|Referenzdaten|Aufzählungen, Suchwerte|
|`reports/`|Inhaltsberichte|Berichte einreichen und prüfen|
|`solidgate/`|Solidgate|Webhook-Handler|
|`sponsor-ads/`|Sponsor-Anzeigen|CRUD, Aktivierung|
|`stripe/`|Streifen|Webhook-Handler, Kasse|
|`surveys/`|Umfragen|Auflisten, antworten, Ergebnisse|
|`user/`|Benutzeroperationen|Profil, Einstellungen|
|`verify-recaptcha/`|reCAPTCHA|Token-Verifizierung|
|`version/`|Versionsinfo|App-Version und Build-Informationen|

## Middleware

Die Anwendung verwendet `next-intl` Middleware für die Erkennung und Weiterleitung des Gebietsschemas. Die Middleware verarbeitet:

1. **Gebietsschemaerkennung**: Bestimmt das Gebietsschema des Benutzers anhand des URL-Pfads, der Cookies oder des `Accept-Language`-Headers
2. **Gebietsschema-Weiterleitungen**: Leitet Anfragen ohne Gebietsschema-Präfix an das entsprechende Gebietsschema um
3. **Standardgebietsschema**: Fällt auf Englisch (`en`) zurück, wenn keine Gebietsschemapräferenz erkannt wird

Die Middleware wird im Verzeichnis `i18n/` konfiguriert, wobei die lokalen Routing-Regeln in `i18n/routing.ts` definiert sind und die Anforderungsverarbeitung in `i18n/request.ts` definiert ist.

## Statische Generierung und dynamische Routen

Die Vorlage verwendet mehrere Datenabrufstrategien:

- **Statische Generierung**: Seiten wie Datenschutzrichtlinien, Nutzungsbedingungen usw. werden statisch generiert
- **Dynamisches Rendering**: Admin-Seiten, Dashboards und authentifizierte Seiten werden dynamisch gerendert
- **ISR (Inkrementelle statische Regeneration)**: Kategorie- und Tag-Listenseiten verwenden ISR mit erneuter Validierung
- **Sitemap-Generierung**: `app/sitemap.ts` generiert die Sitemap dynamisch aus Inhaltsdaten

Der `staticPageGenerationTimeout` ist in `next.config.ts` auf 180 Sekunden festgelegt, um große Inhaltsrepositorys während der Erstellung zu berücksichtigen.
