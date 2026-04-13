---
id: vote-endpoints
title: "Punkty końcowe głosowania"
sidebar_label: "Punkty końcowe głosowania"
---

# Punkty końcowe głosowania

Ta strona dokumentuje punkty końcowe do zarządzania głosami użytkowników na pozycjach (lista, firma, klient itp.), w tym oddawanie, aktualizowanie i usuwanie głosów.

## Przegląd

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `GET` | `/api/votes` | Brak | Pobierz liczniki głosów i głos użytkownika |
| `POST` | `/api/votes` | Wymagana sesja | Oddaj lub zaktualizuj głos |
| `DELETE` | `/api/votes` | Wymagana sesja | Usuń głos |
| `GET` | `/api/votes/count` | Brak | Pobierz tylko liczniki głosów (lekkie) |
| `GET` | `/api/votes/status` | Wymagana sesja | Pobierz surowy typ głosu użytkownika |

## GET /api/votes

Zwraca liczniki głosów i aktualny głos zalogowanego użytkownika (jeśli jest zalogowany).

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `itemId` | `string` | Tak | ID pozycji do pobrania głosów |

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "upvotes": 42,
    "downvotes": 5,
    "netScore": 37,
    "userVote": "up"
  }
}
```

Pole `userVote` wynosi `null` dla niezalogowanych użytkowników i gdy użytkownik nie głosował.

## POST /api/votes

Oddaje nowy głos lub zastępuje istniejący głos użytkownika na danej pozycji.

### Treść żądania

```json
{
  "itemId": "item_123",
  "type": "up"
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `itemId` | `string` | Tak | ID pozycji do głosowania |
| `type` | `"up"` \| `"down"` | Tak | Typ głosu |

### Zachowanie idempotentne

- Jeśli użytkownik już głosował na tę pozycję, głos jest **zamieniany** (nie duplikowany).
- Głosowanie po raz drugi tym samym typem aktualizuje znacznik czasu, ale nie zmienia wyniku.

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "id": "vote_456",
    "itemId": "item_123",
    "type": "up",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Głos przyjęty"
}
```

### Walidacja

- Zablokowanym użytkownikom nie można głosować — żądania zwracają `403`
- Typ głosu musi być `"up"` lub `"down"` — inne wartości zwracają `400`

## DELETE /api/votes

Usuwa głos użytkownika z pozycji.

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `itemId` | `string` | Tak | ID pozycji, z której należy usunąć głos |

### Zachowanie idempotentne

Usunięcie głosu, który nie istnieje, nie zwraca błędu — zwraca odpowiedź z potwierdzeniem sukcesu.

### Odpowiedź sukcesu (200)

```json
{
  "data": null,
  "message": "Głos usunięty pomyślnie"
}
```

## GET /api/votes/count

Lekki punkt końcowy zwracający wyłącznie liczniki głosów bez informacji o głosie użytkownika. Przydatny w widokach publicznych.

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `itemId` | `string` | Tak | ID pozycji |

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "upvotes": 42,
    "downvotes": 5,
    "netScore": 37
  }
}
```

## GET /api/votes/status

Pobiera surowy typ głosu użytkownika dla pozycji. Używany przez komponenty interfejsu do odzwierciedlenia stanu przycisku głosowania.

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `itemId` | `string` | Tak | ID pozycji |

### Odpowiedź sukcesu (200)

```json
{
  "data": {
    "voteType": "UPVOTE"
  }
}
```

Pole `voteType` zwraca `UPVOTE`, `DOWNVOTE` lub `null` (brak głosu).

## Kluczowe szczegóły implementacji

| Funkcja | Opis |
|---------|------|
| Wynik netto | Obliczany jako `upvotes - downvotes` |
| Zamiana głosu | Nowy głos zastępuje poprzedni automatycznie |
| Zapobieganie głosom zablokowanych | Zablokowanym użytkownikom zwraca `403 Forbidden` |
| Idempotentne usuwanie | Usunięcie nieistniejącego głosu zawsze zwraca `200` |

## Obsługa błędów

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 400 | `Missing itemId` | Brak parametru `itemId` |
| 400 | `Invalid vote type` | Typ głosu inny niż `"up"` lub `"down"` |
| 401 | `Unauthorized` | Punkt końcowy wymaga sesji |
| 403 | `User is blocked` | Zablokowany użytkownik próbuje głosować |
| 500 | `Failed to record vote` | Błąd bazy danych |
