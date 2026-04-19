---
id: featured-items-api-endpoints
title: "Featured Items API Endpoints"
sidebar_label: "Featured Items API Endpoints"
---

# Hervorgehobene-Einträge-API-Endpunkte

Die Hervorgehobene-Einträge-API stellt einen öffentlichen Endpunkt zum Abrufen hervorgehobener Einträge bereit, die auf der Website angezeigt werden. Hervorgehobene Einträge werden über das Admin-Panel verwaltet und in der Datenbank mit Unterstützung für Sortierung, Aktivierung und Ablaufdaten gespeichert.

**Quelle:** `template/app/api/featured-items/route.ts`

---

## Hervorgehobene Einträge abrufen

Gibt eine Liste aktiver hervorgehobener Einträge für die öffentliche Anzeige zurück. Filtert automatisch inaktive und (optional) abgelaufene Einträge heraus.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/featured-items` |
| **Authentifizierung** | Keine (öffentlich) |

### Abfrageparameter

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
|-----------|-----|--------------|----------|--------------|
| `limit` | `integer` | Nein | `6` | Maximale Anzahl zurückzugebender hervorgehobener Einträge (1–50) |
| `includeExpired` | `boolean` | Nein | `false` | Ob Einträge nach ihrem `featured_until`-Datum eingeschlossen werden |

### Antwort

**Status 200** – Hervorgehobene Einträge erfolgreich abgerufen.

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

### Antwortfelder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `data` | `array` | Array von hervorgehobenen Eintrags-Objekten |
| `count` | `number` | Anzahl der zurückgegebenen hervorgehobenen Einträge |
| `data[].id` | `string` | Hervorgehobener-Eintrag-Datensatz-ID |
| `data[].itemSlug` | `string` | Eintrags-Slug-Identifier |
| `data[].itemName` | `string` | Eintrags-Anzeigename |
| `data[].itemDescription` | `string \| null` | Beschreibung des hervorgehobenen Eintrags |
| `data[].itemIconUrl` | `string \| null` | Eintrags-Icon-URL |
| `data[].itemImageUrl` | `string \| null` | Hervorgehobenes Banner-Bild-URL |
| `data[].featuredOrder` | `number` | Anzeigereihenfolge (höher = prominenter) |
| `data[].isActive` | `boolean` | Ob der Eintrag derzeit hervorgehoben ist |
| `data[].featuredAt` | `string` (ISO 8601) | Zeitpunkt, an dem der Eintrag hervorgehoben wurde |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Ablaufdatum (`null` = kein Ablauf) |
| `data[].createdAt` | `string` (ISO 8601) | Datensatz-Erstellungszeitstempel |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Letzter Aktualisierungszeitstempel |

### Sortierung

Einträge werden sortiert nach:
1. `featuredOrder` absteigend (höchste Reihenfolge zuerst)
2. `featuredAt` absteigend (zuletzt hervorgehoben zuerst)

### Filterlogik

1. **Nur aktive:** Es werden nur Einträge mit `isActive = true` zurückgegeben.
2. **Ablaufprüfung** (wenn `includeExpired` gleich `false` ist):
   - Einträge mit `featuredUntil = null` werden immer eingeschlossen (kein Ablauf).
   - Einträge mit `featuredUntil >= aktuelles Datum` werden eingeschlossen.
   - Einträge mit `featuredUntil < aktuelles Datum` werden ausgeschlossen.

### Fehlerantwort

**Status 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```
