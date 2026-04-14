---
id: recaptcha-endpoints
title: "ReCAPTCHA API Reference"
sidebar_label: "ReCAPTCHA API Reference"
---

# ReCAPTCHA API-referentie

## Overzicht

Het reCAPTCHA-eindpunt verwerkt Google reCAPTCHA v3-tokenverificatie aan de serverzijde. Het wordt gebruikt om formulierverzendingen te beschermen tegen geautomatiseerd misbruik.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/verify-recaptcha` | Geen | reCAPTCHA v3-token verifiëren |

## Token verifiëren (POST)

### Aanvraagbody

```typescript
interface VerifyRecaptchaRequest {
  token: string;      // reCAPTCHA v3-token van de client
  action?: string;    // Optionele actienaam voor validatie (bijv. "submit_form")
}
```

### Voorbeeldaanvraag

```bash
curl -X POST /api/verify-recaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "03AGdBq25SxXT...",
    "action": "contact_form"
  }'
```

### Geslaagde reactie (200)

```typescript
interface VerifyRecaptchaResponse {
  success: boolean;
  score: number;        // reCAPTCHA v3-score 0.0–1.0 (1.0 = meest menselijk)
  action: string;       // Actienaam die door Google is geverifieerd
  hostname: string;     // Hostnaam waarop de token is aangemaakt
}
```

### Voorbeeld

```json
{
  "success": true,
  "score": 0.9,
  "action": "contact_form",
  "hostname": "example.com"
}
```

### Implementatie

```typescript
const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY!,
    response: token
  })
});

const data = await response.json();
```

## Gedrag in ontwikkelingsmodus

Wanneer `NODE_ENV=development` of `RECAPTCHA_SECRET_KEY` niet is ingesteld, slaat het eindpunt de verificatie aan de serverzijde over en geeft het een succesreactie met score `1.0` terug. Zo kunnen formulieren tijdens het lokale ontwikkelen gebruikt worden zonder geldige reCAPTCHA-tokens.

```json
{
  "success": true,
  "score": 1.0,
  "action": "development",
  "hostname": "localhost"
}
```

## Authenticatie

Dit eindpunt vereist geen authenticatie. Het kan worden opgeroepen door niet-geauthenticeerde gebruikers voor het beschermen van publieke formulieren.

## Foutreacties

| Status | Fout | Beschrijving |
|--------|-------|-------------|
| 400 | `Token is required` | Geen token meegestuurd in aanvraagbody |
| 400 | `Invalid token` | Token is vervallen of ongeldig |
| 400 | `Score too low` | reCAPTCHA-score onder drempelwaarde (verdacht verkeer) |
| 500 | `Verification failed` | Google reCAPTCHA API niet bereikbaar |

## Configuratie

| Variabele | Beschrijving |
|----------|-------------|
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3-geheime sleutel (serverside) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3-sitesleutel (clientside) |

## Gebruik aan de clientzijde

Integreer reCAPTCHA v3 aan de clientzijde met behulp van de bibliotheek `react-google-recaptcha-v3`:

```typescript
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const { executeRecaptcha } = useGoogleReCaptcha();

const token = await executeRecaptcha('contact_form');

const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, action: 'contact_form' })
});
```

## Snelheidsbeperking

Het verificatie-eindpunt past de standaard API-snelheidsbeperking toe om misbruik van de verificatieservice te voorkomen. Bij aanvragen waarvoor een hoge frequentie verwacht wordt (bijv. typeahead-formulieren), dient u caching aan de clientzijde van succesvolle verificaties te overwegen.

## Gerelateerde eindpunten

- [Contactformulier-eindpunten](./contact-endpoints.md)
- [Rapportage-eindpunten](./reports-endpoints.md)
