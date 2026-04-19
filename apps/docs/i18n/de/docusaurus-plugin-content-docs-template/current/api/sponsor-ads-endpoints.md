---
id: sponsor-ads-endpoints
title: "Sponsor Ads API Endpoints"
sidebar_label: "Sponsor Ads API Endpoints"
---

# Sponsor-Anzeigen-Endpunkte

Das Sponsor-Anzeigen-System ermöglicht Nutzern das Kauf und Verwalten von Werbeslots im Verzeichnis. Anzeigen können manuell erneuert werden, laufen automatisch ab und unterstützen Statistik-Tracking. Admins erhalten zusätzliche Verwaltungsendpunkte.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|----------|---------|-------------------|--------------|
| `/api/sponsor-ads` | GET | Öffentlich | Aktive Sponsor-Anzeigen abrufen |
| `/api/sponsor-ads/checkout` | POST | Benutzer | Sponsor-Anzeigen-Checkout initiieren |
| `/api/user/sponsor-ads` | GET | Benutzer | Eigene Anzeigen des Nutzers abrufen |
| `/api/user/sponsor-ads` | POST | Benutzer | Neue Sponsor-Anzeige erstellen |
| `/api/user/sponsor-ads/[id]/cancel` | POST | Benutzer | Anzeige kündigen |
| `/api/user/sponsor-ads/[id]/renew` | POST | Benutzer | Anzeige manuell verlängern |
| `/api/user/sponsor-ads/[id]/stats` | GET | Benutzer | Statistiken einer Anzeige abrufen |
| `/api/admin/sponsor-ads` | GET | Admin | Alle Anzeigen (Admin-Ansicht) |

## Öffentliche Endpunkte

### Aktive Sponsor-Anzeigen abrufen

```
GET /api/sponsor-ads
```

Gibt alle aktuell aktiven Sponsor-Anzeigen zurück, gefiltert nach Status `active` und gültigem Ablaufdatum. Die Antwort ist nach Priorität sortiert.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_abc123",
      "title": "Super Tool",
      "description": "Das beste Tool für Produktivität",
      "url": "https://example.com",
      "imageUrl": "https://cdn.example.com/ad.png",
      "priority": 1,
      "expiresAt": "2024-12-31T23:59:59.000Z"
    }
  ]
}
```

**Quelle:** `template/app/api/sponsor-ads/route.ts`

## Authentifizierte Benutzer-Endpunkte

### Sponsor-Anzeigen-Checkout

```
POST /api/sponsor-ads/checkout
```

Initiiert den Checkout-Prozess für den Kauf eines Werbeslots. Leitet zum konfigurierten Zahlungsanbieter weiter.

:::warning Open-Redirect-Schutz
Alle Weiterleitungs-URLs werden vor der Weiterleitung validiert, um Open-Redirect-Angriffe zu verhindern. Nur erlaubte Domänen sind zugelassen.
:::

**Anfragekörper:**

```json
{
  "planId": "sponsor_monthly",
  "adData": {
    "title": "Mein Tool",
    "description": "Kurze Beschreibung",
    "url": "https://mytool.com",
    "imageUrl": "https://mytool.com/logo.png"
  }
}
```

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

**Quelle:** `template/app/api/sponsor-ads/checkout/route.ts`

### Eigene Anzeigen abrufen

```
GET /api/user/sponsor-ads
```

Gibt alle Sponsor-Anzeigen des angemeldeten Benutzers zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_abc123",
      "title": "Mein Tool",
      "status": "active",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "clicks": 142,
      "impressions": 3400
    }
  ]
}
```

### Neue Sponsor-Anzeige erstellen

```
POST /api/user/sponsor-ads
```

Erstellt eine neue Sponsor-Anzeige nach erfolgreichem Checkout.

**Anfragekörper:**

```json
{
  "title": "Mein Tool",
  "description": "Kurze Beschreibung",
  "url": "https://mytool.com",
  "imageUrl": "https://mytool.com/logo.png",
  "planId": "sponsor_monthly",
  "paymentIntentId": "pi_abc123"
}
```

**Quelle:** `template/app/api/user/sponsor-ads/route.ts`

### Anzeige kündigen

```
POST /api/user/sponsor-ads/[id]/cancel
```

Kündigt eine aktive Anzeige. Die Anzeige bleibt bis zum Ablaufdatum aktiv.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `id` | string | Anzeigen-ID |

**Quelle:** `template/app/api/user/sponsor-ads/[id]/cancel/route.ts`

### Anzeige manuell verlängern

```
POST /api/user/sponsor-ads/[id]/renew
```

Verlängert eine bestehende Anzeige manuell durch eine neue Zahlung.

**Quelle:** `template/app/api/user/sponsor-ads/[id]/renew/route.ts`

### Anzeigen-Statistiken

```
GET /api/user/sponsor-ads/[id]/stats
```

Gibt Klick- und Impressionsstatistiken für eine Anzeige zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "clicks": 142,
    "impressions": 3400,
    "ctr": 0.042,
    "dailyStats": [
      { "date": "2024-01-20", "clicks": 12, "impressions": 280 }
    ]
  }
}
```

**Quelle:** `template/app/api/user/sponsor-ads/[id]/stats/route.ts`

## Admin-Endpunkte

### Alle Anzeigen abrufen (Admin)

```
GET /api/admin/sponsor-ads
```

Gibt alle Sponsor-Anzeigen aller Benutzer mit Filterungs- und Paginierungsmöglichkeiten zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|--------------|
| `page` | integer | 1 | Seitennummer |
| `limit` | integer | 10 | Ergebnisse pro Seite (1–100) |
| `status` | string | - | Filter nach Status: `active`, `expired`, `cancelled` |
| `search` | string | - | Suche nach Titel, URL oder Benutzer-E-Mail |

**Quelle:** `template/app/api/admin/sponsor-ads/route.ts`
