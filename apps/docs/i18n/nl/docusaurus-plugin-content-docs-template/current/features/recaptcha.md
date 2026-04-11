---
id: recaptcha
title: reCAPTCHA-integratie
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# reCAPTCHA-integratie

De sjabloon integreert Google reCAPTCHA v3 voor botbescherming bij authenticatie en formulierinzendingsstromen. Het omvat een verificatie-eindpunt aan de serverzijde, hooks aan de clientzijde voor tokenbeheer en een ontwikkelingsmodus die verificatie omzeilt wanneer inloggegevens niet zijn geconfigureerd.

## Architectuuroverzicht

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## Verificatie-eindpunt aan de serverzijde

De `POST /api/verify-recaptcha` -route op `app/api/verify-recaptcha/route.ts` verwerkt de tokenverificatie aan de hand van de Google reCAPTCHA API:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### Belangrijke implementatiedetails

- **Tokenvalidatie**: retourneert 400 als er geen token is opgegeven in de aanvraagtekst.
- **Ontwikkelingsbypass**: wanneer de geheime sleutel niet is geconfigureerd en `NODE_ENV` gelijk is aan `development` , retourneert het eindpunt een succesvol antwoord met `score: 1.0` en `action: "bypass"` zonder contact op te nemen met Google.
- **Externe client**: gebruikt de vooraf geconfigureerde `externalClient` van `lib/api/server-api-client.ts` met de `postForm` -methode, die `application/x-www-form-urlencoded` -gegevens naar de verificatie-API van Google verzendt.
- **API-hulpprogramma's**: gebruikt `apiUtils.isSuccess()` en `apiUtils.getErrorMessage()` voor consistente reactieafhandeling.
- **Volledig doorsturen van antwoorden**: retourneert het volledige verificatieresultaat, inclusief score, actie, hostnaam, tijdstempel van de uitdaging en foutcodes.

### Ontwikkelingsmodus omzeilen

Wanneer `RECAPTCHA_SECRET_KEY` niet is ingesteld en de applicatie in de ontwikkelingsmodus draait, omzeilt het eindpunt automatisch de verificatie:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

In productie retourneert een ontbrekende geheime sleutel een 500-fout in plaats van deze stilzwijgend te omzeilen.

## Verificatiehaak aan de clientzijde

De `useRecaptchaVerification` hook bij `app/[locale]/auth/hooks/useRecaptchaVerification.ts` verpakt de verificatieoproep in een React Query-mutatie:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Retourwaarden

| Eigendom | Typ | Beschrijving |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Mutatiefunctie om een ​​token te verifiëren |
| `isVerifying` | `boolean` | Of er verificatie plaatsvindt |
| `isVerified` | `boolean` | Of de verificatie is geslaagd |
| `error` | `Error or null` | Fout bij de laatste verificatiepoging |
| `reset` | `() => void` | Verificatiestatus opnieuw instellen |

## Automatische verificatiehaak

De `useAutoRecaptchaVerification` hook activeert automatisch reCAPTCHA-verificatie wanneer een component wordt geactiveerd of wanneer aan een voorwaarde wordt voldaan:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### Gebruiksvoorbeeld

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Google API-integratie

Het eindpunt communiceert met de reCAPTCHA API van Google met behulp van de `externalClient.postForm` -methode uit `lib/api/server-api-client.ts` . Deze methode verzendt URL-gecodeerde formuliergegevens:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

De `externalClient` is een vooraf geconfigureerde `ServerClient` -instantie die is ontworpen voor externe API-aanroepen. De `postForm` -methode verwerkt het inhoudstype `application/x-www-form-urlencoded` automatisch.

### Partituurinterpretatie

reCAPTCHA v3 retourneert een score tussen 0,0 en 1,0:

| Scorebereik | Interpretatie | Typische actie |
|------------|--------------|--------------|
| 0,7 - 1,0 | Waarschijnlijk menselijk | Inzending toestaan ​​|
| 0,3 - 0,7 | Onzeker | Mogelijk is aanvullende verificatie vereist |
| 0,0 - 0,3 | Waarschijnlijk bot | Inzending blokkeren |

## Integratie met authenticatie

De component `CredentialsForm` gebruikt reCAPTCHA-verificatie voordat inloggegevens worden ingediend:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## Omgevingsvariabelen

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

De geheime sleutel is toegankelijk via `analyticsConfig.recaptcha.secretKey` vanuit de gecentraliseerde configuratieservice, niet rechtstreeks via `process.env` .

## Swagger-documentatie

Het verificatie-eindpunt bevat uitgebreide Swagger/JSDoc-annotaties die alle aanvraag- en antwoordschema's, statuscodes en voorbeelden documenteren. Dit wordt mogelijk gemaakt via het ingebouwde API-documentatiesysteem van de sjabloon.

## Voorwaardelijke activering

| Conditie | Gedrag |
|-----------|----------|
| Geheime sleutelset | Volledige verificatie tegen Google API |
| Geheime sleutel ontbreekt, ontwikkelingsmodus | Automatische bypass met `success: true` |
| Geheime sleutel ontbreekt, productiemodus | Retourneert 500-fout |
| Sitesleutel niet ingesteld op client | Script niet geladen, formulieren worden zonder verificatie verzonden |

## Foutafhandeling

Het eindpunt verwerkt drie categorieën fouten:

1. **Clientfouten (400)**: ontbrekend of ongeldig token in de hoofdtekst van het verzoek
2. **Configuratiefouten (500)**: Ontbrekende geheime sleutel in productie
3. **Upstream-fouten (500)**: mislukte Google API-verzoeken of onverwachte uitzonderingen

Alle fouten worden geregistreerd op de serverconsole en retourneren een consistente JSON-structuur met `success: false` en een `error` bericht.

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Verificatie-eindpunt aan serverzijde |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Reageren Queryverificatiemutatie |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Verificatiehook voor automatisch activeren |
| `lib/api/server-api-client.ts` | `externalClient` en `postForm` methode |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
