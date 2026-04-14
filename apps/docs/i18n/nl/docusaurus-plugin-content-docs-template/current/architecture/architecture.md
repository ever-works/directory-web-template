---
id: architecture
title: Architectuuroverzicht
sidebar_label: Overzicht
sidebar_position: 0
---

# Architectuuroverzicht

Deze pagina biedt een kaart op hoog niveau van de Ever Works-sjabloonarchitectuur. Gebruik het als uitgangspunt voordat u zich verdiept in de gedetailleerde pagina's die volgen.

## Technologie Stichting

De sjabloon is een **Next.js 16**-applicatie die gebruikmaakt van de **App Router** met **React 19**. Het produceert een `standalone`-uitvoer voor implementaties in containers en past verschillende optimalisaties op raamwerkniveau toe in `next.config.ts`:

|Laag|Technologie|Doel|
|---|---|---|
|** Kader**|Next.js 16 (app-router)|Server- en clientweergave, routing, API-routes|
|**UI**|Reageer 19, HeroUI, Radix UI, Tailwind CSS 4|Componentenbibliotheek, primitieven, styling|
|**Databank**|Drizzle ORM + PostgreSQL (of SQLite lokaal)|Schemabeheer, migraties, queries|
|**Authenticatie**|VolgendeAuth.js v5 (bèta)|Authenticatie bij meerdere providers met sessiecaching|
|**Internationalisering**|volgende-intl|Lokaalbewuste routering en berichtenbundels|
|**Betalingen**|Streep, Polar, LemonSqueezy, Solidgate|Abonnements- en eenmalige betalingsstromen|
|**Inhoud**|Git-gebaseerd CMS (`.content/` directory)|Markdown/YAML-inhoud gekloond uit een gegevensopslagplaats|
|**Toezicht**|Sentry, PostHog, Vercel Analytics|Foutopsporing, productanalyse, prestaties|
|**E-mail**|Opnieuw verzenden|Transactionele e-mailbezorging|
|**Rijke tekst**|Tiptik|WYSIWYG-editor voor beheerdersinhoud|

## Projectstructuur

De sjabloon volgt een gelaagde, op functies gebaseerde organisatie. Dit zijn de mappen op het hoogste niveau en hun verantwoordelijkheden:

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

Voor een volledige directory-uitleg, zie de pagina [Projectstructuur](/architecture/project-structure).

## Gelaagde architectuur

De codebase zorgt voor een duidelijke scheiding van zorgen over drie lagen:

### Presentatie laag

Reageercomponenten in `components/` en paginabestanden in `app/[locale]/` zorgen voor de weergave en gebruikersinteractie. Servercomponenten halen gegevens rechtstreeks op; Clientcomponenten gebruiken React Query-hooks van `hooks/` voor de status aan de clientzijde.

### Bedrijfslogicalaag

Services in `lib/services/` bevatten de kernbedrijfsregels. De sjabloon wordt geleverd met meer dan 30 servicebestanden voor analyses, abonnementen, moderatie, CRM-synchronisatie, geocodering, meldingen en meer. Services worden aangeroepen door API-routehandlers en servercomponenten, maar nooit rechtstreeks door UI-code in de browser.

### Gegevenstoegangslaag

Repository's in `lib/repositories/` omvatten alle databasequery's met behulp van Drizzle ORM. Elke domeinentiteit (items, categorieën, collecties, gebruikers, rollen, tags, sponsoradvertenties) heeft zijn eigen repositorybestand. Hierdoor blijven details op SQL-niveau buiten de servicelaag.

Voor een dieper inzicht in de gegevensstroom tussen deze lagen, zie [Data Flow](/architecture/data-flow).

## Next.js App-router en routering

Alle gebruikersgerichte routes bevinden zich onder `app/[locale]/`, waardoor URL's met locale prefix standaard mogelijk zijn via `next-intl`. De applicatie maakt gebruik van verschillende App Router-functies:

- **Lay-outs** - geneste `layout.tsx`-bestanden voor admin, klantdashboard en openbare ruimtes.
- **Routegroepen** - de groep `(listing)` verzorgt de hoofddirectorylijst en het bladeren door tags zonder de URL-structuur te beïnvloeden.
- **Dynamische routes** -- `[page]`, `[...tag]` en benoemde segmenten voor items, categorieën en collecties.
- **Herschrijft**: gedefinieerd in `next.config.ts` om kale categoriepaden om te leiden naar hun gepagineerde ontdekkingsweergave.

Zie [Routing](/architecture/routing) voor de volledige routekaart.

## Authenticatiesysteem

Authenticatie is gebaseerd op **NextAuth.js v5** met een providerconfiguratiesysteem in `lib/auth/`. Het bestand `auth.config.ts` in de hoofdmap van het project orkestreert:

- **OAuth-providers**: Google en GitHub, geconfigureerd via omgevingsvariabelen en dynamisch in-/uitgeschakeld.
- **Credentials provider** - e-mail-/wachtwoordverificatie met bcrypt-hashing.
- **Supabase-adapter** - optionele door Supabase ondersteunde sessieopslag.
- **Sessiecaching** -- `lib/auth/cached-session.ts` vermindert overbodige sessiezoekopdrachten.
- **Bewakingssysteem** -- `lib/auth/guards.ts` en `lib/guards/` dwingen op rollen gebaseerde toegang af op routeniveau.

Voor details over het bewakingssysteem en op rollen gebaseerde machtigingen, zie [Guards System](/architecture/guards-system) en [Permissions System](/architecture/permissions-system).

## Besprenkel ORM en database

De databaselaag gebruikt **Drizzle ORM** met het schema gedefinieerd in `lib/db/schema.ts`. Belangrijkste aspecten:

- **Migraties** worden gegenereerd met `drizzle-kit generate` en toegepast met `drizzle-kit migrate`.
- **Seeding**-scripts in `lib/db/seed.ts` en `scripts/cli-seed.ts` vullen initiële gegevens in, inclusief rollen.
- **Configuratie** bevindt zich in `drizzle.config.ts` in de hoofdmap van het project.
- PostgreSQL is vereist voor productie; SQLite wordt ondersteund voor lokale ontwikkeling.

Zie [Repository Patterns](/architecture/repository-patterns) voor hoe de gegevenstoegangslaag is gestructureerd.

## Middleware-keten

De sjabloon maakt gebruik van Next.js middleware (via de `next-intl` plug-in toegepast in `next.config.ts`) gecombineerd met aangepaste toestemmingscontroles in `lib/middleware/permission-check.ts`. De middleware-pijplijn verwerkt:

- Lokaaldetectie en routering
- Verificatie van authenticatiestatus
- Op rollen gebaseerde routebeveiliging
- Beveiligingsheaders (HSTS, CSP, X-Frame-Options en meer - geconfigureerd in `next.config.ts`)

Voor een gedetailleerd overzicht, zie [Middleware](/architecture/middleware) en [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Configuratie en beveiliging

Het bestand `next.config.ts` stelt verschillende standaardinstellingen voor beveiliging en prestaties in:

- **Standalone uitvoer** voor Docker-vriendelijke implementaties.
- **Beveiligingsheaders** inclusief Content-Security-Policy, HSTS, X-Content-Type-Options en X-Frame-Options.
- **Beeldoptimalisatie** met ondersteuning voor patronen op afstand en SVG-veiligheidsbeleid.
- **Sentry-integratie** toegepast als de buitenste configuratie-wrapper voor het opsporen van fouten.
- **Pakketoptimalisatie** voor HeroUI en Lucide React om de bundelgrootte te verkleinen.

## Gedetailleerde architectuurpagina's

Verken deze pagina's voor een diepere dekking van individuele systemen:

|Pagina|Wat het omvat|
|---|---|
|[Tech-stack](/architectuur/tech-stack)|Volledige afhankelijkheidsinventarisatie en versiedetails|
|[Projectstructuur](/architectuur/projectstructuur)|Directory-voor-directory uitleg|
|[Gegevensstroom](/architectuur/data-flow)|Vraag levenscyclus aan van browser naar database|
|[Routing](/architectuur/routing)|App-routerstructuur en URL-patronen|
|[Componentpatronen](/architectuur/component-patronen)|Server- versus clientcomponenten, compositiepatronen|
|[State Management](/architectuur/state-management)|Reageer op Query, Zustand en serverstatus|
|[API-laag](/architectuur/api-laag)|REST API-ontwerp en routehandlerpatronen|
|[Middleware](/architectuur/middleware)|Middleware-pijplijn en aanvraagverwerking|
|[Bewakingssysteem](/architectuur/bewakers-systeem)|Rolgebaseerde toegangscontrole op routeniveau|
|[Permissiesysteem](/architectuur/permissions-system)|Fijnmazige machtigingsdefinities|
|[Repositorypatronen](/architecture/repository-patterns)|Conventies voor gegevenstoegangslagen|
|[Validatiepatronen](/architecture/validation-patterns)|Zod-schema's en invoervalidatie|
|[Themasysteem](/architectuur/thema-systeem)|Thema-architectuur en kleurbeheer|
|[Kleursysteem](/architectuur/kleursysteem)|Pijplijn voor dynamische kleurgeneratie|
|[SEO-systeem](/architectuur/seo-systeem)|Metadata, sitemaps en gestructureerde gegevens|
|[Betaalbibliotheek](/architectuur/betalingsbibliotheek)|Betalingsintegratie met meerdere providers|
|[Inhoudsbibliotheek](/architectuur/inhoudsbibliotheek)|Op Git gebaseerde CMS-inhoudspijplijn|
|[Editorsysteem](/architectuur/editor-systeem)|Integratie van Tiptap-rich-text-editor|
|[Mapper-patronen](/architecture/mapper-patterns)|Gegevenstransformatie tussen lagen|
|[Foutgrenzen](/architectuur/foutgrenzen)|Foutafhandeling en herstel|
|[Analytics-laag](/architecture/analytics-layer)|Pijplijn voor het volgen en analyseren van gebeurtenissen|
|[Swagger-systeem](/architecture/swagger-system)|OpenAPI-documentatie genereren|

## Waar moet ik heen?

- **Nieuw bij het project?** Begin met [Aan de slag](/getting-started) om de sjabloon te installeren en uit te voeren.
- **Klaar om aan te passen?** Ga naar de sectie [Gidsen](/guides) voor stapsgewijze zelfstudies.
- **Wil je de volledige technische inventaris?** Zie [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
