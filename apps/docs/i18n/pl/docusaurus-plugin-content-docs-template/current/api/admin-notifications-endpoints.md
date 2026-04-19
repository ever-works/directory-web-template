---
id: admin-notifications-endpoints
title: Punkty końcowe API Powiadomień Administratora
sidebar_label: Admin Notifications
sidebar_position: 33
---

# Punkty końcowe API Powiadomień Administratora

API powiadomień administratora zarządza powiadomieniami w panelu, w tym tworzeniem, wyświetlaniem listy i oznaczaniem powiadomień jako przeczytane.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/notifications` | Administrator | Pobierz powiadomienia administratora |
| `POST` | `/api/admin/notifications` | Administrator | Utwórz nowe powiadomienie |
| `PATCH` | `/api/admin/notifications/[id]/read` | Administrator lub system | Oznacz powiadomienie jako przeczytane |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Administrator | Oznacz wszystkie powiadomienia jako przeczytane |

---

## Pobierz powiadomienia

```
GET /api/admin/notifications
```

Zwraca ostatnie 50 powiadomień posortowanych według daty (od najnowszych), wraz z liczbą nieprzeczytanych.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-123",
        "type": "item_submitted",
        "title": "New item submitted",
        "message": "A new item requires review.",
        "isRead": false,
        "userId": "user-456",
        "data": { "itemId": "item-789" },
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 5
  }
}
```

### Pola odpowiedzi

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | Unikalny identyfikator powiadomienia |
| `type` | string | Typ powiadomienia (patrz tabela typów poniżej) |
| `title` | string | Krótki tytuł powiadomienia |
| `message` | string | Pełna treść powiadomienia |
| `isRead` | boolean | Czy powiadomienie zostało przeczytane |
| `userId` | string lub null | Użytkownik powiązany z powiadomieniem |
| `data` | object lub null | Dodatkowe metadane specyficzne dla typu |
| `createdAt` | string | Znacznik czasu ISO |

---

## Utwórz powiadomienie

```
POST /api/admin/notifications
```

Tworzy nowe powiadomienie systemowe.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `type` | string | Tak | Typ powiadomienia |
| `title` | string | Tak | Tytuł powiadomienia (maks. 200 znaków) |
| `message` | string | Tak | Treść powiadomienia (maks. 1000 znaków) |
| `userId` | string | Nie | Powiązany użytkownik |
| `data` | object | Nie | Dodatkowe metadane |

**Przykład żądania:**

```json
{
  "type": "system_alert",
  "title": "Maintenance scheduled",
  "message": "System maintenance is scheduled for tonight.",
  "data": { "scheduledAt": "2024-01-21T22:00:00.000Z" }
}
```

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": {
    "id": "notif-new-id",
    "type": "system_alert",
    "title": "Maintenance scheduled",
    "isRead": false,
    "createdAt": "2024-01-20T10:35:00.000Z"
  }
}
```

---

## Oznacz jako przeczytane

```
PATCH /api/admin/notifications/[id]/read
```

Oznacza pojedyncze powiadomienie jako przeczytane.

**Uwierzytelnianie:** Sesja administratora lub tokena systemowego

### Parametry ścieżki

| Parametr | Wymagane | Opis |
|-----------|----------|------|
| `id` | Tak | ID powiadomienia |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "notif-123",
    "isRead": true
  }
}
```

---

## Oznacz wszystkie jako przeczytane

```
PATCH /api/admin/notifications/mark-all-read
```

Oznacza wszystkie powiadomienia jako przeczytane dla zalogowanego administratora.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Wszystkie powiadomienia oznaczone jako przeczytane",
  "data": {
    "updatedCount": 12
  }
}
```

---

## Model danych powiadomień

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | UUID |
| `type` | string | Identyfikator kategorii powiadomienia |
| `title` | string | Krótkie podsumowanie |
| `message` | string | Pełny opis |
| `isRead` | boolean | Stan przeczytania |
| `userId` | string lub null | ID powiązanego użytkownika |
| `data` | JSON lub null | Dodatkowy payload związany z typem |
| `createdAt` | datetime | Czas utworzenia |

## Wspólne typy powiadomień

| Typ | Opis |
|-----|------|
| `item_submitted` | Nowy element oczekuje na przegląd |
| `item_approved` | Element został zatwierdzony przez administratora |
| `item_rejected` | Element został odrzucony przez administratora |
| `user_registered` | Nowe konto użytkownika |
| `sponsor_ad_submitted` | Nowe ogłoszenie sponsorowane oczekuje na moderację |
| `system_alert` | Ogólny alert systemowy |
| `report_submitted` | Użytkownik zgłosił treść |

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji (brakujące pola lub przekroczona długość) |
| 401 | Brak uwierzytelnienia jako administrator |
| 404 | Powiadomienie nie zostało znalezione |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/notifications/**`
