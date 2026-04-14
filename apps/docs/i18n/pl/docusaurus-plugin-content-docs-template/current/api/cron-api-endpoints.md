---
id: cron-api-endpoints
title: "Punkty końcowe API Cron"
sidebar_label: "API Cron"
---

# Punkty końcowe API Cron

API Cron udostępnia punkty końcowe zaplanowanych zadań wyzwalanych przez Vercel Cron, zewnętrzne harmonogramery lub wewnętrzny `BackgroundJobManager`. Wszystkie punkty końcowe cron wymagają uwierzytelnienia za pomocą zmiennej środowiskowej `CRON_SECRET` przy użyciu tokenu `Bearer` w nagłówku `Authorization`.

**Katalog źródłowy:** `template/app/api/cron/`

---

## Uwierzytelnianie

Punkty końcowe cron używają współdzielonego sekretu do autoryzacji:

- **Produkcja:** Zmienna środowiskowa `CRON_SECRET` musi być ustawiona. Żądania muszą zawierać `Authorization: Bearer <CRON_SECRET>`.
- **Programowanie:** Jeśli `CRON_SECRET` nie jest skonfigurowany, dostęp jest dozwolony bez uwierzytelniania dla płynnego lokalnego doświadczenia programistycznego.
- **Bezpieczeństwo:** Wszystkie punkty końcowe cron używają `crypto.timingSafeEqual()` do porównywania w stałym czasie, aby zapobiec atakom timingowym.

**Odpowiedź nieautoryzowana (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## Konfiguracja Vercel Cron

Harmonogram cron jest definiowany w `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

| Zadanie | Harmonogram | Opis |
|---------|-------------|------|
| Synchronizacja treści | Codziennie o 3:00 UTC | Synchronizuje treść z CMS opartego na Git |
| Przypomnienia o subskrypcjach | Codziennie o 9:00 UTC | Wysyła e-maile z przypomnieniami o odnowieniu |
| Wygaśnięcie subskrypcji | Codziennie o północy UTC | Przetwarza wygaśnięte subskrypcje |

---

## Synchronizacja treści

Wyzwala synchronizację treści z repozytorium CMS opartego na Git.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/cron/sync` |
| **Uwierzytelnianie** | `CRON_SECRET` (token Bearer) |
| **Źródło** | `cron/sync/route.ts` |

### Odpowiedź

**Status 200** -- Synchronizacja zakończona pomyślnie.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Synchronizacja nie powiodła się.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `success` | `boolean` | Czy synchronizacja się powiodła |
| `timestamp` | `string` (ISO 8601) | Kiedy synchronizacja została zakończona |
| `duration` | `number` | Czas trwania w milisekundach |
| `message` | `string` | Czytelny dla człowieka komunikat o stanie |
| `details` | `string` (opcjonalny) | Dodatkowe szczegóły w przypadku niepowodzenia |

### Nagłówki odpowiedzi

Wszystkie odpowiedzi zawierają `Cache-Control: no-cache, no-store, must-revalidate`, aby zapobiec buforowaniu wyników synchronizacji.

### Przykład curl

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Wygaśnięcie subskrypcji

Wyszukuje i przetwarza wygaśnięte subskrypcje poprzez aktualizację ich statusu z `active` na `expired` i wysyłanie e-maili z powiadomieniami.

| Właściwość | Wartość |
|------------|--------|
| **Metody** | `GET`, `POST` |
| **Ścieżka** | `/api/cron/subscription-expiration` |
| **Uwierzytelnianie** | `CRON_SECRET` (token Bearer) |
| **Źródło** | `cron/subscription-expiration/route.ts` |

### Odpowiedź

**Status 200** -- Przetworzono pomyślnie.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

### Kroki przetwarzania

1. Wyszukuje aktywne subskrypcje po dacie końcowej.
2. Aktualizuje status z `active` na `expired`.
3. Wysyła e-maile z powiadomieniem o wygaśnięciu za pośrednictwem usługi e-mail.
4. Zwraca podsumowanie -- błędy dostarczenia e-mail nie powodują niepowodzenia całego zadania.

---

## Przypomnienia o subskrypcjach

Wysyła e-maile z przypomnieniami o odnowieniu do użytkowników ze subskrypcjami zbliżającymi się do daty odnowienia.

| Właściwość | Wartość |
|------------|--------|
| **Metody** | `GET`, `POST` |
| **Ścieżka** | `/api/cron/subscription-reminders` |
| **Uwierzytelnianie** | `CRON_SECRET` (token Bearer) |
| **Źródło** | `cron/subscription-reminders/route.ts` |

### Odpowiedź

**Status 200** -- Zadanie zakończone pomyślnie.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Zadanie zakończone z częściowymi błędami.

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

---

## Inicjalizacja Zadań w Tle

Moduł zadań w tle (`cron/jobs/background-jobs-init.ts`) nie jest punktem końcowym API, lecz modułem inicjalizacji singleton używanym do konfiguracji trybu planowania podczas uruchamiania aplikacji.

### Tryby planowania

| Tryb | Opis |
|------|------|
| `vercel` | Zadania obsługiwane przez Vercel Cron za pomocą punktów końcowych `/api/cron/*` |
| `local` | Wewnętrzny harmonogramista (dla wdrożeń self-hosted) |
| `trigger-dev` | Integracja Trigger.dev dla zarządzanych zadań w tle |
| `disabled` | Auto-synchronizacja wyłączona (`DISABLE_AUTO_SYNC=true`) |
