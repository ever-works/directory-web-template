---
id: sponsor-ads-endpoints
title: "Sponsor Ads API Endpoints"
sidebar_label: "Sponsor Ads API Endpoints"
---

# Sponsor-advertenties API Eindpunten

De Sponsor-advertenties API beheert de volledige levenscyclus van gesponsorde advertenties: aanmaken, betaalafrekening, verlenging, annulering en statistieken. De API integreert met meerdere betalingsproviders (Stripe, LemonSqueezy, Polar) voor facturering.

**Bronbestanden:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| GET | `/api/sponsor-ads` | Geen | Actieve sponsor-advertenties ophalen (openbaar) |
| POST | `/api/sponsor-ads/checkout` | Sessie | Afrekeningssessie aanmaken |
| GET | `/api/sponsor-ads/user` | Sessie | Sponsor-advertenties van gebruiker weergeven |
| POST | `/api/sponsor-ads/user` | Sessie | Nieuwe sponsor-advertentie indienen |
| GET | `/api/sponsor-ads/user/{id}` | Sessie | Enkele sponsor-advertentie ophalen |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Sessie | Sponsor-advertentie annuleren |
| POST | `/api/sponsor-ads/user/{id}/renew` | Sessie | Sponsor-advertentie verlengen |
| GET | `/api/sponsor-ads/user/stats` | Sessie | Advertentiestatistieken van gebruiker ophalen |

---

## GET `/api/sponsor-ads`

Geeft actieve sponsor-advertenties terug met bijbehorende itemgegevens voor openbare weergave. **Geen authenticatie vereist.**

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|----------|---------|-------------|
| `limit` | integer | Nee | 10 | Maximaal aantal terug te geven advertenties (1-50) |

### Reactie: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## POST `/api/sponsor-ads/checkout`

Maakt een betaalafrekeningssessie aan voor een goedgekeurde sponsor-advertentie. Ondersteunt Stripe, LemonSqueezy en Polar providers.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `sponsorAdId` | string | **Ja** | ID van de goedgekeurde sponsor-advertentie |
| `successUrl` | string | Nee | Omleidings-URL na geslaagde betaling |
| `cancelUrl` | string | Nee | Omleidings-URL na geannuleerde betaling |

### Beveiliging: Voorkoming van open omleiding

Omleidings-URL's worden gevalideerd aan de hand van de oorsprong van de applicatie om aanvallen via open omleiding te voorkomen:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Ongeldige URL's worden stilzwijgend vervangen door veilige standaardinstellingen.

### Reactie: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Foutreacties

| Status | Beschrijving |
|--------|-------------|
| 400 | Ontbrekend sponsor-advertentie-ID, advertentie heeft geen `pending_payment`-status, of ontbrekende prijsconfiguratie |
| 401 | Niet geauthenticeerd |
| 403 | Gebruiker is niet de eigenaar van deze sponsor-advertentie |
| 404 | Sponsor-advertentie niet gevonden |

---

## GET `/api/sponsor-ads/user`

Geeft een gepagineerde lijst terug van sponsor-advertenties van de geauthenticeerde gebruiker.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|----------|---------|-------------|
| `page` | integer | Nee | 1 | Paginanummer |
| `limit` | integer | Nee | 10 | Items per pagina |
| `status` | string | Nee | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | Nee | -- | Filteren op factureringsinterval |
| `search` | string | Nee | -- | Tekstzoekfilter |

Queryparameters worden gevalideerd met het Zod-schema `querySponsorAdsSchema`.

### Reactie: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## POST `/api/sponsor-ads/user`

Maakt een nieuwe sponsor-advertentieinzending aan. De advertentie begint in een wachtstatus in afwachting van goedkeuring door de beheerder.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `itemSlug` | string | **Ja** | Slug van het te sponsoren item |
| `itemName` | string | **Ja** | Weergavenaam van het item |
| `itemIconUrl` | string | Nee | Pictogram-URL |
| `itemCategory` | string | Nee | Itemcategorie |
| `itemDescription` | string | Nee | Beschrijving (max. 500 tekens) |
| `interval` | `"weekly"` of `"monthly"` | **Ja** | Abonnementsinterval |

### Reactie: 201 Aangemaakt

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 – Dubbele inzending

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Haalt een enkele sponsor-advertentie op die eigendom is van de geauthenticeerde gebruiker. Geeft 404 terug als de advertentie niet bestaat of toebehoort aan een andere gebruiker (om informatielekken te voorkomen).

---

## POST `/api/sponsor-ads/user/{id}/cancel`

Annuleert een sponsor-advertentie. Alleen advertenties met status `pending_payment`, `pending` of `active` kunnen worden geannuleerd.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `cancelReason` | string | Nee | Reden voor annulering (max. 500 tekens) |

### Reactie: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Foutreacties

| Status | Beschrijving |
|--------|-------------|
| 400 | Advertentie kan niet worden geannuleerd met huidige status |
| 403 | Gebruiker is niet de eigenaar van deze sponsor-advertentie |
| 404 | Sponsor-advertentie niet gevonden |

---

## POST `/api/sponsor-ads/user/{id}/renew`

Maakt een afrekeningssessie aan om een actieve of verlopen sponsor-advertentie te verlengen. Alleen advertenties met status `active` of `expired` kunnen worden verlengd.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `successUrl` | string | Nee | Omleidings-URL na betaling |
| `cancelUrl` | string | Nee | Omleidings-URL bij annulering |

### Reactie: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## GET `/api/sponsor-ads/user/stats`

Geeft statistieken terug voor de sponsor-advertenties van de geauthenticeerde gebruiker, inclusief statusverdeling, intervalverdeling en omzetgegevens.

### Reactie: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Omzetwaarden zijn in **kleinste valuta-eenheden** (bijvoorbeeld centen voor USD).

---

## Configuratie van betalingsprovider

De actieve betalingsprovider wordt bepaald door `NEXT_PUBLIC_PAYMENT_PROVIDER` (standaard `"stripe"`). Elke provider vereist zijn eigen set prijs-/variant-ID-omgevingsvariabelen:

| Provider | Wekelijkse prijs-omgevingsvariabele | Maandelijkse prijs-omgevingsvariabele |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Gerelateerde bronbestanden

| Bestand | Doel |
|------|---------|
| `template/app/api/sponsor-ads/route.ts` | Openbaar eindpunt voor actieve advertenties |
| `template/app/api/sponsor-ads/checkout/route.ts` | Aanmaken van afrekeningssessie |
| `template/app/api/sponsor-ads/user/route.ts` | Gebruikersadvertenties weergeven en aanmaken |
| `template/app/api/sponsor-ads/user/[id]/route.ts` | Enkele advertentie ophalen |
| `template/app/api/sponsor-ads/user/[id]/cancel/route.ts` | Advertentie annuleren |
| `template/app/api/sponsor-ads/user/[id]/renew/route.ts` | Advertentie verlengen |
| `template/app/api/sponsor-ads/user/stats/route.ts` | Gebruikersstatistieken |
| `template/lib/services/sponsor-ad.service.ts` | Bedrijfslogicalaag |
| `template/lib/validations/sponsor-ad.ts` | Zod-validatieschema's |
| `template/lib/payment/config/payment-provider-manager.ts` | Betalingsprovider-factory |
