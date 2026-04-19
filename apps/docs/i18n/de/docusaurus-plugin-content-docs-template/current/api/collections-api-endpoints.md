---
id: collections-api-endpoints
title: "Collections API Endpoints"
sidebar_label: "Collections API Endpoints"
---

# Kollektionen API Endpunkte

Die Kollektionen API stellt einen öffentlichen Endpunkt bereit, um zu prüfen, ob aktive Kollektionen in der Datenbank vorhanden sind. Kollektionen sind kuratierte Gruppierungen von Einträgen, verwaltet über das Admin-Panel.

**Quelle:** `template/app/api/collections/exists/route.ts`

---

## Existenz von Kollektionen prüfen

```
GET /api/collections/exists
```

Prüft, ob aktive Kollektionen im System vorhanden sind. Keine Authentifizierung erforderlich.

**Abfrageparameter:** Keine.

**Antwort (200):**

```json
{
  "exists": true,
  "count": 5
}
```

| Feld | Typ | Beschreibung |
| ------- | ------- | ------------------------------------ |
| `exists` | boolean | Ob aktive Kollektionen vorhanden sind |
| `count` | number | Anzahl aktiver Kollektionen |

**Fehlerantwort (500):**

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

**Implementierungshinweise:**

- Kollektionen werden über `collectionRepository.findAll()` mit `includeInactive: false` abgerufen.
- Im Gegensatz zum Kategorien-Endpunkt gibt dieser Endpunkt bei einem Fehler den Status `500` zurück.
- Der Endpunkt wird vom Frontend verwendet, um den Kollektionsnavigationsbereich bedingt zu rendern.

See the [English documentation](/api/collections-api-endpoints) for the full content of this section.
