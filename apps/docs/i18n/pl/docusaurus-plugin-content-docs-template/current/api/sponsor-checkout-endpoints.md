---
id: sponsor-checkout-endpoints
title: "Reklamy sponsorowane i kasa – dokumentacja API"
sidebar_label: "Kasa reklam sponsorowanych"
---

# Reklamy sponsorowane i kasa – dokumentacja API

## Przegląd

Ta strona dokumentuje punkty końcowe do pobierania reklam sponsorowanych, zarządzania reklamami użytkownika oraz przepływu kasy dla zakupu miejsca reklamowego.

## GET /api/sponsor-ads

Pobierz aktualnie aktywne reklamy sponsorowane.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/sponsor-ads` |
| Uwierzytelnianie | Brak |

### Odpowiedź sukcesu (200)

```json
{
  "data": [
    {
      "id": "ad_123",
      "title": "Nazwa firmy",
      "description": "Krótki opis",
      "url": "https://example.com",
      "imageUrl": "https://example.com/logo.png",
      "placement": "homepage",
      "isActive": true
    }
  ]
}
```

## GET /api/sponsor-ads/user

Pobierz reklamy sponsorowane zalogowanego użytkownika.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/sponsor-ads/user` |
| Uwierzytelnianie | Wymagana sesja |

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `page` | `number` | Nie | Numer strony (domyślnie: 1) |
| `limit` | `number` | Nie | Rekordów na stronie (domyślnie: 10) |

### Odpowiedź sukcesu (200)

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

## POST /api/sponsor-ads/user

Utwórz nową sponsorowaną reklamę.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `POST` |
| Ścieżka | `/api/sponsor-ads/user` |
| Uwierzytelnianie | Wymagana sesja |

### Parametry treści

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `title` | `string` | Tak | Tytuł reklamy |
| `description` | `string` | Nie | Opis reklamy |
| `url` | `string` | Tak | Docelowy adres URL reklamy |
| `imageUrl` | `string` | Nie | Adres URL banera/logo |
| `placement` | `string` | Tak | Lokalizacja reklamy |
| `startDate` | `string` | Tak | Data rozpoczęcia (ISO 8601) |
| `endDate` | `string` | Tak | Data zakończenia (ISO 8601) |

## GET /api/sponsor-ads/user/stats

Pobierz statystyki dla reklam sponsorowanych użytkownika.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/sponsor-ads/user/stats` |
| Uwierzytelnianie | Wymagana sesja |

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "totalAds": 3,
    "activeAds": 1,
    "totalSpend": 149.97,
    "totalImpressions": 8200,
    "totalClicks": 215
  }
}
```

## GET /api/sponsor-ads/user/{id}

Pobierz szczegóły konkretnej reklamy sponsorowanej.

### Parametry ścieżki

| Parametr | Typ | Opis |
|----------|-----|------|
| `id` | `string` | ID reklamy |

## POST /api/sponsor-ads/user/{id}

Zaktualizuj istniejącą reklamę sponsorowaną.

## POST /api/checkout (reklamy sponsorowane)

Zainicjuj kasę dla zakupu reklamy sponsorowanej.

### Treść żądania

```json
{
  "adId": "ad_123",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_..."
  }
}
```

## POST /api/sponsor-ads/user/{id}/cancel

Anuluj aktywną reklamę sponsorowaną.

### Treść żądania

```json
{
  "cancelAtPeriodEnd": true
}
```

## POST /api/sponsor-ads/user/{id}/renew

Odnów wygasłą lub anulowaną reklamę sponsorowaną.

### Treść żądania

```json
{
  "startDate": "2024-03-01",
  "endDate": "2024-03-31",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

## Uwierzytelnianie

| Punkt końcowy | Wymagane uwierzytelnianie |
|---------------|--------------------------|
| `GET /api/sponsor-ads` | Nie |
| `POST /api/sponsor-ads/checkout` | Tak |
| `GET /api/sponsor-ads/user` | Tak |
| `POST /api/sponsor-ads/user` | Tak |
| `GET /api/sponsor-ads/user/stats` | Tak |
| `GET/POST /api/sponsor-ads/user/{id}` | Tak |
| `POST /api/sponsor-ads/user/{id}/cancel` | Tak |
| `POST /api/sponsor-ads/user/{id}/renew` | Tak |

## Odpowiedzi błędów

| Kod | Treść | Opis |
|-----|-------|------|
| 401 | `Unauthorized` | Użytkownik niezalogowany |
| 403 | `Forbidden` | Reklama należy do innego użytkownika |
| 404 | `Ad not found` | Nie znaleziono reklamy o podanym ID |
| 422 | `Validation error` | Nieprawidłowe parametry treści |
| 500 | `Internal server error` | Błąd serwera |

## Ograniczenie liczby żądań

Punkty końcowe kasy i tworzenia reklam podlegają ograniczeniu liczby żądań. Szczegóły w dokumentacji ograniczania żądań.
