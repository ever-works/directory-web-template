---
id: items-api-endpoints-deep-dive
title: "Szczegółowe omówienie Punktów końcowych API Elementów"
sidebar_label: "Szczegółowe omówienie API Elementów"
---

# Szczegółowe omówienie Punktów końcowych API Elementów

Ta sekcja zawiera szczegółowe omówienie punktów końcowych API związanych z elementami katalogu, w tym komentarzy, głosów, wyświetleń, powiązań firm i metryk zaangażowania.

## Mapa tras

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/items/[slug]/comments` | Pobierz komentarze do elementu |
| `POST` | `/api/items/[slug]/comments` | Utwórz komentarz |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Zaktualizuj komentarz |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Usuń komentarz |
| `GET` | `/api/items/[slug]/comments/ratings` | Pobierz statystyki ocen |
| `GET` | `/api/items/[slug]/comments/[commentId]/rating` | Pobierz ocenę komentarza |
| `POST` | `/api/items/[slug]/comments/[commentId]/rating` | Oceń komentarz |
| `DELETE` | `/api/items/[slug]/comments/[commentId]/rating` | Usuń ocenę komentarza |
| `GET` | `/api/items/[slug]/company` | Pobierz powiązaną firmę |
| `POST` | `/api/items/[slug]/company` | Przypisz firmę do elementu |
| `DELETE` | `/api/items/[slug]/company` | Usuń powiązanie firmy |
| `POST` | `/api/items/[slug]/views` | Zarejestruj wyświetlenie |
| `GET` | `/api/items/[slug]/votes` | Pobierz głosy do elementu |
| `POST` | `/api/items/[slug]/votes` | Oddaj głos |
| `DELETE` | `/api/items/[slug]/votes` | Usuń głos |
| `GET` | `/api/items/[slug]/votes/count` | Pobierz liczbę głosów |
| `GET` | `/api/items/[slug]/votes/status` | Sprawdź status głosowania |
| `POST` | `/api/items/engagement` | Pobierz metryki zaangażowania (wsadowo) |

---

## Komentarze

### Pobierz komentarze do elementu

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/comments` |
| **Uwierzytelnianie** | Nie wymagane |

**Parametry zapytania:**

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `limit` | number | Nie | Liczba komentarzy na stronę (domyślnie: 20) |
| `cursor` | string | Nie | Kursor paginacji |
| `sortBy` | string | Nie | Pole sortowania (`createdAt`, `rating`) |
| `order` | string | Nie | Kierunek sortowania (`asc`, `desc`) |

**Odpowiedź:**

```json
{
  "data": [
    {
      "id": "comment_abc",
      "content": "Great tool!",
      "userId": "user_123",
      "createdAt": "2024-01-20T10:00:00Z",
      "user": { "name": "Alice", "image": "..." }
    }
  ],
  "nextCursor": "cursor_xyz",
  "total": 42
}
```

### Utwórz komentarz

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/[slug]/comments` |
| **Uwierzytelnianie** | Wymagane |

**Treść żądania:**

```json
{
  "content": "This is my comment",
  "parentId": null
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `content` | string | Tak | Treść komentarza (1–2000 znaków) |
| `parentId` | string lub null | Nie | ID komentarza nadrzędnego dla odpowiedzi |

**Odpowiedź (201):**

```json
{
  "id": "comment_new",
  "content": "This is my comment",
  "userId": "user_123",
  "itemSlug": "my-item",
  "createdAt": "2024-01-20T12:00:00Z"
}
```

### Zaktualizuj komentarz

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `PUT` |
| **Ścieżka** | `/api/items/[slug]/comments/[commentId]` |
| **Uwierzytelnianie** | Wymagane (właściciel lub administrator) |

**Treść żądania:**

```json
{
  "content": "Updated comment text"
}
```

**Odpowiedź (200):** Zaktualizowany obiekt komentarza.

### Usuń komentarz

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `DELETE` |
| **Ścieżka** | `/api/items/[slug]/comments/[commentId]` |
| **Uwierzytelnianie** | Wymagane (właściciel lub administrator) |

Wykonuje miękkie usunięcie poprzez ustawienie `deletedAt`. Odpowiedź: `{ "success": true }`.

### Statystyki ocen komentarzy

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/comments/ratings` |
| **Uwierzytelnianie** | Nie wymagane |

**Odpowiedź:**

```json
{
  "averageRating": 4.2,
  "totalRatings": 18,
  "distribution": { "1": 1, "2": 0, "3": 2, "4": 7, "5": 8 }
}
```

### Pobierz ocenę komentarza

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/comments/[commentId]/rating` |
| **Uwierzytelnianie** | Nie wymagane |

Zwraca aktualną ocenę konkretnego komentarza przez bieżącego użytkownika lub ocenę zbiorczą.

### Oceń komentarz

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/[slug]/comments/[commentId]/rating` |
| **Uwierzytelnianie** | Wymagane |

**Treść żądania:**

```json
{ "rating": 5 }
```

Pole `rating` musi być liczbą całkowitą od 1 do 5.

### Usuń ocenę komentarza

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `DELETE` |
| **Ścieżka** | `/api/items/[slug]/comments/[commentId]/rating` |
| **Uwierzytelnianie** | Wymagane |

Usuwa ocenę bieżącego użytkownika dla danego komentarza. Odpowiedź: `{ "success": true }`.

---

## Powiązanie firmy

### Pobierz powiązaną firmę

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/company` |
| **Uwierzytelnianie** | Nie wymagane |

Zwraca firmę powiązaną z elementem lub `null`, jeśli nie ma powiązania.

**Odpowiedź:**

```json
{
  "id": "company_abc",
  "name": "Acme Corp",
  "website": "https://acme.com",
  "logoUrl": "https://..."
}
```

### Przypisz firmę do elementu

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/[slug]/company` |
| **Uwierzytelnianie** | Wymagane (Administrator) |

**Treść żądania:**

```json
{ "companyId": "company_abc" }
```

### Usuń powiązanie firmy

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `DELETE` |
| **Ścieżka** | `/api/items/[slug]/company` |
| **Uwierzytelnianie** | Wymagane (Administrator) |

Odpowiedź: `{ "success": true }`.

---

## Wyświetlenia

### Zarejestruj wyświetlenie

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/[slug]/views` |
| **Uwierzytelnianie** | Nie wymagane |

Rejestruje wyświetlenie strony elementu. Punkt końcowy stosuje detekcję botów (User-Agent) i deduplikację opartą na IP, aby zapobiec pompowaniu liczników.

**Treść żądania:** Brak (pusta)

**Odpowiedź:**

```json
{ "success": true, "views": 1501 }
```

Jeśli wyświetlenie jest zduplikowane lub pochodzi od bota, odpowiedź może zwrócić `{ "success": false, "reason": "duplicate" }` bez rejestrowania wyświetlenia.

---

## Głosy

### Pobierz głosy do elementu

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/votes` |
| **Uwierzytelnianie** | Nie wymagane |

Zwraca podsumowanie głosowania dla danego elementu.

**Odpowiedź:**

```json
{
  "upvotes": 143,
  "downvotes": 5,
  "score": 138
}
```

### Oddaj głos

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/[slug]/votes` |
| **Uwierzytelnianie** | Wymagane |

**Treść żądania:**

```json
{ "vote": "up" }
```

Pole `vote` musi być `"up"` lub `"down"`. Jeśli użytkownik już głosował, głos jest nadpisywany.

### Usuń głos

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `DELETE` |
| **Ścieżka** | `/api/items/[slug]/votes` |
| **Uwierzytelnianie** | Wymagane |

Usuwa głos bieżącego użytkownika. Odpowiedź: `{ "success": true }`.

### Pobierz liczbę głosów

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/votes/count` |
| **Uwierzytelnianie** | Nie wymagane |

Lekki punkt końcowy zwracający tylko liczbę głosów.

**Odpowiedź:**

```json
{ "count": 138 }
```

### Sprawdź status głosowania

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/items/[slug]/votes/status` |
| **Uwierzytelnianie** | Wymagane |

Sprawdza, czy bieżący użytkownik głosował na element, i jeśli tak — jaki rodzaj głosu.

**Odpowiedź:**

```json
{ "voted": true, "vote": "up" }
```

---

## Metryki zaangażowania

### Pobierz metryki zaangażowania (wsadowo)

| Właściwość | Wartość |
|------------|---------|
| **Metoda** | `POST` |
| **Ścieżka** | `/api/items/engagement` |
| **Uwierzytelnianie** | Nie wymagane |

Pobiera metryki zaangażowania dla wielu elementów w jednym żądaniu.

**Treść żądania:**

```json
{
  "slugs": ["item-one", "item-two", "item-three"]
}
```

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `slugs` | string[] | Tak | Tablica slugów elementów (maks. 200) |

**Odpowiedź:**

```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Przykład:**

```typescript
const res = await fetch('/api/items/engagement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slugs: ['tool-a', 'tool-b'] })
});
const { metrics } = await res.json();
// metrics["tool-a"] = { views: 500, votes: 30, avgRating: 4.1, favorites: 12, comments: 5 }
```

**Odpowiedzi błędów:**

| Status | Opis |
|--------|------|
| 400 | Brakujące lub nieprawidłowe pole `slugs`, lub przekroczono limit 200 slugów |
| 500 | Wewnętrzny błąd serwera |

---

## Wyniki popularności

Punkt końcowy `/api/items/popularity-scores` (metoda `GET`) oblicza ważone wyniki popularności dla wszystkich elementów z następującym algorytmem oceniania:

| Czynnik | Waga | Formuła |
|---------|------|---------|
| Wyróżnienie | 10 000 | `10000` jeśli wyróżniony, w przeciwnym razie `0` |
| Wyświetlenia | 1 000 | `log10(wyświetlenia + 1) × 1000` |
| Głosy | 1 200 | `log10(głosy + 1) × 1200` |
| Ocena | 500 | `avgRating × 500` |
| Ulubione | 1 100 | `log10(ulubione + 1) × 1100` |
| Komentarze | 1 000 | `log10(komentarze + 1) × 1000` |
| Aktualność | Zmienna | Maleje przez 180 dni |
