---
id: recaptcha-endpoints
title: "Dokumentacja API reCAPTCHA"
sidebar_label: "reCAPTCHA"
---

# Dokumentacja API reCAPTCHA

## Przegląd

Punkt końcowy reCAPTCHA umożliwia weryfikację po stronie serwera tokenów Google reCAPTCHA v3. Działa jako bezpieczny serwer pośredniczący między klientem a API weryfikacji Google, przechowując tajny klucz po stronie serwera. W trybie deweloperskim weryfikacja może być pominięta, gdy tajny klucz nie jest skonfigurowany.

## Punkty końcowe

### POST /api/verify-recaptcha

Weryfikuje token Google reCAPTCHA v3, komunikując się z punktem końcowym `siteverify` Google. Zwraca wynik weryfikacji łącznie z oceną bot/człowiek.

**Żądanie**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**Odpowiedź**
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**Przykład**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### Zachowanie w trybie deweloperskim

Gdy `RECAPTCHA_SECRET_KEY` nie jest skonfigurowany i `NODE_ENV` wynosi `"development"`, punkt końcowy pomija weryfikację Google i zwraca:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

Do konsoli zostaje zapisane ostrzeżenie informujące, że weryfikacja jest pomijana.

## Uwierzytelnianie

Ten punkt końcowy jest **publiczny** -- uwierzytelnianie nie jest wymagane. Jest przeznaczony do wywoływania z przepływów przesyłania formularzy po stronie klienta przed przetworzeniem formularza lub w jego trakcie.

## Kody błędów

| Status | Opis |
|--------|------|
| 400 | Brak lub pusty `token` w treści żądania |
| 500 | `RECAPTCHA_SECRET_KEY` nie jest skonfigurowany (tylko produkcja), żądanie do API Google nie powiodło się lub nieoczekiwany błąd środowiska wykonawczego |

## Ograniczenie liczby żądań

Nie stosuje się żadnego ograniczenia liczby żądań na poziomie aplikacji. API reCAPTCHA Google ma własne limity. Punkt końcowy używa formatu `application/x-www-form-urlencoded` podczas komunikacji z API Google.

## Powiązane punkty końcowe

Jest to samodzielny punkt końcowy zabezpieczeń. Zazwyczaj jest wywoływany przed przesłaniem formularzy lub wrażliwymi działaniami w całej aplikacji.
