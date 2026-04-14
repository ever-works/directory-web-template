---
id: categories-api-endpoints
title: "Categories API Endpoints"
sidebar_label: "Categories API Endpoints"
---

# Kategorien API Endpunkte

Die Kategorien API stellt einen öffentlichen Endpunkt bereit, um zu prüfen, ob Kategorien im Inhaltssystem vorhanden sind. Kategorien stammen aus dem Git-basierten CMS-Inhalts-Repository.

**Quelldatei:** `template/app/api/categories/exists/route.ts`

---

## Existenz von Kategorien prüfen

```
GET /api/categories/exists
```

Prüft, ob Kategorien im System vorhanden sind, und gibt die Anzahl zurück. Keine Authentifizierung erforderlich.

**Abfrageparameter:**

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
| --------- | ------- | -------- | ------- | ------------------------------------------- |
| `locale` | string | Nein | `"en"` | Locale-Code zum Abrufen von Kategorien |

**Antwort (200):**

```json
{
  "exists": true,
  "count": 12
}
```

| Feld | Typ | Beschreibung |
| ------- | ------- | ------------------------------ |
| `exists` | boolean | Ob Kategorien vorhanden sind |
| `count` | number | Anzahl der gefundenen Kategorien |

**Fehlerbehandlung:**

Bei einem Fehler gibt der Endpunkt standardmäßig `200` mit sicheren Standardwerten zurück:

```json
{ "exists": false, "count": 0 }
```

Dieses fehlertolerante Verhalten stellt sicher, dass die UI auch dann ordnungsgemäß funktioniert, wenn das Inhaltssystem nicht erreichbar ist.

**Implementierungshinweise:**

- Kategorien werden über `fetchItems()` aus `@/lib/content` aus dem Git-basierten CMS abgerufen.
- Fehler werden nur im Entwicklungsmodus protokolliert (`NODE_ENV === 'development'`).
- Der Parameter `locale` wird auf die Option `lang` in der Content-Fetch-Schicht abgebildet.

See the [English documentation](/api/categories-api-endpoints) for the full content of this section.
