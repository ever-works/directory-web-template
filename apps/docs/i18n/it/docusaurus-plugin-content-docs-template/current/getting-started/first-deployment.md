---
title: Primo Deployment
sidebar_label: Primo Deployment
sidebar_position: 4
---

# Primo Deployment

Distribuire in produzione.

## Opzione 1: Vercel (Consigliato)

1. Fai il push del tuo codice su GitHub
2. Vai su https://vercel.com/new
3. Importa il tuo repository
4. Aggiungi tutte le variabili d'ambiente dal tuo .env.local
5. Clicca su Distribuisci

## Opzione 2: Docker

```bash
# Costruire l'immagine
docker build -t directory-web .

# Eseguire il container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  directory-web
```

## Opzione 3: Self-Hosted (Node.js)

```bash
pnpm build
pnpm start
```

## Checklist Post-Deployment

- [ ] Variabili d'ambiente impostate
- [ ] Database connesso e migrato
- [ ] Dominio configurato
- [ ] Certificato SSL attivo
- [ ] Account amministratore creato
- [ ] Contenuti sincronizzati dal repository dei dati
