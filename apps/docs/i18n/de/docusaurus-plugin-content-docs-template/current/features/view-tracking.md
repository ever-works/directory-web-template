---
id: view-tracking
title: Tracking und Engagement anzeigen
sidebar_label: Tracking anzeigen
sidebar_position: 35
---

# Tracking und Engagement anzeigen

Die Vorlage enthält ein datenschutzbewusstes View-Tracking-System, das einzigartige tägliche Aufrufe pro Artikel aufzeichnet. Es unterstützt die Anzahl der Aufrufe auf Artikelseiten, Dashboard-Analysen, Rankings von Trendartikeln und die Beliebtheitsbewertung.

## Architekturübersicht

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Verarbeitungspipeline

Wenn ein Benutzer eine Artikeldetailseite besucht, löst die `ItemViewTracker` -Komponente eine POST-Anfrage aus. Der Server verarbeitet es über eine mehrstufige Pipeline:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Antwortformat

```json
{ "success": true, "counted": true }
```

| Antwort | Bedeutung |
|----------|---------|
| `counted: true` | Eine neue Ansicht wurde aufgezeichnet |
| `counted: false` | Duplikat für heute (gleicher Betrachter + Artikel + Datum) |
| `counted: false, reason: "bot"` | Bot-Benutzeragent erkannt |
| `counted: false, reason: "owner"` | Authentifizierter Benutzer, der seinen eigenen Artikel anzeigt |

## Client-seitiger Tracker

Die `ItemViewTracker` ist eine Client-Komponente, die beim Mounten eine einzelne POST-Anfrage auslöst:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

Der Tracker verwendet einen Best-Effort-Ansatz: Fehler werden stillschweigend ignoriert, sodass die Ansichtsverfolgung das Benutzererlebnis nie beeinträchtigt.

## Bot-Erkennung

Das `lib/utils/bot-detection.ts` -Modul verwaltet eine Liste bekannter Bot-User-Agent-Muster, einschließlich Suchmaschinen-Crawlern, Überwachungstools und automatisierten Clients. Wenn ein Bot erkannt wird, gibt der Endpunkt eine erfolgreiche Antwort mit `counted: false` zurück, ohne die Datenbank zu berühren.

## Zuschaueridentifikation

Aufrufe werden einer Betrachter-ID zugeordnet, die in einem Nur-HTTP-Cookie eines Erstanbieters gespeichert ist:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Datenschutzeigenschaften

- **Keine personenbezogenen Daten** – das Cookie enthält nur eine zufällige UUID, nicht die Identität des Benutzers.
- **Nur HTTP** – JavaScript kann das Cookie nicht lesen und verhindert so die XSS-basierte Tracking-Exfiltration.
- **Lax für die gleiche Website** – das Cookie wird nicht bei Cross-Origin-Anfragen gesendet.
– **Sicheres Flag** – wird in der Produktion erzwungen, um HTTPS zu erfordern.
- **Keine Dienste von Drittanbietern** – alle Tracking-Daten bleiben in Ihrer Datenbank.

## Tägliche Deduplizierung

Die Kernaufzeichnungslogik verwendet PostgreSQLs `ON CONFLICT DO NOTHING` :

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

Die Tabelle `itemViews` hat eine Eindeutigkeitsbeschränkung für `(itemId, viewerId, viewedDateUtc)` . Die erste Ansicht des Tages für ein Betrachter-Element-Paar fügt eine Zeile ein und gibt `true` zurück. Nachfolgende Aufrufe am selben Tag werden stillschweigend übersprungen. Das Datum wird als UTC `YYYY-MM-DD` berechnet, um eine konsistente Deduplizierung unabhängig von der Zeitzone zu gewährleisten.

## Besitzerausschluss

Wenn ein authentifizierter Benutzer sein eigenes Element ansieht, wird die Ansicht nicht gezählt:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Dies verhindert, dass Artikelbesitzer ihre Aufrufzahlen künstlich erhöhen.

## Aggregationsabfragen

Die `item-view.queries.ts` -Datei exportiert mehrere Funktionen für die Analyse:

| Funktion | Rückgabetyp | Beschreibung |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Gesamtanzahl der Aufrufe aller Artikel-Slugs |
| `getRecentViewsCount(slugs, days)` | `number` | Ansichten innerhalb eines Schiebefensters (Standard 7 Tage) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Karte mit Datumseingabe für Sparkline-Diagramme |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Gesamtaufrufe pro Artikel für Rankings |

## Analytics-Integration

### Beliebtheitsbewertung

Die Anzahl der Aufrufe fließt in den logarithmischen Beliebtheitsbewertungsalgorithmus ein, der vom Shared-Card-System verwendet wird:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Dadurch wird sichergestellt, dass Elemente mit vielen Ansichten im Sortiermodus „Beliebt“ einen höheren Rang einnehmen und gleichzeitig unkontrollierte Ergebnisse durch virale Elemente verhindert werden.

### Kunden-Dashboard

Das Client-Dashboard bei `/client/dashboard` zeigt Folgendes an:
- Gesamtansichten aller eingereichten Artikel
- Aufrufe in den letzten 7 Tagen mit Trendindikatoren
- Ein Tagesansichtsdiagramm über `getDailyViewsData` ### Admin-Dashboard

Das Admin-Dashboard verwendet `GET /api/admin/dashboard/stats` für Site-weite Ansichtsmetriken. Der Geoanalyse-Endpunkt bietet die geografische Verteilung von Ansichten.

## Fehlerbehandlung

Ansichtsverfolgungsfehler werden in der Produktion stillschweigend behandelt:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

Der Entwicklungsmodus protokolliert Fehler zum Debuggen. Die Produktion unterdrückt die Konsolenausgabe, um Rauschen zu vermeiden.

## Konfiguration

Die Ansichtsverfolgung erfolgt automatisch und ohne erforderliche Umgebungsvariablen. Das System wird sanft heruntergefahren:

- **Keine Datenbank** – der Endpunkt gibt 503 zurück und der Client ignoriert den Fehler.
- **Datenbanksimulationsmodus** – wenn aktiviert, werden Ansichten anhand simulierter Daten verfolgt.
- **Feature-Flags** – Die Anzahl der Aufrufe wird abhängig von den Vorlageneinstellungen angezeigt.

## Barrierefreiheit

- Der `ItemViewTracker` rendert keine DOM-Elemente, sodass keinerlei Auswirkungen auf das Seitenlayout und Screenreader gewährleistet sind.
– Die in Karten angezeigten Aufrufzahlen verwenden `aria-label` -Attribute für den Screenreader-Kontext.
- Dashboard-Ansichtsdiagramme enthalten beschreibende Überschriften und zusammenfassenden Text.

## Verwandte Dokumentation

- [Dashboard-Komponenten](/docs/template/components/dashboard-components) – Statistikanzeige anzeigen
– [Shared Card Components](/docs/template/components/shared-card-components) – Beliebtheitsbewertung
– [Admin Analytics](/docs/template/features/admin-analytics) – Site-weite Ansichtsmetriken
– [Abstimmung und Kommentare](/docs/template/features/voting-comments) – Weitere Engagement-Funktionen
