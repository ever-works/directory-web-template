---
id: index
title: Directory Web Template
sidebar_label: Startpagina
sidebar_position: 0
slug: /
---

# Directory Web Template

Het Directory Web Template is een moderne, full-stack directorywebsite-oplossing gebouwd met Next.js 16 en georganiseerd als een Turborepo-monorepo. Het is ontworpen om u te helpen professionele directorywebsites te maken voor tools, diensten, producten of elk ander type lijstplatform.

## Belangrijkste functies

- **Moderne Tech-stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Turborepo Monorepo**: pnpm-workspaces met gedeelde configuraties, web-app, e2e-tests en documentatie
- **Flexibele authenticatie**: NextAuth.js v5, Supabase Auth, OAuth-providers (Google, GitHub, Facebook, Twitter, Microsoft)
- **Betalingsintegratie**: Stripe, LemonSqueezy, Polar, abonnementsbeheer
- **Internationalisering**: Meerdere talen ondersteund met volledige RTL-ondersteuning via next-intl
- **Git-gebaseerd CMS**: Inhoudssynchronisatie vanuit Git-repositories met YAML-gebaseerde structuur
- **Themasysteem**: Ingebouwde thema's met dynamische kleurengeneratie
- **Analyse & monitoring**: PostHog, Sentry, prestatiecontrole
- **Beheerdashboard**: Inhoudsbeheer, gebruikersbeheer en analyse
- **SEO-geoptimaliseerd**: Sitemap-generatie, gestructureerde gegevens (JSON-LD), metatags

## Snelstart

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm run dev
```

## Volgende stappen

- [Installatiegids](/getting-started/installation)
- [Snelstartgids](/getting-started/quick-start)
- [Architectuuroverzicht](/architecture/overview)
- [Implementatiegids](/deployment/deployment-introduction)

## Gebruiksscenario's

- Tool-directories (zoals ProductHunt voor tools)
- Dienstenmarktplaatsen
- Resourcecatalogi
- Professionele directories
- Productpresentaties
- Communityplatforms

## Hulp nodig?

- Raadpleeg onze documentatie voor algemene informatie
- Word lid van onze Discord-community voor ondersteuning
- Bezoek de demosite op https://demo.ever.works
- Neem contact op met ondersteuning voor technische hulp
