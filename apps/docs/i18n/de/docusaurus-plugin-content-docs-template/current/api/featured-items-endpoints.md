---
id: featured-items-endpoints
title: "Featured Items API Endpoints"
sidebar_label: "Featured Items API Endpoints"
---

# Hervorgehobene-Einträge-API-Endpunkte

Die Hervorgehobene-Einträge-API stellt einen öffentlichen Endpunkt zum Abrufen von Einträgen bereit, die für eine prominente Anzeige auf der Website hervorgehoben wurden. Hervorgehobene Einträge unterstützen Sortierung, Ablaufdaten und aktive/inaktive Zustände.

**Quelldatei:** `template/app/api/featured-items/route.ts`

## Endpunktübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| GET | `/api/featured-items` | Keine | Aktive hervorgehobene Einträge für die öffentliche Anzeige abrufen |

---

## GET `/api/featured-items`

Gibt eine Liste aktiver hervorgehobener Einträge für die öffentliche Anzeige zurück. Filtert automatisch inaktive Einträge heraus und schließt optional abgelaufene Einträge basierend auf ihrem `featuredUntil`-Datum aus.

### Abfrageparameter

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
|-----------|-----|--------------|----------|--------------|
| `limit` | integer | Nein | 6 | Maximale Anzahl zurückzugebender Einträge (1–50) |
| `includeExpired` | boolean | Nein | `false` | Ob Einträge nach ihrem `featuredUntil`-Datum eingeschlossen werden |

### Antwortstruktur

#### 200 – Hervorgehobene Einträge abgerufen

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### 200 – Keine hervorgehobenen Einträge

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

### Datenmodell

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | string | Eindeutige Datensatz-ID |
| `itemSlug` | string | Slug des hervorgehobenen Eintrags |
| `itemName` | string | Anzeigename |
| `itemDescription` | string (nullable) | Beschreibung für die hervorgehobene Anzeige |
| `itemIconUrl` | string (nullable) | Eintrags-Icon-URL |
| `itemImageUrl` | string (nullable) | Hervorgehobenes Banner-Bild-URL |
| `featuredOrder` | integer | Anzeigepriorität (höher = prominenter) |
| `isActive` | boolean | Ob derzeit hervorgehoben |
| `featuredAt` | datetime | Zeitpunkt, an dem der Eintrag hervorgehoben wurde |
| `featuredUntil` | datetime (nullable) | Ablaufdatum (null bedeutet kein Ablauf) |
| `createdAt` | datetime | Datensatz-Erstellungszeitstempel |
| `updatedAt` | datetime (nullable) | Letzter Aktualisierungszeitstempel |

### Ablaufverhalten

- Einträge mit `featuredUntil: null` laufen nie ab und werden immer eingeschlossen.
- Einträge mit einem `featuredUntil`-Datum in der Vergangenheit werden standardmäßig ausgeschlossen.
- Das Setzen von `includeExpired=true` umgeht die Ablauffilterung (nützlich für Admin-Ansichten).

### Hinweise

- Dies ist ein **öffentlicher Endpunkt** – keine Authentifizierung erforderlich.
- Hervorgehobene Einträge werden von Admins über das Admin-Panel verwaltet.
