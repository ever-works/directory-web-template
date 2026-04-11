---
id: glossary
title: Glossar
sidebar_label: Glossar
---

# Glossar

Schlüsselbegriffe und Konzepte, die in der gesamten Directory Web Template-Dokumentation verwendet werden.

## Zentrale Domänenkonzepte

### Verzeichnis

Eine Sammlung organisierter Einträge (Elemente) zu einem bestimmten Thema oder einer Nische. Ein Verzeichnis ist die übergeordnete Entität. Beispiele: ein "SaaS Tools Directory", ein "Developer Resources Directory" oder ein "Local Business Directory".

### Element

Ein einzelner Eintrag oder eine Auflistung innerhalb eines Verzeichnisses. Ein Element repräsentiert eine erfasste Entität (ein Tool, Unternehmen, eine Ressource oder einen Dienst). Elemente haben strukturierte Felder (Name, Beschreibung, URL, Logo), gehören zu Kategorien und können mit Tags versehen werden.

### Kategorie

Eine hierarchische Klassifikation zur Organisation von Elementen. Kategorien bilden eine Baumstruktur (Eltern-Kind-Beziehungen) und bieten den primären Navigations- und Filtermechanismus.

### Tag

Ein flaches, nicht-hierarchisches Label, das Elementen für übergreifende Klassifikation angehängt wird. Tags werden für sekundäre Filterung und Entdeckung verwendet. Ein Element kann mehrere Tags wie "open-source", "freemium" oder "API-available" haben.

### Sammlung

Eine kuratierte Gruppierung von Elementen, unabhängig von Kategorien oder Tags. Sammlungen sind benutzer- oder redaktionell kuratierte Sets, wie "Top 10 Auswahl" oder "Neu in diesem Monat".

### Taxonomie

Das gesamte Klassifikationssystem eines Verzeichnisses, das Kategorien, Tags und andere Organisationsstrukturen umfasst.

### Slug

Ein URL-freundlicher, menschenlesbarer Bezeichner, der aus dem Namen einer Entität abgeleitet wird. Slugs werden in URLs anstelle numerischer IDs verwendet. Zum Beispiel wird "Visual Studio Code" zu `visual-studio-code`.

## Architekturmuster

### Repository

Eine Datenzugriffsschicht-Klasse, die Datenbankabfragen und -mutationen für eine bestimmte Entität kapselt. Repositories abstrahieren Drizzle ORM und bieten eine saubere Schnittstelle für Services. Befindet sich in `lib/repositories/`.

### Service

Eine Geschäftslogik-Schicht-Klasse, die Operationen über Repositories, externe APIs und andere Services orchestriert. Services enthalten die zentrale Anwendungslogik und werden von API-Route-Handlern aufgerufen. Befindet sich in `lib/services/`.

### Webhook

Ein HTTP-Callback, der durch ein Ereignis ausgelöst wird. Das Template verwendet Webhooks für Benachrichtigungen von Zahlungsanbietern (Stripe, LemonSqueezy, Polar) und Deployment-Statusaktualisierungen. Webhook-Endpunkte validieren eingehende Anfragen mithilfe von Signaturen oder gemeinsamen Geheimnissen.

## Content-Management

### Git-basiertes CMS

Der im Template verwendete Content-Management-Ansatz. Verzeichnisdaten (Elemente, Kategorien, Metadaten) werden als strukturierte Dateien (YAML, Markdown) in einem Git-Repository gespeichert. Das Template klont dieses Repository zur Build-Zeit und liest Inhalte aus dem lokalen Dateisystem. Änderungen werden über Commits und Pull Requests vorgenommen.

### Community PR

Ein Pull Request, der von einem Community-Mitglied eingereicht wird, um Elemente im Git-basierten CMS-Repository eines Verzeichnisses hinzuzufügen oder zu aktualisieren. Community-PRs durchlaufen einen Überprüfungsprozess, bevor sie gemergt werden.

## Datenbank

### Drizzle ORM

Das leichtgewichtige, TypeScript-first ORM, das vom Template verwendet wird. Drizzle bietet einen SQL-ähnlichen Query Builder mit vollständiger Typsicherheit. Schema-Definitionen werden als TypeScript-Code geschrieben, und Migrationen werden als einfache SQL-Dateien über Drizzle Kit generiert.

### Migration

Eine versionierte Datenbankschemaänderung. Migrationen werden mit `pnpm db:generate` generiert und mit `pnpm db:migrate` angewendet. Migrationsdateien werden in `lib/db/migrations/` gespeichert.

## Authentifizierung

### NextAuth.js

Die vom Template verwendete Authentifizierungsbibliothek (v5). Sie bietet OAuth-Unterstützung für mehrere Anbieter (Google, GitHub, Facebook, Twitter, Microsoft) mit Session-Management und JWT-Tokens.

### Supabase Auth

Ein alternatives Authentifizierungs-Backend, das vom Template unterstützt wird. Supabase Auth bietet E-Mail/Passwort-Authentifizierung, Magic Links und soziales OAuth über den verwalteten Dienst von Supabase.

## Zahlungen

### Abonnement

Eine wiederkehrende Zahlungsvereinbarung, die über einen der unterstützten Zahlungsanbieter (Stripe, LemonSqueezy oder Polar) verwaltet wird. Das Template verarbeitet Abonnement-Erstellung, -Verwaltung und Webhook-Verarbeitung.

## Deployment

### Vercel

Die primäre Deployment-Plattform für das Template. Vercel bietet Zero-Configuration-Deployment für Next.js-Anwendungen, einschließlich automatischer Preview-Deployments, Edge-Funktionen und CDN-Verteilung.

### Docker

Eine alternative Deployment-Methode. Das Template kann containerisiert und in jeder Docker-kompatiblen Hosting-Umgebung bereitgestellt werden.
