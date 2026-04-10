---
id: index
title: Directory Web Template
sidebar_label: Home
sidebar_position: 0
slug: /
---

# Directory Web Template

Il Directory Web Template è una soluzione moderna e full-stack per siti web directory, costruita con Next.js 16 e organizzata come monorepo Turborepo. È progettata per aiutarti a creare siti web directory professionali per strumenti, servizi, prodotti o qualsiasi altro tipo di piattaforma di elenchi.

## Funzionalità Principali

- **Stack Tecnologico Moderno**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Turborepo Monorepo**: workspace pnpm con configurazioni condivise, app web, test e2e e documentazione
- **Autenticazione Flessibile**: NextAuth.js v5, Supabase Auth, provider OAuth (Google, GitHub, Facebook, Twitter, Microsoft)
- **Integrazione Pagamenti**: Stripe, LemonSqueezy, Polar, gestione abbonamenti
- **Internazionalizzazione**: Più lingue supportate con pieno supporto RTL tramite next-intl
- **CMS basato su Git**: Sincronizzazione dei contenuti dai repository Git con struttura basata su YAML
- **Sistema di Temi**: Temi integrati con generazione dinamica dei colori
- **Analisi & Monitoraggio**: PostHog, Sentry, monitoraggio delle prestazioni
- **Dashboard Amministratore**: Gestione dei contenuti, degli utenti e analisi
- **SEO Ottimizzato**: Generazione sitemap, dati strutturati (JSON-LD), meta tag

## Avvio Rapido

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm run dev
```

## Prossimi Passi

- [Guida all'Installazione](/getting-started/installation)
- [Guida all'Avvio Rapido](/getting-started/quick-start)
- [Panoramica dell'Architettura](/architecture/overview)
- [Guida al Deployment](/deployment/deployment-introduction)

## Casi d'Uso

- Directory di strumenti (come ProductHunt per gli strumenti)
- Marketplace di servizi
- Cataloghi di risorse
- Directory professionali
- Vetrine di prodotti
- Piattaforme community

## Hai Bisogno di Aiuto?

- Consulta la nostra documentazione per informazioni generali
- Unisciti alla nostra community Discord per assistenza
- Visita il sito demo su https://demo.ever.works
- Contatta il supporto per assistenza tecnica
