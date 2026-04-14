---
id: queries
title: Referenz zu Datenbankabfragen
sidebar_label: Abfragen
sidebar_position: 2
---

# Referenz zu Datenbankabfragen

Das Verzeichnis `lib/db/queries/` enthält mehr als 23 Abfragemodule, die nach Domänen organisiert sind. Jedes Modul kapselt Drizzle ORM-Abfragen für einen bestimmten Funktionsbereich und folgt dabei dem Prinzip der Einzelverantwortung.

## Modulübersicht

Alle Abfragemodule werden aus `lib/db/queries/index.ts` im Barrel-Format exportiert, um einen bequemen Import zu ermöglichen:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Abfragemodule

### Aktivität.Queries.ts

Aktivitätsprotokollierung und -abruf für das Audit-Trail-System.

**Hauptfunktionen:**
- Benutzeraktivitäten protokollieren (Anmeldung, Registrierung, Kontoänderungen)
- Aktivitätsverlauf nach Benutzer oder Datumsbereich abfragen

### auth.queries.ts

Authentifizierungsbezogene Datenbankoperationen.

**Hauptfunktionen:**
- Suchen Sie den Benutzer per E-Mail zur Authentifizierung der Anmeldeinformationen
- Erstellen und überprüfen Sie Token zum Zurücksetzen des Passworts
- Verifizierungstoken verwalten

### client.queries.ts

Das größte Abfragemodul (37 KB), das alle kundenorientierten Vorgänge abwickelt.

**Hauptfunktionen:**
- CRUD-Vorgänge im Clientprofil
- Übermittlung und Verwaltung von Kundenartikeln
- Aggregation von Kunden-Dashboard-Daten
- Suchen und filtern Sie Kundendaten
- Abfragen nach paginierten Einträgen

### comment.queries.ts

Kommentieren Sie Systemvorgänge.

**Hauptfunktionen:**
- Kommentare erstellen, aktualisieren und vorläufig löschen
- Kommentare nach Element mit Paginierung abrufen
- Fragen zur Kommentarmoderation (Administrator)
- Bewertungsaggregation

### company.queries.ts

Fragen zur Unternehmensleitung.

**Hauptfunktionen:**
- CRUD-Operationen des Unternehmens
- Firmensuche und Filterung
- Verwaltung von Artikel-Firmen-Verbindungen
- Unternehmensstatistiken und -analysen

### Dashboard.queries.ts

Dashboard-Datenaggregation für Administrator- und Client-Dashboards.

**Hauptfunktionen:**
- Statistiken zum Admin-Dashboard (Gesamtbenutzer, Artikel, Umsatz)
- Statistiken zum Kunden-Dashboard (Einsendungen, Aufrufe, Engagement)
- Zeitreihendaten für Diagramme
- Zusammenfassungen der Aktivitäten

### engagement.queries.ts

Aggregierte Engagement-Metriken für Aufrufe, Stimmen, Favoriten und Kommentare.

**Hauptfunktionen:**
- Erhalten Sie Engagement-Scores für Artikel
- Anzahl der aggregierten Ansichten
- Berechnen Sie Beliebtheitskennzahlen
- Engagement-Rankings

### integration-mapping.queries.ts

CRM-Integrationszuordnungsvorgänge.

**Hauptfunktionen:**
- Erstellen und aktualisieren Sie Integrationszuordnungen
- Suchen Sie nach CRM-IDs aus Ever-IDs und umgekehrt
- Verfolgen Sie Synchronisierungszeitstempel und Versions-Hashes
- Massenzuordnungsvorgänge

### item.queries.ts

Kernelementabfragen (Elemente werden in Git gespeichert, Metadaten werden jedoch in der Datenbank verfolgt).

**Hauptfunktionen:**
- Elementmetadatenoperationen
- Verfolgung der Artikelansicht
- Daten zum Artikelengagement

### item-audit.queries.ts

Elementüberwachungsprotokollvorgänge.

**Hauptfunktionen:**
- Zeichnen Sie Aktionen zum Erstellen, Aktualisieren, Löschen und Überprüfen von Elementen auf
- Abfragen des Prüfverlaufs für bestimmte Elemente
- Filtern Sie Prüfprotokolle nach Aktionstyp, Ausführendem oder Datumsbereich

### item-view.queries.ts

Verfolgung und Analyse der Artikelansicht.

**Hauptfunktionen:**
- Erfassen Sie einzigartige tägliche Aufrufe (dedupliziert nach Zuschauer-ID und Datum).
- Die Abfrageansicht zählt nach Element und Datumsbereich
- Analyseaggregation anzeigen

### location-index.queries.ts

Standortbasierte Suche und Indizierung.

**Hauptfunktionen:**
- Geodatenabfragen für Objekte in der Nähe
- Standortindexverwaltung
- Entfernungsberechnungen
- Standortbasierte Suche mit Filtern

### moderation.queries.ts

Inhaltsmoderationssystem.

**Hauptfunktionen:**
- Erstellen und verwalten Sie Inhaltsberichte
- Aktualisieren Sie den Status und die Lösung des Berichts
- Moderationsaktionen aufzeichnen
- Moderationsstatistiken und Warteschlangenverwaltung

### Newsletter.queries.ts

Newsletter-Abonnementverwaltung.

**Hauptfunktionen:**
- Abonnieren und Abbestellen von Vorgängen
- Überprüfen Sie den Abonnementstatus
- Aktive Abonnenten auflisten
- Verfolgen Sie den E-Mail-Versandverlauf

### payment.queries.ts

Zahlungsbezogene Datenbankoperationen.

**Hauptfunktionen:**
- Verwaltung von Zahlungsanbietern
- Verknüpfung des Zahlungskontos
- Transaktionsaufzeichnung
- Abfragen des Zahlungsverlaufs

### report.queries.ts

Abfragen des Inhaltsberichtssystems.

**Hauptfunktionen:**
- Berichte erstellen (Artikel oder Kommentar)
- Listen Sie Berichte mit Filtern und Paginierung auf
- Berichtsstatus aktualisieren
- Berichtsanalyse

### subscription.queries.ts

Abonnement-Lebenszyklusverwaltung (17 KB).

**Hauptfunktionen:**
- Abonnements erstellen und aktualisieren
- Übergänge des Abonnementstatus
- Aufzeichnung des Abonnementverlaufs
- Finden Sie Abonnements nach Benutzer- oder Anbieter-ID
- Verlängerungs- und Stornierungsvorgänge
- Abonnementanalyse

### Survey.queries.ts

Betrieb des Vermessungssystems.

**Hauptfunktionen:**
- Übersicht über CRUD-Operationen
- Aufzeichnung der Umfrageantworten
- Antwortaggregation und -analyse
- Verwaltung des Umfragestatus (Entwurf, veröffentlicht, abgeschlossen)

### user.queries.ts

Abfragen zur Benutzerverwaltung.

**Hauptfunktionen:**
- Benutzer-CRUD-Operationen
- Benutzersuche und -filterung
- Benutzerrollenverwaltung
- Kontolöschung (vorläufiges Löschen)

### vote.queries.ts

Betrieb des Abstimmungssystems.

**Hauptfunktionen:**
- Stimmen erstellen, aktualisieren und entfernen
- Überprüfen Sie vorhandene Stimmen für ein Benutzer-Element-Paar
- Die Gesamtzahl der Stimmen wird nach Punkt gezählt
- Umschalten des Abstimmungstyps (Upvote/Downvote)

## Gemeinsame Dienstprogramme

### Typen.ts

Gemeinsam genutzte TypeScript-Typen, die in allen Abfragemodulen verwendet werden:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Gemeinsame Dienstprogrammfunktionen für die Abfrageerstellung:

- Paginierungshilfen (Offset-Berechnung, Ergebnisformatierung)
- Gängige Filter-Builder
- SQL-Fragment-Helfer

## Abfragemuster

### Standardabfragemuster

Alle Abfragemodule folgen einem einheitlichen Muster:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Paginierte Abfragen

Viele Module implementieren paginierte Abfragen:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Aggregationsabfragen

Die Engagement- und Dashboard-Module verwenden SQL-Aggregation:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Importkonvention

Importieren Sie Abfragefunktionen über den Barrel-Export:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
