---
id: component-patterns
title: Componentarchitectuur en patronen
sidebar_label: Componentpatronen
sidebar_position: 7
---

# Componentarchitectuur en patronen

De Ever Works-sjabloon organiseert de React-componenten met behulp van een op functies gebaseerde directorystructuur, met een duidelijke scheiding tussen functiecomponenten, gedeelde componenten en basis-UI-primitieven.

## Directory-organisatie

De `components/`-directory volgt een functiegerichte organisatie waarbij elk hoofddomein zijn eigen submap heeft, naast gedeelde componenten en componenten op UI-niveau.

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

## Op functies gebaseerde componenten

Elke feature directory bevat alle componenten die betrekking hebben op dat domein. Hierdoor blijft de gerelateerde code op dezelfde locatie en wordt het gemakkelijk om componenten voor een bepaalde functie te vinden.

### beheerder/

Bevat alle componenten van het beheerderspaneel, inclusief gegevenstabellen, formulieren, modaliteiten en beheerinterfaces. Dit zijn clientcomponenten die beheerdersspecifieke hooks van `hooks/use-admin-*.ts` gebruiken.

### autoriseren/

Authenticatiecomponenten, waaronder aanmeldingsformulieren, aanmeldingsformulieren, stromen voor het opnieuw instellen van wachtwoorden, OAuth-knoppen en e-mailverificatieschermen.

### facturering/

Componenten voor facturatie- en abonnementsbeheer, waaronder planselectie, betalingsmethodeformulieren, weergave van facturen en indicatoren voor de abonnementsstatus.

### filters/

Zoek- en filtercomponenten die op de vermeldingspagina's worden gebruikt. Deze werken samen met URL-zoekparameters en de Zustand-filterstatus om realtime filtering te bieden.

### prijzen/

Onderdelen van prijspagina's, waaronder planvergelijkingskaarten, functiematrices en betaalintegratie.

## Gedeelde componenten

### gedeeld/

De map `shared/` bevat herbruikbare componenten die voor meerdere functies worden gebruikt. Dit zijn domein-agnostische bouwstenen die UI-primitieven combineren tot functionele patronen.

### gedeelde kaart/

Gedeelde kaartcomponenten die worden gebruikt voor het weergeven van items, collecties en andere inhoud in kaartlay-outs in de hele applicatie.

## Componenten op rootniveau

Er bestaan verschillende zelfstandige componentbestanden in de hoofdmap van `components/`:

|Onderdeel|Doel|
|-----------|---------|
|`categories-grid.tsx`|Rasterweergave voor categorieën|
|`custom-hero.tsx`|Aanpasbare heldensectie|
|`error-boundary.tsx`|Foutgrens met fallback-UI|
|`error-provider.tsx`|Fout contextprovider|
|`favorite-button.tsx`|Favoriete schakelknop|
|`hero.tsx`|Standaard heldensectie|
|`item.tsx`|Artikelkaartcomponent|
|`items-categories.tsx`|Items georganiseerd per categorie|
|`item-skeleton.tsx`|Skelet voor items laden|
|`item-tags.tsx`|Tagweergave voor artikelen|
|`language-switcher.tsx`|Component voor het wisselen van lokale waarden|
|`layout-switcher.tsx`|Wissel tussen raster-/lijstindeling|
|`report-button.tsx`|Knop Inhoudsrapport|
|`sort-menu.tsx`|Vervolgkeuzelijst Sorteeropties|
|`tags-cards.tsx`|Tagkaartweergave|
|`tags-items.tsx`|Artikelen per tagweergave|
|`theme-toggler.tsx`|Licht/donker themaschakelaar|
|`universal-pagination.tsx`|Herbruikbare pagineringscomponent|
|`view-toggle.tsx`|Weergavemodus schakelen|

## UI-primitieven (components/ui/)

De map `ui/` bevat UI-componenten op basisniveau die de basis vormen voor het ontwerpsysteem. Deze zijn gebouwd bovenop HeroUI (voorheen NextUI) en Tailwind CSS.

De belangrijkste UI-primitieven zijn onder meer:

|Onderdeel|Beschrijving|
|-----------|-------------|
|`button.tsx`|Knop met varianten (primair, secundair, spook, etc.)|
|`card.tsx`|Kaartcontainer met kop-, hoofd- en voettekstsecties|
|`input.tsx`|Tekstinvoer met validatieondersteuning|
|`label.tsx`|Formulierlabelcomponent|
|`modal.tsx`|Modale dialoog met overlay|
|`select.tsx`|Selecteer een vervolgkeuzelijst met zoekmogelijkheden|
|`pagination.tsx`|Paginanavigatiecomponent|
|`badge.tsx`|Statusbadgecomponent|
|`accordion.tsx`|Uitbreidbare inhoudssecties|
|`alert.tsx`|Waarschuwings-/meldingsbanner|
|`breadcrumb.tsx`|Broodkruimelnavigatie|
|`loading-spinner.tsx`|Laadindicator|
|`password-strength.tsx`|Wachtwoordsterktemeter|
|`rating.tsx`|Weergave/invoer van sterrenwaardering|
|`infinity-scroll.tsx`|Oneindige scroll-wrapper|
|`searchable-select.tsx`|Selecteer met zoekfiltering|
|`animations.tsx`|Componenten van animatiehulpprogramma's|
|`auth-illustrations.tsx`|Illustraties van authenticatiepagina's|

## Server versus clientcomponenten

De sjabloon volgt de Next.js-conventies voor de scheiding van server- en clientcomponenten:

### Servercomponenten

Servercomponenten zijn de standaard in de App Router. Ze worden gebruikt voor:
- Pagina-indelingen en wrappers
- Gegevens ophalen op paginaniveau
- Weergave van statische inhoud
- SEO-kritische inhoud

Servercomponenten bevinden zich voornamelijk in `app/[locale]/` pagina- en lay-outbestanden. Ze kunnen databasequeryfuncties en repositorymethoden rechtstreeks importeren.

### Klantcomponenten

Clientcomponenten zijn gemarkeerd met `'use client'` en worden gebruikt voor:
- Interactieve UI-elementen (formulieren, knoppen, schakelaars)
- Componenten die React-hooks gebruiken (useState, useEffect, aangepaste hooks)
- Componenten die browser-API's gebruiken
- Componenten die afhankelijk zijn van React Query of Zustand

De meeste componenten in de map `components/` zijn clientcomponenten omdat ze de gebruikersinteractie en status afhandelen.

## Contextproviders

### componenten/context/

Reageer contextproviders voor het delen van de status tussen componentbomen:
- Foutcontext voor foutgrensstatus
- Functievlagcontext voor functie-gating tijdens runtime

### componenten/aanbieders/

Provider-wrappercomponenten waaruit meerdere providers bestaan:
- Query-clientprovider (TanStack Query)
- Thema-aanbieder
- Sessieprovider (NextAuth)
- Toast leverancier

De rootproviders-wrapper op `app/[locale]/providers.tsx` bevat alle benodigde providers voor de applicatie.

## Componentconventies

1. **Bestandsnaamgeving**: Componenten gebruiken kebab-case bestandsnamen (bijvoorbeeld `favorite-button.tsx`)
2. **Exportpatroon**: Componenten gebruiken benoemde exports, vatbestanden (`index.ts`) in functiemappen
3. **Co-locatie van hooks**: Functiespecifieke hooks bevinden zich in de `hooks/` map op het hoogste niveau, niet in componentmappen
4. **Styling**: componenten gebruiken Tailwind CSS-hulpprogrammaklassen; sommigen gebruiken SCSS-modules voor complexe styling
5. **Typen**: Component-prop-typen worden inline of in aangrenzende typebestanden gedefinieerd in de map `types/`
6. **Iconen**: Aangepaste iconen zijn gecentraliseerd in `components/icons/`; standaardpictogrammen gebruiken `lucide-react`
