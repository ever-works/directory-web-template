---
id: favorites-endpoints
title: "Punkty końcowe API Ulubionych"
sidebar_label: "Ulubione"
---

# Punkty końcowe API Ulubionych

API Ulubionych umożliwia uwierzytelnionym użytkownikom zarządzanie osobistą listą ulubionych elementów. Każde ulubione przechowuje metadane elementu (nazwa, ikona, kategoria) do szybkiego wyświetlania bez konieczności dołączania do warstwy treści.

**Pliki źródłowe:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Podsumowanie punktów końcowych

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| GET | `/api/favorites` | Sesja | Wyświetl wszystkie ulubione bieżącego użytkownika |
| POST | `/api/favorites` | Sesja | Dodaj element do ulubionych |
| DELETE | `/api/favorites/{itemSlug}` | Sesja | Usuń element z ulubionych |

Wszystkie punkty końcowe wymagają uwierzytelnionej sesji użytkownika i działającego połączenia z bazą danych (sprawdzane przez `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Zwraca wszystkie elementy oznaczone jako ulubione przez uwierzytelnionego użytkownika, posortowane według daty utworzenia (najstarszy jako pierwszy).

### Kształt odpowiedzi

#### 200 -- Sukces

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

#### 401 -- Nieautoryzowany

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Błąd serwera

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Dodaje element do ulubionych uwierzytelnionego użytkownika. Zawiera sprawdzanie duplikatów, aby zapobiec dodaniu tego samego elementu dwa razy.

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `itemSlug` | string | **Tak** | Unikalny identyfikator slug elementu |
| `itemName` | string | **Tak** | Nazwa wyświetlana elementu |
| `itemIconUrl` | string | Nie | URL do ikony elementu |
| `itemCategory` | string | Nie | Nazwa kategorii elementu |

### Przykład żądania

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Kształt odpowiedzi

#### 201 -- Utworzono

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

#### 400 -- Błąd walidacji

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Nieautoryzowany

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Konflikt (duplikat)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Usuwa określony element z listy ulubionych uwierzytelnionego użytkownika.

### Parametry ścieżki

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `itemSlug` | string | **Tak** | Slug elementu do usunięcia |

### Kształt odpowiedzi

#### 200 -- Usunięto pomyślnie

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Nieautoryzowany

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Nie znaleziono

Zwracany, gdy ulubiony element nie istnieje lub nie należy do bieżącego użytkownika:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```
