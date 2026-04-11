---
id: changelog
title: Changelog & Versionierung
sidebar_label: Changelog
---

# Changelog & Versionierung

Diese Seite erklärt, wie das Directory Web Template die Versionierung, Releases und Upgrade-Pfade verwaltet.

## Semantische Versionierung

Das Template folgt [Semantic Versioning (SemVer)](https://semver.org/). Versionsnummern verwenden das Format **MAJOR.MINOR.PATCH**:

| Komponente | Wann erhöhen                                                          |
| ---------- | --------------------------------------------------------------------- |
| **MAJOR**  | Breaking Changes, die Migrationsschritte erfordern                    |
| **MINOR**  | Neue Funktionen, rückwärtskompatibel hinzugefügt                      |
| **PATCH**  | Rückwärtskompatible Fehlerbehebungen und kleinere Verbesserungen      |

Vorabversionen können Suffixe wie `-alpha.1`, `-beta.2` oder `-rc.1` für frühzeitiges Testen verwenden.

## Datenbankmigrationen

Das Template verwendet **Drizzle ORM** mit PostgreSQL. Änderungen am Datenbankschema werden über Drizzle Kit verwaltet:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Migrationsdateien werden im Verzeichnis `lib/db/migrations/` gespeichert. Jede Migration ist eine SQL-Datei, die aus Änderungen an den Drizzle-Schemadefinitionen in `lib/db/schema/` generiert wird.

## Template aktualisieren

Beim Upgrade auf eine neuere Version:

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

### Konflikte beim Upgrade behandeln

Wenn Sie das Template angepasst haben, können beim Abrufen von Updates Merge-Konflikte auftreten. Die empfohlene Vorgehensweise:

1. **Anpassungen in separaten Dateien** aufbewahren, wenn möglich (benutzerdefinierte Komponenten, neue Routen, zusätzliche Services).
2. **Das Git-basierte CMS** für Inhaltsänderungen nutzen, anstatt Kerndateien zu ändern.
3. **Release-Notizen** vor dem Upgrade lesen, um zu verstehen, welche Dateien geändert wurden.
4. **Gründlich testen** nach der Konfliktlösung mit `pnpm lint`, `pnpm tsc --noEmit` und `pnpm build`.

## Releases verfolgen

### GitHub Releases

Releases werden auf GitHub veröffentlicht unter [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Jeder Release enthält:

- Ein Versions-Tag (z.B. `v0.1.0`)
- Release-Notizen mit Beschreibung von Änderungen, neuen Funktionen, Fehlerbehebungen und Breaking Changes
- Links zu relevanten Pull Requests und Issues

### Commit-Verlauf

Das Repository verwendet [Conventional Commits](https://www.conventionalcommits.org/), was es einfach macht, den Commit-Verlauf nach Änderungen zu durchsuchen:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Richtlinie für Breaking Changes

Breaking Changes werden ernst genommen. Das Projekt folgt diesen Grundsätzen:

1. **Vorankündigung.** Breaking Changes werden nach Möglichkeit mindestens eine Minor-Version vor dem Inkrafttreten angekündigt.
2. **Migrationsleitfäden.** Jeder Breaking Change enthält einen Migrationsleitfaden in den Release-Notizen.
3. **Störungen minimieren.** Breaking Changes werden in Major Releases gebündelt, anstatt auf mehrere Minor Releases verteilt.
4. **Datenbankabwärtskompatibilität.** Migrationen sind darauf ausgelegt, nicht destruktiv zu sein. Spaltenerweiterungen und Tabellenerstellungen werden Löschvorgängen oder Umbenennungen vorgezogen.

### Beispiele für Breaking Changes

- Entfernen oder Umbenennen eines öffentlichen API-Endpunkts
- Änderung der Struktur von API-Anfrage- oder Antwortkörpern
- Entfernen oder Umbenennen von Datenbankspalten oder -tabellen
- Änderung erforderlicher Umgebungsvariablen
- Aufgabe der Unterstützung einer Node.js-Version
- Änderung des Authentifizierungs- oder Autorisierungsverhaltens
- Entfernen oder Umbenennen exportierter TypeScript-Typen oder -Interfaces

### Beispiele für Nicht-Breaking Changes

- Hinzufügen neuer API-Endpunkte
- Hinzufügen neuer optionaler Felder zu Anfrage- oder Antwortkörpern
- Hinzufügen neuer Datenbankspalten mit Standardwerten
- Hinzufügen neuer Umgebungsvariablen mit sinnvollen Standardwerten
- Hinzufügen neuer Funktionen oder Integrationen
- Leistungsverbesserungen
- Fehlerbehebungen

## Changelog-Format

Release-Notizen folgen dieser Struktur:

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

Dieses Format folgt den Konventionen von [Keep a Changelog](https://keepachangelog.com/).
