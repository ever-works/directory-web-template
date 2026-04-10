---
title: Kurzreferenz
sidebar_label: Kurzreferenz
sidebar_position: 5
---

# Kurzreferenz

## Häufige Befehle

### Entwicklung
```bash
pnpm run dev              # Alle Entwicklungsserver starten
pnpm run dev:web          # Nur Web-App starten
pnpm run build            # Alle Pakete erstellen
pnpm run lint             # Alle Pakete linten
```

### Datenbank (aus apps/web/)
```bash
pnpm db:generate          # Migrationen generieren
pnpm db:migrate           # Migrationen anwenden
pnpm db:seed              # Mit Testdaten befüllen
pnpm db:studio            # Drizzle Studio öffnen
```

### Dokumentation
```bash
pnpm run dev --filter @ever-works/docs   # Dokumentations-Entwicklungsserver starten
pnpm run build --filter @ever-works/docs # Dokumentation erstellen
```

## Wichtige Dateistandorte

| Datei | Zweck |
|------|---------|
| apps/web/.env.local | Umgebungsvariablen |
| apps/web/.content/ | Git-basierter CMS-Inhalt |
| apps/web/app/ | Next.js App Router-Routen |
| apps/web/lib/ | Geschäftslogik |
| apps/web/components/ | React-Komponenten |

## Checkliste für Umgebungsvariablen

- [ ] AUTH_SECRET
- [ ] DATABASE_URL
- [ ] DATA_REPOSITORY
- [ ] GH_TOKEN
