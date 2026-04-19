---
id: sponsor-ads-endpoints
title: "Punkty końcowe API reklam sponsorowanych"
sidebar_label: "Reklamy sponsorowane"
---

# Punkty końcowe API reklam sponsorowanych

Ta strona dokumentuje kompletne punkty końcowe do zarządzania reklamami sponsorowanymi, w tym pobieranie aktywnych reklam, kasę, zarządzanie kontem użytkownika i statystyki.

## Przegląd

Reklamy sponsorowane pozwalają użytkownikom wykupić miejsce reklamowe w docelowych lokalizacjach. Zarządzanie cyklem życia reklamy obejmuje tworzenie, opłacanie, anulowanie i odnawianie ogłoszeń. Integracja wspiera wielu dostawców płatności (Stripe, LemonSqueezy i Polar).

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `GET` | `/api/sponsor-ads` | Brak | Pobierz aktywne reklamy sponsorowane |
| `POST` | `/api/sponsor-ads/checkout` | Wymagana sesja | Zainicjuj kasę reklamy sponsorowanej |
| `GET` | `/api/sponsor-ads/user` | Wymagana sesja | Pobierz reklamy zalogowanego użytkownika |
| `POST` | `/api/sponsor-ads/user` | Wymagana sesja | Utwórz reklamę sponsorowaną |
| `GET` | `/api/sponsor-ads/user/{id}/cancel` | Wymagana sesja | Sprawdź status anulowania |
| `POST` | `/api/sponsor-ads/user/{id}/cancel` | Wymagana sesja | Anuluj aktywną reklamę |
| `POST` | `/api/sponsor-ads/user/{id}/renew` | Wymagana sesja | Odnów wygasłą lub anulowaną reklamę |
| `GET` | `/api/sponsor-ads/user/stats` | Wymagana sesja | Pobierz statystyki reklam |

## GET /api/sponsor-ads

Zwraca wszystkie aktualnie aktywne reklamy sponsorowane. Punkt końcowy jest publiczny i nie wymaga uwierzytelnienia.

### Przykładowa odpowiedź (200)

```json
{
  "data": [
    {
      "id": "ad_123",
      "title": "Zajrzyj do nas",
      "description": "Nasz produkt rozwiązuje Twój problem",
      "url": "https://example.com",
      "imageUrl": "https://example.com/banner.png",
      "placement": "sidebar",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z",
      "isActive": true
    }
  ]
}
```

## POST /api/sponsor-ads/checkout

Inicjuje sesję kasy dla reklamy sponsorowanej. Przekierowuje użytkownika do dostawcy płatności.

:::warning
Punkt końcowy sprawdza parametr `redirectUrl` względem dozwolonych domen, aby zapobiec otwartemu przekierowaniu.
:::

### Treść żądania

```json
{
  "adId": "ad_123",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

## GET /api/sponsor-ads/user

Zwraca wszystkie reklamy sponsorowane należące do zalogowanego użytkownika, niezależnie od statusu.

### Przykładowe parametry zapytania

| Parametr | Typ | Opis |
|----------|-----|------|
| `status` | `string` | Filtruj według statusu: `active`, `cancelled`, `expired` |
| `page` | `number` | Numer strony (domyślnie: 1) |
| `limit` | `number` | Pozycje na stronie (domyślnie: 10) |

## POST /api/sponsor-ads/user

Tworzy nową reklamę sponsorowaną. Reklama musi zostać opłacona przed aktywacją.

### Treść żądania

```json
{
  "title": "Tytuł reklamy",
  "description": "Opis reklamy",
  "url": "https://example.com",
  "imageUrl": "https://example.com/banner.png",
  "placement": "sidebar",
  "startDate": "2024-02-01",
  "endDate": "2024-02-28"
}
```

## POST /api/sponsor-ads/user/{id}/cancel

Anuluje aktywną reklamę sponsorowaną. Anulowanie może być natychmiastowe lub na koniec bieżącego okresu rozliczeniowego, w zależności od konfiguracji.

### Treść żądania

```json
{
  "cancelAtPeriodEnd": true
}
```

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "id": "ad_123",
    "status": "cancelled",
    "cancelledAt": "2024-01-15T10:30:00Z"
  },
  "message": "Reklama anulowana pomyślnie"
}
```

## POST /api/sponsor-ads/user/{id}/renew

Odnawia wygasłą lub anulowaną reklamę sponsorowaną. Tworzy nową sesję płatności dla wybranego okresu.

### Treść żądania

```json
{
  "startDate": "2024-02-01",
  "endDate": "2024-02-28",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

## GET /api/sponsor-ads/user/stats

Zwraca zagregowane statystyki dla wszystkich reklam użytkownika.

### Przykładowa odpowiedź (200)

```json
{
  "data": {
    "totalAds": 5,
    "activeAds": 2,
    "totalImpressions": 12500,
    "totalClicks": 340,
    "averageCtr": 2.72
  }
}
```

## Konfiguracja dostawcy płatności

| Dostawca | Zmienna konfiguracyjna | Uwagi |
|----------|----------------------|-------|
| Stripe | `PAYMENT_PROVIDER=stripe` | Domyślny dostawca |
| LemonSqueezy | `PAYMENT_PROVIDER=lemonsqueezy` | Alternatywa hostowana |
| Polar | `PAYMENT_PROVIDER=polar` | Dostawca open-source |

## Powiązane pliki źródłowe

| Plik | Opis |
|------|------|
| `app/api/sponsor-ads/route.ts` | Aktywne reklamy i kasa |
| `app/api/sponsor-ads/user/route.ts` | Zarządzanie reklamami użytkownika |
| `app/api/sponsor-ads/user/[id]/cancel/route.ts` | Anulowanie reklam |
| `app/api/sponsor-ads/user/[id]/renew/route.ts` | Odnawianie reklam |
| `app/api/sponsor-ads/user/stats/route.ts` | Statystyki reklam |
| `lib/services/sponsorAdService.ts` | Logika biznesowa |
