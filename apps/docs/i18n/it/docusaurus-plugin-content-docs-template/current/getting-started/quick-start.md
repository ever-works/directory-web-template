---
title: Avvio Rapido
sidebar_label: Avvio Rapido
sidebar_position: 2
---

# Avvio Rapido

Metti in funzione il tuo sito web directory in meno di 10 minuti.

## Passo 1: Configurare le Impostazioni

Modifica apps/web/.content/config.yml:
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

## Passo 2: Configurare il Repository dei Dati

1. Fai il fork del repository dei dati su https://github.com/ever-works/awesome-data
2. Aggiorna .env.local:
```bash
DATA_REPOSITORY="https://github.com/YOUR_USERNAME/awesome-data"
GH_TOKEN="your_github_token"
```

## Passo 3: Avviare l'Applicazione
```bash
pnpm run dev
```
Visita http://localhost:3000

## Passo 4: Aggiungere il Primo Elemento

Crea items/my-tool.yml nel tuo repository dei dati:
```yaml
id: 'my-tool'
name: 'My Tool'
slug: 'my-tool'
description: 'Tool description'
url: 'https://my-tool.com'
tags: ['productivity']
```

## Prossimi Passi
- Dashboard Amministratore: http://localhost:3000/admin
- Configurare i provider di pagamento
- Personalizzare il tema
