---
id: changelog
title: Changelog & Versiebeheer
sidebar_label: Changelog
---

# Changelog & Versiebeheer

Deze pagina legt uit hoe het Directory Web Template versiebeheer, releases en upgrade-paden beheert.

## Semantische Versienummering

Het Template volgt [Semantic Versioning (SemVer)](https://semver.org/). Versienummers gebruiken het formaat **MAJOR.MINOR.PATCH**:

| Component  | Wanneer verhogen                                              |
| ---------- | ------------------------------------------------------------- |
| **MAJOR**  | Breaking changes die migratiestappen vereisen                 |
| **MINOR**  | Nieuwe functies toegevoegd op een achterwaarts compatibele manier |
| **PATCH**  | Achterwaarts compatibele bugfixes en kleine verbeteringen     |

Pre-release versies kunnen achtervoegsels gebruiken zoals `-alpha.1`, `-beta.2` of `-rc.1` voor vroeg testen.

## Databasemigraties

Het Template gebruikt **Drizzle ORM** met PostgreSQL. Wijzigingen in het databaseschema worden beheerd via Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Migratiebestanden worden opgeslagen in de map `lib/db/migrations/`. Elke migratie is een SQL-bestand gegenereerd uit wijzigingen in de Drizzle-schemadefinities in `lib/db/schema/`.

## Het Template Upgraden

Bij het upgraden naar een nieuwere versie:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Conflicten Verwerken Tijdens Upgrades

Als u het Template hebt aangepast, kunt u merge-conflicten tegenkomen bij het ophalen van updates. De aanbevolen aanpak:

1. **Bewaar aanpassingen in afzonderlijke bestanden** indien mogelijk (aangepaste componenten, nieuwe routes, extra services).
2. **Gebruik het Git-gebaseerde CMS** voor inhoudswijzigingen in plaats van kernbestanden te wijzigen.
3. **Bekijk de release-notes** voor het upgraden om te begrijpen welke bestanden zijn gewijzigd.
4. **Test grondig** na het oplossen van conflicten door `pnpm lint`, `pnpm tsc --noEmit` en `pnpm build` uit te voeren.

## Releases Bijhouden

### GitHub Releases

Releases worden gepubliceerd op GitHub via [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Elke release omvat:

- Een versietag (bijv. `v0.1.0`)
- Release-notes die wijzigingen, nieuwe functies, bugfixes en breaking changes beschrijven
- Links naar relevante pull requests en issues

### Commit-geschiedenis

Het repository gebruikt [Conventional Commits](https://www.conventionalcommits.org/), waardoor het eenvoudig is om de commit-geschiedenis te scannen op wijzigingen:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Beleid voor Breaking Changes

Breaking changes worden serieus genomen. Het project volgt deze principes:

1. **Voorafgaande kennisgeving.** Breaking changes worden indien mogelijk minstens één minor release van tevoren aangekondigd.
2. **Migratiehandleidingen.** Elke breaking change bevat een migratiehandleiding in de release-notes.
3. **Verstoringen minimaliseren.** Breaking changes worden gebundeld in major releases in plaats van verspreid over meerdere minor releases.
4. **Achterwaartse compatibiliteit van databases.** Migraties zijn ontworpen om niet-destructief te zijn. Kolomtoevoegingen en tabelaanmaken hebben de voorkeur boven verwijderingen of hernoemen.

### Voorbeelden van Breaking Changes

- Verwijderen of hernoemen van een openbaar API-eindpunt
- Wijzigen van de structuur van API-verzoek- of antwoordteksten
- Verwijderen of hernoemen van databasekolommen of -tabellen
- Wijzigen van vereiste omgevingsvariabelen
- Ondersteuning droppen voor een Node.js-versie
- Wijzigen van authenticatie- of autorisatiegedrag
- Verwijderen of hernoemen van geëxporteerde TypeScript-typen of -interfaces

### Voorbeelden van Niet-Breaking Changes

- Nieuwe API-eindpunten toevoegen
- Nieuwe optionele velden toevoegen aan verzoek- of antwoordteksten
- Nieuwe databasekolommen toevoegen met standaardwaarden
- Nieuwe omgevingsvariabelen toevoegen met verstandige standaardwaarden
- Nieuwe functies of integraties toevoegen
- Prestatieverbeteringen
- Bugfixes

## Changelog-formaat

Release-notes volgen deze structuur:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

Dit formaat volgt de conventies van [Keep a Changelog](https://keepachangelog.com/).
