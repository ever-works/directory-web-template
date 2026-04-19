---
id: sponsor-checkout-endpoints
title: "Sponsor Ads & Checkout API Reference"
sidebar_label: "Sponsor Ads & Checkout API Reference"
---

# Sponsor-advertenties & Afrekening – API-referentie

## Overzicht

De eindpunten voor sponsor-advertenties beheren de volledige levenscyclus van gesponsorde advertentieplaatsingen op directory-items. Dit omvat het bekijken van actieve advertenties, het indienen van nieuwe sponsorverzoeken, het beheren van advertenties van gebruikers, het verwerken van betalingen via meerdere providers (Stripe, LemonSqueezy, Polar) en het afhandelen van annuleringen en verlengingen. De afrekenflow ondersteunt wekelijkse en maandelijkse factureringsintervallen.

## Eindpunten

### GET /api/sponsor-ads

Geeft een lijst terug van momenteel actieve sponsor-advertenties met bijbehorende itemgegevens voor openbare weergave.

**Aanvraag**

| Parameter | Type    | In    | Beschrijving                                      |
| --------- | ------- | ----- | ------------------------------------------------ |
| limit     | integer | query | Maximaal aantal sponsor-advertenties (standaard: 10, max: 50) |

**Reactie**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/sponsor-ads/user

Geeft een gepagineerde lijst terug van sponsor-advertenties ingediend door de geauthenticeerde gebruiker.

**Aanvraag**

| Parameter | Type    | In    | Beschrijving                                                                             |
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
| page      | integer | query | Paginanummer (standaard: 1)                                                              |
| limit     | integer | query | Items per pagina (standaard: 10)                                                         |
| status    | string  | query | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| interval  | string  | query | Filter: `"weekly"`, `"monthly"`                                                          |
| search    | string  | query | Zoekterm                                                                                 |

**Reactie**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Maakt een nieuwe sponsor-advertentieinzending aan voor de geauthenticeerde gebruiker. De inzending begint in een wachtstatus in afwachting van goedkeuring door de beheerder.

**Aanvraag**

```typescript
{
  itemSlug: string;          // Slug van het te sponsoren item (vereist)
  itemName: string;          // Naam van het item (vereist)
  itemIconUrl?: string;      // Pictogram-URL
  itemCategory?: string;     // Categorie van het item
  itemDescription?: string;  // Beschrijving (max. 500 tekens)
  interval: "weekly" | "monthly"; // Factureringsinterval (vereist)
}
```

**Reactie**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### GET /api/sponsor-ads/user/stats

Geeft statistieken terug voor de sponsor-advertenties van de geauthenticeerde gebruiker, inclusief tellingen per status, intervaalverdeling en omzetgegevens.

**Aanvraag**

Geen parameters vereist. Authenticatie via sessiecookie.

**Reactie**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In kleinste valuta-eenheden (centen)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Actieve advertenties: ${stats.overview.active}, Totale omzet: ${stats.revenue.totalRevenue}`,
);
```

### GET `/api/sponsor-ads/user/{id}`

Geeft een enkele sponsor-advertentie terug die eigendom is van de geauthenticeerde gebruiker.

**Aanvraag**

| Parameter | Type   | In   | Beschrijving              |
| --------- | ------ | ---- | ------------------------- |
| id        | string | path | Sponsor-advertentie-ID (vereist) |

**Reactie**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

Maakt een afrekeningssessie aan voor een goedgekeurde sponsor-advertentie. De sponsor-advertentie moet de status `pending_payment` hebben en eigendom zijn van de geauthenticeerde gebruiker.

**Aanvraag**

```typescript
{
  sponsorAdId: string;      // ID van de goedgekeurde sponsor-advertentie (vereist)
  successUrl?: string;      // Omleidings-URL na geslaagde betaling
  cancelUrl?: string;       // Omleidings-URL na geannuleerde betaling
}
```

**Reactie**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider afrekeningssessie-ID
    checkoutUrl: string; // URL waarnaar de gebruiker wordt omgeleid voor betaling
    provider: string; // "stripe", "lemonsqueezy" of "polar"
  }
  message: "Checkout session created successfully";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Doorsturen naar betaling
```

### POST `/api/sponsor-ads/user/{id}/cancel`

Annuleert een sponsor-advertentie die eigendom is van de geauthenticeerde gebruiker. Kan alleen advertenties annuleren met de status `pending_payment`, `pending` of `active`.

**Aanvraag**

```typescript
{
  cancelReason?: string;   // Optionele reden voor annulering (max. 500 tekens)
}
```

**Reactie**

```typescript
{
  success: true;
  data: SponsorAd; // De geannuleerde sponsor-advertentie
  message: "Sponsor ad cancelled successfully";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### POST `/api/sponsor-ads/user/{id}/renew`

Maakt een afrekeningssessie aan om een actieve of verlopen sponsor-advertentie te verlengen. Alleen advertenties met de status `active` of `expired` kunnen worden verlengd.

**Aanvraag**

```typescript
{
  successUrl?: string;     // Omleidings-URL na geslaagde betaling
  cancelUrl?: string;      // Omleidings-URL na geannuleerde betaling
}
```

**Reactie**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Voorbeeld**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Authenticatie

| Eindpunt                                 | Authenticatie vereist                         |
| ---------------------------------------- | ------------------------------------- |
| GET /api/sponsor-ads                     | Openbaar                                |
| GET /api/sponsor-ads/user                | Sessie vereist                      |
| POST /api/sponsor-ads/user               | Sessie vereist                      |
| GET /api/sponsor-ads/user/stats          | Sessie vereist                      |
| `GET /api/sponsor-ads/user/{id}`         | Sessie vereist (eigenaarschap geverifieerd) |
| POST /api/sponsor-ads/checkout           | Sessie vereist (eigenaarschap geverifieerd) |
| `POST /api/sponsor-ads/user/{id}/cancel` | Sessie vereist (eigenaarschap geverifieerd) |
| `POST /api/sponsor-ads/user/{id}/renew`  | Sessie vereist (eigenaarschap geverifieerd) |

Alle gebruikersspecifieke eindpunten verifiëren eigenaarschap — een poging om de sponsor-advertentie van een andere gebruiker te benaderen geeft `404` (voor GET) of `403` (voor acties) terug.

## Foutreacties

| Status | Beschrijving                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    | Ongeldige invoer, dubbele inzending, niet-annuleerbare/niet-verlengbare status, ontbrekende prijsconfiguratie of misvormde JSON |
| 401    | Niet geautoriseerd — geen geauthenticeerde sessie                                                                          |
| 403    | Verboden — gebruiker is niet de eigenaar van de sponsor-advertentie                                                        |
| 404    | Sponsor-advertentie niet gevonden                                                                                          |
| 500    | Interne serverfout — betalingsproviderfout of databasefout                                                                 |

## Snelheidsbeperking

Geen expliciete snelheidsbeperking. Omleidings-URL's in afrekening- en verlengingseindpunten worden gevalideerd aan de hand van het applicatiedomein om open omleidingskwetsbaarheden te voorkomen. De actieve betalingsprovider wordt bepaald door de omgevingsvariabele `NEXT_PUBLIC_PAYMENT_PROVIDER` (standaard Stripe).

## Gerelateerde eindpunten

- [Gebruikersbetaal-eindpunten](./user-payment-endpoints) — Gebruikersbetaalgeschiedenis en abonnementsbeheer
