---
id: onboarding
title: Onboarding Gids
sidebar_label: Onboarding
sidebar_position: 2
---

# Onboarding Gids

Welkom bij Ever Works! Deze gids helpt u bij het instellen van uw ontwikkelomgeving en het leveren van uw eerste bijdrage.

## 🎯 Leerdoelen

Aan het einde van deze module zult u:

- ✅ Een volledig geconfigureerde ontwikkelomgeving hebben
- ✅ De projectstructuur begrijpen
- ✅ De applicatie lokaal uitvoeren
- ✅ Uw eerste codewijziging hebben gemaakt
- ✅ De ontwikkelingsworkflow begrijpen

**Geschatte tijd**: 1–2 dagen

---

## Stap 1: Omgeving Instellen

### 1.1 Vereiste hulpmiddelen installeren

Volg de gedetailleerde [Installatiegids](/getting-started/installation) om te installeren:

- Node.js 20.19.0+
- pnpm ([installeren](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (aanbevolen)

### 1.2 Repository klonen

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 Omgevingsvariabelen configureren

**Snelle checklist**:

- [ ] Databaseverbinding geconfigureerd
- [ ] Authenticatie-secrets ingesteld
- [ ] Betalingsaanbieder-sleutels toegevoegd (optioneel voor ontwikkeling)

---

## Stap 2: Database Instellen

### 2.1 PostgreSQL starten

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 Migraties uitvoeren

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## Stap 3: Ontwikkelserver Starten

```bash
pnpm run dev
```

Controleer in uw browser:

- [ ] Startpagina laadt op `http://localhost:3000`
- [ ] Account aanmaken mogelijk
- [ ] Aanmelden/Afmelden werkt
- [ ] API-documentatie toegankelijk op `http://localhost:3000/api/reference`

---

## Stap 4: Projectstructuur Begrijpen

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## Stap 5: Ontwikkelingsworkflow

### 5.1 Feature-branch aanmaken

```bash
git checkout main
git pull origin main
git checkout -b feature/uw-feature-naam
```

### 5.2 Wijzigingen vastleggen en pushen

```bash
git add .
git commit -m "feat: gebruikersnotificatiesysteem toevoegen"
git push origin feature/uw-feature-naam
```

---

## ✅ Onboarding Checklist

- [ ] Ontwikkelomgeving volledig ingesteld
- [ ] Applicatie draait lokaal
- [ ] Database verbonden en gevuld
- [ ] Projectstructuur begrepen
- [ ] Eerste branch aangemaakt
- [ ] Eerste commit gemaakt

---

## Volgende Stappen

1. [API Documentatie](/team-training/api-documentation) – Het documentatiesysteem leren
2. [Best Practices](/team-training/best-practices) – Codeerstandaarden leren
3. [Oefeningen](/team-training/exercises) – Oefenen met echte taken

Hulp nodig? Vraag uw mentor of kijk in het team Slack-kanaal! 🚀
