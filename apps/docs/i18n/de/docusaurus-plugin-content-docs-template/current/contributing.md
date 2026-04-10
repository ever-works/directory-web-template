---
id: contributing
title: Beitragsanleitung
sidebar_label: Beitragen
---

# Beitragsanleitung

Vielen Dank für Ihr Interesse, zum Directory Web Template beizutragen. Dieser Leitfaden behandelt alles, was Sie wissen müssen, um bedeutungsvolle Beiträge zu leisten.

## Repository

Der Quellcode des Templates ist unter [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template) gehostet.

Für Beiträge zur Ever Works Platform siehe das [Platform-Repository](https://github.com/ever-works/ever-works) und dessen Beitragsleitfaden unter [docs.ever.works](https://docs.ever.works).

## Voraussetzungen

Stellen Sie sicher, dass Folgendes installiert ist, bevor Sie beginnen:

- **Node.js** >= 20.19.0 (LTS empfohlen)
- **pnpm** >= 10.x (streng durchgesetzt; verwenden Sie nicht npm oder yarn)
- **Git** >= 2.30
- **PostgreSQL** (für die Datenbank; Supabase bietet eine gehostete Option)

### pnpm installieren

```bash
# Mit corepack (empfohlen, wird mit Node.js 20+ geliefert)
corepack enable
corepack prepare pnpm@latest --activate

# Oder via npm (einmaliger Bootstrap)
npm install -g pnpm
```

**Wichtig:** Das Repository verwendet `packageManager`-Felder und Sperrdateien, die spezifisch für pnpm sind. Die Ausführung von `npm install` oder `yarn install` schlägt fehl oder erzeugt falsche Abhängigkeitsbäume.

## Entwicklungsumgebung einrichten

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Umgebungsdatei kopieren und konfigurieren
cp .env.example .env.local
# Bearbeiten Sie .env.local mit Ihren Werten (siehe README für Details)

pnpm dev        # Next.js Dev-Server auf Port 3000
```

## Code-Standards

### TypeScript

Das Template verwendet TypeScript überall. Führen Sie keine reinen `.js`-Dateien ein. Folgen Sie strengen TypeScript-Praktiken:

- Aktivieren und respektieren Sie die `strict`-Moduseinstellungen in `tsconfig.json`
- Bevorzugen Sie explizite Rückgabetypen bei exportierten Funktionen
- Verwenden Sie `unknown` statt `any` wo möglich
- Validieren Sie Eingaben mit **Zod**-Schemas

### Formatierung (Prettier)

Die Formatierung wird über Prettier durchgesetzt. Die Konfiguration befindet sich in der Root-`package.json`:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Führen Sie den Formatter vor dem Commit aus:

```bash
pnpm format          # Alle Dateien formatieren
pnpm format:check    # Überprüfen ohne Änderungen (CI-freundlich)
```

### Linting (ESLint)

Das Template verwendet die flache ESLint-Konfiguration (`eslint.config.mjs`) mit React-, React Hooks- und TypeScript-Plugins:

```bash
pnpm lint
```

### Benennungskonventionen

| Element                      | Konvention       | Beispiel                              |
| ---------------------------- | ---------------- | ------------------------------------- |
| Dateien                      | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Klassen, Interfaces, Typen   | PascalCase       | `DirectoryService`, `UserProfile`     |
| Funktionen, Variablen        | camelCase        | `getDirectoryById`, `itemCount`       |
| Konstanten                   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Commit-Konventionen

Das Repository erzwingt [Conventional Commits](https://www.conventionalcommits.org/) über **commitlint** und **husky** Pre-Commit-Hooks.

| Präfix      | Verwendung                                     |
| ----------- | ---------------------------------------------- |
| `feat:`     | Neue Funktionen                                |
| `fix:`      | Fehlerkorrekturen                              |
| `docs:`     | Dokumentationsänderungen                       |
| `refactor:` | Code-Umstrukturierung ohne Verhaltensänderung  |
| `test:`     | Hinzufügen oder Aktualisieren von Tests        |
| `chore:`    | Wartungsaufgaben, Abhängigkeitsaktualisierungen |
| `style:`    | Formatierungsänderungen (keine Logikänderung)  |
| `perf:`     | Leistungsverbesserungen                        |
| `ci:`       | CI/CD-Konfigurationsänderungen                 |

Beispiel:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Branch-Benennung

Verwenden Sie beschreibende Branch-Namen mit einem Präfix:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Pull-Request-Prozess

1. **Forken** Sie das Repository (oder erstellen Sie einen Branch, wenn Sie Schreibzugriff haben).
2. **Erstellen Sie einen Feature-Branch** von `main`.
3. **Nehmen Sie Ihre Änderungen vor** und befolgen Sie die oben genannten Code-Standards.
4. **Führen Sie Qualitätsprüfungen aus** bevor Sie pushen (siehe unten).
5. **Pushen** Sie Ihren Branch und öffnen Sie einen Pull Request gegen `main`.
6. **Füllen Sie die PR-Vorlage aus** mit einer Beschreibung, verwandten Issues und Testnotizen.
7. **Warten Sie auf die Überprüfung.** Ein Maintainer wird Ihren PR überprüfen und möglicherweise Änderungen anfordern.
8. Nach der Genehmigung wird ein Maintainer Ihren PR zusammenführen.

### Qualitätsprüfungen vor dem Einreichen eines PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # TypeScript-Prüfung
pnpm build          # Vollständiger Produktions-Build
```

### Testen

Das Template verwendet **Playwright** für End-to-End-Tests:

```bash
pnpm test:e2e
```

Wenn Ihre Änderungen bestehende Funktionalität berühren, stellen Sie sicher, dass alle zugehörigen Tests bestehen. Wenn Sie neue Funktionalität hinzufügen, fügen Sie Tests dafür ein.

## Lizenz

Das Directory Web Template ist unter der **GNU Affero General Public License v3.0 (AGPL-3.0)** lizenziert. Durch das Einreichen eines Beitrags stimmen Sie zu, dass Ihre Arbeit unter derselben Lizenz lizenziert wird.

## Verhaltenskodex

Von allen Mitwirkenden wird erwartet, dass sie den Verhaltenskodex des Projekts einhalten. Seien Sie respektvoll, konstruktiv und kooperativ.

## Hilfe erhalten

Wenn Sie Fragen zum Beitrag haben:

- Öffnen Sie eine [GitHub-Diskussion](https://github.com/ever-works/directory-web-template/discussions)
- Treten Sie der [Discord-Community](https://discord.gg/ever) für Echtzeithilfe bei
- E-Mail an [ever@ever.co](mailto:ever@ever.co) für private Anfragen
