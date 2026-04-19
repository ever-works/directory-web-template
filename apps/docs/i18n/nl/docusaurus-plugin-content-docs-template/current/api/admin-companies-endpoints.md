---
id: admin-companies-endpoints
title: "Admin Companies API Endpoints"
sidebar_label: "Admin Companies API Endpoints"
---

# Admin Bedrijven API Eindpunten

De Admin Bedrijven API biedt beheereindpunten voor bedrijfsrecords. Bedrijven vertegenwoordigen organisaties die gekoppeld zijn aan vermelde items. De API ondersteunt volledige CRUD-bewerkingen met Zod-gebaseerde validatie, handhaving van uniekheid van domein/slug en optionele CRM-synchronisatie bij updates.

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Admin | Bedrijven weergeven (gepagineerd, doorzoekbaar) |
| `POST` | `/api/admin/companies` | Admin | Een nieuw bedrijf aanmaken |
| `GET` | `/api/admin/companies/{id}` | Admin | Een enkel bedrijf ophalen op UUID |
| `PUT` | `/api/admin/companies/{id}` | Admin | Een bedrijf bijwerken |
| `DELETE` | `/api/admin/companies/{id}` | Admin | Een bedrijf permanent verwijderen |

## Authenticatie

Alle bedrijfseindpunten verifiëren dat de sessie beheerdersrechten heeft:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Eindpunten

### GET `/api/admin/companies`

Geeft een gepagineerde lijst van bedrijven terug met zoek- en statusfiltering. Geeft ook globale tellingen van actieve en inactieve bedrijven terug, ongeacht de toegepaste filters.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Paginanummer (minimaal >= 1) |
| `limit` | integer | `10` | Items per pagina (1–100) |
| `q` | string | — | Zoek op naam of domein (hoofdletterongevoelig) |
| `status` | string | — | Filter: `"active"` of `"inactive"` |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

De waarden `meta.activeCount` en `meta.inactiveCount` weerspiegelen globale totalen en worden niet beïnvloed door de filters `q` of `status`. Hierdoor kan de gebruikersinterface tabtellingen naast gefilterde resultaten weergeven.

### POST `/api/admin/companies`

Maakt een nieuw bedrijfsrecord aan. Verzoekgegevens worden gevalideerd met het Zod-schema (`createCompanySchema`). Domein- en slugwaarden worden genormaliseerd naar kleine letters. Uniekheid wordt gecontroleerd voor zowel `domain` als `slug` vóór invoeging.

**Verzoeklichaam:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `name` | string | Ja | Bedrijfsnaam (1–255 tekens) |
| `website` | string (URI) | Nee | Volledige website-URL |
| `domain` | string | Nee | Genormaliseerd domein (max 255 tekens) |
| `slug` | string | Nee | URL-vriendelijke identifier (`^[a-z0-9-]+$`, max 255) |
| `status` | string | Nee | `"active"` of `"inactive"` (standaard: `"active"`) |

**Validatie:** Gebruikt Zod-schemavalidatie. Bij een fout worden gedetailleerde veldfouten geretourneerd:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Antwoord (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Haalt een enkel bedrijf op via zijn UUID.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string (UUID) | Unieke identifier van het bedrijf |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Werkt een bestaand bedrijf bij. Ondersteunt gedeeltelijke updates — alleen opgegeven velden worden gewijzigd. Gevalideerd met `updateCompanySchema`. Uniekheid van domein en slug wordt opnieuw geverifieerd wanneer die velden veranderen. Na een succesvolle update worden de bedrijfsgegevens optioneel gesynchroniseerd naar een CRM-systeem.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string (UUID) | Unieke identifier van het bedrijf |

**Verzoeklichaam:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Alle velden zijn optioneel. Alleen opgegeven velden worden bijgewerkt.

**CRM-synchronisatie:**

Wanneer `TWENTY_CRM_ENABLED` niet is ingesteld op `"false"`, wordt het bijgewerkte bedrijf automatisch gesynchroniseerd naar het Twenty CRM-systeem. Deze synchronisatie is niet-blokkerend — als deze mislukt, retourneert de API nog steeds succes voor de database-update:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Verwijdert een bedrijf permanent. Dit is een harde verwijdering — het record wordt uit de database verwijderd. Bijbehorende item-bedrijfskoppelingen worden verwijderd via CASCADE-beperkingen.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string (UUID) | Unieke identifier van het bedrijf |

**Antwoord (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
Verwijdering van bedrijven is permanent en kan niet ongedaan worden gemaakt. Alle itemkoppelingen voor het verwijderde bedrijf worden verwijderd via database CASCADE-regels.
:::

## Validatieregels

Bedrijfsgegevens worden gevalideerd met Zod-schema's gedefinieerd in `lib/validations/company.ts`:

| Veld | Regel |
|-------|------|
| `name` | Vereist, 1–255 tekens |
| `website` | Optioneel, moet geldig URI-formaat hebben |
| `domain` | Optioneel, max 255 tekens, genormaliseerd naar kleine letters |
| `slug` | Optioneel, max 255 tekens, alleen kleine letters alfanumeriek en koppeltekens |
| `status` | Optioneel, moet `"active"` of `"inactive"` zijn |

## Foutcodes

| Status | Fout | Oorzaak |
|--------|-------|-------|
| `400` | Validatiefout | Zod-schemavalidatiefout (bevat velddetails) |
| `400` | Ongeldige paginaparameter | Pagina is geen positief geheel getal |
| `400` | Ongeldige limietparameter | Limiet buiten het bereik 1–100 |
| `401` | Onbevoegd | Ontbrekende of niet-admin sessie |
| `404` | Bedrijf niet gevonden | Geen bedrijf met het opgegeven UUID |
| `409` | Bedrijf met domein bestaat al | Schending van domeinuniekheid |
| `409` | Bedrijf met slug bestaat al | Schending van sluguniekheid |
| `500` | Aanmaken/bijwerken/verwijderen bedrijf mislukt | Server- of databasefout |

## Gerelateerde Documentatie

- [Overzicht Admin Eindpunten](./admin-endpoints.md)
- [Antwoordpatronen](./response-patterns.md)
- [Verzoekvalidatie](./request-validation.md)
