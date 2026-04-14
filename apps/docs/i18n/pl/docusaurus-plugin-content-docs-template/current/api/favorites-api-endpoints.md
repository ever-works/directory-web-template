---
id: favorites-api-endpoints
title: "Punkty końcowe API Ulubionych"
sidebar_label: "API Ulubionych"
---

# Punkty końcowe API Ulubionych

API Ulubionych umożliwia uwierzytelnionym użytkownikom zarządzanie ich ulubionymi elementami. Użytkownicy mogą wyświetlać, dodawać i usuwać elementy z osobistej listy ulubionych. Rekordy ulubionych przechowują metadane elementów (nazwa, ikona, kategoria) do szybkiego wyświetlania bez konieczności dołączania do tabeli elementów.

**Katalog źródłowy:** `template/app/api/favorites/`

---

## Uwierzytelnianie

Wszystkie punkty końcowe ulubionych wymagają uwierzytelnienia opartego na sesji. Nieuwierzytelnione żądania otrzymują:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Lista ulubionych użytkownika

Zwraca wszystkie elementy oznaczone jako ulubione przez uwierzytelnionego użytkownika.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/favorites` |
| **Uwierzytelnianie** | Sesja (użytkownik) |
| **Źródło** | `favorites/route.ts` |

### Odpowiedź

**Status 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `favorites[].id` | `string` | ID rekordu ulubionego |
| `favorites[].userId` | `string` | Użytkownik, który dodał element do ulubionych |
| `favorites[].itemSlug` | `string` | Identyfikator slug elementu |
| `favorites[].itemName` | `string` | Nazwa wyświetlana elementu |
| `favorites[].itemIconUrl` | `string \| null` | URL ikony elementu |
| `favorites[].itemCategory` | `string \| null` | Kategoria elementu |
| `favorites[].createdAt` | `string` (ISO 8601) | Kiedy element został dodany do ulubionych |
| `favorites[].updatedAt` | `string \| null` | Znacznik czasu ostatniej aktualizacji |

Ulubione są sortowane według `createdAt` (najstarsze jako pierwsze).

---

## Dodaj do ulubionych

Dodaje element do listy ulubionych uwierzytelnionego użytkownika.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/favorites` |
| **Uwierzytelnianie** | Sesja (użytkownik) |
| **Źródło** | `favorites/route.ts` |

### Treść żądania

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `itemSlug` | `string` | Tak | Unikalny identyfikator slug elementu (min. 1 znak) |
| `itemName` | `string` | Tak | Nazwa wyświetlana elementu (min. 1 znak) |
| `itemIconUrl` | `string` | Nie | URL ikony elementu |
| `itemCategory` | `string` | Nie | Kategoria elementu |

### Odpowiedzi

**Status 201** -- Element dodany do ulubionych pomyślnie.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Status 400** -- Nieprawidłowe dane żądania.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Status 409** -- Element już jest w ulubionych.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

---

## Usuń z ulubionych

Usuwa określony element z listy ulubionych uwierzytelnionego użytkownika.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `DELETE` |
| **Ścieżka** | `/api/favorites/{itemSlug}` |
| **Uwierzytelnianie** | Sesja (użytkownik) |
| **Źródło** | `favorites/[itemSlug]/route.ts` |

### Parametry ścieżki

| Parametr | Typ | Opis |
|----------|-----|------|
| `itemSlug` | `string` | Identyfikator slug elementu do usunięcia z ulubionych |

### Odpowiedzi

**Status 200** -- Element usunięty z ulubionych pomyślnie.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status 404** -- Ulubiony element nie znaleziony.
