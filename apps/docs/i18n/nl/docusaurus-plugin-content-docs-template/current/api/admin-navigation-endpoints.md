---
id: admin-navigation-endpoints
title: "Admin Navigation & Location Index Endpoints"
sidebar_label: "Admin Navigation & Location Index Endpoints"
---

# Admin Navigatie & Locatie-index Eindpunten

Deze admin-eindpunten beheren aangepaste sitenavigatie-koppelingen en de geografische locatie-index. Navigatie-eindpunten maken het mogelijk aangepaste koptekst- en voettekstkoppelingen te configureren die zijn opgeslagen in `config.yml`. Locatie-index-eindpunten beheren de ruimtelijke index die wordt gebruikt voor geografische analyses en kaartfuncties.

## Overzicht

| Eindpunt | Methode | Auth | Beschrijving |
|---|---|---|---|
| `/api/admin/navigation` | GET | Admin | Aangepaste navigatieconfiguratie ophalen |
| `/api/admin/navigation` | PATCH | Admin | Aangepaste navigatie-items bijwerken |
| `/api/admin/location-index` | GET | Admin | Statistieken locatie-index ophalen |
| `/api/admin/location-index` | POST | Admin | Locatie-index opnieuw opbouwen of wissen |

## Navigatie-eindpunten

### Navigatieconfiguratie Ophalen

```
GET /api/admin/navigation
```

Haalt de navigatie-items `custom_header` en `custom_footer` op uit het bestand `config.yml` van de site. Geeft lege arrays terug als er geen aangepaste navigatie is geconfigureerd.

**Authenticatie:** Beheerder vereist (via `getCachedApiSession`)

**Succesvol Antwoord (200):**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Elk navigatie-item heeft twee velden:

| Veld | Type | Beschrijving |
|---|---|---|
| `label` | string | Weergavetekst (platte tekst of i18n-vertaalsleutel zoals `"footer.PRIVACY_POLICY"`) |
| `path` | string | URL-pad (intern route beginnend met `/` of externe URL met `http://`/`https://`) |

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Configuratie lezen mislukt |

**Bron:** `template/app/api/admin/navigation/route.ts`

### Navigatieconfiguratie Bijwerken

```
PATCH /api/admin/navigation
```

Werkt de aangepaste koptekst- of voettekstnavigatie-items bij in `config.yml`. Valideert het padformaat van elk item om XSS-aanvallen via gevaarlijke URL-schema's te voorkomen.

**Authenticatie:** Beheerder vereist

**Verzoeklichaam:**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `type` | string | Ja | `"header"` of `"footer"` |
| `items` | array | Ja | Array van navigatie-items |
| `items[].label` | string | Ja | Niet-leeg weergavelabel |
| `items[].path` | string | Ja | Geldig URL-pad |

**Padvalidatie:**

De functie `isValidNavigationPath()` legt strikte padformaatregels op:

| Padformaat | Toegestaan | Voorbeeld |
|---|---|---|
| Interne routes | Ja | `/about`, `/pages/docs` |
| HTTPS-URL's | Ja | `https://example.com` |
| HTTP-URL's | Ja | `http://example.com` |
| Protocol-relatieve URL's | Nee | `//evil.com` |
| JavaScript-URL's | Nee | `javascript:alert(1)` |
| Data-URL's | Nee | `data:text/html,...` |
| Overige schema's | Nee | `vbscript:`, `file:` |

**Succesvol Antwoord (200):**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Foutantwoorden:**

| Status | Voorwaarde |
|---|---|
| 400 | `type` is niet `"header"` of `"footer"` |
| 400 | `items` is geen array |
| 400 | Item mist velden `label` of `path` als string |
| 400 | Ongeldig padformaat (XSS-preventie) |
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Configuratie schrijven mislukt |

Geef een lege `items`-array door om alle aangepaste navigatie voor het opgegeven type te wissen.

**Bron:** `template/app/api/admin/navigation/route.ts`

## Locatie-index Eindpunten

### Statistieken Locatie-index Ophalen

```
GET /api/admin/location-index
```

Geeft statistieken over de geografische locatie-index terug, inclusief totale geïndexeerde items, stad- en landtellingen en herbouwmetadata. Gebruikt de locatie-indexservice voor gegevensophaling.

**Authenticatie:** Beheerder vereist (via `checkAdminAuth()`)

**Caching:** Uitgeschakeld — gebruikt `force-dynamic`, `revalidate: 0`, en `force-no-store`.

**Succesvol Antwoord (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Interne serverfout |

**Bron:** `template/app/api/admin/location-index/route.ts`

### Locatie-index Beheren

```
POST /api/admin/location-index
```

Voert beheeracties uit op de locatie-index. Ondersteunt het opnieuw opbouwen van de index vanaf nul of het wissen van alle vermeldingen.

**Authenticatie:** Beheerder vereist

**Verzoeklichaam:**

```json
{
  "action": "rebuild"
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `action` | string | Ja | `"rebuild"` of `"clear"` |

**Acties:**

| Actie | Beschrijving |
|---|---|
| `rebuild` | Haalt alle items op uit de repository en herindexeert hun locatiegegevens. Geeft herbouwstatistieken terug. |
| `clear` | Verwijdert alle vermeldingen uit de locatie-index. Geeft het aantal gewiste vermeldingen terug. |

**Succesvol Antwoord (200) — Herbouwen:**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Succesvol Antwoord (200) — Wissen:**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Foutantwoorden:**

| Status | Voorwaarde |
|---|---|
| 400 | Ongeldige actie (niet `"rebuild"` of `"clear"`) |
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Interne serverfout |

**Bron:** `template/app/api/admin/location-index/route.ts`

## Belangrijke Implementatiedetails

- **XSS-preventie:** Navigatiepadvalidatie wijst alle URL-schema's af behalve `/`, `http://` en `https://`. Dit blokkeert `javascript:`, `data:`, `vbscript:` en protocol-relatieve URL's (`//evil.com`) die kunnen worden gebruikt voor cross-site scripting.
- **Configuratieopslag:** Navigatie-items worden opgeslagen in `config.yml` onder de sleutels `custom_header` en `custom_footer`, bewaard via `configManager.updateNestedKey()`.
- **i18n-labels:** Navigatielabels kunnen platte tekst of vertaalsleutels zijn (bijv. `"footer.PRIVACY_POLICY"`). De frontend is verantwoordelijk voor het omzetten van vertaalsleutels.
- **Herbouwen locatie-index:** De herbouwbewerking laadt alle items uit de `ItemRepository` en geeft ze door aan de locatie-indexservice. Dit kan een resource-intensieve bewerking zijn voor grote datasets.
- **Cache-invalidatie:** Locatie-index-eindpunten schakelen alle caching expliciet uit om ervoor te zorgen dat het beheerdashboard altijd actuele gegevens weergeeft.
