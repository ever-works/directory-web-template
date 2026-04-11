---
id: recaptcha
title: Integracja z reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Integracja reCAPTCHA

Szablon integruje Google reCAPTCHA v3 w celu ochrony przed botami podczas uwierzytelniania i przesyłania formularzy. Obejmuje punkt końcowy weryfikacji po stronie serwera, punkty zaczepienia po stronie klienta do zarządzania tokenami oraz tryb programistyczny, który omija weryfikację, gdy poświadczenia nie są skonfigurowane.

## Przegląd architektury

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

## Punkt końcowy weryfikacji po stronie serwera

Trasa `POST /api/verify-recaptcha` na `app/api/verify-recaptcha/route.ts` obsługuje weryfikację tokena względem API Google reCAPTCHA:

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

### Kluczowe szczegóły implementacji

- **Weryfikacja tokenu**: Zwraca 400, jeśli w treści żądania nie podano tokenu.
- **Obejście programistyczne**: Gdy tajny klucz nie jest skonfigurowany, a `NODE_ENV` ma wartość `development` , punkt końcowy zwraca pomyślną odpowiedź z `score: 1.0` i `action: "bypass"` bez konieczności kontaktowania się z Google.
- **Klient zewnętrzny**: Używa wstępnie skonfigurowanego `externalClient` z `lib/api/server-api-client.ts` z metodą `postForm` , która wysyła dane `application/x-www-form-urlencoded` do API weryfikacyjnego Google.
- **Narzędzia API**: Używają `apiUtils.isSuccess()` i `apiUtils.getErrorMessage()` do spójnej obsługi odpowiedzi.
- **Przekazywanie pełnej odpowiedzi**: Zwraca pełny wynik weryfikacji, w tym wynik, działanie, nazwę hosta, znacznik czasu wyzwania i kody błędów.

### Obejście trybu programistycznego

Gdy nie ustawiono `RECAPTCHA_SECRET_KEY` i aplikacja działa w trybie deweloperskim, punkt końcowy automatycznie omija weryfikację:

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

W środowisku produkcyjnym brak tajnego klucza powoduje zwrócenie błędu 500 zamiast cichego omijania.

## Hak weryfikacji po stronie klienta

Hak `useRecaptchaVerification` w `app/[locale]/auth/hooks/useRecaptchaVerification.ts` otacza wywołanie weryfikacyjne mutacją React Query:

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

### Zwróć wartości

| Nieruchomość | Wpisz | Opis |
|---------|------|------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Funkcja mutacji weryfikująca token |
| `isVerifying` | `boolean` | Czy weryfikacja jest w toku |
| `isVerified` | `boolean` | Czy weryfikacja się powiodła |
| `error` | `Error or null` | Błąd ostatniej próby weryfikacji |
| `reset` | `() => void` | Zresetuj stan weryfikacji |

## Hak automatycznej weryfikacji

Hook `useAutoRecaptchaVerification` uruchamia weryfikację reCAPTCHA automatycznie, gdy komponent zostanie zamontowany lub gdy spełniony zostanie warunek:

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

### Przykład użycia

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

## Integracja API Google

Punkt końcowy komunikuje się z API reCAPTCHA firmy Google przy użyciu metody `externalClient.postForm` z `lib/api/server-api-client.ts` . Ta metoda wysyła dane formularza zakodowane w adresie URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

`externalClient` to wstępnie skonfigurowana instancja `ServerClient` przeznaczona do zewnętrznych wywołań API. Metoda `postForm` automatycznie obsługuje typ zawartości `application/x-www-form-urlencoded` .

### Interpretacja wyniku

reCAPTCHA v3 zwraca wynik od 0,0 do 1,0:

| Zakres punktacji | Interpretacja | Typowe działanie |
|------------|----------------------------|----------------|
| 0,7 - 1,0 | Prawdopodobnie człowiek | Zezwól na przesłanie |
| 0,3 - 0,7 | Niepewne | Może wymagać dodatkowej weryfikacji |
| 0,0 - 0,3 | Prawdopodobny bot | Blokuj przesyłanie |

## Integracja z uwierzytelnianiem

Komponent `CredentialsForm` korzysta z weryfikacji reCAPTCHA przed przesłaniem danych uwierzytelniających:

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

## Zmienne środowiskowe

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Dostęp do tajnego klucza można uzyskać poprzez `analyticsConfig.recaptcha.secretKey` ze scentralizowanej usługi konfiguracyjnej, a nie bezpośrednio z `process.env` .

## Dokumentacja Swaggera

Punkt końcowy weryfikacji zawiera kompleksowe adnotacje Swagger/JSDoc, które dokumentują wszystkie schematy żądań i odpowiedzi, kody stanu i przykłady. Jest to obsługiwane poprzez wbudowany system dokumentacji API szablonu.

## Aktywacja warunkowa

| Stan | Zachowanie |
|----------|----------|
| Zestaw tajnych kluczy | Pełna weryfikacja względem Google API |
| Brak tajnego klucza, tryb programistyczny | Automatyczne obejście z `success: true` |
| Brak tajnego klucza, tryb produkcyjny | Zwraca błąd 500 |
| Klucz witryny nie jest ustawiony na kliencie | Skrypt nie został załadowany, formularze przesyłane są bez weryfikacji |

## Obsługa błędów

Punkt końcowy obsługuje trzy kategorie błędów:

1. **Błędy klienta (400)**: Brakujący lub nieprawidłowy token w treści żądania
2. **Błędy konfiguracji (500)**: Brak tajnego klucza w produkcji
3. **Błędy nadrzędne (500)**: Błędy żądań Google API lub nieoczekiwane wyjątki

Wszystkie błędy są rejestrowane w konsoli serwera i zwracają spójną strukturę JSON z komunikatami `success: false` i `error` .

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `app/api/verify-recaptcha/route.ts` | Punkt końcowy weryfikacji po stronie serwera |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Reaguj Mutacja weryfikacji zapytania |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Hak weryfikacyjny automatycznego wyzwalania |
| `lib/api/server-api-client.ts` | Metoda `externalClient` i `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
