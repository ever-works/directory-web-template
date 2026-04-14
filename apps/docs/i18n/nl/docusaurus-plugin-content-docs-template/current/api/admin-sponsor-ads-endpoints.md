---
id: admin-sponsor-ads-endpoints
title: "Admin Sponsor Ads API Endpoints"
sidebar_label: "Admin Sponsor Ads API Endpoints"
---

# Admin Sponsor Advertenties API Eindpunten

De Sponsor Advertenties API biedt eindpunten voor het beheren van gesponsorde advertenties, inclusief weergeven, bekijken, goedkeuren, afwijzen en annuleren. Sponsor advertenties doorlopen een levenscyclus van de statussen `pending_payment`, `pending`, `active`, `rejected`, `expired` en `cancelled`. Alle eindpunten vereisen admin-authenticatie.

## Basispad

```
/api/admin/sponsor-ads
```

## Routeoverzicht

| Methode  | Pad                                         | Auth  | Beschrijving                              |
| -------- | ------------------------------------------- | ----- | ----------------------------------------- |
| `GET`    | `/api/admin/sponsor-ads`                    | Admin | Gepagineerde lijst van sponsor advertenties |
| `GET`    | `/api/admin/sponsor-ads/{id}`               | Admin | Sponsor advertentie ophalen op ID         |
| `DELETE` | `/api/admin/sponsor-ads/{id}`               | Admin | Sponsor advertentie permanent verwijderen |
| `POST`   | `/api/admin/sponsor-ads/{id}/approve`       | Admin | Sponsor advertentie goedkeuren en activeren |
| `POST`   | `/api/admin/sponsor-ads/{id}/reject`        | Admin | Sponsor advertentie afwijzen              |
| `POST`   | `/api/admin/sponsor-ads/{id}/cancel`        | Admin | Sponsor advertentie annuleren             |

---

## Sponsor Advertenties Weergeven

```
GET /api/admin/sponsor-ads
```

Geeft een gepagineerde lijst van sponsor advertenties terug met optioneel filteren op status en factuurinterval. Retourneert ook samenvattende statistieken voor het admin-dashboard. Queryparameters worden gevalideerd met Zod.

**Queryparameters:**

| Parameter   | Type    | Standaard   | Beschrijving                                                                      |
| ----------- | ------- | ----------- | --------------------------------------------------------------------------------- |
| `page`      | integer | `1`         | Paginanummer (minimum: 1)                                                         |
| `limit`     | integer | `10`        | Resultaten per pagina (1--100)                                                    |
| `status`    | string  | --          | Filter: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval`  | string  | --          | Filter: `weekly` of `monthly`                                                     |
| `search`    | string  | --          | Zoek sponsor advertenties op tekst                                                |
| `sortBy`    | string  | `createdAt` | Sorteerveld: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status`           |
| `sortOrder` | string  | `desc`      | Sorteerrichting: `asc` of `desc`                                                  |

**Antwoord (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Sponsor Advertentie Ophalen

```
GET /api/admin/sponsor-ads/{id}
```

Geeft een specifieke sponsor advertentie terug met volledige details inclusief de bijbehorende gebruikersinformatie.

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Sponsor Advertentie Verwijderen

```
DELETE /api/admin/sponsor-ads/{id}
```

Verwijdert een sponsor advertentie permanent. Deze actie kan niet ongedaan worden gemaakt.

**Antwoord (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Sponsor Advertentie Goedkeuren

```
POST /api/admin/sponsor-ads/{id}/approve
```

Keurt een sponsor advertentie goed en activeert deze. Advertenties met de status `pending` kunnen direct worden goedgekeurd. Voor advertenties met de status `pending_payment` stelt u `forceApprove` in op `true` om zonder betalingsbevestiging goed te keuren.

**Verzoeklichaam (optioneel):**

| Veld           | Type    | Vereist | Beschrijving                                                        |
| -------------- | ------- | ------- | ------------------------------------------------------------------- |
| `forceApprove` | boolean | Nee     | Stel in op `true` om goed te keuren zonder betaling (voor status `pending_payment`) |

**Voorbeeld:**

```json
{
  "forceApprove": true
}
```

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Foutantwoorden:**

| Status | Fout                     | Beschrijving                                           |
| ------ | ------------------------ | ------------------------------------------------------ |
| `400`  | `PAYMENT_NOT_RECEIVED`   | Advertentie heeft status `pending_payment`; gebruik `forceApprove` |
| `400`  | `Cannot approve...`      | Advertentiestatus laat goedkeuring niet toe            |
| `404`  | `Sponsor ad not found`   | Geen advertentie gevonden met het opgegeven ID         |

---

## Sponsor Advertentie Afwijzen

```
POST /api/admin/sponsor-ads/{id}/reject
```

Wijst een in behandeling zijnde sponsor advertentie af met een verplichte reden. Alleen advertenties met de status `pending` of `pending_payment` kunnen worden afgewezen. De afwijzingsreden wordt gevalideerd met Zod (`rejectSponsorAdSchema`).

**Verzoeklichaam:**

| Veld              | Type   | Vereist | Beschrijving                              |
| ----------------- | ------ | ------- | ----------------------------------------- |
| `rejectionReason` | string | Ja      | Reden voor afwijzing (10--500 tekens)     |

**Voorbeeld:**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Sponsor Advertentie Annuleren

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Annuleert een sponsor advertentie met de status `pending`, `pending_payment` of `active`. Een optionele annuleringsreden kan worden opgegeven. Gevalideerd met Zod (`cancelSponsorAdSchema`).

**Verzoeklichaam (optioneel):**

| Veld           | Type   | Vereist | Beschrijving                              |
| -------------- | ------ | ------- | ----------------------------------------- |
| `cancelReason` | string | Nee     | Reden voor annulering (max 500 tekens)    |

**Voorbeeld:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Statuslevenscyclus

Sponsor advertenties volgen deze statuslevenscyclus:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Aangemaakt door gebruiker, wacht op betalingsbevestiging.
- **`pending`** -- Betaling ontvangen, wacht op admin-beoordeling.
- **`active`** -- Goedgekeurd en momenteel actief.
- **`rejected`** -- Afgewezen door admin met een reden.
- **`expired`** -- Automatisch verlopen na einddatum.
- **`cancelled`** -- Geannuleerd door admin of gebruiker.

---

## Validatieregels

| Veld              | Regel                                                           |
| ----------------- | --------------------------------------------------------------- |
| `status`          | Moet een geldige sponsor advertentie status zijn                |
| `interval`        | Moet `weekly` of `monthly` zijn                                 |
| `rejectionReason` | Vereist bij afwijzen; 10--500 tekens                            |
| `cancelReason`    | Optioneel bij annuleren; max 500 tekens                         |
| `forceApprove`    | Boolean; alleen relevant voor status `pending_payment`          |
| `sortBy`          | Moet `createdAt`, `updatedAt`, `startDate`, `endDate` of `status` zijn |
| `sortOrder`       | Moet `asc` of `desc` zijn                                       |

## Foutcodes

| Status | Betekenis                                                        |
| ------ | ---------------------------------------------------------------- |
| `400`  | Validatiefout, ongeldige statusovergang, betaling niet ontvangen |
| `401`  | Authenticatie vereist                                            |
| `403`  | Admin-rechten vereist                                            |
| `404`  | Sponsor advertentie niet gevonden                                |
| `500`  | Interne serverfout                                               |

## Gerelateerde Documentatie

- [Admin Eindpunten Overzicht](./admin-endpoints.md)
- [Sponsor Advertenties Eindpunten](./sponsor-ads-endpoints.md) -- gebruikerssectie voor sponsor advertenties
- [Antwoordpatronen](./response-patterns.md)
