---
id: admin-items-endpoints
title: Punkty końcowe API Elementów Administratora
sidebar_label: Admin Items
sidebar_position: 37
---

# Punkty końcowe API Elementów Administratora

Punkty końcowe elementów administratora zapewniają pełne zarządzanie treścią elementów, w tym tworzenie, aktualizację, usuwanie, zbiorcze operacje, przegląd oraz śledzenie historii audytu. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd tras

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Wyświetl elementy z filtrami i paginacją |
| `POST` | `/api/admin/items` | Utwórz nowy element |
| `GET` | `/api/admin/items/stats` | Pobierz zagregowane statystyki elementów |
| `POST` | `/api/admin/items/bulk` | Wykonaj zbiorcze operacje na elementach |
| `GET` | `/api/admin/items/[id]` | Pobierz element według ID |
| `PUT` | `/api/admin/items/[id]` | Zaktualizuj element |
| `DELETE` | `/api/admin/items/[id]` | Usuń element |
| `POST` | `/api/admin/items/[id]/review` | Zatwierdź lub odrzuć element |
| `GET` | `/api/admin/items/[id]/history` | Pobierz historię audytu elementu |

## Wyświetl elementy

```
GET /api/admin/items
```

Zwraca paginowaną listę elementów z bogatymi opcjami filtrowania.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 10) |
| `search` | string | Nie | Wyszukaj w nazwie, opisie, URL |
| `status` | string | Nie | Filtruj według statusu: `published`, `pending`, `rejected`, `draft` |
| `categoryId` | string | Nie | Filtruj według kategorii |
| `tagId` | string | Nie | Filtruj według tagu |
| `sort` | string | Nie | Pole sortowania: `name`, `createdAt`, `updatedAt` |
| `order` | string | Nie | Kierunek sortowania: `asc`, `desc` |
| `hasLocation` | boolean | Nie | Filtruj według obecności danych lokalizacji |
| `isFeatured` | boolean | Nie | Filtruj według wyróżnionych elementów |

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-slug",
        "name": "Example Tool",
        "status": "published",
        "category": { "id": "cat-id", "name": "Category" },
        "tags": [{ "id": "tag-id", "name": "Tag" }],
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-21T09:00:00.000Z"
      }
    ],
    "meta": {
      "total": 350,
      "page": 1,
      "limit": 10,
      "totalPages": 35
    }
  }
}
```

## Utwórz element

```
POST /api/admin/items
```

Tworzy nowy element z opcjonalną synchronizacją CRM i indeksowaniem lokalizacji.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `name` | string | Tak | Nazwa elementu (2–200 znaków) |
| `description` | string | Nie | Opis HTML lub Markdown |
| `source_url` | string | Nie | Adres URL strony projektu |
| `status` | string | Nie | Domyślnie: `draft` |
| `categoryId` | string | Tak | Przypisz do kategorii |
| `tagIds` | array | Nie | Lista ID tagów |
| `is_remote` | boolean | Nie | Oznacz jako zdalny/rozproszony |
| `latitude` | number | Nie | Współrzędna szerokości geograficznej |
| `longitude` | number | Nie | Współrzędna długości geograficznej |

**Sprawdzanie duplikatów:** Przed utworzeniem sprawdzane są zduplikowane `source_url` i `name`.

**Efekty uboczne:**
- Synchronizacja CRM (jeśli skonfigurowana): tworzy rekord firmy w Twenty CRM
- Indeksowanie lokalizacji: dodaje wpis do indeksu wyszukiwania geograficznego, jeśli podano współrzędne

### Odpowiedź sukcesu (201)

```json
{
  "success": true,
  "data": { "id": "new-item-slug", "name": "New Tool", "status": "draft" }
}
```

## Pobierz statystyki

```
GET /api/admin/items/stats
```

Zwraca zagregowane statystyki wszystkich elementów.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100,
    "featuredCount": 25,
    "withLocationCount": 620
  }
}
```

## Zbiorcze operacje

```
POST /api/admin/items/bulk
```

Wykonuje tę samą operację na wielu elementach jednocześnie.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `action` | string | Tak | Operacja: `approve`, `reject`, `delete` |
| `ids` | array | Tak | Tablica ID elementów (maks. 100) |
| `reason` | string | Nie | Powód odrzucenia lub usunięcia |

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": {
    "processed": 5,
    "failed": 0,
    "results": []
  }
}
```

## Pobierz element

```
GET /api/admin/items/[id]
```

Pobiera pełne szczegóły elementu według ID.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Parametry ścieżki

| Parametr | Wymagane | Opis |
|-----------|----------|------|
| `id` | Tak | ID elementu (slug) |

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": {
    "id": "example-tool",
    "name": "Example Tool",
    "description": "Full description...",
    "status": "published",
    "category": { "id": "cat-id", "name": "Category" },
    "tags": [],
    "company": { "id": "company-id", "name": "Company Name" },
    "latitude": 37.7749,
    "longitude": -122.4194,
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

## Zaktualizuj element

```
PUT /api/admin/items/[id]
```

Aktualizuje istniejący element.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

Obsługuje te same pola co żądanie tworzenia. Pola pominięte w żądaniu pozostają bez zmian.

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": { "id": "example-tool", "name": "Updated Tool" }
}
```

## Usuń element

```
DELETE /api/admin/items/[id]
```

Usuwa element z systemu.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

:::caution
To jest operacja nieodwracalna. Dane elementu, powiązane komentarze i wpisy w indeksie lokalizacji zostaną trwale usunięte.
:::

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "message": "Element został usunięty"
}
```

## Prześlij przegląd elementu

```
POST /api/admin/items/[id]/review
```

Zatwierdza lub odrzuca element z opcjonalnym powiadomieniem e-mail.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `action` | string | Tak | `approve` lub `reject` |
| `reason` | string | Nie | Powód odrzucenia (wysyłany do właściciela elementu) |
| `sendEmail` | boolean | Nie | Wyślij powiadomienie e-mail (domyślnie: `true`) |

**Efekty uboczne:**
- Zatwierdzenie ustawia `status = "published"`
- Odrzucenie ustawia `status = "rejected"` i zapisuje powód
- Powiadomienie e-mail wysyłane jest do powiązanego klienta (jeśli skonfigurowano)

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": { "id": "example-tool", "status": "published" }
}
```

## Pobierz historię audytu

```
GET /api/admin/items/[id]/history
```

Zwraca dziennik audytu zmian elementu.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

### Odpowiedź sukcesu (200)

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "history-id",
        "action": "status_changed",
        "oldValue": "pending",
        "newValue": "published",
        "changedBy": { "id": "user-id", "name": "Admin User" },
        "changedAt": "2024-01-21T09:00:00.000Z"
      }
    ]
  }
}
```

## Reguły walidacji

| Pole | Reguły |
|------|--------|
| `name` | 2–200 znaków, wymagane przy tworzeniu |
| `categoryId` | Musi istnieć w bazie danych |
| `status` | Jedno z: `published`, `pending`, `rejected`, `draft` |
| `latitude` | -90 do 90 |
| `longitude` | -180 do 180 |
| `tagIds` | Tablica musi zawierać istniejące ID tagów |

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji |
| 401 | Brak uwierzytelnienia jako administrator |
| 404 | Element nie został znaleziony |
| 409 | Zduplikowany `source_url` lub `name` |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/items/**`
