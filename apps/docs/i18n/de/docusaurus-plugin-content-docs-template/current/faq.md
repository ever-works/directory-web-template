---
id: faq
title: Häufig gestellte Fragen
sidebar_label: Häufig gestellte Fragen
---

# Häufig gestellte Fragen

## Allgemein

### Was ist das Directory Web Template?
Das Directory Web Template ist eine produktionsreife, Full-Stack-Verzeichniswebsite-Lösung, die mit Next.js, React, TypeScript und Tailwind CSS entwickelt wurde. Sie können es klonen, anpassen und bereitstellen, um professionelle Verzeichniswebsites zu erstellen.

### Kann ich das Template ohne die Ever Works Platform verwenden?
Ja. Das Template funktioniert unabhängig als eigenständige Next.js-Anwendung. Die Platform ist ein separates optionales Produkt für die KI-Inhaltsgenerierung.

## Tech-Stack

### Welche Technologien verwendet das Template?
- Framework: Next.js 15, React 19
- Sprache: TypeScript 5
- Styling: Tailwind CSS 4, HeroUI React, Radix UI
- ORM: Drizzle ORM mit PostgreSQL
- Auth: NextAuth.js v5
- Zahlungen: Stripe, LemonSqueezy, Polar

### Welche Authentifizierungsanbieter werden unterstützt?
Google, GitHub, Facebook, Twitter und Microsoft über NextAuth.js v5.

### Welche Zahlungsanbieter werden unterstützt?
Stripe, LemonSqueezy und Polar.

## Bereitstellung

### Wie stelle ich das Template bereit?
Empfohlen: Vercel für Zero-Configuration Next.js-Hosting. Docker wird ebenfalls unterstützt.

### Welche Datenbank sollte ich verwenden?
PostgreSQL über Supabase (verwaltet) oder direktes PostgreSQL.

## Inhalt

### Wie funktioniert das Git-basierte CMS?
Inhalte werden in YAML/Markdown-Dateien in einem Git-Repository gespeichert und zur Build-Zeit in das Verzeichnis .content/ geklont.

### Kann ich Einträge manuell hinzufügen?
Ja. Bearbeiten Sie YAML/Markdown-Dateien direkt im CMS-Daten-Repository.
