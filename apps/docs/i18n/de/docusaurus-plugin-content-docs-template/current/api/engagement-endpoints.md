---
id: engagement-endpoints
title: "Engagement API Endpoints"
sidebar_label: "Engagement API Endpoints"
---

# Engagement-API-Endpunkte

Die Engagement-API stellt Endpunkte zur Abfrage von Engagement-Metriken (Aufrufe, Stimmen, Bewertungen, Favoriten, Kommentare) und zur Berechnung von Popularitäts-Scores für Einträge bereit. Diese Endpunkte unterstützen die Sortier-, Ranking- und Analysefunktionen des Templates.

**Quelldateien:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Endpunktübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| GET | `/api/items/engagement` | Keine | Engagement-Metriken für mehrere Einträge abrufen |
| GET | `/api/items/popularity-scores` | Keine | Einträge nach berechnetem Popularitäts-Score sortiert abrufen |

Beide Endpunkte verwenden `dynamic = 'force-dynamic'`, um bei jeder Anfrage aktuelle Daten sicherzustellen.

---

## GET `/api/items/engagement`

Ruft Engagement-Metriken für mehrere Einträge ab, die durch ihre Slugs identifiziert werden. Gibt eine Zuordnung von Slug zu Metriken zurück.

### Abfrageparameter

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
|-----------|-----|--------------|----------|--------------|
| `slugs` | string | **Ja** | -- | Kommagetrennte Liste von Eintrags-Slugs |

### Einschränkungen

- Der Parameter `slugs` ist **erforderlich**. Bei Fehlen wird ein 400-Fehler zurückgegeben.
- Maximal **200 Slugs** pro Anfrage. Bei Überschreitung wird ein 400-Fehler zurückgegeben.

### Antwortstruktur

#### 200 – Metriken abgerufen

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 400 – Fehlende Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 – Zu viele Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

---

## GET `/api/items/popularity-scores`

Ein Debug-/Analyse-Endpunkt, der Einträge nach ihrem berechneten Popularitäts-Score sortiert zurückgibt.

### Abfrageparameter

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
|-----------|-----|--------------|----------|--------------|
| `limit` | integer | Nein | `20` | Anzahl der zurückzugebenden Einträge (max. 100) |
| `locale` | string | Nein | `"en"` | Sprache für das Abrufen von Eintragsdat en |

### Scoring-Algorithmus

Der Popularitäts-Score wird als Summe gewichteter Komponenten berechnet:

| Komponente | Gewichtung | Formel |
|------------|-----------|--------|
| Featured-Bonus | +10.000 | Pauschaler Bonus für hervorgehobene Einträge |
| Aufrufe | 1.000x | `log10(views + 1) * 1000` |
| Stimmen | 1.200x | `log10(max(votes, 0) + 1) * 1200` |
| Durchschnittsbewertung | 500x | `avgRating * 500` |
| Favoriten | 1.100x | `log10(favorites + 1) * 1100` |
| Kommentare | 1.000x | `log10(comments + 1) * 1000` |
| Aktualität (unter 30 Tage) | bis +1.000 | Linearer Verfall über 30 Tage |
| Aktualität (30–90 Tage) | bis +500 | Linearer Verfall über die nächsten 60 Tage |
| Aktualität (90–180 Tage) | bis +250 | Linearer Verfall über die nächsten 90 Tage |

### Antwortstruktur

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

## Authentifizierung

Beide Endpunkte sind **öffentlich** – keine Authentifizierung erforderlich. Sie sind als `force-dynamic` markiert, um bei jeder Anfrage aktuelle Daten zu gewährleisten.
