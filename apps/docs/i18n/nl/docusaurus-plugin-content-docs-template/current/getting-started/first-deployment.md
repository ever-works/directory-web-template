---
title: Eerste implementatie
sidebar_label: Eerste implementatie
sidebar_position: 4
---

# Eerste implementatie

Implementeer naar productie.

## Optie 1: Vercel (Aanbevolen)

1. Push uw code naar GitHub
2. Ga naar https://vercel.com/new
3. Importeer uw repository
4. Voeg alle omgevingsvariabelen toe uit uw .env.local
5. Klik op Implementeren

## Optie 2: Docker

```bash
# Image bouwen
docker build -t directory-web .

# Container uitvoeren
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  directory-web
```

## Optie 3: Zelf gehost (Node.js)

```bash
pnpm build
pnpm start
```

## Controlelijst na implementatie

- [ ] Omgevingsvariabelen ingesteld
- [ ] Database verbonden en gemigreerd
- [ ] Domein geconfigureerd
- [ ] SSL-certificaat actief
- [ ] Beheerdersaccount aangemaakt
- [ ] Inhoud gesynchroniseerd vanuit gegevensrepository
