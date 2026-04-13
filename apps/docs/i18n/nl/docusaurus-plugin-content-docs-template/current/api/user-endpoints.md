---
id: user-endpoints
title: "User Endpoints"
sidebar_label: "User Endpoints"
---

# Gebruikerseindpunten

De gebruikers-API biedt eindpunten voor het beheren van geauthenticeerde gebruikersvoorkeuren, abonnementsdetails, betalingshistorie en profiel-locatie-instellingen. Alle eindpunten vereisen sessiebewuste authenticatie.

## Overzicht

| Eindpunt | Methode | Authenticatie | Beschrijving |
|---|---|---|---|
| `/api/user/currency` | GET | Openbaar | Gebruikersvaluta detecteren op basis van headers |
| `/api/user/currency` | PUT | Gebruiker | Valutavoorkeur bijwerken |
| `/api/user/payments` | GET | Gebruiker | Betalingshistorie ophalen uit Stripe |
| `/api/user/plan-status` | GET | Gebruiker | Planstatus ophalen met verloopinformatie |
| `/api/user/subscription` | GET | Gebruiker | Abonnementsdetails ophalen |
| `/api/user/profile/location` | GET | Gebruiker | Opgeslagen locatie-instellingen ophalen |
| `/api/user/profile/location` | PATCH | Gebruiker | Locatie-instellingen bijwerken |

## Valutadetectie en -voorkeuren

### Valuta detecteren

```
GET /api/user/currency
```

Detecteert de valuta van de gebruiker op basis van HTTP-headers van CDN/proxy-providers. Dit eindpunt gebruikt geleidelijke degradatie -- het geeft altijd 200 OK terug met een geldige valutacode, en valt terug op USD als detectie mislukt. Authenticatie is niet vereist.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|---|---|---|---|
| `provider` | string | `"smart"` | Detectieprovider: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` |

**Succesreactie (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `currency` | string | ISO 4217-valutacode (3 tekens), standaard `"USD"` |
| `country` | string of null | ISO 3166-1 alpha-2-landcode, null als detectie mislukt |
| `detected` | boolean | Of detectie geslaagd is of de waarde een terugval is |

Wanneer detectie mislukt, geeft de reactie nog steeds 200 terug met `"USD"` en `detected: false`.

**Bron:** `template/app/api/user/currency/route.ts`

### Valutavoorkeur bijwerken

```
PUT /api/user/currency
```

Werkt de voorkeurvaluta en het land van de geauthenticeerde gebruiker bij. Gevalideerd met Zod met de lijst `SUPPORTED_CURRENCIES` uit `lib/config/billing`.

**Authenticatie:** Vereist

**Aanvraagbody:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `currency` | string | Ja | ISO 4217-valutacode (precies 3 tekens, hoofdletters) |
| `country` | string of null | Nee | ISO 3166-1 alpha-2-landcode (precies 2 tekens) |

**Succesreactie (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Status | Voorwaarde |
|---|---|
| 400 | Ongeldige JSON, niet-ondersteunde valutacode, of ongeldig landformaat |
| 401 | Gebruiker niet geauthenticeerd |
| 500 | Bijwerking kan niet worden opgeslagen |

**Bron:** `template/app/api/user/currency/route.ts`

## Betalingshistorie

### Betalingshistorie ophalen

```
GET /api/user/payments
```

Haalt de volledige betalingshistorie van de geauthenticeerde gebruiker op uit Stripe. Haalt facturen en abonnementen op, verrijkt ze met planmetadata en geeft een gesorteerde lijst van betalingsrecords terug.

**Authenticatie:** Vereist

**Succesreactie (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

Belangrijke verwerkingsdetails:

- Filtert op alleen `"paid"` en `"open"` facturen
- Converteert bedragen van centen naar de hoofdvaluta-eenheid (deelt door 100)
- Sorteert op datum, nieuwste eerst
- Zet status om naar leesbare waarden: `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- Geeft een lege array `[]` terug als er geen Stripe-klant bestaat

**Bron:** `template/app/api/user/payments/route.ts`

## Planstatus

### Planstatus ophalen

```
GET /api/user/plan-status
```

Geeft uitgebreide planstatusinformatie terug inclusief verloopdetails. Gebruikt door de frontend om planwaarschuwingen weer te geven en functies achter plancontroles te plaatsen.

**Authenticatie:** Vereist

**Succesreactie (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `planId` | string | Het abonnementsplan van de gebruiker: `"free"`, `"standard"`, `"premium"` |
| `effectivePlan` | string | Het plan dat de gebruiker daadwerkelijk kan gebruiken (kan afwijken bij verlopen abonnement) |
| `isExpired` | boolean | Of het abonnement verlopen is |
| `expiresAt` | string of null | Vervaldatum in ISO-formaat |
| `daysUntilExpiration` | integer of null | Dagen tot verloop (negatief als al verlopen) |
| `isInWarningPeriod` | boolean | True als het abonnement binnen 7 dagen verloopt |
| `canAccessPlanFeatures` | boolean | Of de gebruiker toegang heeft tot de functies van zijn plan |
| `warningMessage` | string of null | Gebruikersgerichte waarschuwingsmelding indien van toepassing |
| `status` | string of null | Onbewerkte abonnementsstatus |

Gebruikt `subscriptionService.getUserPlanWithExpiration()` uit `lib/services/subscription.service`.

**Bron:** `template/app/api/user/plan-status/route.ts`

## Abonnementsdetails

### Abonnementsstatus ophalen

```
GET /api/user/subscription
```

Haalt gedetailleerde abonnementsinformatie op uit Stripe, inclusief het huidige actieve abonnement en de volledige abonnementshistorie.

**Authenticatie:** Vereist

**Succesreactie (200) -- Actief abonnement:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

Actieve abonnementen worden geïdentificeerd door `status === "active"` of `status === "trialing"`. Historievermeldingen kunnen `cancelledAt` en `cancelReason` bevatten voor geannuleerde abonnementen.

**Bron:** `template/app/api/user/subscription/route.ts`

## Profiellocatie

### Locatie-instellingen ophalen

```
GET /api/user/profile/location
```

Geeft de opgeslagen standaardlocatie en privacyvoorkeur van de geauthenticeerde gebruiker terug.

**Authenticatie:** Vereist (clientprofiel)

**Succesreactie (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**Bron:** `template/app/api/user/profile/location/route.ts`

### Locatie-instellingen bijwerken

```
PATCH /api/user/profile/location
```

Werkt de standaardlocatie en privacyvoorkeur van de geauthenticeerde gebruiker bij. Gevalideerd met het `updateLocationSchema` uit `lib/validations/user-location`.

**Aanvraagbody:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

| Veld | Type | Vereist | Beschrijving |
|---|---|---|---|
| `defaultLatitude` | number of null | Nee | Breedtegraadcoördinaat |
| `defaultLongitude` | number of null | Nee | Lengtegraadcoördinaat |
| `defaultCity` | string of null | Nee | Stadsnaam |
| `defaultCountry` | string of null | Nee | Landcode |
| `locationPrivacy` | string | Nee | Privacyniveau: `"private"`, `"city"`, `"exact"` |

Breedtegraad en lengtegraad moeten samen worden opgegeven.

**Bron:** `template/app/api/user/profile/location/route.ts`
