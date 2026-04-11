---
title: Installatie
sidebar_label: Installatie
sidebar_position: 1
---

# Installatie

## Vereisten
- Node.js >= 20.19.0
- pnpm (npm install -g pnpm)
- Git
- PostgreSQL (optioneel)

## Systeemvereisten
- OS: Windows, macOS of Linux
- Geheugen: minimaal 4 GB RAM, 8 GB aanbevolen
- Opslag: 2 GB vrije ruimte

## Installatiestappen

### 1. Repository klonen
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Afhankelijkheden installeren
```bash
pnpm install
```

### 3. Omgeving instellen
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Omgevingsvariabelen configureren
Bewerk apps/web/.env.local:
```bash
NODE_ENV=development
AUTH_SECRET="your-secret-key"
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

### 5. Ontwikkelingsserver starten
```bash
pnpm run dev
```
Bezoek http://localhost:3000
