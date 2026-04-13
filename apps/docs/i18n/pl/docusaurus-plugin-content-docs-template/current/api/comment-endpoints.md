---
id: comment-endpoints
title: Punkty końcowe Komentarzy
sidebar_label: Comments
sidebar_position: 24
---

# Punkty końcowe Komentarzy

API komentarzy obsługuje interakcje z komentarzami użytkowników dla elementów katalogu, w tym tworzenie, aktualizację, usuwanie i ocenianie. Punkty końcowe są dostępne (z różnymi poziomami dostępu) dla użytkowników publicznych, zalogowanych i administratorów.

## Przegląd tras

### Publiczne punkty końcowe

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/items/[id]/comments` | Wyświetl komentarze elementu z informacjami o użytkowniku |
| `GET` | `/api/items/[id]/rating` | Pobierz zagregowane statystyki ocen |

### Uwierzytelnione punkty końcowe

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `POST` | `/api/items/[id]/comments` | Dodaj komentarz do elementu |
| `PUT` | `/api/items/[id]/comments/[commentId]` | Zaktualizuj treść lub ocenę komentarza |
| `DELETE` | `/api/items/[id]/comments/[commentId]` | Usuń komentarz (miękkie usunięcie) |
| `PATCH` | `/api/items/[id]/comments/[commentId]/rating` | Zaktualizuj tylko ocenę |

### Punkty końcowe administratora

| Metoda | Ścieżka | Opis |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Wyświetl wszystkie komentarze z filtrami moderacji |
| `GET` | `/api/admin/comments/[id]` | Pobierz komentarz według ID |
| `PUT` | `/api/admin/comments/[id]` | Zaktualizuj komentarz (moderacja) |
| `DELETE` | `/api/admin/comments/[id]` | Usuń komentarz (miękkie usunięcie) |

---

## Wyświetl komentarze elementu

```
GET /api/items/[id]/comments
```

Pobiera wszystkie aktywne komentarze dla danego elementu z dołączonymi informacjami o autorze.

**Uwierzytelnianie:** Brak (publiczny)

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-id",
        "content": "Great tool!",
        "rating": 5,
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "image": "https://example.com/avatar.jpg"
        },
        "createdAt": "2024-01-20T10:00:00.000Z",
        "editedAt": null
      }
    ],
    "total": 12
  }
}
```

---

## Pobierz statystyki ocen

```
GET /api/items/[id]/rating
```

Zwraca zagregowane statystyki ocen dla elementu.

**Uwierzytelnianie:** Brak (publiczny)

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "averageRating": 4.3,
    "totalRatings": 45,
    "distribution": {
      "1": 2,
      "2": 3,
      "3": 5,
      "4": 12,
      "5": 23
    }
  }
}
```

---

## Dodaj komentarz

```
POST /api/items/[id]/comments
```

Dodaje nowy komentarz do elementu.

**Uwierzytelnianie:** Wymagana sesja

**Sprawdzanie blokady:** Użytkownicy, którzy są zablokowani przez właściciela elementu, nie mogą dodawać komentarzy (odpowiedź `403`).

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `content` | string | Tak | Treść komentarza (1–1000 znaków) |
| `rating` | integer | Tak | Ocena od 1 do 5 |

**Odpowiedź sukcesu (201):**

```json
{
  "success": true,
  "data": {
    "id": "new-comment-id",
    "content": "Great tool!",
    "rating": 5,
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## Zaktualizuj komentarz

```
PUT /api/items/[id]/comments/[commentId]
```

Aktualizuje treść lub ocenę komentarza. Wymagane jest co najmniej jedno z pól.

**Uwierzytelnianie:** Wymagana sesja (tylko autor komentarza)

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `content` | string | Nie | Nowa treść (1–1000 znaków) |
| `rating` | integer | Nie | Nowa ocena (1–5) |

:::info
Wymagane jest co najmniej jedno z pól: `content` lub `rating`. Przesłanie obu jest dozwolone.
:::

W odpowiedzi pole `editedAt` będzie zawierać znacznik czasu modyfikacji.

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment-id",
    "content": "Updated review text",
    "rating": 4,
    "editedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

---

## Usuń komentarz

```
DELETE /api/items/[id]/comments/[commentId]
```

Miękkie usunięcie komentarza — oznacza go jako usunięty i usuwa treść, ale zachowuje rekord na potrzeby audytu.

**Uwierzytelnianie:** Wymagana sesja (autor lub administrator)

**Odpowiedź sukcesu:** `204 No Content`

---

## Zaktualizuj ocenę

```
PATCH /api/items/[id]/comments/[commentId]/rating
```

Aktualizuje tylko ocenę istniejącego komentarza.

**Uwierzytelnianie:** Wymagana sesja (tylko autor)

### Treść żądania

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `rating` | integer | Tak | Nowa ocena (1–5) |

---

## Punkty końcowe komentarzy administratora

### Wyświetl wszystkie komentarze

```
GET /api/admin/comments
```

Pobiera wszystkie komentarze z opcjami wyszukiwania i filtrowania dla moderacji.

**Uwierzytelnianie:** Wymagane uprawnienia administratora

**Parametry zapytania:** `page`, `limit`, `search`, `status` (active, deleted)

### Pobierz komentarz (admin)

```
GET /api/admin/comments/[id]
```

Pobiera komentarz według ID, w tym usunięte lub ukryte.

### Zaktualizuj komentarz (admin)

```
PUT /api/admin/comments/[id]
```

Administratorzy mogą aktualizować treść komentarza lub jego status widoczności.

### Usuń komentarz (admin)

```
DELETE /api/admin/comments/[id]
```

Miękkie usunięcie komentarza z panelu administratora.

---

## Kluczowe szczegóły implementacji

| Aspekt | Zachowanie |
|--------|-----------|
| Usuwanie | Zawsze miękkie — dane zachowane, treść wyczyszczona |
| Edycja | Pole `editedAt` ustawiane przy każdej aktualizacji |
| Ocena | Wymagana przy tworzeniu; aktualizowalna przez PUT lub PATCH |
| Blokada | Zablokowani użytkownicy nie mogą komentować elementów właściciela |
| Autoryzacja | Użytkownicy mogą edytować/usuwać tylko własne komentarze |
| Format treści | Zwykły tekst (max 1000 znaków); HTML jest usuwany |

---

## Kody błędów

| Kod | Opis |
|-----|------|
| 400 | Błąd walidacji (np. brakująca treść lub ocena) |
| 401 | Brak sesji |
| 403 | Brak uprawnień do modyfikacji komentarza |
| 404 | Element lub komentarz nie zostały znalezione |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/items/[id]/comments/**`, `template/app/api/admin/comments/**`
