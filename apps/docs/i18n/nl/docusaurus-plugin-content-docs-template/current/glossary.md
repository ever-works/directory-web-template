---
id: glossary
title: Woordenlijst
sidebar_label: Woordenlijst
---

# Woordenlijst

Sleutelbegrippen en -concepten die door de gehele Directory Web Template-documentatie worden gebruikt.

## Kerndomeinconcepten

### Directory

Een verzameling van georganiseerde vermeldingen (items) rondom een specifiek onderwerp of niche. Een directory is de entiteit op het hoogste niveau. Voorbeelden: een "SaaS Tools Directory," een "Developer Resources Directory," of een "Local Business Directory."

### Item

Een enkele vermelding of notering binnen een directory. Een item vertegenwoordigt één entiteit die wordt gecatalogiseerd (een tool, bedrijf, resource of dienst). Items hebben gestructureerde velden (naam, beschrijving, URL, logo), behoren tot categorieën en kunnen worden getagd.

### Categorie

Een hiërarchische classificatie die wordt gebruikt om items te organiseren. Categorieën vormen een boomstructuur (ouder-kind-relaties) en bieden het primaire navigatie- en filtermechanisme.

### Tag

Een plat, niet-hiërarchisch label dat aan items wordt gekoppeld voor overkoepelende classificatie. Tags worden gebruikt voor secundaire filtering en ontdekking. Een item kan meerdere tags hebben zoals "open-source," "freemium," of "API-available."

### Collectie

Een gecureerde groepering van items, onafhankelijk van categorieën of tags. Collecties zijn door gebruikers of redactioneel gecureerde sets, zoals "Top 10 Keuzes" of "Nieuw Deze Maand."

### Taxonomie

Het algehele classificatiesysteem voor een directory, inclusief categorieën, tags en andere organisatiestructuren.

### Slug

Een URL-vriendelijke, mensvriendelijke identifier afgeleid van de naam van een entiteit. Slugs worden in URL's gebruikt in plaats van numerieke ID's. Bijvoorbeeld wordt "Visual Studio Code" `visual-studio-code`.

## Architectuurpatronen

### Repository

Een datatoeganglaagklasse die databasequery's en -mutaties voor een specifieke entiteit inkapselt. Repositories abstraheren Drizzle ORM en bieden een schone interface voor services. Bevinden zich in `lib/repositories/`.

### Service

Een bedrijfslogicalaagklasse die bewerkingen over repositories, externe API's en andere services orkestreert. Services bevatten de kernlogica van de applicatie en worden aangeroepen door API-route-handlers. Bevinden zich in `lib/services/`.

### Webhook

Een HTTP-callback die wordt geactiveerd door een gebeurtenis. De Template gebruikt webhooks voor meldingen van betalingsproviders (Stripe, LemonSqueezy, Polar) en statusupdates voor implementaties. Webhook-endpoints valideren inkomende verzoeken met behulp van handtekeningen of gedeelde geheimen.

## Contentbeheer

### Git-gebaseerd CMS

De contentbeheerbenadering die door de Template wordt gebruikt. Directorygegevens (items, categorieën, metagegevens) worden opgeslagen als gestructureerde bestanden (YAML, Markdown) in een Git-repository. De Template kloont deze repository tijdens de bouwfase en leest inhoud uit het lokale bestandssysteem. Wijzigingen worden aangebracht via commits en pull requests.

### Community PR

Een pull request ingediend door een communitylid om items toe te voegen of bij te werken in de Git-gebaseerde CMS-repository van een directory. Community-PR's doorlopen een beoordelingsproces voordat ze worden samenengevoegd.

## Database

### Drizzle ORM

De lichtgewicht, TypeScript-first ORM die door de Template wordt gebruikt. Drizzle biedt een SQL-achtige querybuilder met volledige typeveiligheid. Schemadefinities worden geschreven als TypeScript-code en migraties worden gegenereerd als gewone SQL-bestanden via Drizzle Kit.

### Migratie

Een versioned databaseschemawijziging. Migraties worden gegenereerd met `pnpm db:generate` en toegepast met `pnpm db:migrate`. Migratiebestanden worden opgeslagen in `lib/db/migrations/`.

## Authenticatie

### NextAuth.js

De authenticatiebibliotheek (v5) die door de Template wordt gebruikt. Het biedt OAuth-ondersteuning voor meerdere providers (Google, GitHub, Facebook, Twitter, Microsoft) met sessiebeheer en JWT-tokens.

### Supabase Auth

Een alternatieve authenticatiebackend ondersteund door de Template. Supabase Auth biedt e-mail/wachtwoord-authenticatie, magic links en sociale OAuth via de beheerde service van Supabase.

## Betalingen

### Abonnement

Een terugkerende betalingsregeling beheerd via een van de ondersteunde betalingsproviders (Stripe, LemonSqueezy of Polar). De Template verwerkt het aanmaken, beheren en de webhookverwerking van abonnementen.

## Implementatie

### Vercel

Het primaire implementatieplatform voor de Template. Vercel biedt zero-configuration implementatie voor Next.js-applicaties, inclusief automatische preview-implementaties, edge-functies en CDN-distributie.

### Docker

Een alternatieve implementatiemethode. De Template kan worden gecontaineriseerd en ingezet in elke Docker-compatibele hostingomgeving.
