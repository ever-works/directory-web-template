---
id: admin-users-endpoints
title: "Admin Users API Endpoints"
sidebar_label: "Admin Users API Endpoints"
---

# Admin Benutzer API Endpunkte

Die Benutzer API stellt Endpunkte für die Verwaltung von Benutzerkonten bereit, einschließlich Erstellung, Aktualisierung, Statusänderungen, Rollenzuweisung und Validierungshilfsfunktionen. Alle Endpunkte erfordern Admin-Authentifizierung.

## Basispfad

```
/api/admin/users
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ------------------------------------------ | -------- | ------------------------------------- |
| `GET` | `/api/admin/users` | Admin | Paginierte Benutzerliste abrufen |
| `POST` | `/api/admin/users` | Admin | Neuen Benutzer erstellen |
| `GET` | `/api/admin/users/stats` | Admin | Benutzerstatistiken abrufen |
| `POST` | `/api/admin/users/check-email` | Admin | E-Mail-Verfügbarkeit prüfen |
| `POST` | `/api/admin/users/check-username` | Admin | Benutzernamen-Verfügbarkeit prüfen |
| `GET` | `/api/admin/users/{id}` | Admin | Benutzer nach ID abrufen |
| `PUT` | `/api/admin/users/{id}` | Admin | Benutzer aktualisieren |
| `DELETE` | `/api/admin/users/{id}` | Admin | Benutzer löschen |

---

## Benutzer auflisten

```
GET /api/admin/users
```

Gibt eine paginierte Benutzerliste mit Suche, Filterung und Sortierung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ----------------- | ------- | -------- | --------------------------------------------------------- |
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |
| `search` | string | – | Suche nach Name, E-Mail oder Benutzername (max. 100 Zeichen) |
| `role` | string | – | Filter nach Rollen-ID (max. 50 Zeichen) |
| `status` | string | – | Filter: `active` oder `inactive` |
| `sortBy` | string | `name` | Sortierfeld: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder` | string | `asc` | Sortierrichtung: `asc` oder `desc` |
| `includeInactive` | boolean | `false` | Inaktive Benutzer einschließen |

**Antwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Benutzer erstellen

```
POST /api/admin/users
```

Erstellt einen neuen Benutzer mit umfassender Validierung. Die Rolle muss im System existieren (gegen die Rollentabelle validiert).

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ---------- | ------ | -------- | ------------------------------------------------------- |
| `username` | string | Ja | 3–30 Zeichen, alphanumerisch plus `-` und `_` |
| `email` | string | Ja | Gültiges E-Mail-Format |
| `name` | string | Ja | Vollständiger Name (2–100 Zeichen) |
| `password` | string | Ja | Mindestens 8 Zeichen (Zod `passwordSchema`) |
| `role` | string | Ja | Muss eine existierende Rollen-ID referenzieren |
| `title` | string | Nein | Berufsbezeichnung (max. 100 Zeichen) |
| `avatar` | string | Nein | Avatar-URL (max. 500 Zeichen) |

**Antwort (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Benutzerstatistiken abrufen

```
GET /api/admin/users/stats
```

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": { "admin": 5, "moderator": 23, "user": 1219 }
  }
}
```

---

## E-Mail-Verfügbarkeit prüfen

```
POST /api/admin/users/check-email
```

Prüft, ob eine E-Mail-Adresse bereits verwendet wird. Der Parameter `excludeId` schließt den aktuellen Benutzer bei Update-Szenarien aus.

```json
{ "email": "john.doe@example.com", "excludeId": "user_123abc" }
```

**Antwort:** `{ "available": true, "exists": false }`

---

## Benutzernamen-Verfügbarkeit prüfen

```
POST /api/admin/users/check-username
```

Prüft, ob ein Benutzername bereits verwendet wird. Gleiches `excludeId`-Muster wie die E-Mail-Prüfung.

```json
{ "username": "johndoe", "excludeId": "user_123abc" }
```

**Antwort:** `{ "available": false, "exists": true }`

---

## Benutzer abrufen / aktualisieren / löschen

### Benutzer abrufen

```
GET /api/admin/users/{id}
```

Gibt vollständige Profilinformationen für einen einzelnen Benutzer zurück.

### Benutzer aktualisieren

```
PUT /api/admin/users/{id}
```

Partielle Aktualisierung – nur angegebene Felder werden geändert. Validiert E-Mail-Format, Benutzernamen-Länge (3–50), Namenslänge (2–100) und ob die angegebene Rolle existiert.

**Anfragekörper (alle Felder optional):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "role": "moderator",
  "status": "active"
}
```

### Benutzer löschen

```
DELETE /api/admin/users/{id}
```

Löscht einen Benutzer permanent. Enthält Selbstlöschungsschutz: Ein Admin kann sein eigenes Konto nicht löschen.

---

## Validierungsregeln

| Feld | Regel |
| ---------- | ----------------------------------------------------------------------- |
| `username` | 3–30 Zeichen, Regex `^[a-zA-Z0-9_-]{3,30}$` (Erstellen), 3–50 (Update) |
| `email` | Gültiges E-Mail-Format über `isValidEmail` |
| `name` | 2–100 Zeichen |
| `password` | Mindestens 8 Zeichen (Zod `passwordSchema`) |
| `role` | Muss eine existierende Rolle in der Datenbank referenzieren |
| `status` | Muss `active` oder `inactive` sein |
| `title` | Maximal 100 Zeichen |
| `avatar` | Maximal 500 Zeichen |

## Fehlercodes

| Status | Bedeutung |
| ------ | -------------------------------------------------------- |
| `400` | Validierungsfehler, Selbstlöschung, doppelte E-Mail/Benutzername |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Benutzer nicht gefunden |
| `500` | Interner Serverfehler |

## Verwandte Dokumentation

- [Admin Rollen API](./admin-roles-endpoints.md) – Rollen verwalten und zuweisen
- [Authentifizierung](../architecture/nextauth-configuration.md) – Sitzungsverwaltung und Schutzmechanismen
- [Admin Clients API](./admin-clients-endpoints.md) – Client-Profilverwaltung

See the [English documentation](/api/admin-users-endpoints) for the full content of this section.
