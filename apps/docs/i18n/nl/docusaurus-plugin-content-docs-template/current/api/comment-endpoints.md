---
id: comment-endpoints
title: "Comment Endpoints"
sidebar_label: "Comment Endpoints"
---

# Opmerking Eindpunten

Het opmerkingssysteem biedt eindpunten voor het aanmaken, lezen, bijwerken en verwijderen van opmerkingen op items. Opmerkingen bevatten een 1-5 sterren beoordeling en ondersteunen zowel openbare toegang (lezen) als geverifieerde bewerkingen (aanmaken/bewerken/verwijderen). Admin-eindpunten bieden moderatiemogelijkheden.

## Overzicht

### Openbare Eindpunten

| Eindpunt | Methode | Auth | Beschrijving |
|---------|---------|------|--------------|
| `/api/items/[slug]/comments` | GET | Openbaar | Opmerkingen voor een item weergeven |
| `/api/items/[slug]/comments/rating` | GET | Openbaar | Samengevoegde beoordelingsstatistieken ophalen |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Openbaar | Beoordeling van een enkele opmerking ophalen |

### Geverifieerde Eindpunten

| Eindpunt | Methode | Auth | Beschrijving |
|---------|---------|------|--------------|
| `/api/items/[slug]/comments` | POST | Gebruiker | Een nieuwe opmerking aanmaken |
| `/api/items/[slug]/comments/[commentId]` | PUT | Eigenaar | Eigen opmerking bijwerken |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Eigenaar | Eigen opmerking verwijderen |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | Gebruiker | Beoordeling van een opmerking bijwerken |

### Admin-eindpunten

| Eindpunt | Methode | Auth | Beschrijving |
|---------|---------|------|--------------|
| `/api/admin/comments` | GET | Admin | Alle opmerkingen weergeven met paginering |
| `/api/admin/comments/[id]` | GET | Admin | Opmerking ophalen op ID |
| `/api/admin/comments/[id]` | PUT | Admin | Opmerkinginhoud bijwerken |
| `/api/admin/comments/[id]` | DELETE | Admin | Opmerking zacht verwijderen |

## Openbare Eindpunten

### Itemsopmerkingen Weergeven

```
GET /api/items/[slug]/comments
```

Geeft alle opmerkingen voor een specifiek item terug inclusief gebruikersprofielinformatie. Geen authenticatie vereist.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `slug` | string | Item-slug |

**Succesvol Antwoord (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Bron:** `template/app/api/items/[slug]/comments/route.ts`

### Beoordelingsstatistieken Ophalen

```
GET /api/items/[slug]/comments/rating
```

Geeft de gemiddelde beoordeling en het totale aantal beoordelingen voor een item terug. Telt alleen niet-verwijderde opmerkingen.

**Succesvol Antwoord (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Geeft `averageRating: 0` en `totalRatings: 0` terug wanneer er geen beoordelingen zijn.

**Bron:** `template/app/api/items/[slug]/comments/rating/route.ts`

## Geverifieerde Eindpunten

### Opmerking Aanmaken

```
POST /api/items/[slug]/comments
```

Maakt een nieuwe opmerking aan met een beoordeling op een item. Vereist authenticatie en een geldig clientprofiel. Geblokkeerde gebruikers kunnen geen opmerkingen plaatsen.

**Authenticatie:** Vereist

**Verzoeklichaam:**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

| Veld | Type | Vereist | Beperkingen |
|------|------|---------|------------|
| `content` | string | Ja | Mag niet leeg zijn na trimmen |
| `rating` | integer | Ja | Moet tussen 1 en 5 inclusief zijn |

**Succesvol Antwoord (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Status | Conditie |
|--------|----------|
| 400 | Lege inhoud of ongeldige beoordeling |
| 401 | Niet geverifieerd |
| 403 | Gebruiker is geschorst of verbannen |
| 404 | Clientprofiel niet gevonden |

**Bron:** `template/app/api/items/[slug]/comments/route.ts`

### Opmerking Bijwerken

```
PUT /api/items/[slug]/comments/[commentId]
```

Werkt de inhoud en/of beoordeling van een bestaande opmerking bij. Alleen de opmerkingsauteur kan zijn eigen opmerking bijwerken. Minimaal één van `content` of `rating` moet worden opgegeven.

**Authenticatie:** Vereist (moet eigenaar van opmerking zijn)

**Verzoeklichaam:**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

| Veld | Type | Vereist | Beperkingen |
|------|------|---------|------------|
| `content` | string | Nee | 1-1000 tekens |
| `rating` | integer | Nee | Moet tussen 1 en 5 zijn |

Het antwoord bevat de bijgewerkte opmerking met een `editedAt`-tijdstempel.

| Status | Conditie |
|--------|----------|
| 400 | Geen velden opgegeven, inhoud te lang of ongeldige beoordeling |
| 401 | Niet geverifieerd |
| 404 | Opmerking niet gevonden of gebruiker is niet de auteur |

**Bron:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Opmerking Verwijderen

```
DELETE /api/items/[slug]/comments/[commentId]
```

Verwijdert een opmerking zacht. Alleen de opmerkingsauteur kan zijn eigen opmerking verwijderen. De opmerking wordt gemarkeerd met een `deletedAt`-tijdstempel in plaats van permanent te worden verwijderd.

**Authenticatie:** Vereist (moet eigenaar van opmerking zijn)

**Succesvol Antwoord:** 204 Geen Inhoud

| Status | Conditie |
|--------|----------|
| 401 | Niet geverifieerd |
| 404 | Opmerking niet gevonden, al verwijderd of niet van gebruiker |

**Bron:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Opmerkingbeoordeling Bijwerken

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Werkt alleen de beoordeling van een specifieke opmerking bij.

**Verzoeklichaam:**

```json
{
  "rating": 4
}
```

**Bron:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Admin-eindpunten

Alle admin-eindpunten vereisen dat `session.user.isAdmin` true is.

### Alle Opmerkingen Weergeven

```
GET /api/admin/comments
```

Geeft een gepagineerde lijst terug van alle opmerkingen (met uitzondering van zacht-verwijderde) met gebruikersinformatie. Ondersteunt zoeken op opmerkinginhoud, gebruikersnaam en gebruikers-e-mail.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|-----------|-------------|
| `page` | integer | 1 | Paginanummer |
| `limit` | integer | 10 | Resultaten per pagina (1-100) |
