---
id: admin-roles-endpoints
title: Punkty końcowe API Ról Administratora
sidebar_label: Admin Roles
sidebar_position: 35
---

# Punkty końcowe API Ról Administratora

API ról administratora zarządza kontrolą dostępu opartą na rolach (RBAC), w tym tworzeniem ról, zarządzaniem uprawnieniami oraz statystykami przypisania. Wszystkie punkty końcowe (z wyjątkiem aktywnych ról) wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/roles` | Administrator | Wyświetl role z paginacją |
| `POST` | `/api/admin/roles` | Administrator | Utwórz nową rolę |
| `GET` | `/api/admin/roles/active` | Publiczny | Pobierz tylko aktywne role |
| `GET` | `/api/admin/roles/stats` | Administrator | Pobierz statystyki ról |
| `GET` | `/api/admin/roles/[id]` | Administrator | Pobierz rolę według ID |
| `PUT` | `/api/admin/roles/[id]` | Administrator | Zaktualizuj rolę |
| `DELETE` | `/api/admin/roles/[id]` | Administrator | Usuń rolę (miękkie usunięcie) |
| `GET` | `/api/admin/roles/[id]/permissions` | Administrator | Pobierz uprawnienia roli |
| `PUT` | `/api/admin/roles/[id]/permissions` | Administrator | Zaktualizuj uprawnienia roli |

---

## Wyświetl role

```
GET /api/admin/roles
```

Zwraca paginowaną listę ról z opcjonalnym filtrowaniem.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 20) |
| `search` | string | Nie | Wyszukaj w nazwie lub opisie |
| `isActive` | boolean | Nie | Filtruj według statusu aktywności |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "role-id",
        "name": "editor",
        "description": "Can manage content",
        "isActive": true,
        "userCount": 5,
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
    ],
    "meta": { "total": 8, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

## Utwórz rolę

```
POST /api/admin/roles
```

Tworzy nową rolę z opcjonalnym zestawem uprawnień.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `name` | string | Tak | Unikalna nazwa roli (3–100 znaków) |
| `description` | string | Nie | Opis (maks. 500 znaków) |
| `isActive` | boolean | Nie | Domyślnie: `true` |
| `permissions` | array | Nie | Tablica kluczy uprawnień do przypisania |

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": { "id": "new-role-id", "name": "editor", "isActive": true }
}
```

---

## Pobierz aktywne role

```
GET /api/admin/roles/active
```

Zwraca tylko aktywne role. Ten punkt końcowy jest **publiczny** — nie wymaga uwierzytelniania.

**Uwierzytelnianie:** Brak (publiczny)

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "roles": [
      { "id": "role-id", "name": "editor", "description": "Can manage content" }
    ]
  }
}
```

---

## Pobierz statystyki ról

```
GET /api/admin/roles/stats
```

Zwraca zagregowane statystyki dla wszystkich ról.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "totalRoles": 8,
    "activeRoles": 6,
    "inactiveRoles": 2,
    "totalAssignments": 45
  }
}
```

---

## Pobierz rolę

```
GET /api/admin/roles/[id]
```

Pobiera szczegóły roli wraz z uprawnieniami.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "role-id",
    "name": "editor",
    "description": "Can manage content",
    "isActive": true,
    "permissions": ["items.create", "items.edit", "comments.moderate"],
    "userCount": 5
  }
}
```

---

## Zaktualizuj rolę

```
PUT /api/admin/roles/[id]
```

Aktualizuje metadane roli.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Opis |
|-----------|-----|------|
| `hard` | boolean | Ustaw `true`, aby trwale usunąć (domyślnie: miękkie usunięcie) |

**Treść żądania:** Takie same pola jak przy tworzeniu roli (wszystkie opcjonalne).

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": { "id": "role-id", "name": "editor", "isActive": true }
}
```

---

## Usuń rolę

```
DELETE /api/admin/roles/[id]
```

Usuwa rolę, domyślnie przez miękkie usunięcie (`isActive = false`).

**Uwierzytelnianie:** Wymagane uprawnienia administratora

:::caution
Przekazanie `?hard=true` trwale usuwa rolę z bazy danych. Upewnij się, że żaden użytkownik nie ma aktywnie przypisanej tej roli przed usunięciem.
:::

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Rola usunięta pomyślnie"
}
```

---

## Pobierz uprawnienia roli

```
GET /api/admin/roles/[id]/permissions
```

Pobiera pełną listę uprawnień przypisanych do danej roli.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "roleId": "role-id",
    "permissions": [
      { "key": "items.create", "name": "Create Items", "category": "items" },
      { "key": "items.edit", "name": "Edit Items", "category": "items" }
    ]
  }
}
```

---

## Zaktualizuj uprawnienia roli

```
PUT /api/admin/roles/[id]/permissions
```

Zastępuje cały zestaw uprawnień roli.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `permissions` | array | Tak | Tablica kluczy uprawnień do ustawienia |

**Przykład żądania:**

```json
{
  "permissions": ["items.create", "items.edit", "comments.moderate", "tags.manage"]
}
```

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Uprawnienia zaktualizowane pomyślnie"
}
```

---

## Reguły walidacji

| Pole | Wymagania |
|------|-----------|
| `name` | 3–100 znaków, unikalna wartość |
| `description` | Maks. 500 znaków, opcjonalne |
| `permissions` | Tablica; każdy wpis musi być prawidłowym kluczem uprawnienia |

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji |
| 401 | Brak uwierzytelnienia jako administrator |
| 404 | Rola nie została znaleziona |
| 409 | Rola o podanej nazwie już istnieje |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/roles/**`
