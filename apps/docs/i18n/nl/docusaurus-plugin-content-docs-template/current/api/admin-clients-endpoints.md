---
id: admin-clients-endpoints
title: "Admin Clients API Endpoints"
sidebar_label: "Admin Clients API Endpoints"
---

# Admin Klanten API Eindpunten

De Klanten API biedt eindpunten voor het beheren van klantprofielen, inclusief aanmaak, updates, geavanceerd zoeken, bulkbewerkingen, dashboardanalyses en uitgebreide statistieken. Klanten vertegenwoordigen eindgebruikersprofielen die zijn gekoppeld aan authenticatieaccounts. Alle eindpunten vereisen beheerdersauthenticatie.

## Basispad

```
/api/admin/clients
```

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
| -------- | --------------------------------------- | ----- | ------------------------------------ |
| `GET` | `/api/admin/clients` | Admin | Gepagineerde klantenlijst ophalen |
| `POST` | `/api/admin/clients` | Admin | Een nieuw klantprofiel aanmaken |
| `GET` | `/api/admin/clients/stats` | Admin | Uitgebreide klantstatistieken ophalen |
| `GET` | `/api/admin/clients/dashboard` | Admin | Gecombineerde dashboardgegevens ophalen |
| `GET` | `/api/admin/clients/advanced-search` | Admin | Geavanceerde multi-filterzoekfunctie |
| `PUT` | `/api/admin/clients/bulk` | Admin | Klantprofielen in bulk bijwerken |
| `DELETE` | `/api/admin/clients/bulk` | Admin | Klantprofielen in bulk verwijderen |
| `GET` | `/api/admin/clients/{clientId}` | Admin | Klant ophalen op ID |
| `PUT` | `/api/admin/clients/{clientId}` | Admin | Klantprofiel bijwerken |
| `DELETE` | `/api/admin/clients/{clientId}` | Admin | Klantprofiel verwijderen |

---

## Klanten Weergeven

```
GET /api/admin/clients
```

Geeft een gepagineerde lijst van klantprofielen terug met basisfiltering.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page` | integer | `1` | Paginanummer (minimaal: 1) |
| `limit` | integer | `10` | Resultaten per pagina (1–100) |
| `search` | string | — | Zoeken op naam of e-mail |
| `status` | string | — | Filter: `active`, `inactive`, `suspended`, `trial` |
| `plan` | string | — | Filter: `free`, `standard`, `premium` |
| `accountType` | string | — | Filter: `individual`, `business`, `enterprise` |
| `provider` | string | — | Filter op authenticatieprovider |

**Antwoord (200):**

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

## Klant Aanmaken

```
POST /api/admin/clients
```

Maakt een nieuw klantprofiel aan. Als er geen gebruikersaccount bestaat voor het opgegeven e-mailadres, wordt automatisch een nieuwe gebruiker aangemaakt met een tijdelijk wachtwoord. Activeert CRM-synchronisatie indien ingeschakeld.

**Verzoeklichaam:**

| Veld | Type | Vereist | Beschrijving |
| ---------------- | ------- | -------- | -------------------------------------------- |
| `email` | string | Ja | E-mailadres van de klant |
| `displayName` | string | Nee | Weergavenaam (standaard e-mailprefix) |
| `username` | string | Nee | Unieke gebruikersnaam |
| `bio` | string | Nee | Klantbiografie |
| `jobTitle` | string | Nee | Functietitel |
| `company` | string | Nee | Bedrijfsnaam |
| `industry` | string | Nee | Sector |
| `phone` | string | Nee | Telefoonnummer |
| `website` | string | Nee | Website-URL |
| `location` | string | Nee | Locatie |
| `accountType` | string | Nee | `individual` (standaard), `business`, `enterprise` |
| `status` | string | Nee | `active` (standaard), `inactive`, `suspended`, `trial` |
| `plan` | string | Nee | `free` (standaard), `standard`, `premium` |

**Antwoord (200):**

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

## Klantstatistieken Ophalen

```
GET /api/admin/clients/stats
```

Geeft uitgebreide analyses over alle klanten terug, gegroepeerd per overzicht, groei, abonnementen, accounttypes, betrokkenheid, demografie en authenticatieproviders.

**Antwoord (200):**

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

Geeft een gecombineerde reactie terug met een gepagineerde klantenlijst, geaggregeerde statistieken en pagineringsmetadata. Ondersteunt alle basisfilters plus datumbereikparameters.

**Extra Queryparameters (naast lijstparameters):**

| Parameter | Type | Beschrijving |
| --------------- | ------ | ------------------------------------------ |
| `createdAfter` | string | ISO-datum of `YYYY-MM-DD` — aangemaakt na |
| `createdBefore` | string | ISO-datum of `YYYY-MM-DD` — aangemaakt voor |

---

## Geavanceerd Zoeken

```
GET /api/admin/clients/advanced-search
```

Voert een meerdimensionale zoekopdracht uit in klantprofielen. Naast de basislijstfilters ondersteunt het veldspecifieke zoekopdrachten, numerieke bereiken, booleaanse vlaggen en datumbereiken. Geeft zoekmetadata terug, inclusief toegepaste filters en uitvoeringstijd.

**Extra Queryparameters:**

| Parameter | Type | Beschrijving |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy` | string | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder` | string | `asc` of `desc` |
| `createdAfter` | string | ISO datum-tijdfilter |
| `createdBefore` | string | ISO datum-tijdfilter |
| `emailDomain` | string | Filteren op e-maildomein (bijv. `example.com`) |
| `companySearch` | string | Zoeken in bedrijfsnamen |
| `locationSearch` | string | Zoeken in locaties |
| `industrySearch` | string | Zoeken in sectoren |
| `minSubmissions` | integer | Minimaal aantal inzendingen |
| `maxSubmissions` | integer | Maximaal aantal inzendingen |
| `emailVerified` | boolean | Filteren op e-mailverificatiestatus |
| `twoFactorEnabled` | boolean | Filteren op 2FA-status |
| `hasAvatar` | boolean | Klanten met/zonder avatar filteren |
| `hasWebsite` | boolean | Klanten met/zonder website filteren |
| `hasPhone` | boolean | Klanten met/zonder telefoonnummer filteren |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Bulkbewerkingen

### Bulk Bijwerken

```
PUT /api/admin/clients/bulk
```

Werkt meerdere klantprofielen bij in één verzoek. Elk klantobject moet een veld `id` bevatten plus de bij te werken velden. Individuele fouten annuleren de gehele batch niet.

**Verzoeklichaam:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Bulk Verwijderen

```
DELETE /api/admin/clients/bulk
```

Verwijdert meerdere klantprofielen permanent. Elk object in de array moet een veld `id` bevatten.

**Verzoeklichaam:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Antwoord (200) — beide bulk-eindpunten:**

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

## Klant Ophalen / Bijwerken / Verwijderen

### Klant Ophalen

```
GET /api/admin/clients/{clientId}
```

Geeft het volledige klantprofiel terug inclusief weergavenaam, bedrijf, abonnement, accounttype en activiteitstijdstempels.

### Klant Bijwerken

```
PUT /api/admin/clients/{clientId}
```

Gedeeltelijke update — alleen opgegeven velden worden gewijzigd. Activeert CRM-synchronisatie wanneer bedrijfs- of profielgegevens wijzigen.

**Verzoeklichaam (alle velden optioneel):**

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

### Klant Verwijderen

```
DELETE /api/admin/clients/{clientId}
```

Verwijdert een klantprofiel permanent. Deze actie kan niet ongedaan worden gemaakt.

**Antwoord (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Validatieregels

| Veld | Regel |
| ------------- | ---------------------------------------------------------- |
| `email` | Vereist voor aanmaak; geldig e-mailformaat |
| `status` | Moet `active`, `inactive`, `suspended` of `trial` zijn |
| `plan` | Moet `free`, `standard` of `premium` zijn |
| `accountType` | Moet `individual`, `business` of `enterprise` zijn |
| `clients` | Bulk: niet-lege array met `id` vereist op elk object |

## Foutcodes

| Status | Betekenis |
| ------ | ------------------------------------------------------ |
| `400` | Validatiefout, ontbrekend e-mailadres, aanmaken gebruiker mislukt |
| `401` | Authenticatie vereist |
| `403` | Beheerdersrechten vereist |
| `404` | Klant niet gevonden |
| `500` | Interne serverfout |

## Gerelateerde Documentatie

- [Admin Gebruikers API](./admin-users-endpoints.md) — beheer van gebruikersaccounts
- [Admin Rollen API](./admin-roles-endpoints.md) — rol- en rechtenbeheer
- [Authenticatie](../architecture/nextauth-configuration.md) — sessiebeheer en beveiliging
