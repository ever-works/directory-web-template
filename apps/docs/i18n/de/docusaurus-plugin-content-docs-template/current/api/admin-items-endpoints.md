---
id: admin-items-endpoints
title: "Admin Items API Endpoints"
sidebar_label: "Admin Items API Endpoints"
---

# Admin Elemente API Endpunkte

Die Elemente API stellt Endpunkte für die Verwaltung von Verzeichniseinträgen bereit, einschließlich Erstellung, Aktualisierungen, Review-Workflows (genehmigen/ablehnen), Prüfverlauf, Massenoperationen und Statistiken. Elemente durchlaufen einen Lebenszyklus mit den Status `draft`, `pending`, `approved` und `rejected`. Alle Endpunkte erfordern Admin-Authentifizierung.

## Basispfad

```
/api/admin/items
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ------------------------------------- | ----- | ------------------------------------ |
| `GET` | `/api/admin/items` | Admin | Paginierte Elementliste abrufen |
| `POST` | `/api/admin/items` | Admin | Neues Element erstellen |
| `GET` | `/api/admin/items/stats` | Admin | Elementstatistiken abrufen |
| `POST` | `/api/admin/items/bulk` | Admin | Massen-Genehmigung, -Ablehnung oder -Löschung |
| `GET` | `/api/admin/items/{id}` | Admin | Element nach ID abrufen |
| `PUT` | `/api/admin/items/{id}` | Admin | Element aktualisieren |
| `DELETE` | `/api/admin/items/{id}` | Admin | Element dauerhaft löschen |
| `POST` | `/api/admin/items/{id}/review` | Admin | Element genehmigen oder ablehnen |
| `GET` | `/api/admin/items/{id}/history` | Admin | Element-Prüfverlauf abrufen |

---

## Elemente auflisten

```
GET /api/admin/items
```

Gibt eine paginierte Liste von Elementen mit Suche, Filterung nach Status/Kategorie/Tags und Sortierung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |
| `search` | string | – | Elemente nach Name oder Beschreibung suchen |
| `status` | string | – | Filter: `draft`, `pending`, `approved`, `rejected` |
| `categories` | string | – | Kommagetrennte Kategorie-Slugs |
| `tags` | string | – | Kommagetrennte Tag-Slugs |
| `sortBy` | string | `updated_at` | Sortierfeld: `name`, `updated_at`, `status`, `submitted_at` |
| `sortOrder` | string | `desc` | Sortierrichtung: `asc` oder `desc` |

**Antwort (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Element erstellen

```
POST /api/admin/items
```

Erstellt ein neues Element mit Duplikatprüfungen für ID und Slug. Löst CRM-Synchronisierung (wenn aktiviert) und Standortindizierung (wenn aktiviert) aus.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `id` | string | Ja | Eindeutige Element-Kennung |
| `name` | string | Ja | Elementname |
| `slug` | string | Ja | URL-freundlicher Slug (muss eindeutig sein) |
| `description` | string | Ja | Element-Beschreibung |
| `source_url` | string | Ja | Quell-URL des Elements |
| `category` | string[] | Nein | Array von Kategorie-Slugs |
| `tags` | string[] | Nein | Array von Tag-Slugs |
| `brand` | string | Nein | Markenname (für CRM-Unternehmenssync verwendet) |
| `featured` | boolean | Nein | Hervorgehobenes Flag (Standard: `false`) |
| `icon_url` | string | Nein | Icon-URL |
| `status` | string | Nein | Anfangsstatus (Standard: `draft`) |
| `location` | object | Nein | Standortdaten für Geo-Indizierung |

**Antwort (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Elementstatistiken abrufen

```
GET /api/admin/items/stats
```

Gibt Zählungen nach Status zurück. Unterstützt optionale Filter zur Einschränkung der Statistiken.

**Abfrageparameter:**

| Parameter | Typ | Beschreibung |
| ------------ | ------ | ---------------------------------- |
| `search` | string | Statistiken nach Suchbegriff filtern |
| `categories` | string | Kommagetrennte Kategorie-Slugs |
| `tags` | string | Kommagetrennte Tag-Slugs |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Massenaktionen

```
POST /api/admin/items/bulk
```

Führt Massen-Genehmigung, -Ablehnung oder -Löschung für bis zu 100 Elemente durch. Jedes Element wird einzeln verarbeitet; Teilfehler brechen die gesamte Operation nicht ab. Sendet E-Mail-Benachrichtigungen an Einreicher bei Genehmigung/Ablehnung.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| -------- | -------- | ------------------ | ---------------------------------------------------- |
| `action` | string | Ja | `approve`, `reject` oder `delete` |
| `ids` | string[] | Ja | Zu verarbeitende Element-IDs (1–100, keine Duplikate) |
| `reason` | string | Ja (für `reject`) | Ablehnungsgrund (mindestens 10 Zeichen) |

**Antwort (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Element abrufen / aktualisieren / löschen

### Element abrufen

```
GET /api/admin/items/{id}
```

Gibt vollständige Elementdetails zurück, einschließlich Metadaten, Kategorien, Tags, Review-Notizen und Engagement-Metriken.

### Element aktualisieren

```
PUT /api/admin/items/{id}
```

Partielle Aktualisierung – nur angegebene Felder werden geändert. Löst CRM-Synchronisierung aus, wenn `brand` angegeben wird, und Standort-Re-Indizierung, wenn Standortdaten geändert werden.

**Anfragekörper (alle Felder optional):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Element löschen

```
DELETE /api/admin/items/{id}
```

Löscht ein Element dauerhaft und entfernt es aus dem Standortindex (wenn aktiviert). Diese Aktion kann nicht rückgängig gemacht werden.

**Antwort (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Element reviewen

```
POST /api/admin/items/{id}/review
```

Genehmigt oder lehnt ein Element ab. Zeichnet die Review-Entscheidung mit optionalen Notizen auf. Sendet eine E-Mail-Benachrichtigung an den ursprünglichen Einreicher (wenn der Einreicher ein registrierter Benutzer ist).

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| -------------- | ------ | -------- | ------------------------------------ |
| `status` | string | Ja | `approved` oder `rejected` |
| `review_notes` | string | Nein | Erklärung der Review-Entscheidung |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Element-Prüfverlauf abrufen

```
GET /api/admin/items/{id}/history
```

Gibt den vollständigen Prüfpfad für ein Element zurück, einschließlich Erstellung, Aktualisierungen, Statusänderungen, Reviews, Löschungen und Wiederherstellungen.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page` | integer | `1` | Seitennummer |
| `limit` | integer | `20` | Ergebnisse pro Seite (max. 100) |
| `action` | string | – | Kommagetrennte Filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Validierungsregeln

| Feld | Regel |
| ------------ | ---------------------------------------------------------- |
| `id` | Erforderlich; muss über alle Elemente eindeutig sein |
| `name` | Erforderlich für die Erstellung |
| `slug` | Erforderlich; muss über alle Elemente eindeutig sein |
| `description` | Erforderlich für die Erstellung |
| `source_url` | Erforderlich für die Erstellung; gültiges URL-Format |
| `status` | Muss `draft`, `pending`, `approved` oder `rejected` sein |
| `reason` | Erforderlich für Massenablehnung; mindestens 10 Zeichen |
| `ids` | Masse: 1–100 nicht leere eindeutige Strings |
| `action` | Verlaufsfilter: nur gültige Prüfaktionstypen |

## Fehlercodes

| Status | Bedeutung |
| ------ | -------------------------------------------------------- |
| `400` | Validierungsfehler, ungültige Parameter, fehlende Felder |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Element nicht gefunden |
| `409` | Doppelte Element-ID oder Slug |
| `500` | Interner Serverfehler |

## Verwandte Dokumentation

- [Admin Roles API](./admin-roles-endpoints.md) – Rollen verwalten, die Benutzern zugewiesen sind
- [Admin Users API](./admin-users-endpoints.md) – Benutzerkontenverwaltung
- [Authentifizierung](../architecture/nextauth-configuration.md) – Sitzungsverwaltung und Schutzmaßnahmen

See the [English documentation](/api/admin-items-endpoints) for the full content of this section.
