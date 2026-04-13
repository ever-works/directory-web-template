---
id: utility-endpoints
title: "Narzędziowe punkty końcowe API"
sidebar_label: "Narzędziowe punkty końcowe"
---

# Narzędziowe punkty końcowe API

Ta strona dokumentuje punkty końcowe infrastruktury obsługujące sprawdzanie kondycji, wersjonowanie, zarządzanie funkcjami, geokodowanie i operacje wewnętrzne.

## Sprawdzanie kondycji

### GET /api/health/database

Weryfikuje połączenie z bazą danych. Używany przez loadbalancery i narzędzia monitorowania.

**Uwierzytelnianie:** Brak

#### Odpowiedź sukcesu (200)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Odpowiedź błędu (503)

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Wersja i synchronizacja

### GET /api/version

Zwraca informacje o aktualnej wersji aplikacji z metadanymi Git.

**Uwierzytelnianie:** Brak

#### Odpowiedź (200)

```json
{
  "data": {
    "version": "1.2.3",
    "commit": "abc1234",
    "date": "2024-01-10T08:00:00Z",
    "message": "feat: dodano nową funkcję filtrowania",
    "author": "Jan Kowalski",
    "branch": "main"
  }
}
```

### GET /api/version/sync

Sprawdza status synchronizacji treści.

**Uwierzytelnianie:** Brak

#### Odpowiedź (200)

```json
{
  "data": {
    "syncInProgress": false,
    "lastSyncTime": "2024-01-15T09:00:00Z",
    "timeSinceLastSync": "01:30:00"
  }
}
```

## Konfiguracja funkcji

### GET /api/config/features

Zwraca aktualną konfigurację funkcji aplikacji dla bieżącego użytkownika (lub konfigurację publiczną, jeśli nie jest zalogowany).

**Uwierzytelnianie:** Brak

#### Odpowiedź (200)

```json
{
  "data": {
    "features": {
      "payments": true,
      "sponsorAds": true,
      "surveys": true,
      "analytics": false,
      "newsletter": true,
      "recaptcha": true
    }
  }
}
```

## Ekstrakcja adresów URL

### POST /api/extract

Ekstrahuje i normalizuje adres URL z podanej treści lub tekstu.

**Uwierzytelnianie:** Wymagana sesja

#### Treść żądania

```json
{
  "input": "Sprawdź https://example.com/some-page po więcej informacji"
}
```

#### Odpowiedź (200)

```json
{
  "data": {
    "url": "https://example.com/some-page",
    "domain": "example.com",
    "isValid": true
  }
}
```

## Geokodowanie

### POST /api/geocode

Konwertuje adres tekstowy na współrzędne geograficzne.

**Uwierzytelnianie:** Wymagana sesja

#### Treść żądania

```json
{
  "address": "Warszawa, Polska"
}
```

#### Odpowiedź (200)

```json
{
  "data": {
    "lat": 52.2297,
    "lng": 21.0122,
    "formattedAddress": "Warszawa, Polska",
    "country": "PL",
    "city": "Warszawa"
  }
}
```

## Dane lokalizacji

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/locations/countries` | Listuj dostępne kraje |
| `GET` | `/api/locations/states/{countryCode}` | Listuj stany/regiony danego kraju |
| `GET` | `/api/locations/cities/{countryCode}/{stateCode}` | Listuj miasta |
| `GET` | `/api/locations/timezones` | Listuj strefy czasowe |

Wszystkie punkty końcowe lokalizacji są publiczne i nie wymagają uwierzytelniania.

## Weryfikacja reCAPTCHA

### POST /api/verify-recaptcha

Weryfikuje token reCAPTCHA Google. Szczegóły w dokumentacji punktów końcowych reCAPTCHA.

## Dane referencyjne

### GET /api/reference

Zwraca statyczne dane konfiguracyjne używane przez aplikację (enumeracje, mapowania, słowniki).

**Uwierzytelnianie:** Brak

#### Odpowiedź (200)

```json
{
  "data": {
    "categories": [...],
    "paymentProviders": ["stripe", "lemonsqueezy", "polar", "solidgate"],
    "supportedCurrencies": ["USD", "EUR", "GBP", "CAD", "AUD"],
    "supportedLanguages": ["en", "pl", "fr", "de", "es", "ar", "zh"]
  }
}
```

## Operacje wewnętrzne

### POST /api/internal/db-init

Inicjalizuje bazę danych i uruchamia oczekujące migracje. Używane tylko przy wdrożeniu.

:::danger
Punkt końcowy jest chroniony wewnętrznym tokenem API. Nigdy nie udostępniaj `INTERNAL_API_TOKEN` publicznie ani nie wystawiaj tego punktu końcowego na publiczny dostęp.
:::

**Uwierzytelnianie:** `Authorization: Bearer ${INTERNAL_API_TOKEN}` (nagłówek)

#### Odpowiedź sukcesu (200)

```json
{
  "status": "success",
  "message": "Database initialized and migrations applied",
  "migrationsRun": 3
}
```

## Kwestie bezpieczeństwa

| Punkt końcowy | Dostęp publiczny | Uwagi |
|---------------|-----------------|-------|
| `/api/health/database` | Tak | Nie ujawniaj szczegółów błędów |
| `/api/version` | Tak | Nie ujawniaj wewnętrznych SHA commitów w produkcji |
| `/api/config/features` | Tak | Filtruj wrażliwe cechy dla niezalogowanych |
| `/api/extract` | Nie | Waliduj adres URL, aby zapobiec SSRF |
| `/api/geocode` | Nie | Stosuj ograniczenie liczby żądań |
| `/api/internal/db-init` | Nie | Wymagany token wewnętrzny |
