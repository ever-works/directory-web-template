---
id: admin-settings-endpoints
title: "Admin Settings Endpoints"
sidebar_label: "Admin Settings Endpoints"
---

# Admin Instellingen Eindpunten

De admin-instellingen API biedt eindpunten voor het lezen en wijzigen van siteconfiguratie opgeslagen in `config.yml`. Dit omvat algemene instellingen en de status van kaartproviders. Alle eindpunten vereisen beheerdersauthenticatie.

## Overzicht

| Eindpunt | Methode | Auth | Beschrijving |
|---|---|---|---|
| `/api/admin/settings` | GET | Admin | Alle instellingen ophalen |
| `/api/admin/settings` | PATCH | Admin | Een specifieke instelling bijwerken |
| `/api/admin/settings/map-status` | GET | Admin | Configuratiestatus van kaartprovider ophalen |

## Instellingen Ophalen

```
GET /api/admin/settings
```

Haalt de volledige `settings`-sectie op uit het bestand `config.yml` van de site.

**Authenticatie:** Beheerder vereist (via `getCachedApiSession`)

**Succesvol Antwoord (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

De exacte vorm van het `settings`-object is afhankelijk van de configuratie in `config.yml`. Het eindpunt geeft alles terug wat is opgeslagen onder de sleutel `settings`.

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Configuratie lezen mislukt |

**Bron:** `template/app/api/admin/settings/route.ts`

## Een Instelling Bijwerken

```
PATCH /api/admin/settings
```

Werkt een enkele instellingswaarde bij binnen de sectie `settings` van `config.yml`. De sleutel wordt automatisch beperkt tot de naamruimte `settings` (bijv. sleutel `"theme"` opgeven werkt `settings.theme` bij in het configuratiebestand).

**Authenticatie:** Beheerder vereist

**Verzoeklichaam:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `key` | string | Ja | De bij te werken instellingssleutel (relatief aan `settings.`) |
| `value` | any | Ja | De nieuwe waarde voor de instelling |

**Succesvol Antwoord (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

De update wordt bewaard via `configManager.updateNestedKey()`, dat het onderliggende bestand `config.yml` wijzigt. De sleutel wordt automatisch voorafgegaan door `settings.` voordat het wordt doorgegeven aan de configuratiebeheerder.

**Foutantwoorden:**

| Status | Voorwaarde |
|---|---|
| 400 | Veld `key` ontbreekt in verzoeklichaam |
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Configuratie schrijven mislukt |

**Bron:** `template/app/api/admin/settings/route.ts`

## Kaartproviderstatus

### Kaartstatus Ophalen

```
GET /api/admin/settings/map-status
```

Geeft de configuratiestatus van ondersteunde kaartproviders terug zonder de werkelijke API-sleutels bloot te stellen. Hierdoor kan het beheerdashboard tonen welke kaartproviders beschikbaar zijn voor gebruik.

**Authenticatie:** Beheerder vereist

**Succesvol Antwoord (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `mapbox.isConfigured` | boolean | Of `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is ingesteld |
| `mapbox.isPreviewAvailable` | boolean | Hetzelfde als `isConfigured` — voorbeeld vereist het token |
| `google.isConfigured` | boolean | Of `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is ingesteld |
| `google.isPreviewAvailable` | boolean | Hetzelfde als `isConfigured` |

Het eindpunt controleert de aanwezigheid van omgevingsvariabelen:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` voor Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` voor Google Maps

Er worden geen werkelijke sleutelwaarden blootgesteld in het antwoord.

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Interne serverfout |
