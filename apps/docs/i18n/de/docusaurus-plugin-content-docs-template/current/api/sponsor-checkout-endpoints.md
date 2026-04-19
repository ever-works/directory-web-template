---
id: sponsor-checkout-endpoints
title: "Sponsor Ads & Checkout API Reference"
sidebar_label: "Sponsor Ads & Checkout API Reference"
---

# Sponsor-Checkout-Endpunkte

Der Sponsor-Checkout-Flow ermöglicht Benutzern den Kauf von Werbeslots im Verzeichnis. Er integriert sich in das Zahlungssystem der Vorlage und unterstützt mehrere Anbieter.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|----------|---------|-------------------|--------------|
| `/api/sponsor-ads/checkout` | POST | Benutzer | Checkout-Session erstellen |
| `/api/sponsor-ads/checkout/success` | GET | Benutzer | Checkout-Erfolg verarbeiten |
| `/api/user/sponsor-ads` | GET | Benutzer | Eigene Anzeigen abrufen |
| `/api/user/sponsor-ads` | POST | Benutzer | Anzeige nach Zahlung erstellen |
| `/api/user/sponsor-ads/[id]/cancel` | POST | Benutzer | Anzeige kündigen |
| `/api/user/sponsor-ads/[id]/renew` | POST | Benutzer | Anzeige verlängern |
| `/api/user/sponsor-ads/[id]/stats` | GET | Benutzer | Anzeigenstatistiken |
| `/api/admin/sponsor-ads` | GET | Admin | Alle Anzeigen verwalten |

## Checkout erstellen

```
POST /api/sponsor-ads/checkout
```

Erstellt eine Checkout-Session beim konfigurierten Zahlungsanbieter und gibt die Checkout-URL zurück.

**Authentifizierung:** Erforderlich (Benutzer-Session)

**Anfragekörper:**

```json
{
  "planId": "sponsor_monthly",
  "adData": {
    "title": "Mein Produkt",
    "description": "Produktbeschreibung",
    "url": "https://meinprodukt.de",
    "imageUrl": "https://meinprodukt.de/logo.png"
  },
  "successUrl": "https://meineseite.de/sponsor/success",
  "cancelUrl": "https://meineseite.de/sponsor"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `planId` | string | Ja | Anzeigenplan-ID |
| `adData` | object | Ja | Anzeigendaten (Titel, Beschreibung, URL, Bild) |
| `successUrl` | string | Nein | Weiterleitung nach erfolgreicher Zahlung |
| `cancelUrl` | string | Nein | Weiterleitung bei Abbruch |

**TypeScript-Antworttyp:**

```typescript
type CheckoutResponse = {
  success: true;
  data: {
    checkoutUrl: string;
    sessionId: string;
    provider: 'stripe' | 'lemon_squeezy' | 'polar';
  };
} | {
  success: false;
  error: string;
};
```

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_abc123",
    "sessionId": "cs_test_abc123",
    "provider": "stripe"
  }
}
```

| Status | Bedingung |
|--------|-----------|
| 400 | Ungültige Eingabedaten |
| 401 | Nicht angemeldet |
| 500 | Fehler beim Erstellen der Checkout-Session |

**Quelle:** `template/app/api/sponsor-ads/checkout/route.ts`

## Checkout-Erfolg

```
GET /api/sponsor-ads/checkout/success
```

Verarbeitet den erfolgreichen Checkout-Abschluss. Verifiziert die Session beim Zahlungsanbieter und erstellt die Anzeige in der Datenbank.

**Abfrageparameter:**

| Parameter | Beschreibung |
|-----------|--|
| `session_id` | Checkout-Session-ID vom Anbieter |
| `provider` | Zahlungsanbieter: `stripe`, `lemon_squeezy`, `polar` |

**Erfolgsantwort:** Weiterleitung zur Anzeigenverwaltungsseite.

**Quelle:** `template/app/api/sponsor-ads/checkout/success/route.ts`

## Benutzerverwaltung existierender Anzeigen

### Eigene Anzeigen

```typescript
type SponsorAdListResponse = {
  success: true;
  data: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    imageUrl: string | null;
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    expiresAt: string;
    clicks: number;
    impressions: number;
    planId: string;
    createdAt: string;
  }>;
};
```

### Anzeige kündigen

```
POST /api/user/sponsor-ads/[id]/cancel
```

Setzt den Status der Anzeige auf `cancelled`. Gibt den gebuchten Zeitraum nicht zurück.

**TypeScript-Antworttyp:**

```typescript
type CancelAdResponse = {
  success: true;
  data: { id: string; status: 'cancelled' };
} | { success: false; error: string };
```

### Anzeige verlängern

```
POST /api/user/sponsor-ads/[id]/renew
```

Erstellt eine neue Checkout-Session zur Verlängerung der Anzeige. Gibt eine Checkout-URL zurück.

**TypeScript-Antworttyp:**

```typescript
type RenewAdResponse = {
  success: true;
  data: { checkoutUrl: string };
} | { success: false; error: string };
```

### Anzeigen-Statistiken

```
GET /api/user/sponsor-ads/[id]/stats
```

**TypeScript-Antworttyp:**

```typescript
type AdStatsResponse = {
  success: true;
  data: {
    clicks: number;
    impressions: number;
    ctr: number;
    dailyStats: Array<{
      date: string;
      clicks: number;
      impressions: number;
    }>;
  };
} | { success: false; error: string };
```

## Admin-Endpunkte

```
GET /api/admin/sponsor-ads
```

**TypeScript-Antworttyp:**

```typescript
type AdminAdsResponse = {
  success: true;
  data: {
    ads: Array<{
      id: string;
      title: string;
      status: string;
      user: { id: string; name: string; email: string };
      expiresAt: string;
      clicks: number;
      impressions: number;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
};
```
