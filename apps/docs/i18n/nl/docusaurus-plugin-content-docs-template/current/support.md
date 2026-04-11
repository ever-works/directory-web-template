---
id: support
title: Ondersteuning & hulp
sidebar_label: Ondersteuning & hulp
---

# Ondersteuning & hulp

## Hulp krijgen

### Community-ondersteuning
- GitHub Issues: https://github.com/ever-works/directory-web-template/issues
- Discord-community: https://discord.gg/ever
- Stack Overflow: tag `directory-web-template`

### Professionele ondersteuning
- E-mail: ever@ever.co
- Beveiligingsproblemen: security@ever.co
- Enterprise-ondersteuning: https://ever.co/contacts

## Documentatiebronnen
- Installatiegids: /getting-started/installation
- Snelstart: /getting-started/quick-start
- Architectuur: /architecture/overview
- Implementatie: /deployment/deployment-introduction

## Demo & voorbeelden
- Demosite: https://demo.ever.works
- GitHub-repository: https://github.com/ever-works/directory-web-template

## Probleemoplossing

### Veelvoorkomende problemen

#### Installatieproblemen
- Node.js-versie: Gebruik Node.js 20+
- Pakketbeheerder: Gebruik pnpm (voer `corepack enable` uit)
- Afhankelijkheden: Voer `pnpm install` uit in de repository-hoofdmap
- Poortconflicten: Standaardpoort 3000, gebruik de vlag --port om te wijzigen

#### Build-problemen
- Voer `pnpm build --filter @ever-works/web` uit
- Controleer of omgevingsvariabelen zijn ingesteld
- Verifieer de databaseverbinding
