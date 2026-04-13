---
id: admin-users-endpoints
title: "Admin Users API Endpoints"
sidebar_label: "Admin Users API Endpoints"
---

# Admin Gebruikers API Eindpunten

De Gebruikers API biedt eindpunten voor het beheren van gebruikersaccounts inclusief aanmaken, bijwerken, statuswijzigingen, roltoewijzing en validatiehulpprogramma's. Alle eindpunten vereisen admin-authenticatie tenzij anders vermeld.

## Basispad

```
/api/admin/users
```

## Routeoverzicht

| Methode  | Pad                                   | Auth  | Beschrijving                              |
| -------- | ------------------------------------- | ----- | ----------------------------------------- |
| `GET`    | `/api/admin/users`                    | Admin | Gepagineerde gebruikerslijst ophalen      |
| `POST`   | `/api/admin/users`                    | Admin | Een nieuwe gebruiker aanmaken             |
| `GET`    | `/api/admin/users/stats`              | Admin | Gebruikersstatistieken ophalen            |
| `POST`   | `/api/admin/users/check-email`        | Admin | E-mailbeschikbaarheid controleren         |
| `POST`   | `/api/admin/users/check-username`     | Admin | Gebruikersnaamsbeschikbaarheid controleren |
| `GET`    | `/api/admin/users/{id}`               | Admin | Gebruiker ophalen op ID                   |
| `PUT`    | `/api/admin/users/{id}`               | Admin | Gebruiker bijwerken                       |
| `DELETE` | `/api/admin/users/{id}`               | Admin | Gebruiker verwijderen                     |

---

## Gebruikers Weergeven

```
GET /api/admin/users
```

Geeft een gepagineerde lijst van gebruikers terug met zoeken, filteren en sorteren.

**Queryparameters:**

| Parameter         | Type    | Standaard | Beschrijving                                                         |
| ----------------- | ------- | --------- | -------------------------------------------------------------------- |
| `page`            | integer | `1`       | Paginanummer (minimum: 1)                                            |
| `limit`           | integer | `10`      | Resultaten per pagina (1--100)                                       |
| `search`          | string  | --        | Zoeken op naam, e-mail of gebruikersnaam (max 100 tekens)            |
| `role`            | string  | --        | Filteren op rol-ID (max 50 tekens)                                   |
| `status`          | string  | --        | Filter: `active` of `inactive`                                       |
| `sortBy`          | string  | `name`    | Sorteerveld: `name`, `username`, `email`, `role`, `created_at`       |
| `sortOrder`       | string  | `asc`     | Sorteerrichting: `asc` of `desc`                                     |
| `includeInactive` | boolean | `false`   | Inactieve gebruikers opnemen in resultaten                           |

**Antwoord (200):**

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
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
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

## Gebruiker Aanmaken

```
POST /api/admin/users
```

Maakt een nieuwe gebruiker aan met uitgebreide validatie. De rol moet bestaan in het systeem (gevalideerd ten opzichte van de rollentabel).

**Verzoeklichaam:**

| Veld       | Type   | Vereist | Beschrijving                                                   |
| ---------- | ------ | ------- | -------------------------------------------------------------- |
| `username` | string | Ja      | 3--30 tekens, alfanumeriek plus `-` en `_`                     |
| `email`    | string | Ja      | Geldig e-mailformaat                                           |
| `name`     | string | Ja      | Volledige naam (2--100 tekens)                                 |
| `password` | string | Ja      | Minimaal 8 tekens (gevalideerd door Zod `passwordSchema`)      |
| `role`     | string | Ja      | Moet verwijzen naar een bestaand rol-ID                        |
| `title`    | string | Nee     | Functietitel (max 100 tekens)                                  |
| `avatar`   | string | Nee     | Avatar URL (max 500 tekens)                                    |

**Voorbeeld:**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "role": "admin",
  "title": "Senior Developer",
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**Antwoord (201):**

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

## Gebruikersstatistieken Ophalen

```
GET /api/admin/users/stats
```

Geeft uitgebreide statistieken terug voor het admin-dashboard.

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## E-mailbeschikbaarheid Controleren

```
POST /api/admin/users/check-email
```

Controleert of een e-mailadres al in gebruik is. Ondersteunt een `excludeId`-parameter voor updatescenario's waarbij het e-mailadres van de huidige gebruiker moet worden uitgesloten van de dubbele controle.

**Verzoeklichaam:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**Antwoord (200):**

```json
{ "available": true, "exists": false }
```

---

## Gebruikersnaamsbeschikbaarheid Controleren

```
POST /api/admin/users/check-username
```

Controleert of een gebruikersnaam al in gebruik is. Hetzelfde `excludeId`-patroon als de e-mailcontrole.

**Verzoeklichaam:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Antwoord (200):**

```json
{ "available": false, "exists": true }
```

---

## Gebruiker Ophalen / Bijwerken / Verwijderen

### Gebruiker Ophalen

```
GET /api/admin/users/{id}
```

Geeft volledige profielinformatie terug voor een enkele gebruiker.

### Gebruiker Bijwerken

```
PUT /api/admin/users/{id}
```

Gedeeltelijke update -- alleen opgegeven velden worden gewijzigd. Valideert e-mailformaat, gebruikersnaamlengte (3--50), naamlengte (2--100) en dat de rol bestaat in het systeem.

**Verzoeklichaam (alle velden optioneel):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### Gebruiker Verwijderen

```
DELETE /api/admin/users/{id}
```

Verwijdert een gebruiker permanent. Bevat een zelf-verwijderingsbeveiliging: een admin kan zijn eigen account niet verwijderen.

**Antwoord (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Validatieregels

| Veld       | Regel                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| `username` | 3--30 tekens; regex `^[a-zA-Z0-9_-]{3,30}$` (aanmaken), 3--50 tekens (bijwerken)  |
| `email`    | Geldig e-mailformaat via hulpfunctie `isValidEmail`                                |
| `name`     | 2--100 tekens                                                                      |
| `password` | Minimaal 8 tekens; gevalideerd door Zod `passwordSchema`                           |
| `role`     | Moet verwijzen naar een bestaande rol in de database                               |
| `status`   | Moet `active` of `inactive` zijn                                                   |
| `title`    | Maximaal 100 tekens                                                                |
| `avatar`   | Maximaal 500 tekens                                                                |

## Foutcodes

| Status | Betekenis                                                    |
| ------ | ------------------------------------------------------------ |
| `400`  | Validatiefout, zelf-verwijdering, dubbel e-mail/gebruikersnaam |
| `401`  | Authenticatie vereist                                        |
| `403`  | Admin-rechten vereist                                        |
| `404`  | Gebruiker niet gevonden                                      |
| `500`  | Interne serverfout                                           |

## Gerelateerde Documentatie

- [Admin Rollen API](./admin-roles-endpoints.md) -- rollen beheren die aan gebruikers zijn toegewezen
- [Authenticatie](../architecture/nextauth-configuration.md) -- sessiebeheer en beveiliging
- [Admin Clients API](./admin-clients-endpoints.md) -- clientprofielbeheer
