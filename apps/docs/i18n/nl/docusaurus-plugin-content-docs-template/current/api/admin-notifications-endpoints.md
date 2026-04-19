---
id: admin-notifications-endpoints
title: "Admin Notifications API Endpoints"
sidebar_label: "Admin Notifications API Endpoints"
---

# Admin Meldingen API Eindpunten

De Admin Meldingen API beheert in-app meldingen voor admin-gebruikers. Het ondersteunt het weergeven van meldingen met ongelezen tellingen, het aanmaken van nieuwe meldingen voor specifieke gebruikers en het markeren van meldingen als gelezen (afzonderlijk of in bulk). Meldingen worden opgeslagen in de database en zijn gekoppeld aan individuele gebruikers.

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin | Meldingen weergeven voor huidige beheerder |
| `POST` | `/api/admin/notifications` | Geauthenticeerd | Een nieuwe melding aanmaken |
| `PATCH` | `/api/admin/notifications/{id}/read` | Geauthenticeerd | Een enkele melding als gelezen markeren |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Geauthenticeerd | Alle meldingen als gelezen markeren |

## Authenticatie

De meldingseindpunten gebruiken twee niveaus van authenticatie:

**Alleen beheerder (GET-lijst):** Vereist zowel authenticatie als beheerdersrol.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Geauthenticeerde gebruiker (POST, PATCH):** Vereist een geldige sessie maar geen beheerdersrol. De als-gelezen-markeer-eindpunten zijn gekoppeld aan de eigen meldingen van de geauthenticeerde gebruiker.

## Eindpunten

### GET `/api/admin/notifications`

Haalt de laatste 50 meldingen op voor de geauthenticeerde beheerder, gesorteerd op aanmaakdatum (nieuwste eerst). Geeft ook het totale aantal ongelezen meldingen terug.

**Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Gedragsdetails:**
- Maximaal 50 meldingen worden per verzoek geretourneerd
- Resultaten zijn geordend op `createdAt` aflopend (nieuwste eerst)
- `unreadCount` wordt apart berekend door meldingen te tellen waarbij `isRead = false`
- Meldingen zijn gekoppeld aan de ID van de geauthenticeerde gebruiker

### POST `/api/admin/notifications`

Maakt een nieuwe melding aan voor een opgegeven gebruiker. Het veld `data` accepteert een object dat wordt JSON-geserialiseerd voor opslag. Dit eindpunt vereist geen beheerdersrechten — elke geauthenticeerde gebruiker kan meldingen aanmaken (doorgaans intern door het systeem aangeroepen).

**Verzoeklichaam:**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `type` | string | Ja | Meldingstype-identifier (bijv. `"item_approved"`, `"comment_received"`) |
| `title` | string | Ja | Korte meldingstitel |
| `message` | string | Ja | Volledig meldingsbericht |
| `userId` | string | Ja | Doel-gebruikers-ID om de melding te ontvangen |
| `data` | object | Nee | Aanvullende metadata (JSON-geserialiseerd bij opslag) |

**Antwoord (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

Markeert een specifieke melding als gelezen. Stelt `isRead` in op `true`, registreert de huidige tijdstempel in `readAt` en werkt `updatedAt` bij. Alleen de eigenaar van de melding kan zijn eigen meldingen markeren — de query filtert op zowel meldings-ID als geauthenticeerde gebruikers-ID.

**Padparameters:**

| Parameter | Type | Beschrijving |
|-----------|------|-------------|
| `id` | string | Unieke identifier van de melding |

**Antwoord (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

Markeert alle ongelezen meldingen voor de geauthenticeerde gebruiker als gelezen in één bulkbewerking. Werkt `isRead`, `readAt` en `updatedAt` bij voor elke overeenkomende melding. Geeft het aantal bijgewerkte meldingen terug.

**Antwoord (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Gedragsdetails:**
- Werkt alleen meldingen bij waarbij `isRead = false` voor de huidige gebruiker
- `updatedCount` kan `0` zijn als er geen ongelezen meldingen zijn
- Alle overeenkomende meldingen worden bijgewerkt in één databasequery

## Melding Gegevensmodel

| Veld | Type | Nullable | Beschrijving |
|-------|------|----------|-------------|
| `id` | string | Nee | Unieke meldings-identifier |
| `userId` | string | Nee | ID van de gebruiker die de melding ontvangt |
| `type` | string | Nee | Meldingstype (bijv. `"item_approved"`, `"comment_received"`) |
| `title` | string | Nee | Korte weergavetitel |
| `message` | string | Nee | Volledig meldingsbericht |
| `data` | string | Ja | JSON-geserialiseerde aanvullende metadata |
| `isRead` | boolean | Nee | Of de melding gelezen is |
| `readAt` | datetime | Ja | Tijdstempel wanneer als gelezen gemarkeerd |
| `createdAt` | datetime | Nee | Aanmaaktijdstempel |
| `updatedAt` | datetime | Ja | Tijdstempel van laatste update |

## Foutcodes

| Status | Fout | Oorzaak |
|--------|-------|-------|
| `400` | Vereiste velden ontbreken | POST mist type, title, message of userId |
| `400` | Meldings-ID is vereist | PATCH met leeg ID-parameter |
| `401` | Onbevoegd | Geen actieve sessie |
| `403` | Verboden | Niet-beheerder op GET-lijsteindpunt |
| `404` | Melding niet gevonden | Ongeldig ID of melding behoort tot een andere gebruiker |
| `500` | Interne serverfout | Database- of serverstoring |

## Veelvoorkomende Meldingstypes

Het veld `type` is een vrije tekst, maar de applicatie gebruikt doorgaans deze waarden:

| Type | Beschrijving |
|------|-------------|
| `item_approved` | Een item is goedgekeurd door een beheerder |
| `item_rejected` | Een item is afgewezen |
| `comment_received` | Er is een nieuwe reactie geplaatst op een item |
| `submission_received` | Er is een nieuwe iteminzending ontvangen |

## Gerelateerde Documentatie

- [Overzicht Admin Eindpunten](./admin-endpoints.md)
- [Antwoordpatronen](./response-patterns.md)
- [Verzoekvalidatie](./request-validation.md)
