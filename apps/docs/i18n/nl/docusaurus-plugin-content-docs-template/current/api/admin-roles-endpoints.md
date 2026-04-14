---
id: admin-roles-endpoints
title: "Admin Roles API Endpoints"
sidebar_label: "Admin Roles API Endpoints"
---

# Admin Rollen API Eindpunten

De Rollen API biedt eindpunten voor het beheren van gebruikersrollen en bijbehorende rechten. Rollen bepalen toegangsniveaus in de gehele applicatie en kunnen aan gebruikers worden toegewezen via de [Admin Gebruikers API](./admin-users-endpoints.md).

## Basispad

```
/api/admin/roles
```

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
| -------- | --------------------------------- | -------- | ------------------------------------ |
| `GET` | `/api/admin/roles` | Admin | Gepagineerde rollenlijst ophalen |
| `POST` | `/api/admin/roles` | Admin | Een nieuwe rol aanmaken |
| `GET` | `/api/admin/roles/active` | Openbaar | Alle actieve rollen ophalen |
| `GET` | `/api/admin/roles/stats` | Admin | Rolstatistieken ophalen |
| `GET` | `/api/admin/roles/{id}` | Admin | Een enkele rol ophalen op ID |
| `PUT` | `/api/admin/roles/{id}` | Admin | Een rol bijwerken |
| `DELETE` | `/api/admin/roles/{id}` | Admin | Een rol verwijderen (zacht of hard) |
| `GET` | `/api/admin/roles/{id}/permissions` | Admin | Rechten voor een rol ophalen |
| `PUT` | `/api/admin/roles/{id}/permissions` | Admin | Rechten voor een rol bijwerken |

---

## Rollen Weergeven

```
GET /api/admin/roles
```

Geeft een gepagineerde lijst van rollen terug met optionele filtering en sortering.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
| ----------- | ------- | -------- | --------------------------------------------- |
| `page` | integer | `1` | Paginanummer (minimaal: 1) |
| `limit` | integer | `10` | Resultaten per pagina (1–100) |
| `status` | string | — | Filteren op `active` of `inactive` |
| `sortBy` | string | `name` | Sorteerveld: `name`, `id`, `created_at` |
| `sortOrder` | string | `asc` | Sorteerrichting: `asc` of `desc` |

**Antwoord (200):**

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

## Rol Aanmaken

```
POST /api/admin/roles
```

Maakt een nieuwe rol aan. Het rol-ID wordt automatisch gegenereerd uit de naam door normalisatie, verwijdering van diakritische tekens en conversie naar een URL-veilige slug (max 64 tekens). Dubbele namen (inclusief zacht verwijderde records) worden geweigerd.

**Verzoeklichaam:**

| Veld | Type | Vereist | Beschrijving |
| ------------- | ------- | -------- | ---------------------------------- |
| `name` | string | Ja | Rolnaam (3–100 tekens) |
| `description` | string | Ja | Rolbeschrijving (max 500 tekens) |
| `status` | string | Nee | `active` (standaard) of `inactive` |
| `isAdmin` | boolean | Nee | Beheerdersrechtenvlag (standaard: `false`) |

**Voorbeeld:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**Antwoord (201):**

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

## Actieve Rollen Ophalen

```
GET /api/admin/roles/active
```

Geeft alle rollen met `active`-status terug. Wordt vaak gebruikt voor het vullen van roldropdowns in gebruikersbeheerformulieren. Geen authenticatie vereist.

**Antwoord (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [...] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [...] }
  ]
}
```

---

## Rolstatistieken Ophalen

```
GET /api/admin/roles/stats
```

Geeft geaggregeerde statistieken over rollen terug. Vereist beheerdersessie.

**Antwoord (200):**

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

## Rol Ophalen / Bijwerken / Verwijderen

### Rol Ophalen

```
GET /api/admin/roles/{id}
```

Geeft volledige details voor een enkele rol terug inclusief rechten, status en tijdstempels.

### Rol Bijwerken

```
PUT /api/admin/roles/{id}
```

Gedeeltelijke update — alleen opgegeven velden worden gewijzigd. Valideert naamlengte (3–100) en beschrijvingslengte (max 500).

**Verzoeklichaam (alle velden optioneel):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Rol Verwijderen

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parameter | Type | Standaard | Beschrijving |
| --------- | ------ | ------- | ---------------------------------------- |
| `hard` | string | `false` | `true` voor permanente verwijdering, `false` voor zachte verwijdering (markeert inactief) |

---

## Rolrechten

### Rechten Ophalen

```
GET /api/admin/roles/{id}/permissions
```

Geeft de rechtenarray en basisrolmetadata terug.

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### Rechten Bijwerken

```
PUT /api/admin/roles/{id}/permissions
```

Vervangt de gehele rechtenarray. Elke rechtenstring wordt gevalideerd tegen de systeemrechtendefinities. Ongeldige rechten worden geretourneerd in het foutantwoord.

**Verzoeklichaam:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Validatieregels

| Veld | Regel |
| ------------- | ------------------------------------------------------- |
| `name` | 3–100 tekens; gebruikt om een unieke slug-ID af te leiden |
| `description` | Maximaal 500 tekens |
| `status` | Moet `active` of `inactive` zijn |
| `permissions` | Array van strings; elk moet een geldig systeemrecht zijn |

## Foutcodes

| Status | Betekenis |
| ------ | ------------------------------------------------ |
| `400` | Validatiefout (ongeldige parameters, ontbrekende velden) |
| `401` | Authenticatie vereist |
| `403` | Beheerdersrechten vereist |
| `404` | Rol niet gevonden |
| `409` | Dubbele rolnaam / ID-conflict |
| `500` | Interne serverfout |

## Gerelateerde Documentatie

- [Admin Gebruikers API](./admin-users-endpoints.md) — rollen toewijzen aan gebruikers
- [Authenticatie](../architecture/nextauth-configuration.md) — sessie- en beheerdersbeveiligingsdetails
- [Rechtensysteem](../architecture/permissions-system.md) — rechtendefinities en validatie
