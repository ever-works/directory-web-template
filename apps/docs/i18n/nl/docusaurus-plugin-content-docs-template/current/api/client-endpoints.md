---
id: client-endpoints
title: "Client API Endpoints"
sidebar_label: "Client API Endpoints"
---

# Client API Eindpunten

Client-gerichte API-eindpunten bedienen geverifieerde eindgebruikers (niet-admin). Deze routes verwerken het clientdashboard, iteminzendingen, favoritenbeheer en publieke iteminteracties zoals opmerkingen, stemmen en weergaven.

## Client Dashboard & Items (`/api/client`)

Alle `/api/client/*`-routes vereisen een geverifieerde sessie met een geldig `clientProfileId`.

### Dashboard

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/client/dashboard/stats` | Clientdashboardstatistieken (itemsaantal, weergaven, betrokkenheid) |

### Clientitems

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/client/items` | Items van de huidige client weergeven |
| `POST` | `/api/client/items` | Een nieuw item indienen voor beoordeling |
| `GET` | `/api/client/items/stats` | Clientitemstatistieken (gepubliceerd, in behandeling, afgewezen) |
| `GET` | `/api/client/items/coordinates` | Coördinaten voor clientitems ophalen |
| `GET` | `/api/client/items/[id]` | Itemdetails ophalen |
| `PUT` | `/api/client/items/[id]` | Eigen item bijwerken |
| `DELETE` | `/api/client/items/[id]` | Eigen item verwijderen (zachte verwijdering) |
| `POST` | `/api/client/items/[id]/restore` | Een zacht-verwijderd item herstellen |

### Geo-statistieken

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/client/geo-stats` | Geografische statistieken voor clientitems |

## Publieke Iteminteracties (`/api/items`)

Deze eindpunten verwerken publieke itemfuncties. Sommige vereisen authenticatie (bijv. stemmen), terwijl andere volledig openbaar zijn (bijv. weergeven).

### Opmerkingen

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/items/[slug]/comments` | Opmerkingen voor een item weergeven | Openbaar |
| `POST` | `/api/items/[slug]/comments` | Een opmerking toevoegen | Vereist |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Opmerkingdetails ophalen | Openbaar |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Eigen opmerking bijwerken | Vereist |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Eigen opmerking verwijderen | Vereist |

### Opmerkingbeoordelingen

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/items/[slug]/comments/rating` | Beoordelingsoverzicht ophalen | Openbaar |
| `POST` | `/api/items/[slug]/comments/rating` | Een beoordeling indienen | Vereist |
| `GET` | `/api/items/[slug]/comments/rating/[commentId]` | Beoordeling voor een opmerking ophalen | Openbaar |

### Stemmen

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/items/[slug]/votes/count` | Stemtelling ophalen | Openbaar |
| `GET` | `/api/items/[slug]/votes/status` | Stemstatus huidige gebruiker ophalen | Vereist |
| `POST` | `/api/items/[slug]/votes` | Op een item stemmen (omhoog/omlaag) | Vereist |

### Weergaven

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `POST` | `/api/items/[slug]/views` | Een paginaweergave registreren | Openbaar |

### Betrokkenheid & Populariteit

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/items/engagement` | Betrokkenheidsstatistieken voor items ophalen | Openbaar |
| `GET` | `/api/items/popularity-scores` | Berekende populariteitsscores ophalen | Openbaar |

### Bedrijf

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/items/[slug]/company` | Bedrijfsinformatie voor een item ophalen | Openbaar |

## Favorieten (`/api/favorites`)

Beheer de favoriete items van een gebruiker. Alle favorieten-eindpunten vereisen authenticatie.

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/favorites` | Favoriete items van huidige gebruiker weergeven |
| `POST` | `/api/favorites/[itemSlug]` | Favorietenstatus voor een item omschakelen |
| `DELETE` | `/api/favorites/[itemSlug]` | Item uit favorieten verwijderen |

## Gebruikersprofiel (`/api/user`)

Gebruikersprofiel en abonnementbeheereindpunten.

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/user/profile/location` | Gedetecteerde locatie van gebruiker ophalen |
| `GET` | `/api/user/currency` | Gedetecteerde/voorkeur valuta ophalen |
| `GET` | `/api/user/plan-status` | Huidige abonnementsplanstatus ophalen |
| `GET` | `/api/user/subscription` | Abonnementsdetails ophalen |
| `GET` | `/api/user/payments` | Betalingsgeschiedenis ophalen |

## Huidige Gebruiker (`/api/current-user`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/current-user` | Geverifieerde gebruikerssessiegegevens ophalen |

## Sponsor Advertenties - Gebruiker (`/api/sponsor-ads/user`)

Eindpunten voor gebruikers die hun eigen gesponsorde advertenties beheren.

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/sponsor-ads/user` | Sponsor advertenties van gebruiker weergeven |
| `GET` | `/api/sponsor-ads/user/stats` | Prestatiestatistieken van gebruikersadvertenties |
| `GET` | `/api/sponsor-ads/user/[id]` | Advertentiedetails ophalen |
| `PUT` | `/api/sponsor-ads/user/[id]` | Eigen advertentie bijwerken |
| `POST` | `/api/sponsor-ads/user/[id]/cancel` | Eigen advertentie annuleren |
| `POST` | `/api/sponsor-ads/user/[id]/renew` | Verlopen advertentie verlengen |

## Enquêtes (`/api/surveys`)

Enquêtebeheer en antwoordenverzameling.

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `GET` | `/api/surveys` | Gepubliceerde enquêtes weergeven | Openbaar |
| `GET` | `/api/surveys/[surveyId]` | Enquêtedetails ophalen | Openbaar |
| `POST` | `/api/surveys/[surveyId]/responses` | Enquêteantwoord indienen | Openbaar |
| `GET` | `/api/surveys/responses/[responseId]` | Antwoorddetails ophalen | Vereist |

## Rapporten (`/api/reports`)

| Methode | Pad | Beschrijving | Auth |
|---------|-----|-------------|------|
| `POST` | `/api/reports` | Een inhoudsrapport indienen | Vereist |

## Openbare Gegevenseindpunten

Deze eindpunten vereisen geen authenticatie:

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/categories/exists` | Controleer of een categorie-slug bestaat |
| `GET` | `/api/collections/exists` | Controleer of een collectie-slug bestaat |
| `GET` | `/api/featured-items` | Uitgelichte items weergeven |
| `GET` | `/api/sponsor-ads` | Actieve sponsor advertenties voor weergave ophalen |
| `POST` | `/api/sponsor-ads/checkout` | Sponsor advertentie checkout starten |

## Paginatiepatronen

Client-gerichte lijsteindpunten ondersteunen de standaard paginatieparameters:

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
GET /api/items/[slug]/comments?page=1&limit=20
GET /api/favorites?page=1&limit=50
```

Antwoorden bevatten paginatieMetadata:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
