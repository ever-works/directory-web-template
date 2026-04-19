---
id: items-api-endpoints-deep-dive
title: "Items API Endpoints Deep Dive"
sidebar_label: "Items API Endpoints Deep Dive"
sidebar_position: 65
---

# Items API Eindpunten - Diepgaande Analyse

De Items API biedt publieke eindpunten voor interactie met items, inclusief reacties, stemmen, weergavetracering, bedrijfsassociaties en betrokkenheidsstatistieken. Deze eindpunten vormen de kern van de gebruikersgerichte functies van de directorywebsite.

**Bronmap:** `template/app/api/items/`

---

## Routekaart

| Methode | Pad | Authenticatie | Beschrijving |
|---------|-----|---------------|--------------|
| `GET` | `/api/items/{slug}/comments` | Publiek | Reacties op item ophalen |
| `POST` | `/api/items/{slug}/comments` | Sessie | Een reactie aanmaken |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Sessie (eigenaar) | Een reactie bijwerken |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Sessie (eigenaar) | Een reactie verwijderen |
| `GET` | `/api/items/{slug}/comments/rating` | Publiek | Beoordelingsstatistieken ophalen |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Publiek | Beoordeling van afzonderlijke reactie ophalen |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Publiek | Beoordeling van reactie bijwerken |
| `GET` | `/api/items/{slug}/company` | Beheerder | Bedrijf van item ophalen |
| `POST` | `/api/items/{slug}/company` | Beheerder | Bedrijf aan item koppelen |
| `DELETE` | `/api/items/{slug}/company` | Beheerder | Bedrijfskoppeling van item verwijderen |
| `POST` | `/api/items/{slug}/views` | Publiek | Itemweergave registreren |
| `GET` | `/api/items/{slug}/votes` | Publiek | Steminfo + gebruikersstatus ophalen |
| `POST` | `/api/items/{slug}/votes` | Sessie | Stem uitbrengen of bijwerken |
| `DELETE` | `/api/items/{slug}/votes` | Sessie | Stem verwijderen |
| `GET` | `/api/items/{slug}/votes/count` | Publiek | Alleen stemtelling ophalen |
| `GET` | `/api/items/{slug}/votes/status` | Sessie | Stemrecord van gebruiker ophalen |
| `GET` | `/api/items/engagement` | Publiek | Batch betrokkenheidsstatistieken |
| `GET` | `/api/items/popularity-scores` | Publiek | Debug populariteitsscores |

---

## Reacties

### Reacties Ophalen

Geeft alle reacties voor een specifiek item terug, inclusief gebruikersprofielinformatie.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/comments` |
| **Authenticatie** | Geen (publiek) |
| **Bron** | `items/[slug]/comments/route.ts` |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
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

#### curl-voorbeeld

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Reactie Aanmaken

Maakt een nieuwe reactie met een beoordeling aan voor een item.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/items/{slug}/comments` |
| **Authenticatie** | Sessie (gebruiker met clientprofiel) |
| **Bron** | `items/[slug]/comments/route.ts` |

#### Aanvraagbody

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `content` | `string` | Ja | Reactietekst (moet niet leeg zijn) |
| `rating` | `integer` | Ja | Beoordeling van 1 tot 5 |

#### Reacties

| Status | Beschrijving |
|--------|--------------|
| 200 | Reactie succesvol aangemaakt |
| 400 | Ongeldige inhoud of beoordeling |
| 401 | Authenticatie vereist |
| 403 | Gebruiker is geblokkeerd (geschorst of verbannen) |
| 404 | Clientprofiel niet gevonden |
| 500 | Serverfout |

**Status 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### curl-voorbeeld

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderatie
Geblokkeerde gebruikers (geschorst of verbannen) ontvangen een 403-reactie met een bericht dat hun blokkeerstatus uitlegt. De `isUserBlocked()`-controle wordt uitgevoerd met behulp van het statusveld van het clientprofiel.
:::

---

### Reactie Bijwerken

Werkt de inhoud en/of beoordeling van een reactie bij. Alleen de auteur van de reactie kan zijn reactie bijwerken.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `PUT` |
| **Pad** | `/api/items/{slug}/comments/{commentId}` |
| **Authenticatie** | Sessie (reactie-eigenaar) |
| **Bron** | `items/[slug]/comments/[commentId]/route.ts` |

#### Aanvraagbody

Er moet minimaal één veld opgegeven worden:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Veld | Type | Vereist | Beperkingen |
|------|------|---------|-------------|
| `content` | `string` | Nee | 1-1000 tekens |
| `rating` | `integer` | Nee | 1-5 |

#### Reactie

**Status 200** -- Geeft de bijgewerkte reactie terug met gebruikersinformatie en een `editedAt`-tijdstempel.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Reactie Verwijderen

Verwijdert een reactie zacht. Alleen de auteur van de reactie kan zijn reactie verwijderen.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `DELETE` |
| **Pad** | `/api/items/{slug}/comments/{commentId}` |
| **Authenticatie** | Sessie (reactie-eigenaar) |
| **Bron** | `items/[slug]/comments/[commentId]/route.ts` |

#### Reactie

**Status 204** -- Geen inhoud (reactie succesvol verwijderd).

| Status | Beschrijving |
|--------|--------------|
| 204 | Reactie verwijderd |
| 401 | Niet geautoriseerd |
| 404 | Reactie niet gevonden of niet geautoriseerd |

#### curl-voorbeeld

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Beoordelingsstatistieken Ophalen

Geeft geaggregeerde beoordelingsstatistieken terug voor een item: gemiddelde beoordeling en totaaltelling.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/comments/rating` |
| **Authenticatie** | Geen (publiek) |
| **Bron** | `items/[slug]/comments/rating/route.ts` |

#### Reactie

**Status 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Veld | Type | Beschrijving |
|------|------|--------------|
| `averageRating` | `number` | Gemiddelde beoordeling (0 als geen beoordelingen, max 5) |
| `totalRatings` | `number` | Totaal aantal niet-verwijderde reacties met beoordelingen |

#### curl-voorbeeld

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Afzonderlijke Reactiebeoordeling Ophalen/Bijwerken

#### Reactiebeoordeling Ophalen

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Authenticatie** | Geen (publiek) |

Geeft het volledige reactieobject terug voor een specifieke reactie-ID.

#### Reactiebeoordeling Bijwerken

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `PATCH` |
| **Pad** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Authenticatie** | Geen |

**Aanvraagbody:**
```json
{
  "rating": 4
}
```

Geeft het bijgewerkte reactieobject terug.

---

## Bedrijfsassociatie

Beheerder-exclusieve eindpunten voor het beheren van de relatie tussen items en bedrijven.

### Bedrijf van Item Ophalen

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/company` |
| **Authenticatie** | Beheerder |
| **Bron** | `items/[slug]/company/route.ts` |

#### Reactie

**Status 200** -- Bedrijf gevonden.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**Status 200** -- Geen bedrijf gekoppeld.

```json
{
  "success": true,
  "data": null
}
```

---

### Bedrijf aan Item Koppelen

Koppelt een bedrijf aan een item. Deze operatie is idempotent.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/items/{slug}/company` |
| **Authenticatie** | Beheerder |
| **Bron** | `items/[slug]/company/route.ts` |

#### Aanvraagbody

```json
{
  "companyId": "company_123"
}
```

#### Reacties

**Status 201** -- Nieuwe associatie aangemaakt.

```json
{
  "success": true,
  "data": { /* associatie-object */ },
  "created": true,
  "updated": false
}
```

**Status 200** -- Bestaande associatie bijgewerkt.

```json
{
  "success": true,
  "data": { /* associatie-object */ },
  "created": false,
  "updated": true
}
```

**Status 409** -- Item is al gekoppeld aan een ander bedrijf.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### Bedrijfskoppeling van Item Verwijderen

Verwijdert de bedrijfsassociatie van een item. Deze operatie is idempotent.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `DELETE` |
| **Pad** | `/api/items/{slug}/company` |
| **Authenticatie** | Beheerder |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### curl-voorbeeld

```bash
# Bedrijf koppelen
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Bedrijf verwijderen
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Weergaven

### Itemweergave Registreren

Registreert een unieke dagelijkse weergave voor een item met ingebouwde deduplicatie, botdetectie en eigenaarsuitsluiting.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/items/{slug}/views` |
| **Authenticatie** | Geen (publiek) |
| **Bron** | `items/[slug]/views/route.ts` |

#### Verwerkingsstroom

1. **Databasecontrole** -- verifieert databasebeschikbaarheid.
2. **Botdetectie** -- weigert bekende bot-user agents.
3. **Itemvalidatie** -- bevestigt dat het item bestaat (geeft 404 terug als niet gevonden).
4. **Eigenaarsuitsluiting** -- slaat tellen over als de kijker de itemeigenaar is (indien geauthenticeerd).
5. **Kijker-ID** -- leest of maakt een kijkercookie aan (`VIEWER_COOKIE_NAME`) voor anonieme tracering.
6. **Dagelijkse deduplicatie** -- registreert de weergave slechts eenmaal per kijker per dag.

#### Reactie

**Status 200** -- Weergave verwerkt.

```json
{ "success": true, "counted": true }
```

| Scenario | `counted` | `reason` |
|----------|-----------|----------|
| Nieuwe weergave geregistreerd | `true` | -- |
| Dubbele weergave (zelfde dag) | `false` | -- |
| Bot gedetecteerd | `false` | `"bot"` |
| Eigenaar bekijkt eigen item | `false` | `"owner"` |

**Status 404** -- Item niet gevonden.

```json
{ "success": false, "error": "Item not found" }
```

#### curl-voorbeeld

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Implementatienotities

- De kijkercookie is `HttpOnly`, `Secure` in productie en heeft `SameSite: lax`.
- Weergavededuplicatie is gebaseerd op `(itemId, viewerId, viewedDateUtc)` waarbij de datum `YYYY-MM-DD` in UTC is.
- De hulpprogramma `isBot()` controleert de user agent op bekende botpatronen.

---

## Stemmen

### Steminformatie Ophalen

Geeft het totale stemtelling terug en de huidige stemstatus van de gebruiker (indien geauthenticeerd).

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/votes` |
| **Authenticatie** | Geen (publiek; gebruikersstatus vereist sessie) |
| **Bron** | `items/[slug]/votes/route.ts` |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Veld | Type | Beschrijving |
|------|------|--------------|
| `count` | `number` | Netto stemtelling (stemmen voor - stemmen tegen) |
| `userVote` | `"up" \| "down" \| null` | Stem van gebruiker (`null` indien niet geauthenticeerd of geen stem) |

---

### Stem Uitbrengen of Bijwerken

Brengt een nieuwe stem uit of vervangt een bestaande stem.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/items/{slug}/votes` |
| **Authenticatie** | Sessie (gebruiker met clientprofiel) |
| **Bron** | `items/[slug]/votes/route.ts` |

#### Aanvraagbody

```json
{
  "type": "up"
}
```

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `type` | `string` | Ja | Stemtype: `"up"` of `"down"` |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Status | Beschrijving |
|--------|--------------|
| 200 | Stem succesvol uitgebracht |
| 400 | Ongeldig stemtype |
| 401 | Niet geautoriseerd |
| 403 | Gebruiker is geblokkeerd (geschorst/verbannen) |
| 404 | Clientprofiel niet gevonden |

#### curl-voorbeeld

```bash
# Stem voor
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Stem tegen
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### Stem Verwijderen

Verwijdert de stem van de huidige gebruiker van een item.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `DELETE` |
| **Pad** | `/api/items/{slug}/votes` |
| **Authenticatie** | Sessie (gebruiker met clientprofiel) |
| **Bron** | `items/[slug]/votes/route.ts` |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Stemtelling Ophalen

Een lichtgewicht eindpunt dat alleen de stemtelling teruggeeft (geen gebruikersstatus).

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/votes/count` |
| **Authenticatie** | Geen (publiek) |
| **Bron** | `items/[slug]/votes/count/route.ts` |

#### Reactie

**Status 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### Gebruikers Stemstatus Ophalen

Geeft het volledige stemrecord terug voor de stem van de geauthenticeerde gebruiker op een specifiek item.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/{slug}/votes/status` |
| **Authenticatie** | Sessie (gebruiker) |
| **Bron** | `items/[slug]/votes/status/route.ts` |

#### Reactie

**Status 200** -- Gebruiker heeft gestemd.

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

**Status 200** -- Gebruiker heeft niet gestemd.

```json
null
```

---

## Betrokkenheidsstatistieken

### Batch Betrokkenheidsstatistieken

Haalt betrokkenheidsstatistieken op (weergaven, stemmen, beoordelingen, favorieten, reacties) voor meerdere items in één verzoek.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/engagement` |
| **Authenticatie** | Geen (publiek) |
| **Caching** | `force-dynamic` |
| **Bron** | `items/engagement/route.ts` |

#### Queryparameters

| Parameter | Type | Vereist | Beschrijving |
|-----------|------|---------|--------------|
| `slugs` | `string` | Ja | Door komma's gescheiden lijst van item-slugs (max 200) |

#### Reactie

**Status 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Foutreacties

| Status | Beschrijving |
|--------|--------------|
| 400 | Ontbrekende parameter `slugs` of meer dan 200 slugs |

#### curl-voorbeeld

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### Populariteitsscores (Debug)

Een debug-eindpunt dat items gesorteerd op hun berekende populariteitsscore teruggeeft met een gedetailleerde uitsplitsing van scoringsfactoren.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/items/popularity-scores` |
| **Authenticatie** | Geen (publiek) |
| **Caching** | `force-dynamic` |
| **Bron** | `items/popularity-scores/route.ts` |

#### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|--------------|
| `limit` | `integer` | Nee | `20` | Aantal terug te geven items (max 100) |
| `locale` | `string` | Nee | `"en"` | Taal voor items |

#### Reactie

**Status 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### Scoresalgoritme

De populariteitsscore gebruikt logaritmische schaling om te voorkomen dat uitschieters de ranglijst domineren:

| Factor | Gewicht | Formule |
|--------|---------|---------|
| Uitgelicht-bonus | 10.000 | Vaste bonus voor uitgelichte items |
| Weergaven | 1.000 | `log10(views + 1) * 1000` |
| Stemmen | 1.200 | `log10(max(votes, 0) + 1) * 1200` |
| Gemiddelde beoordeling | 500 | `avgRating * 500` |
| Favorieten | 1.100 | `log10(favorites + 1) * 1100` |
| Reacties | 1.000 | `log10(comments + 1) * 1000` |
| Recentheid | tot 1.000 | Afnemende bonus voor items jonger dan 180 dagen |

Items zonder betrokkenheidsgegevens ontvangen een kleine heuristische score op basis van metagegevenskwaliteit (aantal tags, naamlengte, aanwezigheid van pictogram, promotiecode).

#### curl-voorbeeld

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## TypeScript-gebruik

```typescript
// Reacties ophalen voor een item
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Een reactie plaatsen
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Stemmen voor een item
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`Nieuw stemtelling: ${voteRes.count}`);

// Een weergave registreren
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Betrokkenheid ophalen voor meerdere items in batch
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Beoordelingsstatistieken ophalen
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```
