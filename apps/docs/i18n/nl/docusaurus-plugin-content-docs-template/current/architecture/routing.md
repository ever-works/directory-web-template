---
id: routing
title: Routeringsarchitectuur
sidebar_label: Routering
sidebar_position: 6
---

# Routeringsarchitectuur

De Ever Works-sjabloon maakt gebruik van de Next.js App Router met internationalisering via `next-intl`, en biedt routes met locale prefix, routegroepen voor logische organisatie en een uitgebreide API-laag.

## App-router met lokaal segment

Alle gebruikersgerichte pagina's zijn genest onder een `[locale]` dynamisch segment, waardoor meertalige ondersteuning voor 6 talen mogelijk is: `en`, `fr`, `es`, `de`, `ar` en `zh`.

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

URL's volgen het patroon `/{locale}/path`, bijvoorbeeld:
- `/en/pricing` -- Engelse prijspagina
- `/fr/admin/items` -- Franse pagina met beheerdersitems
- `/de/categories` -- Duitse categorieënpagina

## Next.js-configuratie

De `next.config.ts` configureert verschillende routeringsgedragingen:

### Herschrijft

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

Deze herschrijvingen leiden het root-landinstellingspad en `/discover` om naar de eerste pagina van de ontdekkingslijst (`/discover/1`), waardoor een schone standaard-URL ontstaat.

### Beveiligingskoppen

Alle routes ontvangen beveiligingsheaders, waaronder:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` met een maximale leeftijd van 2 jaar
- `Content-Security-Policy` met beperkende standaardwaarden
- `Referrer-Policy: strict-origin-when-cross-origin`

### next-intl-plug-in

De plug-in `next-intl` wordt toegepast op de Next.js-configuratie, wijzend naar `./i18n/request.ts` voor de landinstellingen:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Routegroepen

De map `[locale]` gebruikt verschillende logische groeperingen om pagina's te ordenen:

### (lijst) -- Hoofdlijstpagina's

De routegroep `(listing)` is een groep tussen haakjes (geen URL-segment) die de hoofdmaplijstpagina's omhult met een gedeelde lay-out.

### admin/ -- Beheerderspaneel

Het admin-gedeelte biedt een complete backoffice-interface:

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

### auth/ -- Authenticatiepagina's

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### klant/ -- Klantdashboard

Het klantengedeelte biedt geverifieerde gebruikersfuncties voor het beheren van hun eigen inzendingen en account.

### dashboard/ -- Gebruikersdashboard

Algemeen gebruikersdashboard met accountoverzicht, activiteit en instellingen.

## API-routes (29 groepen)

API-routes bevinden zich buiten het `[locale]`-segment op `app/api/` en hebben geen locale-voorvoegsel. Ze dienen als backend voor het ophalen van gegevens aan de clientzijde.

|Routegroep|Doel|Belangrijkste eindpunten|
|-------------|---------|---------------|
|`admin/`|Beheeractiviteiten|Items, gebruikers, categorieën, instellingen|
|`auth/`|Authenticatie|Sessie, OAuth-callbacks|
|`categories/`|Categoriegegevens|Lijst, zoek|
|`client/`|Klantactiviteiten|Profiel, inzendingen, dashboard|
|`collections/`|Verzamelgegevens|Lijst, details|
|`config/`|Siteconfiguratie|Functievlaggen, instellingen|
|`cron/`|Geplande taken|Abonnementscontroles, opschonen|
|`current-user/`|Huidige gebruikersinformatie|Profiel, sessiegegevens|
|`extract/`|URL-extractie|Extractie van metagegevens uit URL's|
|`favorites/`|Favorieten|Toevoegen, verwijderen, lijst|
|`featured-items/`|Uitgelichte artikelen|Maak een lijst van actieve aanbevolen items|
|`geocode/`|Geocodering|Adres opzoeken, omgekeerde geocodering|
|`health/`|Gezondheidscontrole|Database- en servicestatus|
|`internal/`|Interne operaties|Eindpunten op systeemniveau|
|`items/`|Artikelgegevens|Lijst, detail, zoeken|
|`lemonsqueezy/`|CitroenSqueezy|Webhook-handler|
|`location/`|Locatiegegevens|Items in de buurt, locatie zoeken|
|`payment/`|Betalingstransacties|Afrekenen, betaalmethoden|
|`polar/`|Polair|Webhook-handler|
|`reference/`|Referentiegegevens|Enums, opzoekwaarden|
|`reports/`|Inhoudelijke rapporten|Rapporten indienen en beoordelen|
|`solidgate/`|Solide poort|Webhook-handler|
|`sponsor-ads/`|Advertenties sponsoren|KRUD, activatie|
|`stripe/`|Streep|Webhook-handler, afrekenen|
|`surveys/`|Enquêtes|Lijst, reageren, resultaten|
|`user/`|Gebruikersbewerkingen|Profiel, instellingen|
|`verify-recaptcha/`|reCAPTCHA|Tokenverificatie|
|`version/`|Versie-informatie|App-versie en build-informatie|

## Middelware

De applicatie gebruikt `next-intl` middleware voor locale detectie en routering. De middleware verwerkt:

1. **Landinstellingsdetectie**: bepaalt de landinstelling van de gebruiker op basis van het URL-pad, cookies of `Accept-Language` header
2. **Locale omleidingen**: Leidt verzoeken zonder een locale-voorvoegsel om naar de juiste locale
3. **Standaardlandinstelling**: Valt terug naar Engels (`en`) wanneer er geen landinstellingsvoorkeur wordt gedetecteerd

De middleware wordt geconfigureerd in de map `i18n/` met lokale routeringsregels gedefinieerd in `i18n/routing.ts` en verzoekafhandeling in `i18n/request.ts`.

## Statische generatie en dynamische routes

De sjabloon maakt gebruik van verschillende strategieën voor het ophalen van gegevens:

- **Statische generatie**: pagina's zoals privacybeleid, servicevoorwaarden en over worden statisch gegenereerd
- **Dynamische weergave**: beheerderspagina's, dashboards en geverifieerde pagina's worden dynamisch weergegeven
- **ISR (Incremental Static Regeneration)**: Categorie- en taglijstpagina's gebruiken ISR met hervalidatie
- **Sitemap genereren**: `app/sitemap.ts` genereert de sitemap dynamisch op basis van inhoudsgegevens

De `staticPageGenerationTimeout` is ingesteld op 180 seconden in `next.config.ts` om grote inhoudsopslagplaatsen tijdens builds mogelijk te maken.
