---
id: vote-endpoints
title: "Vote Endpoints"
sidebar_label: "Vote Endpoints"
---

# Stem-eindpunten

Het stemsysteem biedt eindpunten voor het omhoog en omlaag stemmen op items. Stemmen gebruiken een nettoscoremodel waarbij het aantal de upvotes minus de downvotes vertegenwoordigt. Openbare eindpunten geven stemaantallen terug, terwijl geauthenticeerde eindpunten het uitbrengen, bijwerken en verwijderen van stemmen mogelijk maken. Geblokkeerde gebruikers kunnen niet stemmen.

## Overzicht

| Eindpunt | Methode | Authenticatie | Beschrijving |
|---|---|---|---|
| `/api/items/[slug]/votes` | GET | Openbaar | Stemaantal en stemstatus van gebruiker ophalen |
| `/api/items/[slug]/votes` | POST | Gebruiker | Een stem uitbrengen of bijwerken |
| `/api/items/[slug]/votes` | DELETE | Gebruiker | Een stem verwijderen |
| `/api/items/[slug]/votes/count` | GET | Openbaar | Alleen het nettostemaantal ophalen |
| `/api/items/[slug]/votes/status` | GET | Gebruiker | Volledige stemrecord voor gebruiker ophalen |

## Gecombineerd stemeindpunt

### Steminformatie ophalen

```
GET /api/items/[slug]/votes
```

Geeft het nettostemaantal voor een item terug en de stemstatus van de huidige gebruiker als die geauthenticeerd is. Authenticatie is niet vereist, maar geauthenticeerde gebruikers ontvangen hun stemstatus in de reactie.

**Padparameters:**

| Parameter | Type | Beschrijving |
|---|---|---|
| `slug` | string | Slug van het item |

**Succesreactie (200):**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `success` | boolean | Altijd `true` bij succes |
| `count` | integer | Nettostemaantal (upvotes minus downvotes) |
| `userVote` | string of null | `"up"`, `"down"`, of `null` als niet geauthenticeerd of geen stem |

Voor niet-geauthenticeerde gebruikers is `userVote` altijd `null`. Het `count` kan negatief zijn als er meer downvotes dan upvotes zijn.

**Bron:** `template/app/api/items/[slug]/votes/route.ts`

### Een stem uitbrengen of bijwerken

```
POST /api/items/[slug]/votes
```

Brengt een nieuwe stem uit of vervangt een bestaande stem op een item. Als de gebruiker al een stem heeft, wordt de vorige stem verwijderd voordat de nieuwe wordt aangemaakt. Dit betekent dat het wijzigen van upvote naar downvote (of vice versa) één bewerking is.

**Authenticatie:** Vereist

**Aanvraagbody:**

```json
{
  "type": "up"
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `type` | string | Ja | `"up"` voor upvote, `"down"` voor downvote |

**Succesreactie (200):**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

De reactie geeft het bijgewerkte nettostemaantal terug nadat de stem is verwerkt.

**Foutreacties:**

| Status | Voorwaarde |
|---|---|
| 400 | Ongeldig stemtype (moet `"up"` of `"down"` zijn) |
| 401 | Niet geauthenticeerd |
| 403 | Gebruiker is geschorst of verbannen |
| 404 | Clientprofiel niet gevonden |

**Bron:** `template/app/api/items/[slug]/votes/route.ts`

### Stem verwijderen

```
DELETE /api/items/[slug]/votes
```

Verwijdert de stem van de huidige gebruiker van een item. Als er geen stem bestaat, wordt de bewerking succesvol voltooid zonder fout (idempotent). Na verwijdering is `userVote` `null`.

**Authenticatie:** Vereist

**Succesreactie (200):**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd |
| 404 | Clientprofiel niet gevonden |

**Bron:** `template/app/api/items/[slug]/votes/route.ts`

## Stemaantaleindpunt

### Stemaantal ophalen

```
GET /api/items/[slug]/votes/count
```

Geeft alleen het nettostemaantal voor een item terug. Dit is een lichtgewicht openbaar eindpunt, geoptimaliseerd voor het snel ophalen van stemaantallen zonder gebruikersspecifieke stemstatus.

**Succesreactie (200):**

```json
{
  "success": true,
  "count": 15
}
```

Het aantal kan positief, negatief of nul zijn afhankelijk van de verhouding tussen upvotes en downvotes.

**Bron:** `template/app/api/items/[slug]/votes/count/route.ts`

## Stemstatuseindpunt

### Stemstatus van gebruiker ophalen

```
GET /api/items/[slug]/votes/status
```

Geeft het volledige stemrecord terug voor de geauthenticeerde gebruiker op een specifiek item. Geeft `null` terug als de gebruiker niet op het item heeft gestemd.

**Authenticatie:** Vereist

**Succesreactie (200) -- Gebruiker heeft gestemd:**

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Succesreactie (200) -- Geen stem:**

```json
null
```

Dit eindpunt geeft de onbewerkte database `voteType`-waarden (`"UPVOTE"` of `"DOWNVOTE"`) terug in plaats van het vereenvoudigde formaat `"up"` / `"down"` dat door het gecombineerde eindpunt wordt gebruikt.

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd |
| 404 | Clientprofiel niet gevonden |

**Bron:** `template/app/api/items/[slug]/votes/status/route.ts`

## Belangrijke implementatiedetails

- **Nettoscore:** Het stemaantal wordt berekend als upvotes minus downvotes. Een negatief aantal geeft aan dat er meer downvotes dan upvotes zijn.
- **Stemvervanging:** Wanneer een gebruiker het stemtype wijzigt, wordt de bestaande stem verwijderd en een nieuwe aangemaakt. Er is geen update ter plaatse.
- **Preventie van geblokkeerde gebruikers:** De controle `isUserBlocked()` op het POST-eindpunt voorkomt dat geschorste of verbande gebruikers stemmen. De blokkeercontrole wordt alleen afgedwongen bij het aanmaken van een stem, niet bij het verwijderen ervan.
- **VoteType-enum:** De database slaat stemmen op als `VoteType.UPVOTE` en `VoteType.DOWNVOTE`. De API vertaalt deze naar `"up"` en `"down"` voor externe consumenten.
- **Idempotent verwijderen:** Het verwijderen van een stem die niet bestaat geeft nog steeds een 200-reactie terug met het huidige aantal en `userVote: null`.
