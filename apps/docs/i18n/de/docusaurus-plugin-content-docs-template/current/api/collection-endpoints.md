---
id: collection-endpoints
title: "Collection API Endpoints"
sidebar_label: "Collection API Endpoints"
---

# Kollektions API Endpunkte

Die Kollektions API stellt einen öffentlichen Endpunkt bereit, um zu prüfen, ob aktive Kollektionen im System vorhanden sind. Kollektionen werden in der Datenbank gespeichert und über die Kollektions-Repository-Schicht verwaltet.

**Quelldatei:** `template/app/api/collections/exists/route.ts`

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| ------- | ------------------------------ | -------- | --------------------------------------- |
| `GET` | `/api/collections/exists` | Keine | Prüfen ob aktive Kollektionen vorhanden sind |

---

## GET `/api/collections/exists`

Prüft, ob aktive Kollektionen verfügbar sind. Gibt ein boolesches `exists`-Flag und die Anzahl aktiver Kollektionen zurück.

**Implementierung:**

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

**Antwort (200) – Kollektionen gefunden:**

```json
{ "exists": true, "count": 5 }
```

**Antwort (500) – Serverfehler:**

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

**Hinweise:**

- Nur **aktive** Kollektionen werden gezählt. Inaktive Kollektionen werden durch `includeInactive: false` ausgeschlossen.
- Im Gegensatz zum Kategorien-Endpunkt gibt dieser Endpunkt bei einem Fehler den Status 500 zurück statt eines stillen Fallbacks.
- Der Endpunkt benötigt eine funktionierende Datenbankverbindung.

**Unterschiede zum Kategorien-Endpunkt:**

| Aspekt | Kategorien | Kollektionen |
| ------------------- | ---------------------- | ------------------------- |
| Datenquelle | Git-basiertes CMS | Datenbank via Repository |
| Fehlerverhalten | 200 mit `exists: false` | 500 mit Fehlermeldung |
| Filter-Unterstützung | Locale-Parameter | Nur-Aktiv-Filter (fest) |
| Datenbankabhängig | Nein | Ja |

See the [English documentation](/api/collection-endpoints) for the full content of this section.
