---
id: cron-endpoints
title: "Punkty końcowe API Zadań Cron"
sidebar_label: "Punkty końcowe Cron"
---

# Punkty końcowe API Zadań Cron

Szablon zawiera trzy punkty końcowe zadań cron uruchamiane w zaplanowanych odstępach czasu za pomocą Vercel Cron. Te punkty końcowe obsługują synchronizację treści, przypomnienia o subskrypcjach i przetwarzanie wygaśnięć subskrypcji.

## Konfiguracja Cron

Harmonogramy Cron są definiowane w `vercel.json`:

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

## Synchronizacja treści (`/api/cron/sync`)

| Metoda | Ścieżka | Harmonogram | Opis |
|--------|---------|-------------|------|
| `GET` | `/api/cron/sync` | Codziennie o 3:00 UTC | Synchronizacja repozytorium treści opartego na Git |

### Co Robi

Zadanie cron synchronizacji pobiera najnowszą treść ze skonfigurowanego repozytorium danych Git (`DATA_REPOSITORY`) i aktualizuje lokalną pamięć podręczną treści. Zapewnia to, że aplikacja odzwierciedla wszelkie zmiany dokonane bezpośrednio w repozytorium treści (np. poprzez scalenie PR w GitHub).

### Proces synchronizacji

```
1. Zweryfikuj autoryzację CRON_SECRET
2. Sprawdź, czy synchronizacja jest już w toku (blokada mutex)
3. Pobierz najnowsze zmiany ze zdalnego repozytorium Git
4. Przeanalizuj i zwaliduj zaktualizowane pliki treści YAML
5. Zaktualizuj lokalną pamięć podręczną treści
6. Zwróć wynik synchronizacji z czasem trwania
```

### Kluczowe zachowania

- **Blokada mutex**: Jednocześnie może działać tylko jedna synchronizacja. Jednoczesne żądania są odrzucane z komunikatem o stanie
- **Limit czasu**: Operacje synchronizacji mają 5-minutowy limit czasu, aby zapobiec nieskończonym procesom
- **Logika ponownych prób**: Nieudane synchronizacje są ponawiane do 3 razy
- **Tryb programistyczny**: Auto-synchronizację można wyłączyć przez `DISABLE_AUTO_SYNC=true`

### Odpowiedź

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Przypomnienia o subskrypcjach (`/api/cron/subscription-reminders`)

| Metoda | Ścieżka | Harmonogram | Opis |
|--------|---------|-------------|------|
| `GET` | `/api/cron/subscription-reminders` | Codziennie o 9:00 UTC | Wyślij przypomnienia o odnowieniu subskrypcji |

### Co Robi

Zapytuje subskrypcje zbliżające się do daty odnowienia i wysyła przypomnienia e-mailem do subskrybentów. Pomaga redukować mimowolny odpis poprzez informowanie użytkowników przed przetworzeniem płatności.

### Okna przypomnień

Typowe okna przypomnień:
- **7 dni przed odnowieniem**: Pierwsze przypomnienie
- **1 dzień przed odnowieniem**: Ostatnie przypomnienie

### Odpowiedź

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## Wygaśnięcie subskrypcji (`/api/cron/subscription-expiration`)

| Metoda | Ścieżka | Harmonogram | Opis |
|--------|---------|-------------|------|
| `GET` | `/api/cron/subscription-expiration` | Codziennie o północy UTC | Przetwarzaj wygaśnięte subskrypcje |

### Co Robi

Identyfikuje subskrypcje po dacie wygaśnięcia i aktualizuje ich status. Obsługuje subskrypcje, które zostały anulowane, ale miały pozostały czas, a także subskrypcje, które nie zostały odnowione.

### Odpowiedź

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## Zadania w tle (`/api/cron/jobs`)

Plik `background-jobs-init.ts` w katalogu zadań cron inicjalizuje przetwarzanie zadań w tle. Konfiguruje wszelkie cykliczne zadania, które muszą być uruchamiane w czasie działania aplikacji.
