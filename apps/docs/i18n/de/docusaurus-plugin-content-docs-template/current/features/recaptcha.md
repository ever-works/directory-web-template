---
id: recaptcha
title: reCAPTCHA-Integration
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# reCAPTCHA-Integration

Die Vorlage integriert Google reCAPTCHA v3 für den Bot-Schutz bei Authentifizierung und Formularübermittlungsabläufen. Es umfasst einen serverseitigen Verifizierungsendpunkt, clientseitige Hooks für die Token-Verwaltung und einen Entwicklungsmodus, der die Verifizierung umgeht, wenn Anmeldeinformationen nicht konfiguriert sind.

## Architekturübersicht

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

## Serverseitiger Verifizierungsendpunkt

Die `POST /api/verify-recaptcha` -Route bei `app/api/verify-recaptcha/route.ts` übernimmt die Token-Verifizierung anhand der Google reCAPTCHA-API:

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

### Wichtige Implementierungsdetails

- **Token-Validierung**: Gibt 400 zurück, wenn im Anforderungstext kein Token bereitgestellt wird.
- **Entwicklungsumgehung**: Wenn der geheime Schlüssel nicht konfiguriert ist und `NODE_ENV` `development` ist, gibt der Endpunkt eine erfolgreiche Antwort mit `score: 1.0` und `action: "bypass"` zurück, ohne Google zu kontaktieren.
- **Externer Client**: Verwendet das vorkonfigurierte `externalClient` von `lib/api/server-api-client.ts` mit seiner `postForm` -Methode, die `application/x-www-form-urlencoded` -Daten an die Verifizierungs-API von Google sendet.
- **API-Dienstprogramme**: Verwendet `apiUtils.isSuccess()` und `apiUtils.getErrorMessage()` für eine konsistente Antwortverarbeitung.
- **Vollständige Antwortweiterleitung**: Gibt das vollständige Verifizierungsergebnis zurück, einschließlich Punktzahl, Aktion, Hostname, Challenge-Zeitstempel und Fehlercodes.

### Umgehung des Entwicklungsmodus

Wenn `RECAPTCHA_SECRET_KEY` nicht festgelegt ist und die Anwendung im Entwicklungsmodus ausgeführt wird, umgeht der Endpunkt automatisch die Überprüfung:

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

In der Produktion gibt ein fehlender geheimer Schlüssel einen 500-Fehler zurück, anstatt ihn stillschweigend zu umgehen.

## Clientseitiger Verifizierungs-Hook

Der `useRecaptchaVerification` -Hook bei `app/[locale]/auth/hooks/useRecaptchaVerification.ts` umschließt den Verifizierungsaufruf in einer React Query-Mutation:

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

### Rückgabewerte

| Eigentum | Geben Sie | ein Beschreibung |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Mutationsfunktion zur Überprüfung eines Tokens |
| `isVerifying` | `boolean` | Ob die Verifizierung läuft |
| `isVerified` | `boolean` | Ob die Überprüfung erfolgreich war |
| `error` | `Error or null` | Fehler beim letzten Verifizierungsversuch |
| `reset` | `() => void` | Überprüfungsstatus zurücksetzen |

## Auto-Verification-Hook

Der `useAutoRecaptchaVerification` -Hook löst die reCAPTCHA-Überprüfung automatisch aus, wenn eine Komponente bereitgestellt wird oder wenn eine Bedingung wahr wird:

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

### Anwendungsbeispiel

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

## Google API-Integration

Der Endpunkt kommuniziert mit der reCAPTCHA-API von Google über die Methode `externalClient.postForm` aus `lib/api/server-api-client.ts` . Diese Methode sendet URL-codierte Formulardaten:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

Die `externalClient` ist eine vorkonfigurierte `ServerClient` -Instanz, die für externe API-Aufrufe konzipiert ist. Die Methode `postForm` verarbeitet den Inhaltstyp `application/x-www-form-urlencoded` automatisch.

### Partiturinterpretation

reCAPTCHA v3 gibt einen Score zwischen 0,0 und 1,0 zurück:

| Bewertungsbereich | Interpretation | Typische Aktion |
|-------------|---------------|----------------|
| 0,7 - 1,0 | Wahrscheinlich menschlich | Übermittlung zulassen |
| 0,3 - 0,7 | Unsicher | Möglicherweise ist eine zusätzliche Überprüfung erforderlich |
| 0,0 - 0,3 | Wahrscheinlich Bot | Einreichung blockieren |

## Integration mit Authentifizierung

Die `CredentialsForm` -Komponente verwendet die reCAPTCHA-Überprüfung vor der Übermittlung von Anmeldeinformationen:

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

## Umgebungsvariablen

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Der Zugriff auf den geheimen Schlüssel erfolgt über `analyticsConfig.recaptcha.secretKey` vom zentralen Konfigurationsdienst, nicht direkt über `process.env` .

## Swagger-Dokumentation

Der Verifizierungsendpunkt umfasst umfassende Swagger/JSDoc-Anmerkungen, die alle Anforderungs- und Antwortschemata, Statuscodes und Beispiele dokumentieren. Dies wird über das integrierte API-Dokumentationssystem der Vorlage bereitgestellt.

## Bedingte Aktivierung

| Zustand | Verhalten |
|-----------|----------|
| Geheimer Schlüsselsatz | Vollständige Überprüfung anhand der Google API |
| Geheimer Schlüssel fehlt, Entwicklungsmodus | Automatischer Bypass mit `success: true` |
| Geheimer Schlüssel fehlt, Produktionsmodus | Gibt 500 Fehler zurück |
| Site-Schlüssel nicht auf Client festgelegt | Skript nicht geladen, Formulare werden ohne Überprüfung gesendet |

## Fehlerbehandlung

Der Endpunkt verarbeitet drei Kategorien von Fehlern:

1. **Client-Fehler (400)**: Fehlendes oder ungültiges Token im Anfragetext
2. **Konfigurationsfehler (500)**: Fehlender geheimer Schlüssel in der Produktion
3. **Upstream-Fehler (500)**: Google API-Anforderungsfehler oder unerwartete Ausnahmen

Alle Fehler werden an der Serverkonsole protokolliert und geben eine konsistente JSON-Struktur mit `success: false` und einer `error` -Meldung zurück.

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Serverseitiger Verifizierungsendpunkt |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | React Query-Verifizierungsmutation |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Hook zur automatischen Auslösung der Überprüfung |
| `lib/api/server-api-client.ts` | `externalClient` und `postForm` Methode |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
