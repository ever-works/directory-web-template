---
id: local-setup
title: Lokale Entwicklungseinrichtung
sidebar_label: Lokales Setup
---

# Lokale Entwicklungseinrichtung

Diese Anleitung hilft Ihnen dabei, eine vollständige lokale Entwicklungsumgebung für Ever Works einzurichten.

## Voraussetzungen

Stellen Sie sicher, dass Folgendes installiert ist:

- **Node.js 20.x oder höher** – [Herunterladen](https://nodejs.org/)
- **pnpm** – [Installieren](https://pnpm.io/installation) (der Monorepo-Paketmanager)
- **Git** – [Herunterladen](https://git-scm.com/)
- **PostgreSQL** (optional) – [Herunterladen](https://postgresql.org/)
- **Docker** (optional) – [Herunterladen](https://docker.com/)

## Entwicklungsumgebung einrichten

### 1. Klonen und Installieren

```bash
# Repository klonen
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Alle Abhängigkeiten vom Monorepo-Stammverzeichnis installieren
pnpm install
```

### 2. Umgebungskonfiguration

Kopieren Sie die Beispiel-Umgebungsdatei in das Web-App-Verzeichnis:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Konfigurieren Sie Ihre `apps/web/.env.local`-Datei:

```bash
# Grundlegende Entwicklungskonfiguration
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentifizierung
AUTH_SECRET="generate-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub-Integration (Erforderlich)
GH_TOKEN="your-github-personal-access-token"
DATA_REPOSITORY="https://github.com/your-username/awesome-data"

# Datenbank (Optional)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# OAuth-Anbieter (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Datenbankeinrichtung (Optional)

#### Option A: Lokales PostgreSQL

```bash
# Datenbank erstellen
createdb everworks_dev

# Datenbankbefehle vom Web-App-Verzeichnis ausführen
cd apps/web

# Migrationen ausführen
pnpm run db:generate
pnpm run db:migrate

# Mit Beispieldaten befüllen
pnpm run db:seed
```

#### Option B: Docker PostgreSQL

```bash
# PostgreSQL-Container starten
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e POSTGRES_DB=your_database_name \
  -p 5432:5432 \
  -d postgres:15

# Migrationen ausführen (von apps/web/)
pnpm run db:migrate
pnpm run db:seed
```

#### Option C: Supabase

1. Projekt bei [Supabase](https://supabase.com) erstellen
2. Verbindungszeichenfolge aus Einstellungen → Datenbank abrufen
3. `DATABASE_URL` in `apps/web/.env.local` aktualisieren
4. Migrationen von `apps/web/` ausführen: `pnpm run db:migrate`

### 4. Inhaltsrepository-Einrichtung

#### Datenrepository forken

1. [awesome-data](https://github.com/ever-works/awesome-data) besuchen
2. „Fork" klicken, um Ihre Kopie zu erstellen
3. `DATA_REPOSITORY` in `apps/web/.env.local` aktualisieren

#### GitHub-Token generieren

1. GitHub-Einstellungen → Entwicklereinstellungen → Persönliche Zugriffstoken aufrufen
2. Neues Token (klassisch) generieren
3. Berechtigungen auswählen: `repo`, `read:user`, `user:email`
4. Generierten Token kopieren und zu `GH_TOKEN` in `apps/web/.env.local` hinzufügen
5. **Wichtig**: Token niemals in die Versionskontrolle committen

### 5. Entwicklungsserver starten

```bash
# Vom Monorepo-Stammverzeichnis — startet alle Apps (Web, Docs, etc.)
pnpm run dev

# Oder nur die Web-App starten
pnpm run dev:web
```

Ihre Anwendung ist unter [http://localhost:3000](http://localhost:3000) verfügbar.

## Entwicklungsskripte

### Core-Skripte (vom Monorepo-Stammverzeichnis)

```bash
# Alle Dev-Server starten (Web, Docs, etc.)
pnpm run dev

# Nur die Web-App starten
pnpm run dev:web

# Alle Apps bauen
pnpm run build

# Typprüfung
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Code-Formatierung
pnpm run format
pnpm run format:check
```

### Datenbankskripte (von `apps/web/` ausführen)

```bash
cd apps/web

# Datenbankschema generieren
pnpm run db:generate

# Migrationen ausführen
pnpm run db:migrate

# Datenbank zurücksetzen
pnpm run db:reset

# Datenbank befüllen
pnpm run db:seed

# Datenbankstudio öffnen
pnpm run db:studio
```

### Inhaltsskripte (von `apps/web/` ausführen)

```bash
cd apps/web

# Inhalte von Git synchronisieren
pnpm run content:sync

# Inhaltsdateien validieren
pnpm run content:validate

# Inhaltstypen generieren
pnpm run content:types
```

## Entwicklungswerkzeuge

### VS Code Einrichtung

Empfohlene Erweiterungen installieren:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma"
  ]
}
```
