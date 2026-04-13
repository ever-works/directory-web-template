---
id: collections-api-endpoints
title: Punkty końcowe API Kolekcji
sidebar_label: Collections API
sidebar_position: 57
---

# Punkty końcowe API Kolekcji

Publiczne API kolekcji udostępnia jeden punkt końcowy do sprawdzania, czy w systemie istnieje co najmniej jedna aktywna kolekcja.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/collections/exists` | Brak (publiczny) | Sprawdź, czy istnieje co najmniej jedna kolekcja |

---

## Sprawdź istnienie kolekcji

```
GET /api/collections/exists
```

Sprawdza dostępność kolekcji, wysyłając zapytanie bezpośrednio do bazy danych w celu pobrania aktywnych kolekcji.

**Uwierzytelnianie:** Brak (publiczny)

---

### Odpowiedź sukcesu (200)

```json
{
  "exists": true,
  "count": 5
}
```

### Pola odpowiedzi

| Pole | Typ | Opis |
|------|-----|------|
| `exists` | boolean | Czy istnieje co najmniej jedna aktywna kolekcja |
| `count` | integer | Łączna liczba aktywnych kolekcji |

### Odpowiedź błędu (500)

```json
{
  "error": "Nie udało się sprawdzić kolekcji"
}
```

:::warning
Ten punkt końcowy zwraca `500` w przypadku błędów wewnętrznych, w przeciwieństwie do `/api/categories/exists`, który zawsze zwraca `200`.
:::

---

## Przykłady

### curl

```bash
curl https://example.com/api/collections/exists
```

### TypeScript

```typescript
const res = await fetch('/api/collections/exists');
if (!res.ok) {
  // Obsłuż błąd serwera
  return;
}
const { exists, count } = await res.json();
// exists: boolean, count: number
```

---

## Uwagi dotyczące implementacji

- Dane kolekcji są pobierane **bezpośrednio z bazy danych** (nie z buforu treści).
- Tylko kolekcje z `isActive: true` są zliczane.
- Brak parametrów zapytania — filtr lokalizacji nie jest obsługiwany.

**Źródło:** `template/app/api/collections/exists/route.ts`
