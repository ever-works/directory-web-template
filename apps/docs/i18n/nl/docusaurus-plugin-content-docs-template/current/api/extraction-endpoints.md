---
id: extraction-endpoints
title: "Extraction & Verification Endpoints"
sidebar_label: "Extraction & Verification Endpoints"
sidebar_position: 19
---

# Extractie- & Verificatie-eindpunten

Deze eindpunten bieden URL-metadata-extractie (via de Ever Works Platform API) en Google reCAPTCHA-tokenverificatie. Beide fungeren als beveiligde server-side proxy's om API-sleutels en geheimen uit de clientcode te houden.

**Bronbestanden:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|---------|-----|---------------|--------------|
| POST | `/api/extract` | Geen | Itemmetadata extraheren van een URL |
| POST | `/api/verify-recaptcha` | Geen | Een reCAPTCHA-token verifiëren |

---

## POST `/api/extract`

Een beveiligde proxy die itemmetadata (naam, beschrijving, categoriesuggesties) extraheert van een opgegeven URL met de Ever Works Platform API. Het eindpunt houdt de inloggegevens `PLATFORM_API_URL` en `PLATFORM_API_SECRET_TOKEN` server-side.

### Beschikbaarheid van Functie

Dit eindpunt vereist dat `PLATFORM_API_URL` is geconfigureerd. Wanneer niet geconfigureerd, geeft het een nette reactie terug die aangeeft dat de functie is uitgeschakeld in plaats van een harde fout:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `url` | string (URL) | **Ja** | De URL waarvan metadata geëxtraheerd moet worden |
| `existingCategories` | string[] | Nee | Bestaande categorienamen om categorisatie te helpen |

Gevalideerd met een Zod-schema:

```ts
const extractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  existingCategories: z.array(z.string()).optional()
});
```

### Aanvraagvoorbeeld

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Werking

De handler stuurt het verzoek door naar het eindpunt `/extract-item-details` van de Platform API:

```ts
const extractionEndpoint =
  `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

const response = await fetch(extractionEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(platformApiToken
      ? { Authorization: `Bearer ${platformApiToken}` }
      : {})
  },
  body: JSON.stringify({
    source_url: url,
    existing_data: existingCategories?.length > 0
      ? existingCategories
      : undefined
  })
});
```

### Reactie: 200 (Geslaagd)

De reactie wordt direct doorgegeven vanuit de Platform API:

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Reactie: 200 (Functie Uitgeschakeld)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Foutreacties

| Status | Beschrijving |
|--------|--------------|
| 400 | Ongeldig URL-formaat (Zod-validatie) |
| Variabel | Upstream API-fout (statuscode doorgegeven vanuit Platform API) |
| 500 | Interne serverfout tijdens extractie |

### Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|--------------|
| `PLATFORM_API_URL` | Ja (voor functie) | Basis-URL van de Ever Works Platform API |
| `PLATFORM_API_SECRET_TOKEN` | Nee | Bearer-token voor geauthenticeerde Platform API-aanroepen |

---

## POST `/api/verify-recaptcha`

Verifieert een Google reCAPTCHA-token door te communiceren met de `siteverify` API van Google. Ondersteunt zowel reCAPTCHA v2- als v3-tokens. In ontwikkelingsmodus kan het eindpunt verificatie overslaan wanneer de geheime sleutel niet is geconfigureerd.

### Aanvraagbody

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `token` | string | **Ja** | reCAPTCHA-token van client-side verificatie |

### Aanvraagvoorbeeld

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Werking

De handler stuurt het token naar het verificatie-eindpunt van Google via URL-gecodeerde formuliergegevens:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Reactie: 200 (Geverifieerd)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Reactie: 200 (Verificatie Mislukt)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Ontwikkelingsmodus-bypass

Wanneer `RECAPTCHA_SECRET_KEY` niet is geconfigureerd en `NODE_ENV` `"development"` is, slaat het eindpunt verificatie over en geeft succes terug:

```ts
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({
      success: true,
      score: 1.0,
      action: "bypass",
    });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

### Foutreacties

| Status | Beschrijving |
|--------|--------------|
| 400 | Ontbrekend of leeg `token`-veld |
| 500 | Geheime sleutel niet geconfigureerd (alleen productie) |
| 500 | Google API-verzoek mislukt |
| 500 | Onverwachte fout tijdens verificatie |

### Reactievelden

| Veld | Type | Beschrijving |
|------|------|--------------|
| `success` | boolean | Of de verificatie geslaagd is |
| `score` | number (0.0-1.0) | reCAPTCHA v3-score (1.0 = waarschijnlijk mens, 0.0 = waarschijnlijk bot) |
| `action` | string | Actienaam van reCAPTCHA |
| `hostname` | string | Hostnaam waar verificatie plaatsvond |
| `challenge_ts` | string | Tijdstempel van de uitdaging |
| `error_codes` | string[] | Foutcodes van de API van Google |

### Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|--------------|
| `RECAPTCHA_SECRET_KEY` | Ja (productie) | Google reCAPTCHA-geheime sleutel |

---

## Gebruiksvoorbeelden

### URL-extractie

```ts
// Metadata extraheren van een URL voor het itemindieningsformulier
const res = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/product',
    existingCategories: ['Productivity', 'Developer Tools']
  })
});

const data = await res.json();

if (data.featureDisabled) {
  // Functie niet beschikbaar, auto-invullen overslaan
  console.log('Extractie niet beschikbaar');
} else if (data.success) {
  // Formuliervelden automatisch invullen
  setName(data.data.name);
  setDescription(data.data.description);
}
```

### reCAPTCHA-verificatie

```ts
// reCAPTCHA-token verifiëren voor formulierindiening
const recaptchaToken = await grecaptcha.execute(siteKey, {
  action: 'submit'
});

const res = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: recaptchaToken })
});

const { success, score } = await res.json();

if (success && score >= 0.5) {
  // Doorgaan met formulierindiening
  submitForm();
} else {
  // Menselijke verificatieuitdaging tonen
  showCaptchaChallenge();
}
```

---

## Gerelateerde bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/extract/route.ts` | URL-extractie proxy |
| `template/app/api/verify-recaptcha/route.ts` | reCAPTCHA-verificatie proxy |
| `template/lib/api/server-api-client.ts` | Externe API-client met `postForm`-ondersteuning |
| `template/lib/config/config-service.ts` | Configuratieservice voor omgevingsvariabelen |
