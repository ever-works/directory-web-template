---
id: client-api-endpoints
title: "Client API Endpoints"
sidebar_label: "Client API Endpoints"
---

# Client API Endpunkte

Die Client API stellt authentifizierte Endpunkte für registrierte Benutzer bereit, um eingereichte Einträge zu verwalten, Dashboard-Statistiken anzuzeigen und geografische Daten abzurufen. Alle Endpunkte erfordern eine sitzungsbasierte Authentifizierung.

**Quellverzeichnis:** `template/app/api/client/`

---

## Authentifizierung

Jeder Endpunkt in dieser Gruppe erfordert eine gültige Benutzersitzung. Nicht-authentifizierte Anfragen erhalten:

```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Dashboard-Statistiken

### Dashboard-Statistiken abrufen

```
GET /api/client/dashboard/stats
```

Gibt umfassende Dashboard-Statistiken für den authentifizierten Benutzer zurück.

**Antwort (200):**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "statusBreakdown": [
    { "status": "Approved", "value": 15 },
    { "status": "Pending", "value": 5 },
    { "status": "Rejected", "value": 3 }
  ]
}
```

### Geografische Statistiken abrufen

```
GET /api/client/geo-stats
```

Gibt geografische Abdeckungsstatistiken für die Einträge des authentifizierten Benutzers zurück.

### Eintrags-Koordinaten abrufen

```
GET /api/client/items/coordinates
```

Gibt Koordinaten für alle Benutzereinträge mit Standortdaten zurück, geeignet für Kartenrendering.

---

## Eintrags-Verwaltung

### Benutzereinträge auflisten

```
GET /api/client/items
```

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ----------- | ------- | ------- | --------------------------------------------------- |
| `page` | integer | `1` | Seitennummer (min: 1) |
| `limit` | integer | `10` | Einträge pro Seite (1–100) |
| `status` | string | – | Filter: `all`, `pending`, `approved`, `rejected` |
| `search` | string | – | Suche nach Name oder Beschreibung |
| `deleted` | boolean | `false` | `true` für weich gelöschte Einträge |

### Eintrag erstellen

```
POST /api/client/items
```

Erstellt eine neue Einreichung. Status wird auf `pending` für Admin-Review gesetzt.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| -------------- | ------------------- | -------- | ------------------------------ |
| `name` | string | Ja | Eintragsname (3–100 Zeichen) |
| `description` | string | Ja | Beschreibung (10–500 Zeichen) |
| `source_url` | string (URI) | Ja | Haupt-URL des Eintrags |
| `category` | string \| string[] | Nein | Kategoriename oder -array |
| `tags` | string[] | Nein | Tag-Array |
| `icon_url` | string (URI) | Nein | URL zum Eintragssymbol |

**Antwort (201):**

```json
{
  "success": true,
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

### Einzelnen Eintrag abrufen / aktualisieren / löschen

- `GET /api/client/items/{id}` – Eintragsdetails abrufen
- `PUT /api/client/items/{id}` – Eintrag aktualisieren (wenn zuvor genehmigt, wird Status auf `pending` zurückgesetzt)
- `DELETE /api/client/items/{id}` – Weiche Löschung
- `POST /api/client/items/{id}/restore` – Weich gelöschten Eintrag wiederherstellen

### Einreichungsstatistiken abrufen

```
GET /api/client/items/stats
```

**Antwort (200):**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

---

## Fehlermuster

Alle Client-API-Endpunkte folgen einem einheitlichen Fehlermuster:

```json
{
  "success": false,
  "error": "Lesbare Fehlermeldung"
}
```

Fehlerantworten verwenden das Hilfsprogramm `serverErrorResponse()`, das detaillierte Fehlerinformationen serverseitig protokolliert und nur eine generische Meldung an den Client zurückgibt.

See the [English documentation](/api/client-api-endpoints) for the full content of this section.
