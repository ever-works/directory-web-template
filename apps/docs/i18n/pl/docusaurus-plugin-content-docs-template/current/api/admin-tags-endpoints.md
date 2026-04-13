---
id: admin-tags-endpoints
title: Punkty końcowe API Tagów Administratora
sidebar_label: Admin Tags
sidebar_position: 34
---

# Punkty końcowe API Tagów Administratora

API tagów administratora zarządza tagami treści używanymi do kategoryzowania i tagowania elementów. Tagi są przechowywane zarówno w bazie danych, jak i buforowane przez system zarządzania treścią. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/admin/tags` | Administrator | Wyświetl tagi z paginacją |
| `POST` | `/api/admin/tags` | Administrator | Utwórz nowy tag |
| `GET` | `/api/admin/tags/all` | Administrator | Pobierz wszystkie tagi z buforu treści |
| `GET` | `/api/admin/tags/[id]` | Administrator | Pobierz tag według ID |
| `PUT` | `/api/admin/tags/[id]` | Administrator | Zaktualizuj tag |
| `DELETE` | `/api/admin/tags/[id]` | Administrator | Usuń tag |

---

## Wyświetl tagi

```
GET /api/admin/tags
```

Zwraca paginowaną listę tagów z bazy danych.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 20) |
| `search` | string | Nie | Wyszukaj w nazwie tagu |
| `isActive` | boolean | Nie | Filtruj według statusu aktywności |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "open-source",
        "name": "Open Source",
        "isActive": true,
        "itemCount": 45,
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
    ],
    "meta": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 }
  }
}
```

---

## Utwórz tag

```
POST /api/admin/tags
```

Tworzy nowy tag treści.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `id` | string | Tak | Slug tagu (slug-format, 2–50 znaków) |
| `name` | string | Tak | Wyświetlana nazwa tagu (2–50 znaków) |
| `isActive` | boolean | Nie | Domyślnie: `true` |

**Przykład żądania:**

```json
{
  "id": "machine-learning",
  "name": "Machine Learning",
  "isActive": true
}
```

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": {
    "id": "machine-learning",
    "name": "Machine Learning",
    "isActive": true
  }
}
```

**Po utworzeniu:** Bufor treści jest automatycznie unieważniany, aby odzwierciedlić nowy tag na stronach publicznych.

---

## Pobierz wszystkie tagi

```
GET /api/admin/tags/all
```

Pobiera wszystkie tagi z buforu treści (a nie bezpośrednio z bazy danych). Obsługuje lokalizację.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `locale` | string | Nie | Kod lokalizacji (domyślnie: `en`) |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      { "id": "open-source", "name": "Open Source" },
      { "id": "machine-learning", "name": "Machine Learning" },
      { "id": "devtools", "name": "Dev Tools" }
    ]
  }
}
```

### Źródła danych

| Punkt końcowy | Źródło | Opis |
|---------------|--------|------|
| `GET /api/admin/tags` | `tagRepository` | Bezpośrednie zapytanie do bazy danych z paginacją |
| `GET /api/admin/tags/all` | `getCachedItems()` | Buforowana treść; lekki, wymaga unieważnienia bufora |

---

## Pobierz tag

```
GET /api/admin/tags/[id]
```

Pobiera szczegóły pojedynczego tagu.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "open-source",
    "name": "Open Source",
    "isActive": true,
    "itemCount": 45,
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## Zaktualizuj tag

```
PUT /api/admin/tags/[id]
```

Aktualizuje istniejący tag.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `name` | string | Nie | Zaktualizuj wyświetlaną nazwę (2–50 znaków) |
| `isActive` | boolean | Nie | Aktywuj lub dezaktywuj tag |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": { "id": "open-source", "name": "Open Source", "isActive": false }
}
```

---

## Usuń tag

```
DELETE /api/admin/tags/[id]
```

Trwale usuwa tag z bazy danych.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

:::caution
Usunięcie tagu usuwa je bezpowrotnie i odłącza go od wszystkich elementów, do których był przypisany. Przed usunięciem aktywnego tagu upewnij się, że żaden element go nie używa.
:::

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Tag usunięty pomyślnie"
}
```

**Po usunięciu:** Bufor treści jest unieważniany, aby strony publiczne nie wyświetlały usuniętego tagu.

---

## Model danych tagu

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | URL-friendly slug (np. `open-source`) — używany jako identyfikator |
| `name` | string | Wyświetlana nazwa |
| `isActive` | boolean | Czy tag jest widoczny publicznie |
| `itemCount` | integer | Liczba elementów używających tego tagu |
| `createdAt` | datetime | Czas utworzenia |
| `updatedAt` | datetime | Czas ostatniej modyfikacji |

## Unieważnianie bufora

Operacje tworzenia, aktualizacji i usuwania automatycznie unieważniają odpowiednie klucze buforu treści tam, gdzie tagi są wyświetlane (lista tagów, strony elementów z tagami, strony filtrowania).

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji (np. za krótka nazwa, brakujące pole `id`) |
| 401 | Brak uwierzytelnienia jako administrator |
| 404 | Tag nie został znaleziony |
| 409 | Tag o podanym ID już istnieje |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/tags/**`
