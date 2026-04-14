---
id: client-api-endpoints
title: Punkty końcowe API Klienta
sidebar_label: Client API
sidebar_position: 58
---

# Punkty końcowe API Klienta

API klienta dostarcza zalogowanym użytkownikom zasobów do zarządzania własnymi elementami, przeglądania statystyk panelu oraz dostępu do danych geograficznych. Wszystkie punkty końcowe wymagają uwierzytelniania.

## Uwierzytelnianie

Wszystkie punkty końcowe `/api/client/*` wymagają aktywnej sesji. Nieuwierzytelnione żądania otrzymują odpowiedź `401`.

## Przegląd tras

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/client/dashboard/stats` | Statystyki panelu użytkownika |
| `GET` | `/api/client/geo-stats` | Geograficzne statystyki elementów użytkownika |
| `GET` | `/api/client/items/coordinates` | Współrzędne elementów do wyświetlenia na mapie |
| `GET` | `/api/client/items` | Wyświetl elementy użytkownika |
| `POST` | `/api/client/items` | Utwórz nowy element |
| `GET` | `/api/client/items/[id]` | Pobierz element użytkownika |
| `PUT` | `/api/client/items/[id]` | Zaktualizuj element użytkownika |
| `DELETE` | `/api/client/items/[id]` | Usuń element użytkownika |

---

## Statystyki panelu

```
GET /api/client/dashboard/stats
```

Zwraca bogate statystyki panelu dla zalogowanego użytkownika, w tym wykresy, oś czasu, rozkład statusów i najlepsze elementy.

**Uwierzytelnianie:** Wymagana sesja

**Buforowanie:** Wyłączone (`force-dynamic`, `no-store`)

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalItems": 15,
      "publishedItems": 10,
      "pendingItems": 3,
      "draftItems": 2
    },
    "charts": {
      "submissionsOverTime": [
        { "date": "2024-01-01", "count": 2 },
        { "date": "2024-01-08", "count": 1 }
      ]
    },
    "timeline": [
      {
        "id": "item-id",
        "name": "My Tool",
        "status": "published",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "statusBreakdown": {
      "published": 10,
      "pending": 3,
      "draft": 2,
      "rejected": 0
    },
    "topItems": [
      {
        "id": "item-id",
        "name": "My Best Tool",
        "viewCount": 250,
        "rating": 4.5
      }
    ]
  }
}
```

---

## Statystyki geograficzne

```
GET /api/client/geo-stats
```

Zwraca statystyki geograficzne dla elementów zalogowanego użytkownika.

**Uwierzytelnianie:** Wymagana sesja

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "totalWithLocation": 8,
    "totalRemote": 3,
    "byCountry": [
      { "country": "Poland", "count": 5 },
      { "country": "Germany", "count": 3 }
    ],
    "byCity": [
      { "city": "Warsaw", "country": "Poland", "count": 3 }
    ]
  }
}
```

---

## Współrzędne elementów

```
GET /api/client/items/coordinates
```

Zwraca tablicę współrzędnych dla wszystkich elementów zalogowanego użytkownika do wyświetlenia na mapie.

**Uwierzytelnianie:** Wymagana sesja

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "coordinates": [
      {
        "id": "item-id",
        "name": "My Tool",
        "latitude": 52.2297,
        "longitude": 21.0122,
        "status": "published"
      }
    ]
  }
}
```

---

## Wyświetl elementy użytkownika

```
GET /api/client/items
```

Zwraca paginowaną listę elementów należących do zalogowanego użytkownika.

**Uwierzytelnianie:** Wymagana sesja

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `page` | integer | Nie | Numer strony (domyślnie: 1) |
| `limit` | integer | Nie | Elementy na stronie (domyślnie: 10) |
| `search` | string | Nie | Wyszukaj w nazwie |
| `status` | string | Nie | Filtruj według statusu |
| `sort` | string | Nie | Pole sortowania |
| `order` | string | Nie | `asc` lub `desc` |
| `deleted` | boolean | Nie | Uwzględnij usunięte elementy |

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "my-tool",
        "name": "My Tool",
        "status": "published",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "meta": { "total": 15, "page": 1, "limit": 10, "totalPages": 2 }
  }
}
```

---

## Utwórz element

```
POST /api/client/items
```

Tworzy nowy element przypisany do zalogowanego użytkownika.

**Uwierzytelnianie:** Wymagana sesja

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `name` | string | Tak | Nazwa elementu (2–200 znaków) |
| `description` | string | Tak | Opis elementu |
| `source_url` | string | Tak | Adres URL projektu lub strony głównej |
| `categoryId` | string | Nie | Przypisz do kategorii |
| `tagIds` | array | Nie | Lista ID tagów |
| `is_remote` | boolean | Nie | Oznacz jako zdalny |
| `latitude` | number | Nie | Szerokość geograficzna lokalizacji |
| `longitude` | number | Nie | Długość geograficzna lokalizacji |

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": {
    "id": "my-new-tool",
    "name": "My New Tool",
    "status": "pending"
  }
}
```

:::info
Nowe elementy otrzymują domyślnie status `pending` i wymagają zatwierdzenia przez administratora przed opublikowaniem (chyba że `require_approval` jest wyłączone w ustawieniach).
:::

---

## Pobierz element użytkownika

```
GET /api/client/items/[id]
```

Pobiera szczegóły pojedynczego elementu należącego do zalogowanego użytkownika.

**Uwierzytelnianie:** Wymagana sesja

:::warning
Użytkownicy mogą pobierać tylko własne elementy. Próba dostępu do cudzego elementu skutkuje odpowiedzią `403`.
:::

---

## Zaktualizuj element

```
PUT /api/client/items/[id]
```

Aktualizuje element użytkownika. Pola pominięte w żądaniu pozostają bez zmian.

**Uwierzytelnianie:** Wymagana sesja

**Treść żądania:** Takie same pola jak przy tworzeniu — wszystkie opcjonalne.

:::info
Aktualizacja opublikowanego elementu może zmienić jego status na `pending` (oczekujący na ponowne zatwierdzenie) w zależności od konfiguracji ustawień witryny.
:::

---

## Usuń element

```
DELETE /api/client/items/[id]
```

Usuwa element użytkownika (miękkie usunięcie — można odtworzyć przez administratora).

**Uwierzytelnianie:** Wymagana sesja

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "message": "Element usunięty pomyślnie"
}
```

---

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji |
| 401 | Brak sesji |
| 403 | Element nie należy do bieżącego użytkownika |
| 404 | Element nie został znaleziony |
| 409 | Zduplikowany `source_url` |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/client/**`
