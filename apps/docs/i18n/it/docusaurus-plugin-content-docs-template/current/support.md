---
id: support
title: Supporto & Aiuto
sidebar_label: Supporto & Aiuto
---

# Supporto & Aiuto

## Ottenere Aiuto

### Supporto Community
- GitHub Issues: https://github.com/ever-works/directory-web-template/issues
- Community Discord: https://discord.gg/ever
- Stack Overflow: tag `directory-web-template`

### Supporto Professionale
- Email: ever@ever.co
- Problemi di Sicurezza: security@ever.co
- Supporto Enterprise: https://ever.co/contacts

## Risorse Documentazione
- Guida all'Installazione: /getting-started/installation
- Avvio Rapido: /getting-started/quick-start
- Architettura: /architecture/overview
- Deployment: /deployment/deployment-introduction

## Demo & Esempi
- Sito Demo: https://demo.ever.works
- Repository GitHub: https://github.com/ever-works/directory-web-template

## Risoluzione dei Problemi

### Problemi Comuni

#### Problemi di Installazione
- Versione Node.js: Usa Node.js 20+
- Gestore Pacchetti: Usa pnpm (esegui `corepack enable`)
- Dipendenze: Esegui `pnpm install` nella cartella radice del repository
- Conflitti di Porta: Porta predefinita 3000, usa il flag --port per cambiarla

#### Problemi di Build
- Esegui `pnpm build --filter @ever-works/web`
- Verifica che le variabili d'ambiente siano impostate
- Verifica la connessione al database
