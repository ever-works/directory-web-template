---
id: user-endpoints
title: "Punkty końcowe użytkownika"
sidebar_label: "Punkty końcowe użytkownika"
---

# Punkty końcowe użytkownika

Ta strona dokumentuje punkty końcowe dotyczące danych użytkownika, w tym walutę, historię płatności, status planu, dane subskrypcji i lokalizację profilu.

## Przegląd

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `GET` | `/api/user/currency` | Wymagana sesja | Pobierz bieżącą walutę użytkownika |
| `PUT` | `/api/user/currency` | Wymagana sesja | Zaktualizuj preferencję walutową |
| `GET` | `/api/user/payments` | Wymagana sesja | Pobierz historię płatności |
| `GET` | `/api/user/plan-status` | Wymagana sesja | Pobierz aktualny status planu |
| `GET` | `/api/user/subscription` | Wymagana sesja | Pobierz dane subskrypcji |
| `GET` | `/api/user/profile/location` | Wymagana sesja | Pobierz lokalizację profilu |
| `PATCH` | `/api/user/profile/location` | Wymagana sesja | Zaktualizuj lokalizację profilu |

## GET /api/user/currency

Pobiera bieżące ustawienie waluty użytkownika. Jeśli nie jest ustawiona, wykrywa walutę na podstawie lokalizacji.

### Wykrywanie waluty

Punkt końcowy próbuje wykryć odpowiednią walutę z kilku źródeł:

1. **Preferencja użytkownika** — sprawdza pole `currency` w rekordzie użytkownika
2. **Parametr dostawcy** — obsługuje parametr zapytania `?provider=` do testowania
3. **Graceful degradation** — domyślna wartość `USD` przy braku danych

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "currency": "EUR",
    "source": "user_preference"
  }
}
```

## PUT /api/user/currency

Aktualizuje preferencję walutową użytkownika.

### Treść żądania

```json
{
  "currency": "EUR"
}
```

### Obsługiwane kody walut

Obsługiwane waluty zdefiniowano w `lib/constants/currencies.ts`. Żądania z nieobsługiwanymi kodami walut zwracają błąd `400`.

## GET /api/user/payments

Pobiera historię płatności zalogowanego użytkownika.

### Parametry zapytania

| Parametr | Typ | Wymagane | Domyślne | Opis |
|----------|-----|----------|----------|------|
| `page` | `number` | Nie | `1` | Numer strony |
| `limit` | `number` | Nie | `10` | Rekordów na stronie |
| `status` | `string` | Nie | Wszystkie | Filtruj według statusu płatności |
| `sortBy` | `string` | Nie | `createdAt` | Pole sortowania |
| `sortOrder` | `string` | Nie | `desc` | Kierunek sortowania (`asc`/`desc`) |

### Odpowiedź sukcesu (200)

```json
{
  "data": [
    {
      "id": "pay_123",
      "amount": 29.99,
      "currency": "USD",
      "status": "succeeded",
      "provider": "stripe",
      "description": "Plan Pro – styczeń 2024",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
}
```

## GET /api/user/plan-status

Pobiera szczegółowy status planu, w tym datę wygaśnięcia i flagi ostrzegawcze.

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "plan": "pro",
    "status": "active",
    "expiresAt": "2024-02-01T00:00:00Z",
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "daysUntilExpiry": 17,
    "features": {
      "maxListings": 50,
      "analyticsAccess": true,
      "prioritySupport": true
    }
  }
}
```

| Pole | Opis |
|------|------|
| `isInWarningPeriod` | `true` gdy plan wygasa w ciągu 7 dni |
| `canAccessPlanFeatures` | `false` gdy subskrypcja jest nieaktywna lub wygasła |

## GET /api/user/subscription

Pobiera aktualną i historyczną informację o subskrypcji.

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "hasActiveSubscription": true,
    "currentSubscription": {
      "id": "sub_abc123",
      "plan": "pro",
      "status": "active",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "provider": "stripe"
    },
    "subscriptionHistory": [
      {
        "id": "sub_old456",
        "plan": "basic",
        "status": "canceled",
        "startDate": "2023-06-01T00:00:00Z",
        "endDate": "2023-12-31T00:00:00Z"
      }
    ]
  }
}
```

## GET /api/user/profile/location

Pobiera zapisaną lokalizację profilu użytkownika.

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "country": "PL",
    "city": "Warszawa",
    "region": "Masovia",
    "timezone": "Europe/Warsaw"
  }
}
```

Jeżeli lokalizacja nie jest ustawiona, zwraca `null` dla każdego pola.

## PATCH /api/user/profile/location

Aktualizuje lokalizację profilu użytkownika.

### Treść żądania

```json
{
  "country": "PL",
  "city": "Kraków",
  "region": "Lesser Poland",
  "timezone": "Europe/Warsaw"
}
```

Pola są opcjonalne — można aktualizować dowolny podzbiór.

## Obsługa błędów

| Kod | Opis |
|-----|------|
| 400 | Nieprawidłowe dane wejściowe (np. nieobsługiwany kod waluty) |
| 401 | Brak uwierzytelnionej sesji |
| 404 | Zasób nie znaleziony (np. brak rekordu subskrypcji) |
| 500 | Wewnętrzny błąd serwera |
