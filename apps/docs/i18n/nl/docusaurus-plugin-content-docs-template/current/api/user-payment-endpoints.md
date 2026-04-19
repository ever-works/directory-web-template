---
id: user-payment-endpoints
title: "User Payment API Reference"
sidebar_label: "User Payment API Reference"
---

# Gebruikersbetaling API-referentie

Eindpunten voor het beheren van valutadetectie, betaalgeschiedenis, planstatus en abonnementsdetails voor de ingelogde gebruiker.

## Overzicht

De gebruikersbetaling-API biedt vier eindpunten voor het ophalen en beheren van betaalgerelateerde gegevens voor de geauthenticeerde gebruiker. Alle eindpunten vereisen een actieve sessie.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/user/currency` | Sessie vereist | Valuta van gebruiker detecteren |
| `PUT` | `/api/user/currency` | Sessie vereist | Valutavoorkeur bijwerken |
| `GET` | `/api/user/payments` | Sessie vereist | Betaalgeschiedenis ophalen |
| `GET` | `/api/user/plan-status` | Sessie vereist | Planstatus en limieten ophalen |
| `GET` | `/api/user/subscription` | Sessie vereist | Abonnementsdetails ophalen |

## Valuta detecteren (GET `/api/user/currency`)

### Hoe het werkt

Detecteert de valuta van de gebruiker via:
1. Opgeslagen valutavoorkeur in de gebruikersdatabase
2. Geo-locatie via `cf-ipcountry` header (Cloudflare) of `x-vercel-ip-country` (Vercel)
3. Standaard terugvalmethode naar `USD`

### Geslaagde reactie (200)

```typescript
interface CurrencyResponse {
  currency: string;    // "USD", "EUR", "GBP", etc.
  source: string;      // "user_preference", "geo", or "default"
}
```

### Voorbeeld

```json
{
  "currency": "EUR",
  "source": "geo"
}
```

## Valuta bijwerken (PUT `/api/user/currency`)

### Aanvraagbody

```typescript
interface UpdateCurrencyRequest {
  currency: string;    // ISO 4217-valutacode bijv. "EUR"
}
```

### Voorbeeldaanvraag

```bash
curl -X PUT /api/user/currency \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{ "currency": "EUR" }'
```

### Geslaagde reactie (200)

```json
{
  "success": true,
  "currency": "EUR"
}
```

## Betaalgeschiedenis ophalen (GET `/api/user/payments`)

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|---------|-------------|
| `limit` | number | Nee | 10 | Maximaal aantal records |
| `page` | number | Nee | 1 | Paginanummer |
| `provider` | string | Nee | - | Filteren op provider (`stripe`, `lemonsqueezy`, `polar`, `solidgate`) |

### Geslaagde reactie (200)

```typescript
interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;         // "succeeded", "failed", "pending"
  provider: string;       // "stripe", "lemonsqueezy", "polar", "solidgate"
  createdAt: string;      // ISO-datumstring
  description?: string;
}
```

## Planstatus ophalen (GET `/api/user/plan-status`)

### Geslaagde reactie (200)

```typescript
interface PlanStatusResponse {
  plan: {
    id: string;
    name: string;
    status: string;        // "active", "trialing", "canceled", "expired"
    features: string[];
    limits: {
      [key: string]: number | null;  // null = onbeperkt
    };
  };
  usage: {
    [key: string]: number;
  };
  subscription: {
    id: string;
    currentPeriodEnd: string;    // ISO-datumstring
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
  } | null;
}
```

### Voorbeeld

```json
{
  "plan": {
    "id": "pro",
    "name": "Pro",
    "status": "active",
    "features": ["analytics", "priority_support"],
    "limits": {
      "listings": 50,
      "api_calls": null
    }
  },
  "usage": {
    "listings": 12,
    "api_calls": 4823
  },
  "subscription": {
    "id": "sub_1234567890abcdef",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "trialEnd": null
  }
}
```

## Abonnementsdetails ophalen (GET `/api/user/subscription`)

### Geslaagde reactie (200)

```typescript
interface SubscriptionDetailsResponse {
  subscription: {
    id: string;
    providerId: string;           // provider-specifieke abonnements-ID
    provider: string;             // "stripe", "lemonsqueezy", "polar", "solidgate"
    status: string;               // "active", "trialing", "canceled", etc.
    priceId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelAt: string | null;
    trialStart: string | null;
    trialEnd: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  plan: {
    id: string;
    name: string;
    interval: string;             // "month", "year"
    amount: number;               // in centen
    currency: string;
  } | null;
}
```

### Voorbeeld: Actief abonnement

```json
{
  "subscription": {
    "id": "1",
    "providerId": "sub_1234567890abcdef",
    "provider": "stripe",
    "status": "active",
    "priceId": "price_1234567890abcdef",
    "currentPeriodStart": "2025-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2025-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "cancelAt": null,
    "trialStart": null,
    "trialEnd": null,
    "createdAt": "2024-06-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "plan": {
    "id": "pro",
    "name": "Pro",
    "interval": "month",
    "amount": 1999,
    "currency": "usd"
  }
}
```

### Voorbeeld: Geen abonnement

```json
{
  "subscription": null,
  "plan": null
}
```

## Authenticatie

Alle gebruikersbetaaleindpunten vereisen een actieve sessie:

| Vereiste | Details |
|---------|---------|
| Sessiecookie | Actieve geauthenticeerde sessie |
| Gebruiker | Ingelogde gebruiker die hun eigen betaalgegevens bekijkt |
| Beheerder | Beheerderstoegang vereist geen afzonderlijk eindpunt voor weergave |

Niet-geauthenticeerde aanvragen ontvangen een `401 Unauthorized`-reactie.

## Foutreacties

| Status | Fout | Beschrijving |
|--------|-------|-------------|
| 401 | `Unauthorized` | Geen actieve sessie |
| 404 | `User not found` | Gebruikersrecord niet gevonden in database |
| 500 | `Failed to fetch payments` | Databasefout bij ophalen betaalgeschiedenis |
| 500 | `Failed to fetch subscription` | Fout bij ophalen abonnementsdetails |

## Snelheidsbeperking

Gebruikersbetaaleindpunten worden beperkt via de standaard snelheidsbeperkende middleware. Er gelden hogere drempels voor geauthenticeerde aanvragen dan voor niet-geauthenticeerde.

## Gerelateerde eindpunten

- [Stripe Abonnementen – Diepgaande uitleg](./stripe-subscription-deep-dive.md)
- [Betaal API Eindpunten](./payment-endpoints.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
