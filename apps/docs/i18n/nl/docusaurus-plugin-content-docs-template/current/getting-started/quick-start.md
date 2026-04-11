---
title: Snelstart
sidebar_label: Snelstart
sidebar_position: 2
---

# Snelstart

Krijg uw directorywebsite in minder dan 10 minuten aan de gang.

## Stap 1: Instellingen configureren

Bewerk apps/web/.content/config.yml:
```yaml
company_name: 'Your Company'
item_name: 'Tool'
items_name: 'Tools'
auth:
    credentials: true
    google: true
payment:
    provider: 'stripe'
```

## Stap 2: Gegevensrepository instellen

1. Fork de gegevensrepository op https://github.com/ever-works/awesome-data
2. Werk .env.local bij:
```bash
DATA_REPOSITORY="https://github.com/YOUR_USERNAME/awesome-data"
GH_TOKEN="your_github_token"
```

## Stap 3: De applicatie starten
```bash
pnpm run dev
```
Bezoek http://localhost:3000

## Stap 4: Uw eerste item toevoegen

Maak items/my-tool.yml aan in uw gegevensrepository:
```yaml
id: 'my-tool'
name: 'My Tool'
slug: 'my-tool'
description: 'Tool description'
url: 'https://my-tool.com'
tags: ['productivity']
```

## Volgende stappen
- Beheerdashboard: http://localhost:3000/admin
- Betalingsproviders configureren
- Het thema aanpassen
