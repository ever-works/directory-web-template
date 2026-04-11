---
id: faq
title: Veelgestelde vragen
sidebar_label: Veelgestelde vragen
---

# Veelgestelde vragen

## Algemeen

### Wat is het Directory Web Template?
Het Directory Web Template is een productieklare, full-stack directorywebsite-oplossing gebouwd met Next.js, React, TypeScript en Tailwind CSS. U kunt het klonen, aanpassen en implementeren om professionele directorywebsites te maken.

### Kan ik het Template gebruiken zonder het Ever Works Platform?
Ja. Het Template werkt onafhankelijk als een zelfstandige Next.js-applicatie. Het Platform is een afzonderlijk optioneel product voor AI-inhoudsgeneratie.

## Tech-stack

### Welke technologieën gebruikt het Template?
- Framework: Next.js 15, React 19
- Taal: TypeScript 5
- Styling: Tailwind CSS 4, HeroUI React, Radix UI
- ORM: Drizzle ORM met PostgreSQL
- Auth: NextAuth.js v5
- Betalingen: Stripe, LemonSqueezy, Polar

### Welke authenticatieproviders worden ondersteund?
Google, GitHub, Facebook, Twitter en Microsoft via NextAuth.js v5.

### Welke betalingsproviders worden ondersteund?
Stripe, LemonSqueezy en Polar.

## Implementatie

### Hoe implementeer ik het Template?
Aanbevolen: Vercel voor zero-configuratie Next.js-hosting. Docker wordt ook ondersteund.

### Welke database moet ik gebruiken?
PostgreSQL via Supabase (beheerd) of directe PostgreSQL.

## Inhoud

### Hoe werkt het Git-gebaseerde CMS?
Inhoud wordt opgeslagen in YAML/Markdown-bestanden in een Git-repository, gekloond tijdens build-tijd naar de map .content/.

### Kan ik items handmatig toevoegen?
Ja. Bewerk YAML/Markdown-bestanden rechtstreeks in de CMS-gegevensrepository.
