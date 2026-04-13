---
id: user-endpoints
title: "User Endpoints"
sidebar_label: "User Endpoints"
---

# Benutzer-Endpunkte

Diese Endpunkte verwalten benutzerspezifische Daten wie Währungseinstellungen, Zahlungsverlauf, Abonnementstatus und Profilstandort.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|----------|---------|-------------------|--------------|
| `/api/user/currency` | GET | Benutzer | Währung erkennen oder gespeicherte Währung abrufen |
| `/api/user/currency` | PUT | Benutzer | Währungspräferenz aktualisieren |
| `/api/user/payment-history` | GET | Benutzer | Stripe-Rechnungsverlauf abrufen |
| `/api/user/plan-status` | GET | Benutzer | Plan-Ablauf und Warnstatus abrufen |
| `/api/user/subscription` | GET | Benutzer | Abonnementdetails abrufen |
| `/api/user/profile/location` | GET | Benutzer | Profilstandort abrufen |
| `/api/user/profile/location` | PATCH | Benutzer | Profilstandort aktualisieren |

## Währungserkennung

### Währung abrufen

```
GET /api/user/currency
```

Gibt die gespeicherte Währungspräferenz des Benutzers zurück. Falls keine gespeichert ist, wird die Währung anhand der Geolocation des Benutzers erkannt.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "currency": "EUR",
    "source": "stored"
  }
}
```

| Feld `source` | Bedeutung |
|---------------|-----------|
| `stored` | Aus Benutzerprofil geladen |
| `detected` | Anhand IP-Geolocation erkannt |
| `default` | Rückfallwert (USD) |

### Währung aktualisieren

```
PUT /api/user/currency
```

**Anfragekörper:**

```json
{ "currency": "EUR" }
```

| Status | Bedingung |
|--------|-----------|
| 400 | Ungültiger oder nicht unterstützter Währungscode |
| 401 | Nicht angemeldet |

**Quelle:** `template/app/api/user/currency/route.ts`

## Zahlungsverlauf

```
GET /api/user/payment-history
```

Gibt den Stripe-Rechnungsverlauf des Benutzers zurück. Erfordert ein verknüpftes Stripe-Kundenkonto.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "in_abc123",
        "amount": 2900,
        "currency": "usd",
        "status": "paid",
        "description": "Pro Plan - Monthly",
        "invoiceUrl": "https://invoice.stripe.com/...",
        "pdfUrl": "https://pay.stripe.com/invoice/.../pdf",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "hasMore": false
  }
}
```

| Status | Bedingung |
|--------|-----------|
| 401 | Nicht angemeldet |
| 404 | Kein Stripe-Kundenkonto verknüpft |

**Quelle:** `template/app/api/user/payment-history/route.ts`

## Plan-Status

```
GET /api/user/plan-status
```

Gibt Informationen zum Ablauf des aktuellen Plans und aktive Warnungen zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "status": "active",
    "planId": "pro_monthly",
    "expiresAt": "2024-02-01T00:00:00.000Z",
    "daysRemaining": 12,
    "warning": {
      "type": "expiring_soon",
      "message": "Ihr Plan läuft in 12 Tagen ab",
      "severity": "warning"
    }
  }
}
```

| `warning.type` | Bedeutung |
|----------------|-----------|
| `expiring_soon` | Plan läuft in < 14 Tagen ab |
| `expired` | Plan ist abgelaufen |
| `null` | Kein aktives Problem |

**Quelle:** `template/app/api/user/plan-status/route.ts`

## Abonnementdetails

```
GET /api/user/subscription
```

Gibt Details zum aktiven Abonnement des Benutzers zurück, einschließlich Anbieter, Plan und nächstem Abrechnungsdatum.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "provider": "stripe",
    "planId": "pro_monthly",
    "status": "active",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "features": ["unlimited_items", "priority_support"]
  }
}
```

| Status | Bedingung |
|--------|-----------|
| 401 | Nicht angemeldet |
| 404 | Kein aktives Abonnement |

**Quelle:** `template/app/api/user/subscription/route.ts`

## Profilstandort

### Standort abrufen

```
GET /api/user/profile/location
```

Gibt den gespeicherten Standort des Benutzerprofils zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "city": "Berlin",
    "country": "DE",
    "latitude": 52.52,
    "longitude": 13.405
  }
}
```

### Standort aktualisieren

```
PATCH /api/user/profile/location
```

**Anfragekörper:**

```json
{
  "city": "München",
  "country": "DE",
  "latitude": 48.137,
  "longitude": 11.575
}
```

| Feld | Typ | Erforderlich |
|------|-----|--------------|
| `city` | string | Nein |
| `country` | string | Nein |
| `latitude` | number | Nein |
| `longitude` | number | Nein |

**Quelle:** `template/app/api/user/profile/location/route.ts`
