---
id: admin-items-endpoints
title: "Admin Items API Endpoints"
sidebar_label: "Admin Items API Endpoints"
---

# Admin Items API Eindpunten

De Items API biedt eindpunten voor het beheren van directorylistings, inclusief aanmaak, updates, beoordelingsworkflows (goedkeuren/afwijzen), auditgeschiedenis, bulkbewerkingen en statistieken. Items doorlopen een levenscyclus van `draft`, `pending`, `approved` en `rejected` statussen. Alle eindpunten vereisen beheerdersauthenticatie.

## Basispad

```
/api/admin/items
```

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
| -------- | ------------------------------------- | ----- | ------------------------------------ |
| `GET` | `/api/admin/items` | Admin | Gepagineerde itemslijst ophalen |
| `POST` | `/api/admin/items` | Admin | Een nieuw item aanmaken |
| `GET` | `/api/admin/items/stats` | Admin | Itemstatistieken ophalen |
| `POST` | `/api/admin/items/bulk` | Admin | Items in bulk goedkeuren, afwijzen of verwijderen |
| `GET` | `/api/admin/items/{id}` | Admin | Item ophalen op ID |
| `PUT` | `/api/admin/items/{id}` | Admin | Item bijwerken |
| `DELETE` | `/api/admin/items/{id}` | Admin | Item permanent verwijderen |
| `POST` | `/api/admin/items/{id}/review` | Admin | Een item goedkeuren of afwijzen |
| `GET` | `/api/admin/items/{id}/history` | Admin | Auditgeschiedenis van item ophalen |

---

## Items Weergeven

```
GET /api/admin/items
```

Geeft een gepagineerde lijst van items terug met zoekfunctie, filtering op status/categorie/tags en sortering.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page` | integer | `1` | Paginanummer (minimaal: 1) |
| `limit` | integer | `10` | Resultaten per pagina (1–100) |
| `search` | string | — | Items zoeken op naam of beschrijving |
| `status` | string | — | Filter: `draft`, `pending`, `approved`, `rejected` |
| `categories` | string | — | Kommagescheiden categorie-slugs |
| `tags` | string | — | Kommagescheiden tag-slugs |
| `sortBy` | string | `updated_at` | Sorteerveld: `name`, `updated_at`, `status`, `submitted_at` |
| `sortOrder` | string | `desc` | Sorteerrichting: `asc` of `desc` |

**Antwoord (200):**

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

## Item Aanmaken

```
POST /api/admin/items
```

Maakt een nieuw item aan met dubbelecontroles op zowel ID als slug. Activeert CRM-synchronisatie (indien ingeschakeld) en locatie-indexering (indien ingeschakeld).

**Verzoeklichaam:**

| Veld | Type | Vereist | Beschrijving |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `id` | string | Ja | Unieke item-identifier |
| `name` | string | Ja | Itemnaam |
| `slug` | string | Ja | URL-vriendelijke slug (moet uniek zijn) |
| `description` | string | Ja | Itembeschrijving |
| `source_url` | string | Ja | Bron-URL van het item |
| `category` | string[] | Nee | Array van categorie-slugs |
| `tags` | string[] | Nee | Array van tag-slugs |
| `brand` | string | Nee | Merknaam (gebruikt voor CRM-bedrijfssynchronisatie) |
| `featured` | boolean | Nee | Uitgelicht-vlag (standaard: `false`) |
| `icon_url` | string | Nee | Pictogram-URL |
| `status` | string | Nee | Beginstatus (standaard: `draft`) |
| `location` | object | Nee | Locatiegegevens voor geo-indexering |

**Antwoord (201):**

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

## Itemstatistieken Ophalen

```
GET /api/admin/items/stats
```

Geeft tellingen per status terug. Ondersteunt optionele filters om de statistieken in te perken.

**Queryparameters:**

| Parameter | Type | Beschrijving |
| ------------ | ------ | ---------------------------------- |
| `search` | string | Statistieken filteren op zoekterm |
| `categories` | string | Kommagescheiden categorie-slugs |
| `tags` | string | Kommagescheiden tag-slugs |

**Antwoord (200):**

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

## Bulkacties

```
POST /api/admin/items/bulk
```

Voert bulk goedkeuring, afwijzing of verwijdering uit op maximaal 100 items. Elk item wordt afzonderlijk verwerkt; gedeeltelijke fouten annuleren de gehele bewerking niet. Stuurt e-mailmeldingen naar indieners bij goedkeuren/afwijzen.

**Verzoeklichaam:**

| Veld | Type | Vereist | Beschrijving |
| -------- | -------- | ------------------ | ---------------------------------------------------- |
| `action` | string | Ja | `approve`, `reject` of `delete` |
| `ids` | string[] | Ja | Item-ID's om te verwerken (1–100, geen duplicaten) |
| `reason` | string | Ja (voor `reject`) | Reden voor afwijzing (minimaal 10 tekens) |

**Antwoord (200):**

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

## Item Ophalen / Bijwerken / Verwijderen

### Item Ophalen

```
GET /api/admin/items/{id}
```

Geeft volledige itemdetails terug inclusief metadata, categorieën, tags, beoordelingsnotities en betrokkenheidsmaatstaven.

### Item Bijwerken

```
PUT /api/admin/items/{id}
```

Gedeeltelijke update — alleen opgegeven velden worden gewijzigd. Activeert CRM-synchronisatie wanneer `brand` is opgegeven en herindexering van locatie wanneer locatiegegevens wijzigen.

**Verzoeklichaam (alle velden optioneel):**

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

### Item Verwijderen

```
DELETE /api/admin/items/{id}
```

Verwijdert een item permanent en verwijdert het uit de locatie-index (indien ingeschakeld). Deze actie kan niet ongedaan worden gemaakt.

**Antwoord (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Item Beoordelen

```
POST /api/admin/items/{id}/review
```

Keurt een item goed of wijst het af. Registreert de beoordelingsbeslissing met optionele notities. Stuurt een e-mailmelding naar de oorspronkelijke indiener (als de indiener een geregistreerde gebruiker is).

**Verzoeklichaam:**

| Veld | Type | Vereist | Beschrijving |
| -------------- | ------ | -------- | ------------------------------------ |
| `status` | string | Ja | `approved` of `rejected` |
| `review_notes` | string | Nee | Toelichting op de beoordelingsbeslissing |

**Antwoord (200):**

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

## Auditgeschiedenis Item Ophalen

```
GET /api/admin/items/{id}/history
```

Geeft het volledige auditspoor voor een item terug, inclusief aanmaak, updates, statuswijzigingen, beoordelingen, verwijderingen en herstelacties.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page` | integer | `1` | Paginanummer |
| `limit` | integer | `20` | Resultaten per pagina (max 100) |
| `action` | string | — | Kommagescheiden filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Antwoord (200):**

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

## Validatieregels

| Veld | Regel |
| ------------ | ---------------------------------------------------------- |
| `id` | Vereist; moet uniek zijn voor alle items |
| `name` | Vereist voor aanmaak |
| `slug` | Vereist; moet uniek zijn voor alle items |
| `description` | Vereist voor aanmaak |
| `source_url` | Vereist voor aanmaak; geldig URL-formaat |
| `status` | Moet `draft`, `pending`, `approved` of `rejected` zijn |
| `reason` | Vereist voor bulk afwijzen; minimaal 10 tekens |
| `ids` | Bulk: 1–100 niet-lege unieke strings |
| `action` | Geschiedenisfilter: alleen geldige auditactietypes |

## Foutcodes

| Status | Betekenis |
| ------ | -------------------------------------------------------- |
| `400` | Validatiefout, ongeldige parameters, ontbrekende velden |
| `401` | Authenticatie vereist |
| `403` | Beheerdersrechten vereist |
| `404` | Item niet gevonden |
| `409` | Dubbel item-ID of slug |
| `500` | Interne serverfout |

## Gerelateerde Documentatie

- [Admin Rollen API](./admin-roles-endpoints.md) — rollen beheren die aan gebruikers zijn toegewezen
- [Admin Gebruikers API](./admin-users-endpoints.md) — beheer van gebruikersaccounts
- [Authenticatie](../architecture/nextauth-configuration.md) — sessiebeheer en beveiliging
