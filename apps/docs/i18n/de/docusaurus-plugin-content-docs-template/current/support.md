---
id: support
title: Support & Hilfe
sidebar_label: Support & Hilfe
---

# Support & Hilfe

## Hilfe erhalten

### Community-Support
- GitHub Issues: https://github.com/ever-works/directory-web-template/issues
- Discord-Community: https://discord.gg/ever
- Stack Overflow: Tag `directory-web-template`

### Professioneller Support
- E-Mail: ever@ever.co
- Sicherheitsprobleme: security@ever.co
- Enterprise-Support: https://ever.co/contacts

## Dokumentationsressourcen
- Installationsanleitung: /getting-started/installation
- Schnellstart: /getting-started/quick-start
- Architektur: /architecture/overview
- Bereitstellung: /deployment/deployment-introduction

## Demo & Beispiele
- Demo-Website: https://demo.ever.works
- GitHub-Repository: https://github.com/ever-works/directory-web-template

## Fehlerbehebung

### Häufige Probleme

#### Installationsprobleme
- Node.js-Version: Verwenden Sie Node.js 20+
- Paketmanager: Verwenden Sie pnpm (führen Sie `corepack enable` aus)
- Abhängigkeiten: Führen Sie `pnpm install` im Repository-Stammverzeichnis aus
- Port-Konflikte: Standardport 3000, verwenden Sie das Flag --port zum Ändern

#### Build-Probleme
- Führen Sie `pnpm build --filter @ever-works/web` aus
- Überprüfen Sie, ob Umgebungsvariablen gesetzt sind
- Überprüfen Sie die Datenbankverbindung
