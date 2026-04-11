---
id: recaptcha
title: Integrazione reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Integrazione reCAPTCHA

Il modello integra Google reCAPTCHA v3 per la protezione dai bot sui flussi di autenticazione e invio di moduli. Include un endpoint di verifica lato server, hook lato client per la gestione dei token e una modalità di sviluppo che ignora la verifica quando le credenziali non sono configurate.

## Panoramica dell'architettura

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

## Endpoint di verifica lato server

Il percorso `POST /api/verify-recaptcha` in `app/api/verify-recaptcha/route.ts` gestisce la verifica del token rispetto all'API reCAPTCHA di Google:

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

### Dettagli chiave sull'implementazione

- **Convalida token**: restituisce 400 se non viene fornito alcun token nel corpo della richiesta.
- **Bypass di sviluppo**: quando la chiave segreta non è configurata e `NODE_ENV` è `development` , l'endpoint restituisce una risposta positiva con `score: 1.0` e `action: "bypass"` senza contattare Google.
- **Client esterno**: utilizza il `externalClient` preconfigurato da `lib/api/server-api-client.ts` con il relativo metodo `postForm` , che invia `application/x-www-form-urlencoded` dati all'API di verifica di Google.
- **Utilità API**: utilizza `apiUtils.isSuccess()` e `apiUtils.getErrorMessage()` per una gestione coerente delle risposte.
- **Inoltro risposta completa**: restituisce il risultato completo della verifica, inclusi punteggio, azione, nome host, timestamp della sfida e codici di errore.

### Bypass della modalità di sviluppo

Quando `RECAPTCHA_SECRET_KEY` non è impostato e l'applicazione viene eseguita in modalità di sviluppo, l'endpoint ignora automaticamente la verifica:

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

In produzione, una chiave segreta mancante restituisce un errore 500 invece di essere bypassata silenziosamente.

## Hook di verifica lato client

L'hook `useRecaptchaVerification` in `app/[locale]/auth/hooks/useRecaptchaVerification.ts` racchiude la chiamata di verifica in una mutazione di React Query:

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

### Valori restituiti

| Immobile | Digitare | Descrizione |
|----------|------|-----|
| `verifyRecaptcha` | `(token: string) => Promise` | Funzione di mutazione per verificare un token |
| `isVerifying` | `boolean` | Se la verifica è in corso |
| `isVerified` | `boolean` | Se la verifica è riuscita |
| `error` | `Error or null` | Errore dall'ultimo tentativo di verifica |
| `reset` | `() => void` | Reimposta stato di verifica |

## Hook di verifica automatica

L'hook `useAutoRecaptchaVerification` attiva automaticamente la verifica reCAPTCHA quando un componente viene montato o quando una condizione diventa vera:

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

### Esempio di utilizzo

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

## Integrazione dell'API di Google

L'endpoint comunica con l'API reCAPTCHA di Google utilizzando il metodo `externalClient.postForm` da `lib/api/server-api-client.ts` . Questo metodo invia i dati del modulo con codifica URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

`externalClient` è un'istanza `ServerClient` preconfigurata progettata per chiamate API esterne. Il metodo `postForm` gestisce automaticamente il tipo di contenuto `application/x-www-form-urlencoded` .

### Interpretazione del punteggio

reCAPTCHA v3 restituisce un punteggio compreso tra 0,0 e 1,0:

| Intervallo di punteggio | Interpretazione | Azione tipica |
|-------------|-------|----------------|
| 0,7 - 1,0| Probabilmente umano | Consenti invio |
| 0,3 - 0,7| Incerto | Potrebbe richiedere una verifica aggiuntiva |
| 0,0 - 0,3 | Probabile bot | Blocca invio |

## Integrazione con l'autenticazione

Il componente `CredentialsForm` utilizza la verifica reCAPTCHA prima di inviare le credenziali:

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

## Variabili d'ambiente

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Si accede alla chiave segreta tramite `analyticsConfig.recaptcha.secretKey` dal servizio di configurazione centralizzato, non direttamente da `process.env` .

## Documentazione spavalda

L'endpoint di verifica include annotazioni Swagger/JSDoc complete che documentano tutti gli schemi di richiesta e risposta, codici di stato ed esempi. Questo viene fornito tramite il sistema di documentazione API integrato del modello.

## Attivazione Condizionata

| Condizione | Comportamento |
|-----------|----------|
| Set di chiavi segrete | Verifica completa rispetto all'API di Google |
| Chiave segreta mancante, modalità di sviluppo | Bypass automatico con `success: true` |
| Chiave segreta mancante, modalità di produzione | Restituisce 500 errori |
| Chiave del sito non impostata sul client | Script non caricato, moduli inviati senza verifica |

## Gestione degli errori

L'endpoint gestisce tre categorie di errori:

1. **Errori client (400)**: token mancante o non valido nel corpo della richiesta
2. **Errori di configurazione (500)**: chiave segreta mancante nella produzione
3. **Errori upstream (500)**: errori di richiesta API di Google o eccezioni impreviste

Tutti gli errori vengono registrati sulla console del server e restituiscono una struttura JSON coerente con `success: false` e un messaggio `error` .

## Riferimento al file

| File | Scopo |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Endpoint di verifica lato server |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Mutazione di verifica della query di reazione |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Hook di verifica con attivazione automatica |
| `lib/api/server-api-client.ts` | `externalClient` e `postForm` metodo |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
