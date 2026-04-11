---
title: Installation
sidebar_label: Installation
sidebar_position: 1
---

# Installation

## Voraussetzungen
- Node.js >= 20.19.0
- pnpm (npm install -g pnpm)
- Git
- PostgreSQL (optional)

## Systemanforderungen
- Betriebssystem: Windows, macOS oder Linux
- Arbeitsspeicher: 4 GB RAM minimum, 8 GB empfohlen
- Speicherplatz: 2 GB freier Speicherplatz

## Installationsschritte

### 1. Repository klonen
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Abhängigkeiten installieren
```bash
pnpm install
```

### 3. Umgebung einrichten
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Umgebungsvariablen konfigurieren
Bearbeiten Sie apps/web/.env.local:
```bash
NODE_ENV=development
AUTH_SECRET="your-secret-key"
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

### 5. Entwicklungsserver starten
```bash
pnpm run dev
```
Besuchen Sie http://localhost:3000
