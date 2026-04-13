---
id: collection-endpoints
title: Punkty końcowe Kolekcji
sidebar_label: Collections
sidebar_position: 11
---

# Punkty końcowe Kolekcji

Publiczny punkt końcowy kolekcji pozwala sprawdzić, czy w systemie istnieje co najmniej jedna aktywna kolekcja. Używany jest do warunkowego renderowania sekcji kolekcji w interfejsie.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/collections/exists` | Brak (publiczny) | Sprawdź, czy istnieje co najmniej jedna kolekcja |

---

## Sprawdź istnienie kolekcji

```
GET /api/collections/exists
```

Sprawdza, czy w systemie istnieje co najmniej jedna aktywna kolekcja.

**Uwierzytelnianie:** Brak (publiczny punkt końcowy)

### Parametry zapytania

Brak parametrów zapytania.

---

### Odpowiedź sukcesu (200) — znaleziono kolekcje

```json
{
  "exists": true,
  "count": 5
}
```

### Odpowiedź sukcesu (200) — brak kolekcji

```json
{
  "exists": false,
  "count": 0
}
```

### Odpowiedź błędu (500)

W przeciwieństwie do punktu końcowego kategorii, błędy wewnętrzne zwracają odpowiedź `500`:

```json
{
  "error": "Nie udało się sprawdzić kolekcji"
}
```

---

## Jak to działa

Punkt końcowy wykonuje zapytanie do bazy danych przez warstwę repozytorium:

```typescript
const collections = await collectionRepository.findAll({
  includeInactive: false
});
return Response.json({
  exists: collections.length > 0,
  count: collections.length,
});
```

Kolekcje są bezpośrednio pobierane z bazy danych z filtrem `includeInactive: false`, co oznacza, że liczone są tylko aktywne kolekcje.

---

## Przykłady

### curl

```bash
curl https://example.com/api/collections/exists
```

### TypeScript

```typescript
const response = await fetch('/api/collections/exists');
if (!response.ok) {
  console.error('Nie udało się sprawdzić kolekcji');
  return;
}
const { exists, count } = await response.json();

if (exists) {
  console.log(`Dostępne są ${count} ${count === 1 ? 'kolekcja' : 'kolekcje'}`);
} else {
  console.log('Brak kolekcji');
}
```

---

## Różnice względem kategorii

| Zachowanie | `/api/categories/exists` | `/api/collections/exists` |
|-----------|--------------------------|---------------------------|
| Błąd zwraca | `200` z `{ exists: false }` | `500` z komunikatem błędu |
| Źródło danych | Bufor treści | Bezpośrednie zapytanie do bazy danych |
| Parametry zapytania | `locale` | Brak |

---

## Uwagi

- Punkt końcowy jest całkowicie publiczny i nie wymaga uwierzytelniania.
- Liczy tylko **aktywne** kolekcje (nieaktywne są wykluczone).
- Idealny do warunkowego renderowania sekcji kolekcji w interfejsie użytkownika.

**Źródło:** `template/app/api/collections/exists/route.ts`
