---
id: admin-tags-endpoints
title: "Admin Tags API Endpoints"
sidebar_label: "Admin Tags API Endpoints"
---

# Admin Tags API Endpunkte

Die Admin Tags API bietet vollständige CRUD-Operationen für die Verwaltung von Inhalts-Tags. Tags werden verwendet, um Einträge im Verzeichnis zu klassifizieren und zu filtern. Alle Schreiboperationen invalidieren den Inhalts-Cache für sofortige Sichtbarkeit.

## Basispfad

```
/api/admin/tags
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ---------------------------- | -------- | -------------------------------------- |
| `GET` | `/api/admin/tags` | Admin | Tags auflisten (paginiert) |
| `POST` | `/api/admin/tags` | Admin | Neues Tag erstellen |
| `GET` | `/api/admin/tags/all` | Admin | Alle Tags abrufen (aus Content-Cache) |
| `GET` | `/api/admin/tags/{id}` | Admin | Einzelnes Tag nach ID abrufen |
| `PUT` | `/api/admin/tags/{id}` | Admin | Tag aktualisieren |
| `DELETE` | `/api/admin/tags/{id}` | Admin | Tag permanent löschen |

---

## Tags auflisten

```
GET /api/admin/tags
```

Gibt eine paginierte Liste aller Tags zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| --------- | ------- | ------- | ------------------------------ |
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Tag erstellen

```
POST /api/admin/tags
```

Erstellt ein neues Tag mit ID, Name und optionalem Aktivstatus. Invalidiert den Inhalts-Cache.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| --------- | ------- | -------- | ------------------------------------------- |
| `id` | string | Ja | URL-freundlicher Slug-Bezeichner |
| `name` | string | Ja | Anzeigename (2–50 Zeichen) |
| `isActive` | boolean | Nein | Ob das Tag aktiv ist (Standard: `true`) |

**Validierungsregeln:**
- `id` und `name` sind erforderlich
- Tagname muss 2–50 Zeichen haben
- ID und Name müssen eindeutig sein

**Antwort (201):**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Alle Tags abrufen

```
GET /api/admin/tags/all
```

Gibt alle Tags aus dem Content-Cache für eine bestimmte Locale zurück. Geeignet für Tag-Selektoren in der Admin-UI.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| --------- | ------ | ------- | ------------------------------- |
| `locale` | string | `"en"` | Locale-Code für den Content-Abruf |

---

## Einzelnes Tag abrufen

```
GET /api/admin/tags/{id}
```

Gibt vollständige Details für ein einzelnes Tag zurück, einschließlich Nutzungsstatistiken.

---

## Tag aktualisieren

```
PUT /api/admin/tags/{id}
```

Aktualisiert Name und/oder Aktivstatus eines Tags. Die Tag-ID kann nach der Erstellung nicht mehr geändert werden. Invalidiert den Inhalts-Cache.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| --------- | ------- | -------- | --------------------------- |
| `name` | string | Ja | Aktualisierter Anzeigename |
| `isActive` | boolean | Nein | Aktualisierter Aktivstatus |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

---

## Tag löschen

```
DELETE /api/admin/tags/{id}
```

Löscht ein Tag permanent und entfernt alle zugehörigen Element-Tag-Verknüpfungen.

:::caution
Tag-Löschungen sind permanent und können nicht rückgängig gemacht werden. Erwägen Sie stattdessen, das Tag zu deaktivieren (`isActive: false`), um die Datenintegrität zu wahren.
:::

---

## Tag-Datenmodell

| Feld | Typ | Nullable | Beschreibung |
| ------------ | -------- | -------- | ----------------------------------------- |
| `id` | string | Nein | URL-freundlicher eindeutiger Bezeichner |
| `name` | string | Nein | Lesbarer Anzeigename |
| `isActive` | boolean | Nein | Ob das Tag Einträgen zugewiesen werden kann |
| `itemCount` | integer | Nein | Anzahl der Einträge, die dieses Tag verwenden |
| `created_at` | datetime | Nein | Erstellungszeitstempel |
| `updated_at` | datetime | Nein | Letzter Aktualisierungszeitstempel |

## Fehlercodes

| Status | Fehler | Ursache |
| ------ | ----------------------------------------- | --------------------------------------- |
| `400` | Tag ID and name are required | Fehlende Pflichtfelder beim Erstellen |
| `400` | Tag name must be between 2 and 50 characters | Längenfehler beim Namen |
| `401` | Unauthorized | Fehlende oder keine Admin-Sitzung |
| `404` | Tag not found | Kein Tag mit der angegebenen ID |
| `409` | Tag with ID already exists | Doppelte ID beim Erstellen |
| `409` | Tag with name already exists | Doppelter Name beim Erstellen/Aktualisieren |
| `500` | Failed to fetch/create/update/delete tag | Server- oder Datenbankfehler |

## Cache-Invalidierung

Alle Schreiboperationen rufen `invalidateContentCaches()` auf:

```typescript
await invalidateContentCaches();
```

## Datenquellen

| Endpunkt | Datenquelle | Anwendungsfall |
| ----------------------------- | ----------------------- | ---------------------------------------- |
| `GET /api/admin/tags` | `tagRepository` (DB) | Admin-Verwaltung mit Paginierung |
| `GET /api/admin/tags/all` | `getCachedItems()` | Dropdown-Selektoren, schnelle Suche |
| `GET/PUT/DELETE /tags/{id}` | `tagRepository` (DB) | Einzelne Tag-Operationen |

## Verwandte Dokumentation

- [Admin Endpunkte Übersicht](./admin-endpoints.md)
- [Admin Kategorien Endpunkte](./admin-categories-endpoints.md) – Ähnliches Muster für Kategorieverwaltung

See the [English documentation](/api/admin-tags-endpoints) for the full content of this section.
