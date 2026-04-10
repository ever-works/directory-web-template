---
title: Schnellstart
sidebar_label: Schnellstart
sidebar_position: 2
---

# Schnellstart

Bringen Sie Ihre Verzeichniswebsite in unter 10 Minuten zum Laufen.

## Schritt 1: Einstellungen konfigurieren

Bearbeiten Sie apps/web/.content/config.yml:
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

## Schritt 2: Daten-Repository einrichten

1. Forken Sie das Daten-Repository unter https://github.com/ever-works/awesome-data
2. Aktualisieren Sie .env.local:
```bash
DATA_REPOSITORY="https://github.com/YOUR_USERNAME/awesome-data"
GH_TOKEN="your_github_token"
```

## Schritt 3: Anwendung starten
```bash
pnpm run dev
```
Besuchen Sie http://localhost:3000

## Schritt 4: Ersten Eintrag hinzufügen

Erstellen Sie items/my-tool.yml in Ihrem Daten-Repository:
```yaml
id: 'my-tool'
name: 'My Tool'
slug: 'my-tool'
description: 'Tool description'
url: 'https://my-tool.com'
tags: ['productivity']
```

## Nächste Schritte
- Admin-Dashboard: http://localhost:3000/admin
- Zahlungsanbieter konfigurieren
- Design anpassen
