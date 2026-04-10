---
title: Snelreferentie
sidebar_label: Snelreferentie
sidebar_position: 5
---

# Snelreferentie

## Veelgebruikte opdrachten

### Ontwikkeling
```bash
pnpm run dev              # Alle ontwikkelingsservers starten
pnpm run dev:web          # Alleen web-app starten
pnpm run build            # Alle pakketten bouwen
pnpm run lint             # Alle pakketten linten
```

### Database (vanuit apps/web/)
```bash
pnpm db:generate          # Migraties genereren
pnpm db:migrate           # Migraties toepassen
pnpm db:seed              # Vullen met testgegevens
pnpm db:studio            # Drizzle Studio openen
```

### Documentatie
```bash
pnpm run dev --filter @ever-works/docs   # Documentatie-ontwikkelingsserver starten
pnpm run build --filter @ever-works/docs # Documentatie bouwen
```

## Belangrijke bestandslocaties

| Bestand | Doel |
|------|---------|
| apps/web/.env.local | Omgevingsvariabelen |
| apps/web/.content/ | Git-gebaseerde CMS-inhoud |
| apps/web/app/ | Next.js App Router-routes |
| apps/web/lib/ | Bedrijfslogica |
| apps/web/components/ | React-componenten |

## Controlelijst omgevingsvariabelen

- [ ] AUTH_SECRET
- [ ] DATABASE_URL
- [ ] DATA_REPOSITORY
- [ ] GH_TOKEN
