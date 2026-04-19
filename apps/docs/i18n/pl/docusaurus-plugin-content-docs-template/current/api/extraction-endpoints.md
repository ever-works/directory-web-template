---
id: extraction-endpoints
title: "Punkty końcowe Ekstrakcji i Weryfikacji"
sidebar_label: "Ekstrakcja i Weryfikacja"
---

# Punkty końcowe Ekstrakcji i Weryfikacji

Te punkty końcowe zapewniają ekstrakcję metadanych URL (za pośrednictwem Ever Works Platform API) i weryfikację tokenów Google reCAPTCHA. Oba działają jako bezpieczne proxy po stronie serwera, aby klucze API i tajemnice nie trafiały do kodu po stronie klienta.

**Pliki źródłowe:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| POST | `/api/extract` | Brak | Wyodrębnij metadane elementów z URL |
| POST | `/api/verify-recaptcha` | Brak | Zweryfikuj token reCAPTCHA |

---

## POST `/api/extract`

Bezpieczne proxy wyodrębniające metadane elementów (nazwę, opis, sugestie kategorii) z podanego URL przy użyciu Ever Works Platform API. Punkt końcowy utrzymuje poświadczenia `PLATFORM_API_URL` i `PLATFORM_API_SECRET_TOKEN` po stronie serwera.

### Dostępność funkcji

Ten punkt końcowy wymaga skonfigurowania `PLATFORM_API_URL`. Gdy nie jest skonfigurowany, zwraca łagodną odpowiedź wskazującą, że funkcja jest wyłączona, zamiast twardego błędu:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `url` | string (URL) | **Tak** | URL, z którego należy wyodrębnić metadane |
| `existingCategories` | string[] | Nie | Istniejące nazwy kategorii pomocne przy kategoryzacji |

### Przykład żądania

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Odpowiedź: 200 (Sukces)

Odpowiedź jest przekazywana bezpośrednio z Platform API:

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

### Odpowiedź: 200 (Funkcja wyłączona)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 400 | Nieprawidłowy format URL (walidacja Zod) |
| Różne | Błąd upstream API (kod statusu przekazany z Platform API) |
| 500 | Wewnętrzny błąd serwera podczas ekstrakcji |

### Zmienne środowiskowe

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `PLATFORM_API_URL` | Tak (dla funkcji) | Bazowy URL Ever Works Platform API |
| `PLATFORM_API_SECRET_TOKEN` | Nie | Token nażywiciela dla uwierzytelnionych wywołań Platform API |

---

## POST `/api/verify-recaptcha`

Weryfikuje token Google reCAPTCHA komunikując się z API `siteverify` Google. Obsługuje tokeny reCAPTCHA v2 i v3. W trybie programistycznym punkt końcowy może pomijać weryfikację, gdy klucz tajny nie jest skonfigurowany.

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `token` | string | **Tak** | Token reCAPTCHA z weryfikacji po stronie klienta |

### Odpowiedź: 200 (Zweryfikowany)

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

### Odpowiedź: 200 (Weryfikacja nie powiodła się)

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

### Pola odpowiedzi

| Pole | Typ | Opis |
|------|-----|------|
| `success` | boolean | Czy weryfikacja przeszła pomyślnie |
| `score` | number (0.0-1.0) | Wynik reCAPTCHA v3 (1.0 = prawdopodobnie człowiek, 0.0 = prawdopodobnie bot) |
| `action` | string | Nazwa akcji z reCAPTCHA |
| `hostname` | string | Nazwa hosta, gdzie nastąpiła weryfikacja |
| `challenge_ts` | string | Znacznik czasu weryfikacji |
| `error_codes` | string[] | Kody błędów z API Google |

### Zmienne środowiskowe

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `RECAPTCHA_SECRET_KEY` | Tak (produkcja) | Tajny klucz Google reCAPTCHA |
