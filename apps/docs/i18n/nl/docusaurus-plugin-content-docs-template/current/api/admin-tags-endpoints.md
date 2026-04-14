---
id: admin-tags-endpoints
title: "Admin Tags API Endpoints"
sidebar_label: "Admin Tags API Endpoints"
---

# Admin Tags API Eindpunten

De Admin Tags API biedt volledige CRUD-bewerkingen voor het beheren van inhoudstagss. Tags worden gebruikt om items in de directory te classificeren en te filteren. De API ondersteunt gepagineerde weergave, aanmaken met actieve/inactieve statussen, bijwerken, verwijderen en localegebewuste ophaling uit de inhoudscache. Alle schrijfbewerkingen invalideren inhoudscaches voor onmiddellijke zichtbaarheid.

## Routeoverzicht

| Methode  | Pad                      | Auth  | Beschrijving                              |
| -------- | ------------------------ | ----- | ----------------------------------------- |
| `GET`    | `/api/admin/tags`        | Admin | Tags weergeven (gepagineerd)              |
| `POST`   | `/api/admin/tags`        | Admin | Een nieuwe tag aanmaken                   |
| `GET`    | `/api/admin/tags/all`    | Admin | Alle tags ophalen (uit inhoudscache)      |
| `GET`    | `/api/admin/tags/{id}`   | Admin | Een enkele tag ophalen op ID              |
| `PUT`    | `/api/admin/tags/{id}`   | Admin | Een tag bijwerken                         |
| `DELETE` | `/api/admin/tags/{id}`   | Admin | Een tag permanent verwijderen             |

## Authenticatie

Alle tagbeheereindpunten vereisen admin-rechten:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Eindpunten

### GET `/api/admin/tags`

Geeft een gepagineerde lijst van alle tags in het systeem terug. Paginatieparameters worden gevalideerd met de gedeelde hulpfunctie `validatePaginationParams`.

**Queryparameters:**

| Parameter | Type    | Standaard | Beschrijving                   |
| --------- | ------- | --------- | ------------------------------ |
| `page`    | integer | `1`       | Paginanummer (minimum: 1)      |
| `limit`   | integer | `10`      | Items per pagina (1--100)      |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "design",
        "name": "Design",
        "isActive": true,
        "itemCount": 89,
        "created_at": "2024-01-19T15:20:00.000Z",
        "updated_at": "2024-01-19T15:20:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### POST `/api/admin/tags`

Maakt een nieuwe tag aan met een opgegeven ID, naam en optionele actieve status. Invalideert inhoudscaches bij succes.

**Verzoeklichaam:**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

| Veld       | Type    | Vereist | Beschrijving                                   |
| ---------- | ------- | ------- | ---------------------------------------------- |
| `id`       | string  | Ja      | URL-vriendelijke slug-identifier               |
| `name`     | string  | Ja      | Leesbare tagnaam (2--50 tekens)                |
| `isActive` | boolean | Nee     | Of de tag actief is (standaard: `true`)        |

**Validatieregels:**
- Zowel `id` als `naam` zijn vereist
- Tagnaam moet tussen 2 en 50 tekens lang zijn
- Tag-ID moet uniek zijn in alle bestaande tags
- Tagnaam moet uniek zijn in alle bestaande tags

**Antwoord (201):**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### GET `/api/admin/tags/all`

Geeft alle tags terug uit de inhoudscache voor een opgegeven locale. Dit eindpunt leest uit de gecachte inhoudslaag in plaats van de database, waardoor het geschikt is voor het vullen van tagselectievakken in de admin-UI.

**Queryparameters:**

| Parameter | Type   | Standaard | Beschrijving                        |
| --------- | ------ | --------- | ----------------------------------- |
| `locale`  | string | `"en"`    | Localecode voor inhoudophaling      |

**Antwoord (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 156
    }
  ]
}
```

### GET `/api/admin/tags/{id}`

Haalt een enkele tag op via zijn unieke identifier met volledige details inclusief gebruiksstatistieken.

**Padparameters:**

| Parameter | Type   | Beschrijving               |
| --------- | ------ | -------------------------- |
| `id`      | string | Unieke tag-identifier      |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/tags/{id}`

Werkt de naam en/of actieve status van een tag bij. Het tag-ID kan na aanmaken niet worden gewijzigd. Invalideert inhoudscaches bij succes.

**Padparameters:**

| Parameter | Type   | Beschrijving               |
| --------- | ------ | -------------------------- |
| `id`      | string | Unieke tag-identifier      |

**Verzoeklichaam:**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

| Veld       | Type    | Vereist | Beschrijving                         |
| ---------- | ------- | ------- | ------------------------------------ |
| `name`     | string  | Ja      | Bijgewerkte weergavenaam van de tag  |
| `isActive` | boolean | Nee     | Bijgewerkte actieve status           |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### DELETE `/api/admin/tags/{id}`

Verwijdert een tag permanent uit het systeem. Dit verwijdert ook de tag van alle bijbehorende items. Invalideert inhoudscaches bij succes.

**Padparameters:**

| Parameter | Type   | Beschrijving               |
| --------- | ------ | -------------------------- |
| `id`      | string | Unieke tag-identifier      |

**Antwoord (200):**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::caution
Het verwijderen van een tag is permanent en kan niet ongedaan worden gemaakt. Alle item-tag-associaties voor de verwijderde tag worden verwijderd. Overweeg de tag te deactiveren (door `isActive` in te stellen op `false` via PUT) als u de data-integriteit wilt bewaren.
:::

## Tag Gegevensmodel

| Veld         | Type     | Nullable | Beschrijving                                       |
| ------------ | -------- | -------- | -------------------------------------------------- |
| `id`         | string   | Nee      | URL-vriendelijke unieke identifier                 |
| `name`       | string   | Nee      | Leesbare weergavenaam                              |
| `isActive`   | boolean  | Nee      | Of de tag aan items kan worden toegewezen          |
| `itemCount`  | integer  | Nee      | Aantal items dat deze tag gebruikt                 |
| `created_at` | datetime | Nee      | Aanmaaktijdstempel                                 |
| `updated_at` | datetime | Nee      | Tijdstempel van laatste update                     |

## Foutcodes

| Status | Fout                                          | Oorzaak                                          |
| ------ | --------------------------------------------- | ------------------------------------------------ |
| `400`  | Tag ID and name are required                  | Vereiste velden ontbreken bij aanmaken           |
| `400`  | Tag name is required                          | Naam ontbreekt bij bijwerken                     |
| `400`  | Tag name must be between 2 and 50 characters  | Naamlengte validatiefout                         |
| `400`  | Invalid page/limit parameter                  | Paginatieparameter buiten bereik                 |
| `401`  | Unauthorized                                  | Ontbrekende of niet-admin sessie                 |
| `404`  | Tag not found                                 | Geen tag gevonden met het opgegeven ID           |
| `409`  | Tag with ID already exists                    | Dubbele ID bij aanmaken                          |
| `409`  | Tag with name already exists                  | Dubbele naam bij aanmaken/bijwerken              |
| `500`  | Failed to fetch/create/update/delete tag      | Server- of databasefout                          |

## Cache-invalidatie

Alle schrijfbewerkingen (aanmaken, bijwerken, verwijderen) roepen `invalidateContentCaches()` aan om ervoor te zorgen dat tagwijzigingen onmiddellijk zichtbaar zijn in de publiek gerichte inhoud:

```typescript
await invalidateContentCaches();
```

Dit wist zowel de in-memory inhoudscache als eventuele CDN-niveau caches die actief zijn.

## Gegevensbronnen

De tag-API gebruikt twee verschillende gegevensbronnen afhankelijk van het eindpunt:

| Eindpunt                    | Gegevensbron                      | Gebruiksscenario                         |
| --------------------------- | --------------------------------- | ---------------------------------------- |
| `GET /api/admin/tags`       | `tagRepository` (database)        | Adminbeheer met paginering               |
| `POST /api/admin/tags`      | `tagRepository` (database)        | Nieuwe tags aanmaken                     |
| `GET /api/admin/tags/all`   | `getCachedItems()` (inhoudscache) | Dropdown-selectievakken, snelle opzoekingen |
| `GET /api/admin/tags/{id}`  | `tagRepository` (database)        | Gedetailleerde tagweergave               |
| `PUT /api/admin/tags/{id}`  | `tagRepository` (database)        | Tageigenschappen bijwerken               |
| `DELETE /api/admin/tags/{id}` | `tagRepository` (database)      | Tags verwijderen                         |

## Gerelateerde Documentatie

- [Admin Eindpunten Overzicht](./admin-endpoints.md)
- [Admin Categorieën Eindpunten](./admin-categories-endpoints.md) -- Vergelijkbaar patroon voor categoriebeheer
- [Antwoordpatronen](./response-patterns.md)
- [Verzoekvalidatie](./request-validation.md)
