---
id: admin-comments-endpoints
title: "Admin Comments API Endpoints"
sidebar_label: "Admin Comments API Endpoints"
---

# Admin Reacties API Eindpunten

De Admin Reacties API biedt moderatiemogelijkheden voor het beheren van gebruikersreacties. Beheerders kunnen reacties weergeven, bekijken, bijwerken en zacht verwijderen. Alle eindpunten gebruiken de Node.js-runtime en vereisen databasebeschikbaarheid. Authenticatiecontroles gebruiken `403 Verboden` voor niet-beheerders.

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Admin | Reacties weergeven (gepagineerd, doorzoekbaar) |
| `GET` | `/api/admin/comments/{id}` | Admin | Een enkele reactie met gebruikersinfo ophalen |
| `PUT` | `/api/admin/comments/{id}` | Admin | Inhoud van reactie bijwerken |
| `DELETE` | `/api/admin/comments/{id}` | Admin | Een reactie zacht verwijderen |

## Authenticatie

Reactiemoderatieëindpunten verifiëren de beheerderstatus en retourneren `403 Verboden` (niet `401`) voor niet-beheerders:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Databasevereiste

De reactie-eindpunten controleren de databasebeschikbaarheid voordat verzoeken worden verwerkt:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Als de database niet is geconfigureerd, wordt een geschikte foutreactie geretourneerd vóór enige authenticatiecontrole.

## Eindpunten

### GET `/api/admin/comments`

Geeft een gepagineerde lijst van reacties met bijbehorende gebruikersinformatie terug. Ondersteunt volledige tekstzoekopdrachten in reactie-inhoud, gebruikersnamen en gebruikers-e-mailadressen. Alleen niet-verwijderde reacties worden geretourneerd.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Paginanummer voor paginering |
| `limit` | integer | `10` | Reacties per pagina (1–100) |
| `search` | string | `""` | Zoeken in inhoud, gebruikersnaam of e-mail |

**Zoekgedrag:**

De zoekopdracht wordt hoofdletterongevoelig (met `ILIKE`) vergeleken met:
- Reactie-inhoud
- Weergavenaam van gebruiker
- E-mailadres van gebruiker

Speciale tekens `%`, `_` en `\` worden ontsnapt om SQL-patrooninjectie te voorkomen.

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### GET `/api/admin/comments/{id}`

Haalt een specifieke reactie op via zijn ID met volledige gebruikersprofielinformatie. Bevat een linker-join naar de tabel `clientProfiles` voor gebruikersgegevens.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string | Unieke identifier van de reactie |

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Gebruikersreserve:** Als het gebruikersprofiel niet wordt gevonden (verwijderde gebruiker), wordt een tijdelijk object geretourneerd:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Werkt de inhoud van een specifieke reactie bij. Alleen het veld `content` kan worden gewijzigd. De reactie moet bestaan en mag niet zacht verwijderd zijn.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string | Unieke identifier van de reactie |

**Verzoeklichaam:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `content` | string | Ja | Nieuwe reactietekst (mag niet leeg zijn na verwijderen van witruimte) |

**Validatieregels:**
- `content` is vereist en mag niet leeg zijn of alleen witruimte bevatten
- De doelreactie moet bestaan en mag geen `deletedAt`-tijdstempel hebben

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Voert een zachte verwijdering uit op een reactie door de tijdstempel `deletedAt` in te stellen. De reactie moet bestaan en nog niet verwijderd zijn. Zacht verwijderde reacties worden uitgesloten van alle lijstqueries.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string | Unieke identifier van de reactie |

**Antwoord (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Reactie-gegevensmodel

| Veld | Type | Nullable | Beschrijving |
|-------|------|----------|-------------|
| `id` | string | Nee | Unieke reactie-identifier |
| `content` | string | Nee | Tekst van de reactie |
| `rating` | integer | Ja | Beoordelingswaarde (1–5) |
| `userId` | string | Nee | Gebruikers-ID van de auteur |
| `itemId` | string | Nee | Bijbehorend item-ID |
| `createdAt` | datetime | Ja | Aanmaaktijdstempel |
| `updatedAt` | datetime | Ja | Tijdstempel van laatste update |
| `deletedAt` | datetime | Ja | Tijdstempel zachte verwijdering (null indien actief) |

## Foutcodes

| Status | Fout | Oorzaak |
|--------|-------|-------|
| `400` | Inhoud is vereist | Lege of ontbrekende inhoud bij bijwerken |
| `403` | Verboden | Niet-beheerder probeert toegang te krijgen |
| `404` | Reactie niet gevonden | Ongeldig ID of al zacht verwijderd |
| `500` | Interne serverfout | Database- of serverstoring |

## Implementatienotities

- Reacties gebruiken **zachte verwijdering** — het veld `deletedAt` wordt ingesteld in plaats van de rij te verwijderen. Dit behoudt de gegevensintegriteit en maakt herstel mogelijk.
- Alle lijstqueries filteren met `isNull(comments.deletedAt)` om verwijderde reacties uit te sluiten.
- Gebruikersgegevens worden opgehaald via een `LEFT JOIN` op `clientProfiles`, zodat reacties van verwijderde gebruikers nog steeds opvraagbaar zijn.
- De `runtime` is ingesteld op `"nodejs"` voor deze routes (niet Edge).

## Gerelateerde Documentatie

- [Overzicht Admin Eindpunten](./admin-endpoints.md)
- [Openbare Reactie-eindpunten](./comment-endpoints.md)
- [Antwoordpatronen](./response-patterns.md)
- [Verzoekvalidatie](./request-validation.md)
