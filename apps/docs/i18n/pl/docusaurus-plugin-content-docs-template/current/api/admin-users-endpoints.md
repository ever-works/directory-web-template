---
id: admin-users-endpoints
title: Punkty końcowe API Użytkowników Administratora
sidebar_label: Admin Users
sidebar_position: 36
---

# Punkty końcowe API Użytkowników Administratora

API użytkowników administratora zarządza kontami użytkowników, w tym tworzeniem, aktualizacją, przeglądaniem statystyk oraz sprawdzaniem unikalności danych. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/users` | Administrator | Wyświetl użytkowników z paginacją |
| `POST` | `/api/admin/users` | Administrator | Utwórz nowego użytkownika |
| `GET` | `/api/admin/users/stats` | Administrator | Pobierz statystyki użytkowników |
| `POST` | `/api/admin/users/check-email` | Administrator | Sprawdź dostępność adresu e-mail |
| `POST` | `/api/admin/users/check-username` | Administrator | Sprawdź dostępność nazwy użytkownika |
| `GET` | `/api/admin/users/[id]` | Administrator | Pobierz użytkownika według ID |
| `PUT` | `/api/admin/users/[id]` | Administrator | Zaktualizuj konto użytkownika |
| `DELETE` | `/api/admin/users/[id]` | Administrator | Usuń konto użytkownika |

---

## Wyświetl użytkowników

```
GET /api/admin/users
```

Zwraca paginowaną listę użytkowników z bogatymi opcjami filtrowania.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 20) |
| `search` | string | Nie | Wyszukaj w nazwie, nazwie użytkownika lub adresie e-mail |
| `role` | string | Nie | Filtruj według nazwy roli |
| `isActive` | boolean | Nie | Filtruj według stanu aktywności |
| `includeInactive` | boolean | Nie | Uwzględnij dezaktywowane konta (domyślnie: `false`) |
| `sort` | string | Nie | Sortuj według: `name`, `createdAt`, `lastLoginAt` |
| `order` | string | Nie | `asc` lub `desc` |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "role": "admin",
        "isActive": true,
        "createdAt": "2024-01-10T08:00:00.000Z",
        "lastLoginAt": "2024-01-20T09:00:00.000Z"
      }
    ],
    "meta": { "total": 85, "page": 1, "limit": 20, "totalPages": 5 }
  }
}
```

---

## Utwórz użytkownika

```
POST /api/admin/users
```

Tworzy nowe konto użytkownika z zaszyfrowanym hasłem.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `username` | string | Tak | Unikalna nazwa użytkownika (3–50 znaków) |
| `email` | string | Tak | Unikalny adres e-mail |
| `name` | string | Tak | Pełna nazwa wyświetlana |
| `password` | string | Tak | Hasło (min. 8 znaków) |
| `role` | string | Tak | Przypisz rolę (np. `admin`, `editor`, `user`) |
| `isActive` | boolean | Nie | Domyślnie: `true` |

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": {
    "id": "new-user-id",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "editor"
  }
}
```

:::info
Hasło jest zaszyfrowane za pomocą bcrypt przed zapisem do bazy danych. Hasła w postaci zwykłego tekstu nigdy nie są przechowywane.
:::

---

## Pobierz statystyki użytkowników

```
GET /api/admin/users/stats
```

Zwraca zagregowane statystyki dla wszystkich użytkowników.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "total": 85,
    "active": 78,
    "inactive": 7,
    "admins": 3,
    "byRole": [
      { "role": "admin", "count": 3 },
      { "role": "editor", "count": 12 },
      { "role": "user", "count": 70 }
    ],
    "newThisMonth": 8,
    "newThisWeek": 2
  }
}
```

---

## Sprawdź dostępność adresu e-mail

```
POST /api/admin/users/check-email
```

Sprawdza, czy adres e-mail jest już zajęty. Obsługuje parametr `excludeId` przy edycji istniejącego użytkownika.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `email` | string | Tak | Adres e-mail do sprawdzenia |
| `excludeId` | string | Nie | Pomiń bieżącego użytkownika (gdy edytujesz profil) |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": { "available": true }
}
```

---

## Sprawdź dostępność nazwy użytkownika

```
POST /api/admin/users/check-username
```

Sprawdza, czy nazwa użytkownika jest już zajęta.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `username` | string | Tak | Nazwa użytkownika do sprawdzenia |
| `excludeId` | string | Nie | Pomiń bieżącego użytkownika |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": { "available": false }
}
```

---

## Pobierz użytkownika

```
GET /api/admin/users/[id]
```

Pobiera pełne szczegóły konta użytkownika.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "editor",
    "isActive": true,
    "bio": "Short bio",
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-10T08:00:00.000Z",
    "lastLoginAt": "2024-01-20T09:00:00.000Z"
  }
}
```

---

## Zaktualizuj użytkownika

```
PUT /api/admin/users/[id]
```

Aktualizuje konto użytkownika. Jeśli przekazano `password`, zostanie ono zaszyfrowane przed zapisem.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Treść żądania:** Takie same pola jak przy tworzeniu — wszystkie opcjonalne. Pola pominięte w żądaniu nie zostaną zmienione.

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": { "id": "user-id", "name": "John Doe", "email": "new@example.com" }
}
```

---

## Usuń użytkownika

```
DELETE /api/admin/users/[id]
```

Trwale usuwa konto użytkownika.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

:::caution
Administrator nie może usunąć własnego konta za pomocą tego punktu końcowego. Próba usunięcia własnego konta skutkuje odpowiedzią `403`. Usunięcie jest trwałe i nieodwracalne.
:::

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Użytkownik usunięty pomyślnie"
}
```

---

## Reguły walidacji

| Pole | Wymagania |
|------|-----------|
| `username` | 3–50 znaków, tylko znaki alfanumeryczne i myślniki, unikalna wartość |
| `email` | Prawidłowy format adresu e-mail, unikalna wartość |
| `name` | 2–100 znaków |
| `password` | Min. 8 znaków |
| `role` | Musi być prawidłową, istniejącą rolą w bazie danych |

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji |
| 401 | Brak uwierzytelnienia jako administrator |
| 403 | Administrator nie może usunąć własnego konta |
| 404 | Użytkownik nie został znaleziony |
| 409 | Adres e-mail lub nazwa użytkownika już jest zajęta |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/users/**`
