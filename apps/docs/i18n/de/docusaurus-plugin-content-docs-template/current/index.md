---
id: index
title: Directory Web Template
sidebar_label: Startseite
sidebar_position: 0
slug: /
---

# Directory Web Template

Das Directory Web Template ist eine moderne, Full-Stack-Verzeichniswebsite-Lösung, die mit Next.js 16 entwickelt und als Turborepo-Monorepo organisiert wurde. Es wurde entwickelt, um Ihnen zu helfen, professionelle Verzeichniswebsites für Tools, Dienste, Produkte oder jede andere Art von Listing-Plattform zu erstellen.

## Hauptfunktionen

- **Moderner Tech-Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Turborepo Monorepo**: pnpm-Workspaces mit gemeinsamen Konfigurationen, Web-App, E2E-Tests und Dokumentation
- **Flexible Authentifizierung**: NextAuth.js v5, Supabase Auth, OAuth-Anbieter (Google, GitHub, Facebook, Twitter, Microsoft)
- **Zahlungsintegration**: Stripe, LemonSqueezy, Polar, Abonnementverwaltung
- **Internationalisierung**: Mehrere Sprachen mit vollständiger RTL-Unterstützung über next-intl
- **Git-basiertes CMS**: Inhaltssynchronisierung aus Git-Repositories mit YAML-basierter Struktur
- **Theming-System**: Integrierte Designs mit dynamischer Farbgenerierung
- **Analysen & Monitoring**: PostHog, Sentry, Leistungsüberwachung
- **Admin-Dashboard**: Inhaltsverwaltung, Benutzerverwaltung und Analysen
- **SEO-Optimiert**: Sitemap-Generierung, strukturierte Daten (JSON-LD), Meta-Tags

## Schnellstart

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm run dev
```

## Nächste Schritte

- [Installationsanleitung](/getting-started/installation)
- [Schnellstart-Anleitung](/getting-started/quick-start)
- [Architekturübersicht](/architecture/overview)
- [Bereitstellungsanleitung](/deployment/deployment-introduction)

## Anwendungsfälle

- Tool-Verzeichnisse (wie ProductHunt für Tools)
- Dienstleistungsmarktplätze
- Ressourcenkataloge
- Professionelle Verzeichnisse
- Produktpräsentationen
- Community-Plattformen

## Benötigen Sie Hilfe?

- Lesen Sie unsere Dokumentation für allgemeine Informationen
- Treten Sie unserer Discord-Community für Support bei
- Besuchen Sie die Demo-Website unter https://demo.ever.works
- Kontaktieren Sie den Support für technische Unterstützung
