---
title: Guida Rapida
sidebar_label: Guida Rapida
sidebar_position: 5
---

# Guida Rapida

## Comandi Comuni

### Sviluppo
```bash
pnpm run dev              # Avvia tutti i server di sviluppo
pnpm run dev:web          # Avvia solo l'app web
pnpm run build            # Compila tutti i pacchetti
pnpm run lint             # Lint di tutti i pacchetti
```

### Database (da apps/web/)
```bash
pnpm db:generate          # Genera le migrazioni
pnpm db:migrate           # Applica le migrazioni
pnpm db:seed              # Popola con dati di test
pnpm db:studio            # Apri Drizzle Studio
```

### Documentazione
```bash
pnpm run dev --filter @ever-works/docs   # Avvia il server di sviluppo della documentazione
pnpm run build --filter @ever-works/docs # Compila la documentazione
```

## Posizioni dei File Principali

| File | Scopo |
|------|---------|
| apps/web/.env.local | Variabili d'ambiente |
| apps/web/.content/ | Contenuti CMS basati su Git |
| apps/web/app/ | Route Next.js App Router |
| apps/web/lib/ | Logica di business |
| apps/web/components/ | Componenti React |

## Checklist Variabili d'Ambiente

- [ ] AUTH_SECRET
- [ ] DATABASE_URL
- [ ] DATA_REPOSITORY
- [ ] GH_TOKEN
