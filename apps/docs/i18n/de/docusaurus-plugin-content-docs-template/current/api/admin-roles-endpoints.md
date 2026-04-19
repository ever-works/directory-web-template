---
id: admin-roles-endpoints
title: "Admin Roles API Endpoints"
sidebar_label: "Admin Roles API Endpoints"
---

# Admin Rollen API Endpunkte

Die Rollen API stellt Endpunkte für die Verwaltung von Benutzerrollen und deren zugehörigen Berechtigungen bereit. Rollen steuern die Zugriffsebenen in der gesamten Anwendung und können Benutzern über die [Admin Users API](./admin-users-endpoints.md) zugewiesen werden.

## Basispfad

```
/api/admin/roles
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | --------------------------------- | -------- | ------------------------------------ |
| `GET` | `/api/admin/roles` | Admin | Paginierte Rollenliste abrufen |
| `POST` | `/api/admin/roles` | Admin | Neue Rolle erstellen |
| `GET` | `/api/admin/roles/active` | Öffentlich | Alle aktiven Rollen abrufen |
| `GET` | `/api/admin/roles/stats` | Admin | Rollenstatistiken abrufen |
| `GET` | `/api/admin/roles/{id}` | Admin | Einzelne Rolle nach ID abrufen |
| `PUT` | `/api/admin/roles/{id}` | Admin | Rolle aktualisieren |
| `DELETE` | `/api/admin/roles/{id}` | Admin | Rolle löschen (weich oder hart) |
| `GET` | `/api/admin/roles/{id}/permissions` | Admin | Berechtigungen für eine Rolle abrufen |
| `PUT` | `/api/admin/roles/{id}/permissions` | Admin | Berechtigungen für eine Rolle aktualisieren |

---

## Rollen auflisten

```
GET /api/admin/roles
```

Gibt eine paginierte Liste von Rollen mit optionaler Filterung und Sortierung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ----------- | ------- | -------- | --------------------------------------------- |
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |
| `status` | string | – | Filter nach `active` oder `inactive` |
| `sortBy` | string | `name` | Sortierfeld: `name`, `id`, `created_at` |
| `sortOrder` | string | `asc` | Sortierrichtung: `asc` oder `desc` |

**Antwort (200):**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## Rolle erstellen

```
POST /api/admin/roles
```

Erstellt eine neue Rolle. Die Rollen-ID wird automatisch aus dem Namen generiert, indem normalisiert, Diakritika entfernt und in einen URL-sicheren Slug umgewandelt wird (max. 64 Zeichen). Doppelte Namen (einschließlich weich gelöschter Datensätze) werden abgelehnt.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ------------- | ------- | -------- | ---------------------------------- |
| `name` | string | Ja | Rollenname (3–100 Zeichen) |
| `description` | string | Ja | Rollenbeschreibung (max. 500 Zeichen) |
| `status` | string | Nein | `active` (Standard) oder `inactive` |
| `isAdmin` | boolean | Nein | Admin-Rechte-Flag (Standard: `false`) |

**Beispiel:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Antwort (201):**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Aktive Rollen abrufen

```
GET /api/admin/roles/active
```

Gibt alle Rollen mit `active`-Status zurück. Wird häufig verwendet, um Rollen-Dropdowns in Benutzerverwaltungsformularen zu befüllen. Keine Authentifizierung erforderlich.

**Antwort (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [] }
  ]
}
```

---

## Rollenstatistiken abrufen

```
GET /api/admin/roles/stats
```

Gibt aggregierte Statistiken über Rollen zurück. Erfordert Admin-Sitzung.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Rolle abrufen / aktualisieren / löschen

### Rolle abrufen

```
GET /api/admin/roles/{id}
```

Gibt vollständige Details für eine einzelne Rolle zurück, einschließlich Berechtigungen, Status und Zeitstempel.

### Rolle aktualisieren

```
PUT /api/admin/roles/{id}
```

Partielle Aktualisierung – nur angegebene Felder werden geändert. Validiert Namelänge (3–100) und Beschreibungslänge (max. 500).

**Anfragekörper (alle Felder optional):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Rolle löschen

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parameter | Typ | Standard | Beschreibung |
| --------- | ------ | ------- | ---------------------------------------- |
| `hard` | string | `false` | `true` für permanente Entfernung, `false` für weiche Löschung (markiert als inaktiv) |

---

## Rollenberechtigungen

### Berechtigungen abrufen

```
GET /api/admin/roles/{id}/permissions
```

Gibt das Berechtigungsarray und grundlegende Rollenmetadaten zurück.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Berechtigungen aktualisieren

```
PUT /api/admin/roles/{id}/permissions
```

Ersetzt das gesamte Berechtigungsarray. Jeder Berechtigungs-String wird gegen die System-Berechtigungsdefinitionen validiert. Ungültige Berechtigungen werden in der Fehlerantwort zurückgegeben.

**Anfragekörper:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Validierungsregeln

| Feld | Regel |
| ------------- | ------------------------------------------------------- |
| `name` | 3–100 Zeichen; wird verwendet, um eine eindeutige Slug-ID abzuleiten |
| `description` | Maximal 500 Zeichen |
| `status` | Muss `active` oder `inactive` sein |
| `permissions` | Array von Strings; jeder muss eine gültige Systemberechtigung sein |

## Fehlercodes

| Status | Bedeutung |
| ------ | ------------------------------------------------ |
| `400` | Validierungsfehler (ungültige Parameter, fehlende Felder) |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Rolle nicht gefunden |
| `409` | Doppelter Rollenname / ID-Konflikt |
| `500` | Interner Serverfehler |

## Verwandte Dokumentation

- [Admin Users API](./admin-users-endpoints.md) – Rollen Benutzern zuweisen
- [Authentifizierung](../architecture/nextauth-configuration.md) – Sitzungs- und Admin-Schutzdetails
- [Berechtigungssystem](../architecture/permissions-system.md) – Berechtigungsdefinitionen und Validierung

See the [English documentation](/api/admin-roles-endpoints) for the full content of this section.
