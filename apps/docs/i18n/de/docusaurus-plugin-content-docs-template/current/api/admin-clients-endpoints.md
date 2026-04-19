---
id: admin-clients-endpoints
title: "Admin Clients API Endpoints"
sidebar_label: "Admin Clients API Endpoints"
---

# Admin Clients API Endpunkte

Die Clients API stellt Endpunkte für die Verwaltung von Client-Profilen bereit, einschließlich Erstellung, Aktualisierungen, erweiterter Suche, Massenoperationen, Dashboard-Analysen und umfassender Statistiken. Clients stellen Endbenutzerprofile dar, die mit Authentifizierungskonten verknüpft sind. Alle Endpunkte erfordern Admin-Authentifizierung.

## Basispfad

```
/api/admin/clients
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ------- | ----- | ------------------------------------ |
| `GET` | `/api/admin/clients` | Admin | Paginierte Client-Liste abrufen |
| `POST` | `/api/admin/clients` | Admin | Neues Client-Profil erstellen |
| `GET` | `/api/admin/clients/stats` | Admin | Umfassende Client-Statistiken abrufen |
| `GET` | `/api/admin/clients/dashboard` | Admin | Kombinierte Dashboard-Daten abrufen |
| `GET` | `/api/admin/clients/advanced-search` | Admin | Erweiterte Mehrfachfilter-Suche |
| `PUT` | `/api/admin/clients/bulk` | Admin | Client-Profile in Massen aktualisieren |
| `DELETE` | `/api/admin/clients/bulk` | Admin | Client-Profile in Massen löschen |
| `GET` | `/api/admin/clients/{clientId}` | Admin | Client nach ID abrufen |
| `PUT` | `/api/admin/clients/{clientId}` | Admin | Client-Profil aktualisieren |
| `DELETE` | `/api/admin/clients/{clientId}` | Admin | Client-Profil löschen |

---

## Clients auflisten

```
GET /api/admin/clients
```

Gibt eine paginierte Liste von Client-Profilen mit grundlegender Filterung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |
| `search` | string | – | Suche nach Name oder E-Mail |
| `status` | string | – | Filter: `active`, `inactive`, `suspended`, `trial` |
| `plan` | string | – | Filter: `free`, `standard`, `premium` |
| `accountType` | string | – | Filter: `individual`, `business`, `enterprise` |
| `provider` | string | – | Filter nach Authentifizierungsanbieter |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Client erstellen

```
POST /api/admin/clients
```

Erstellt ein neues Client-Profil. Wenn kein Benutzerkonto für die angegebene E-Mail existiert, wird automatisch ein neuer Benutzer mit einem temporären Passwort erstellt. Löst CRM-Synchronisierung aus, wenn aktiviert.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ---------------- | ------- | -------- | -------------------------------------------- |
| `email` | string | Ja | Client-E-Mail-Adresse |
| `displayName` | string | Nein | Anzeigename (Standard: E-Mail-Präfix) |
| `username` | string | Nein | Eindeutiger Benutzername |
| `bio` | string | Nein | Client-Biografie |
| `jobTitle` | string | Nein | Berufsbezeichnung |
| `company` | string | Nein | Firmenname |
| `industry` | string | Nein | Branche |
| `phone` | string | Nein | Telefonnummer |
| `website` | string | Nein | Website-URL |
| `location` | string | Nein | Standort |
| `accountType` | string | Nein | `individual` (Standard), `business`, `enterprise` |
| `status` | string | Nein | `active` (Standard), `inactive`, `suspended`, `trial` |
| `plan` | string | Nein | `free` (Standard), `standard`, `premium` |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Client-Statistiken abrufen

```
GET /api/admin/clients/stats
```

Gibt umfassende Analysen über alle Clients zurück, gruppiert nach Übersicht, Wachstum, Plänen, Kontotypen, Engagement, Demografie und Authentifizierungsanbietern.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Dashboard

```
GET /api/admin/clients/dashboard
```

Gibt eine kombinierte Antwort mit einer paginierten Client-Liste, aggregierten Statistiken und Paginierungsmetadaten zurück. Unterstützt alle grundlegenden Filter sowie Datumsbereichsparameter.

---

## Massenoperationen

### Massenaktualisierung

```
PUT /api/admin/clients/bulk
```

Aktualisiert mehrere Client-Profile in einer einzigen Anfrage. Jedes Client-Objekt muss ein `id`-Feld sowie die zu aktualisierenden Felder enthalten. Einzelne Fehler brechen die gesamte Stapelverarbeitung nicht ab.

**Anfragekörper:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Massenlöschung

```
DELETE /api/admin/clients/bulk
```

Löscht mehrere Client-Profile dauerhaft. Jedes Objekt im Array muss ein `id`-Feld enthalten.

**Anfragekörper:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Antwort (200) – beide Massen-Endpunkte:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Client abrufen / aktualisieren / löschen

### Client abrufen

```
GET /api/admin/clients/{clientId}
```

Gibt das vollständige Client-Profil zurück, einschließlich Anzeigename, Unternehmen, Plan, Kontotyp und Aktivitäts-Zeitstempel.

### Client aktualisieren

```
PUT /api/admin/clients/{clientId}
```

Partielle Aktualisierung – nur angegebene Felder werden geändert. Löst CRM-Synchronisierung aus, wenn Unternehmens- oder Profildaten geändert werden.

**Anfragekörper (alle Felder optional):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Client löschen

```
DELETE /api/admin/clients/{clientId}
```

Löscht ein Client-Profil dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.

**Antwort (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Validierungsregeln

| Feld | Regel |
| ------------- | ---------------------------------------------------------- |
| `email` | Erforderlich für die Erstellung; gültiges E-Mail-Format |
| `status` | Muss `active`, `inactive`, `suspended` oder `trial` sein |
| `plan` | Muss `free`, `standard` oder `premium` sein |
| `accountType` | Muss `individual`, `business` oder `enterprise` sein |
| `clients` | Masse: nicht leeres Array mit `id` bei jedem Objekt erforderlich |

## Fehlercodes

| Status | Bedeutung |
| ------ | ------------------------------------------------------ |
| `400` | Validierungsfehler, fehlende E-Mail, Benutzererstellung fehlgeschlagen |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Client nicht gefunden |
| `500` | Interner Serverfehler |

## Verwandte Dokumentation

- [Admin Users API](./admin-users-endpoints.md) – Benutzerkontenverwaltung
- [Admin Roles API](./admin-roles-endpoints.md) – Rollen- und Berechtigungsverwaltung
- [Authentifizierung](../architecture/nextauth-configuration.md) – Sitzungsverwaltung und Schutzmaßnahmen

See the [English documentation](/api/admin-clients-endpoints) for the full content of this section.
