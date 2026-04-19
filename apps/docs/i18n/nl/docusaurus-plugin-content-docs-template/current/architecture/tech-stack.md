---
id: tech-stack
title: Technologie stapel
sidebar_label: Technische stapel
sidebar_position: 2
---

# Technologie stapel

Dit document geeft een uitgebreid overzicht van alle technologieën die in de Ever Works worden gebruikt.

## Systeemvereisten

- **Node.js**: 20.19.0 of hoger
- **PostgreSQL**: 14.0 of hoger
- **Pakketbeheer**: npm, pnpm, garen of knotje

## Frontend-technologieën {#frontend}

### Kernkader

- **[Next.js 15.4.7](https://nextjs.org/)** - Reageer raamwerk met App Router
  - Rendering aan de serverzijde (SSR)
  - Statische sitegeneratie (SSG)
  - Incrementele statische regeneratie (ISR)
  - Serveracties voor mutaties
  - Ingebouwde optimalisatie
  - Op bestanden gebaseerde routering met `[locale]` dynamische segmenten

- **[Reageer 19.1.0](https://react.dev/)** - UI-bibliotheek
  - Nieuwste functies en verbeteringen
  - Gelijktijdige weergave
  - Automatische batchverwerking
  - Spanning voor het ophalen van gegevens
  - Standaard servercomponenten

### Taal- en typeveiligheid

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Statische typecontrole
  - Strikte modus ingeschakeld
  - Padtoewijzing geconfigureerd (`@/` alias)
  - Aangepaste typedefinities
  - Volledige type gevolgtrekking

### Stijl en gebruikersinterface

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Utility-first CSS-framework
  - Ontwerpsysteem op maat
  - Ondersteuning voor donkere modus
  - Responsieve ontwerphulpprogramma's
  - JIT-compilatie
  - Dynamisch kleursysteem (50-950 tinten)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Moderne React-componenten
  - Toegankelijke componenten
  - Aanpasbare thema's
  - TypeScript-ondersteuning
  - Boom-schudbaar

- **[Radix UI](https://www.radix-ui.com/)** - Ongestylede toegankelijke componenten
  - Headless UI-primitieven
  - Volledige toetsenbordnavigatie
  - ARIA-compatibel
  - Samenstelbaar

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Animatiebibliotheek
  - Declaratieve animaties
  - Ondersteuning van gebaren
  - Lay-out animaties
  - SVG-animaties

### Rijke tekstbewerking

- **[TipTap](https://tiptap.dev/)** - Rich-text-editor zonder hoofd
  - Uitbreidbare architectuur
  - Ondersteuning voor prijsverlagingen
  - Gezamenlijk bewerken klaar
  - Aangepaste extensies

### Staatsbeheer

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Lichtgewicht staatsbeheer
  - Eenvoudige API
  - TypeScript-ondersteuning
  - Minimale boilerplate
  - DevTools-integratie
  - Middleware-ondersteuning

- **[TanStack React Query 5](https://tanstack.com/query/)** - Beheer van de serverstatus
  - Caching en synchronisatie
  - Achtergrondupdates
  - Optimistische updates
  - Foutafhandeling
  - Oneindige vragen

### Datavisualisatie

- **[TanStack Table](https://tanstack.com/table/)** - Headless tafelbibliotheek
  - Sorteren, filteren, paginering
  - Kolomgrootte wijzigen
  - Rij selectie
  - TypeScript-ondersteuning

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Virtualisatiebibliotheek
  - Virtueel scrollen
  - Prestatie-optimalisatie
  - Dynamische rijhoogtes

### Formulierafhandeling

- **[React Hook Form 7](https://react-hook-form.com/)** - Performante formulieren
  - Minimale re-renders
  - Ingebouwde validatie
  - TypeScript-ondersteuning
  - Gemakkelijke integratie
  - Ondersteuning voor veldarrays

- **[Zod 4](https://zod.dev/)** - Schemavalidatie
  - TypeScript-eerst
  - Runtime-validatie
  - Typ gevolgtrekking
  - Foutafhandeling
  - Aangepaste validatoren

## Backend-technologieën

### Database & ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Relationele database
  - ACID-naleving
  - Geavanceerde functies (JSONB, zoeken in volledige tekst)
  - Uitstekende prestaties
  - JSON-ondersteuning
  - Triggers en opgeslagen procedures

- **[Motregen ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - Typeveilige zoekopdrachten
  - Minimale overhead
  - SQL-achtige syntaxis
  - Migratie systeem
  - Relatievragen
  - Opgestelde verklaringen

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service (optioneel)
  - Gehoste PostgreSQL
  - Realtime abonnementen
  - Beveiliging op rijniveau
  - Ingebouwde auth
  - Opbergemmers
  - Randfuncties

### Authenticatie

- **[NextAuth.js 5.0 (bèta)](https://authjs.dev/)** - Authenticatiebibliotheek
  - Meerdere OAuth-providers (Google, GitHub, Facebook, Twitter)
  - JWT- en databasesessies
  - TypeScript-ondersteuning
  - Best practices op het gebied van beveiliging
  - Op inloggegevens gebaseerde authenticatie
  - Sessiebeheer

- **[Supabase Auth](https://supabase.com/auth)** - Alternatieve auth-oplossing
  - Ingebouwd gebruikersbeheer
  - Sociale aanbieders
  - E-mailverificatie
  - Wachtwoord opnieuw instellen
  - Magische koppelingen
  - Telefoon auth

### Dual Auth-architectuur

Ever Works ondersteunt **zowel NextAuth.js als Supabase Auth** gelijktijdig:

- NextAuth voor traditionele OAuth-stromen
- Supabase Auth voor realtime functies
- Uniform sessiebeheer
- Naadloos wisselen van provider

## Inhoudsbeheer

### Git-gebaseerd CMS

- **[isomorphic-git](https://isomorphic-git.org/)** - Git-bewerkingen in JavaScript
  - Kloon opslagplaatsen
  - Trek wijzigingen aan
  - Bestanden vastleggen
  - Filiaalbeheer

- **[js-yaml](https://github.com/nodeca/js-yaml)** - YAML-parser
  - Parseer YAML-bestanden
  - YAML genereren
  - Schemavalidatie
  - Foutafhandeling

### Bestandsverwerking

- **[grijze materie](https://github.com/jonschlinkert/gray-matter)** - Frontmatter-parser
  - Markdown-bestanden parseren
  - Metagegevens extraheren
  - Ondersteuning van meerdere formaten

## Internationalisering

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n voor Next.js
  - Ondersteuning voor app-router
  - Typeveilige vertalingen
  - Pluralisering
  - Datum-/getalnotatie

### Ondersteunde talen

Ever Works ondersteunt **13+ talen** standaard:

- 🇬🇧 Engels (nl)
- 🇫🇷 Frans (fr)
- 🇪🇸 Spaans (es)
- 🇨🇳 Chinees (zh)
- 🇩🇪 Duits (de)
- 🇸🇦 Arabisch (ar) - met RTL-ondersteuning
- 🇮🇹 Italiaans (het)
- 🇵🇹 Portugees (pt)
- 🇯🇵 Japans (ja)
- 🇰🇷 Koreaans (ko)
- 🇷🇺 Russisch (ru)
- 🇳🇱 Nederlands (nl)
- 🇵🇱 Pools (pl)

[Lees meer over internationalisering →](/internationalisering)

## Analyse en monitoring

### Analyse

- **[PostHog](https://posthog.com/)** - Productanalyses
  - Gebeurtenis volgen
  - Gebruikersidentificatie
  - Functievlaggen
  - Sessie opname

### Foutopsporing

- **[Sentry 9.38](https://sentry.io/)** - Foutcontrole
  - Foutopsporing
  - Prestatiemonitoring
  - Het volgen van releases
  - Feedback van gebruikers

### Prestaties

- **[Vercel Analytics](https://vercel.com/analytics)** - Webvitaliteit
  - Kernwebvitalen
  - Echte gebruikersmonitoring
  - Prestatie-inzichten

## Betalingsverwerking

### Betalingsaanbieders

- **[Stripe](https://stripe.com/)** - Uitgebreid betalingsplatform
  - Eenmalige betalingen
  - Terugkerende abonnementen
  - Meerdere betaalmethoden (kaarten, Apple Pay, Google Pay)
  - Meerdere valuta's
  - Geavanceerde analyses en rapportage
  - Klantenportaal
  - Facturering
  - Webhaken

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Merchant of record-platform
  - Automatische belastingnaleving
  - Wereldwijde betalingen (135+ landen)
  - Abonnementen
  - Fraudepreventie
  - Vereenvoudigde installatie
  - Ondersteuning van partnerprogramma's

[Meer informatie over betalingsintegratie →](/betaling)

### Betalings-SDK's

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - Stripe client SDK
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - Stripe-server SDK
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - LemonSqueezy SDK

## CRM-integratie

- **[Twintig CRM](https://twenty.com/)** - Open-source CRM
  - Beheer van klantrelaties
  - Contactsynchronisatie
  - Activiteiten volgen
  - Aangepaste velden
  - API-integratie
  - Zelf gehost of in de cloud

### CRM-functies

- Automatisch contact maken op basis van gebruikersregistraties
- Synchroniseer gebruikersactiviteiten en interacties
- Volg abonnementen en betalingen
- Aangepaste veldtoewijzing
- Webhook-gebaseerde synchronisatie

## E-maildiensten

- **[4 opnieuw verzenden](https://resend.com/)** - E-mail-API
  - Transactionele e-mails
  - Ondersteuning voor sjablonen
  - Levering volgen
  - Ontwikkelaarvriendelijk

- **[Novu 2.6](https://novu.co/)** - Meldingsinfrastructuur
  - Meldingen via meerdere kanalen
  - Sjabloonbeheer
  - Automatisering van de workflow
  - Analyse

## Enquêtesysteem

- **[SurveyJS](https://surveyjs.io/)** - Enquête- en formulierbouwer
  - Meerdere vraagtypen (meerkeuze, tekst, beoordeling, matrix)
  - Voorwaardelijke logica
  - Enquêtevoorbeeld
  - Reactieanalyse
  - Exporteren naar CSV/Excel
  - Anonieme of geverifieerde reacties
  - Aangepaste thema's

[Meer informatie over enquêtes →](/guides/survey-system)

## Beveiliging

### Authenticatiebeveiliging

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Wachtwoordhashing
  - Veilige wachtwoordopslag
  - Zout generatie
  - Bescherming tegen timingaanvallen

- **[jose 6](https://github.com/panva/jose)** - JWT-operaties
  - Token generatie
  - Tokenverificatie
  - Ondersteuning voor encryptie

### Invoervalidatie

- **[Reageer Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - Bot-bescherming
  - Vormbescherming
  - Onzichtbare reCAPTCHA
  - Op scores gebaseerde verificatie

## Ontwikkelingshulpmiddelen

### Codekwaliteit

- **[ESLint 9](https://eslint.org/)** - JavaScript-linter
  - Codeer kwaliteitsregels
  - Aangepaste configuraties
  - TypeScript-ondersteuning
  - Next.js-regels

- **[Mooiere 3.5](https://prettier.io/)** - Codeformatter
  - Consistente opmaak
  - Editor-integratie
  - Aangepaste regels

### Bouw gereedschap

- **[PostCSS 8](https://postcss.org/)** - CSS-processor
  - CSS-verwerking in de rug
  - Autovoorvoegsel
  - CSS-optimalisatie

- **[Webpack 5](https://webpack.js.org/)** - Modulebundelaar (via Next.js)
  - Code-splitsing
  - Boom schudden
  - Optimalisatie van activa

## Implementatie en infrastructuur

### Hostingplatforms

- **[Vercel](https://vercel.com/)** - Aanbevolen platform
  - Next.js-optimalisatie
  - Randfuncties
  - Wereldwijd CDN
  - Automatische implementaties

- **[Netlify](https://netlify.com/)** - Alternatief platform
  - Statische sitehosting
  - Serverloze functies
  - Formulierafhandeling

### Database-hosting

- **[Supabase](https://supabase.com/)** - Beheerde PostgreSQL
  - Automatische back-ups
  - Verbindingspooling
  - Realtime functies

- **[PlanetScale](https://planetscale.com/)** - Serverloze MySQL
  - Vertakkingswerkstroom
  - Automatisch schalen
  - Schemabeheer

- **[Neon](https://neon.tech/)** - Serverloze PostgreSQL
  - Onmiddellijke vertakking
  - Automatisch schalen
  - Herstel op een bepaald tijdstip

## Pakketbeheer

- **[pnpm](https://pnpm.io/)** - Snelle, schijfruimte-efficiënte pakketbeheerder
  - Snellere installaties
  - Gedeelde afhankelijkheden
  - Strenge afhankelijkheidsresolutie

- **[npm](https://npmjs.com/)** - Standaard Node.js-pakketbeheerder
  - Breed ondersteund
  - Groot ecosysteem
  - Beveiligingsaudit

## Versievereisten

### Knooppunt.js

- **Minimaal**: Node.js 20.19.0
- **Aanbevolen**: Nieuwste LTS-versie
- **Pakketmanager**: npm 10+, garen 1.13+ of pnpm 8+

### Browserondersteuning

- **Moderne browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobiel**: iOS Safari 14+, Chrome Mobile 90+
- **Geen IE-ondersteuning**: alleen moderne functies

## Prestatieoverwegingen

### Bundelgrootte

- **Kernbundel**: ~200 KB gzipt
- **Codesplitsing**: op route gebaseerd en op componenten gebaseerd
- **Boomschudden**: eliminatie van ongebruikte codes
- **Dynamische import**: Lui laden voor niet-kritieke componenten

### Runtime-prestaties

- **Reageer 19**: Gelijktijdige functies voor betere UX
- **Next.js 15**: geoptimaliseerde weergave en caching
- **Beeldoptimalisatie**: WebP/AVIF-ondersteuning met lazyloading
- **Lettertypeoptimalisatie**: zelfgehoste lettertypen met vooraf laden

### Databaseprestaties

- **Verbindingspooling**: Efficiënte databaseverbindingen
- **Query-optimalisatie**: geïndexeerde zoekopdrachten en efficiënte joins
- **Caching**: caching op applicatie- en databaseniveau

## Beveiligingsstapel

### Applicatiebeveiliging

- **HTTPS**: afgedwongen in productie
- **CSRF-bescherming**: ingebouwd in NextAuth.js
- **XSS-bescherming**: Opschoning van inhoud
- **SQL-injectie**: geparametriseerde zoekopdrachten via Drizzle

### Infrastructuurbeveiliging

- **Omgevingsvariabelen**: Veilig geheimbeheer
- **Snelheidsbeperking**: API-eindpuntbescherming
- **Invoervalidatie**: Zod-schemavalidatie
- **Beveiliging bij het uploaden van bestanden**: beperkingen voor type en grootte

## Controlestapel

### Applicatiebewaking

- **Foutopsporing**: Sentry voor foutbewaking
- **Prestaties**: Core Web Vitals-tracking
- **Analytics**: PostHog voor gebruikersgedrag
- **Uptime**: externe monitoringdiensten

### Infrastructuurmonitoring

- **Database**: monitoring van verbindingen en zoekopdrachten
- **API**: tracking van responstijd en foutenpercentage
- **CDN**: Cachehitpercentages en prestaties
- **Implementatie**: monitoring van builds en implementaties

## Toekomstige overwegingen

### Geplande upgrades

- **Reactie 19**: adoptie van stabiele releases
- **Next.js 16**: Indien beschikbaar
- **TypeScript 5.x**: nieuwste functies
- **Node.js 22**: LTS-upgrade

### Potentiële toevoegingen

- **GraphQL**: voor complexe gegevensvereisten
- **WebSockets**: realtime functies
- **PWA**: Progressieve webapp-functies
- **Edge computing**: verbeterde prestaties

## Technologiebeslissingsmatrix

|Vereiste|Technologie keuze|Grondgedachte|
|-------------|-------------------|-----------|
|** Kader**|Volgende.js 15|Het beste React-framework in zijn klasse met App Router|
|**Databank**|PostgreSQL + motregen|Typeveilig, performant, schaalbaar|
|**Authentificatie**|VolgendeAuth.js + Supabase|Flexibiliteit van dubbele aanbieder|
|**Styling**|Tailwind CSS + HeroUI|Snelle ontwikkeling, consistent ontwerp|
|**Staat**|Zustand + Reageervraag|Eenvoudige clientstatus + krachtige serverstatus|
|**Formulieren**|React Hook Form + Zod|Prestaties + typeveiligheid|
|**i18n**|volgende-intl|Beste Next.js App Router-ondersteuning|
|**Betaling**|Streep + LemonSqueezy|Flexibiliteit + wereldwijde compliance|
|**E-mail**|Opnieuw verzenden + Novu|Ontwikkelaarsvriendelijk + multi-channel|
|**Analytics**|PostHog + Sentry|Productinzichten + foutopsporing|

## Volgende stappen

- [Architectuuroverzicht](./overview) - Begrijp de systeemarchitectuur
- [Platformfuncties](./features) - Ontdek alle platformfuncties
- [Ontwikkelingsinstellingen](/development/local-setup) - Stel uw omgeving in

## Hulpbronnen

### Officiële documentatie

- [Next.js-documentatie] (https://nextjs.org/docs)
- [Reageerdocumentatie] (https://react.dev/)
- [TypeScript-handboek](https://www.typescriptlang.org/docs/)
- [Tailwind CSS-documenten] (https://tailwindcss.com/docs)
- [Motregen ORM-documenten] (https://orm.drizzle.team/docs/overview)

### Gemeenschapsbronnen

- [Volgende.js GitHub] (https://github.com/vercel/next.js)
- [Reageer op GitHub] (https://github.com/facebook/react)
- [Tailwind GitHub] (https://github.com/tailwindlabs/tailwindcss)
- [Ever Works-gemeenschap] (https://github.com/ever-co/ever-works)
