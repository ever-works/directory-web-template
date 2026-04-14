---
id: admin-endpoints
title: "Admin API Endpoints"
sidebar_label: "Admin API Endpoints"
---

# Admin API Eindpunten

De admin API bevat ongeveer 60 route-handlers verdeeld over 19 resourcegroepen. Alle admin-eindpunten worden beschermd door de `withAdminAuth`-middleware, die zowel authenticatie als beheerdersroltoewijzing verifieert via een databasequery.

## Authenticatie

Elk admin-eindpunt vereist:

1. Een geldige JWT-sessie (gecontroleerd via `auth()`)
2. Een beheerdersrol in de tabel `user_roles` (gecontroleerd via `isAdmin()` uit `lib/db/roles.ts`)

Niet-geauthenticeerde verzoeken ontvangen een `401`-antwoord. Geauthenticeerde maar niet-admin verzoeken ontvangen een `403`-antwoord.

## Resourcegroepen

### Categorieën (`/api/admin/categories`)

Beheer inhoudscategorieën met Git-gebaseerde persistentie.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Categorieën weergeven met paginering |
| `POST` | `/api/admin/categories` | Een nieuwe categorie aanmaken |
| `GET` | `/api/admin/categories/all` | Alle categorieën ophalen (zonder paginering) |
| `POST` | `/api/admin/categories/git` | Categorieën synchroniseren met Git-repository |
| `POST` | `/api/admin/categories/reorder` | Categorieposities herordenen |
| `GET` | `/api/admin/categories/[id]` | Categorie ophalen op ID |
| `PUT` | `/api/admin/categories/[id]` | Categorie bijwerken |
| `DELETE` | `/api/admin/categories/[id]` | Categorie verwijderen |

### Klanten (`/api/admin/clients`)

Beheer klantgebruikersaccounts en -profielen.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Klantprofielen weergeven met paginering |
| `POST` | `/api/admin/clients/advanced-search` | Geavanceerd zoeken naar klanten met filters |
| `POST` | `/api/admin/clients/bulk` | Bulkbewerkingen op klanten |
| `GET` | `/api/admin/clients/dashboard` | Statistieken klantdashboard |
| `GET` | `/api/admin/clients/stats` | Geaggregeerde klantstatistieken |
| `GET` | `/api/admin/clients/[clientId]` | Klantprofieldetails ophalen |
| `PUT` | `/api/admin/clients/[clientId]` | Klantprofiel bijwerken |
| `DELETE` | `/api/admin/clients/[clientId]` | Klantaccount verwijderen |

### Collecties (`/api/admin/collections`)

Beheer gecureerde itemcollecties.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Alle collecties weergeven |
| `POST` | `/api/admin/collections` | Een nieuwe collectie aanmaken |
| `GET` | `/api/admin/collections/[id]` | Collectiedetails ophalen |
| `PUT` | `/api/admin/collections/[id]` | Collectie bijwerken |
| `DELETE` | `/api/admin/collections/[id]` | Collectie verwijderen |
| `GET` | `/api/admin/collections/[id]/items` | Items in een collectie weergeven |
| `PUT` | `/api/admin/collections/[id]/items` | Collectie-items bijwerken |

### Reacties (`/api/admin/comments`)

Modereer gebruikersreacties.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Reacties weergeven met moderatiefilters |
| `GET` | `/api/admin/comments/[id]` | Reactiedetails ophalen |
| `PUT` | `/api/admin/comments/[id]` | Reactie bijwerken (goedkeuren/afwijzen) |
| `DELETE` | `/api/admin/comments/[id]` | Reactie verwijderen |

### Bedrijven (`/api/admin/companies`)

Beheer bedrijfsprofielen gekoppeld aan items.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Bedrijven weergeven |
| `POST` | `/api/admin/companies` | Bedrijf aanmaken |
| `GET` | `/api/admin/companies/[id]` | Bedrijfsdetails ophalen |
| `PUT` | `/api/admin/companies/[id]` | Bedrijf bijwerken |
| `DELETE` | `/api/admin/companies/[id]` | Bedrijf verwijderen |

### Dashboard (`/api/admin/dashboard`)

Geaggregeerde dashboardanalyses.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Samenvattingsstatistieken dashboard |

### Uitgelichte Items (`/api/admin/featured-items`)

Beheer uitgelichte itemhoogtepunten.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | Uitgelichte items weergeven |
| `POST` | `/api/admin/featured-items` | Een item uitlichten |
| `GET` | `/api/admin/featured-items/[id]` | Details uitgelicht item ophalen |
| `PUT` | `/api/admin/featured-items/[id]` | Instellingen uitgelicht item bijwerken |
| `DELETE` | `/api/admin/featured-items/[id]` | Uitlichten verwijderen |

### Geo-analyse (`/api/admin/geo-analytics`)

Geografische analyses en bezoekersverdelingsgegevens.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Geografische analysegegevens ophalen |

### Items (`/api/admin/items`)

Volledig itembeheer van inhoud.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Items weergeven met filters en paginering |
| `POST` | `/api/admin/items` | Een nieuw item aanmaken |
| `POST` | `/api/admin/items/bulk` | Bulkbewerkingen op items (goedkeuren, afwijzen, verwijderen) |
| `GET` | `/api/admin/items/stats` | Geaggregeerde itemstatistieken |
| `GET` | `/api/admin/items/[id]` | Itemdetails ophalen |
| `PUT` | `/api/admin/items/[id]` | Item bijwerken |
| `DELETE` | `/api/admin/items/[id]` | Item verwijderen |
| `GET` | `/api/admin/items/[id]/history` | Audit-geschiedenis van item ophalen |
| `POST` | `/api/admin/items/[id]/review` | Itemreview indienen (goedkeuren/afwijzen) |

### Locatie-index (`/api/admin/location-index`)

Beheer geografische locatiezoekindexering.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Locatiezoekindex opnieuw opbouwen |

### Navigatie (`/api/admin/navigation`)

Admin-navigatieconfiguratie.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Navigatiestructuur ophalen |
| `PUT` | `/api/admin/navigation` | Navigatie bijwerken |

### Meldingen (`/api/admin/notifications`)

Beheer van admin-meldingen.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin-meldingen weergeven |
| `POST` | `/api/admin/notifications/mark-all-read` | Alle meldingen als gelezen markeren |
| `POST` | `/api/admin/notifications/[id]/read` | Enkele melding als gelezen markeren |

### Rapporten (`/api/admin/reports`)

Beheer en moderatie van inhoudsrapporten.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | Inhoudsrapporten weergeven |
| `GET` | `/api/admin/reports/stats` | Rapportstatistieken |
| `GET` | `/api/admin/reports/[id]` | Rapportdetails ophalen |
| `PUT` | `/api/admin/reports/[id]` | Rapportstatus bijwerken (oplossen, sluiten) |

### Rollen (`/api/admin/roles`)

Rol- en rechtenbeheer voor RBAC.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Rollen weergeven met paginering |
| `POST` | `/api/admin/roles` | Een nieuwe rol aanmaken |
| `GET` | `/api/admin/roles/active` | Alleen actieve rollen ophalen |
| `GET` | `/api/admin/roles/stats` | Rolstatistieken |
| `GET` | `/api/admin/roles/[id]` | Roldetails ophalen |
| `PUT` | `/api/admin/roles/[id]` | Rol bijwerken |
| `DELETE` | `/api/admin/roles/[id]` | Rol verwijderen (zachte verwijdering) |
| `GET` | `/api/admin/roles/[id]/permissions` | Rolrechten ophalen |
| `PUT` | `/api/admin/roles/[id]/permissions` | Rolrechten bijwerken |

### Instellingen (`/api/admin/settings`)

Beheer van applicatie-instellingen.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Alle instellingen ophalen |
| `PUT` | `/api/admin/settings` | Instellingen bijwerken |
| `GET` | `/api/admin/settings/map-status` | Kaartfunctiestatus ophalen |

### Sponsoradvertenties (`/api/admin/sponsor-ads`)

Moderatie van sponsoradvertenties.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Sponsoradvertenties weergeven |
| `GET` | `/api/admin/sponsor-ads/[id]` | Advertentiedetails ophalen |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Advertentie bijwerken |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Sponsoradvertentie goedkeuren |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Sponsoradvertentie afwijzen |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Sponsoradvertentie annuleren |

### Tags (`/api/admin/tags`)

Beheer van inhoudstags.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Tags weergeven met paginering |
| `POST` | `/api/admin/tags` | Een nieuwe tag aanmaken |
| `GET` | `/api/admin/tags/all` | Alle tags ophalen (zonder paginering) |
| `GET` | `/api/admin/tags/[id]` | Tagdetails ophalen |
| `PUT` | `/api/admin/tags/[id]` | Tag bijwerken |
| `DELETE` | `/api/admin/tags/[id]` | Tag verwijderen |

### Twenty CRM (`/api/admin/twenty-crm`)

CRM-integratieconfiguratie en -testen.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | CRM-configuratie ophalen |
| `PUT` | `/api/admin/twenty-crm/config` | CRM-configuratie bijwerken |
| `POST` | `/api/admin/twenty-crm/test-connection` | CRM-verbinding testen |

### Gebruikers (`/api/admin/users`)

Beheer van admin-gebruikers.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Gebruikers weergeven met paginering |
| `POST` | `/api/admin/users` | Een nieuwe gebruiker aanmaken |
| `GET` | `/api/admin/users/stats` | Gebruikersstatistieken |
| `GET` | `/api/admin/users/check-email` | E-mailbeschikbaarheid controleren |
| `GET` | `/api/admin/users/check-username` | Gebruikersnaamsbeschikbaarheid controleren |
| `GET` | `/api/admin/users/[id]` | Gebruikersdetails ophalen |
| `PUT` | `/api/admin/users/[id]` | Gebruiker bijwerken |
| `DELETE` | `/api/admin/users/[id]` | Gebruiker verwijderen |

## Veelvoorkomende Patronen

### Bulkbewerkingen

Meerdere resources ondersteunen bulkbewerkingen via POST met een array van ID's:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Statistiekeindpunten

De meeste resourcegroepen bevatten een `/stats`-eindpunt dat geaggregeerde tellingen retourneert:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Auditgeschiedenis

Items ondersteunen het bijhouden van auditgeschiedenis via het eindpunt `/[id]/history`, waarbij wordt vastgelegd wie wijzigingen heeft aangebracht en wanneer.
