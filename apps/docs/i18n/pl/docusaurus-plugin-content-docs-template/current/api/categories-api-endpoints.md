---
id: categories-api-endpoints
title: Punkty końcowe API Kategorii
sidebar_label: Categories API
sidebar_position: 56
---

# Punkty końcowe API Kategorii

Publiczne API kategorii udostępnia jeden punkt końcowy do sprawdzania, czy w systemie istnieją jakiekolwiek kategorie. Jest to szybkie sprawdzenie dostępności używane do warunkowego renderowania interfejsu użytkownika.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/categories/exists` | Brak (publiczny) | Sprawdź, czy istnieją jakiekolwiek kategorie |

---

## Sprawdź istnienie kategorii

```
GET /api/categories/exists
```

Sprawdza, czy w systemie istnieje co najmniej jedna kategoria dla podanej lokalizacji. Zawsze zwraca odpowiedź `200` — błędy są ukryte i zwracają bezpieczne wartości domyślne.

**Uwierzytelnianie:** Brak (publiczny punkt końcowy)

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `locale` | string | Nie | Kod języka (domyślnie: `en`) |

---

### Odpowiedź sukcesu (200) — znaleziono kategorie

```json
{
  "exists": true,
  "count": 12
}
```

### Odpowiedź sukcesu (200) — brak kategorii

```json
{
  "exists": false,
  "count": 0
}
```

### Odpowiedź w przypadku błędu (200)

W przypadku błędu wewnętrznego punkt końcowy zwraca odpowiedź `200` z bezpiecznymi wartościami domyślnymi zamiast błędu `500`:

```json
{
  "exists": false,
  "count": 0
}
```

---

## Przykłady

### curl

```bash
# Sprawdzenie domyślne (locale: en)
curl https://example.com/api/categories/exists

# Z konkretną lokalizacją
curl "https://example.com/api/categories/exists?locale=pl"
```

### TypeScript

```typescript
const response = await fetch('/api/categories/exists?locale=en');
const data = await response.json();

if (data.exists) {
  console.log(`Znaleziono ${data.count} ${ data.count === 1 ? 'kategorię' : 'kategorie' }`);
} else {
  console.log('Brak dostępnych kategorii');
}
```

---

## Uwagi dotyczące implementacji

- Punkt końcowy jest **zawsze publiczny** — nie wymaga uwierzytelniania.
- Zwraca `200` nawet w przypadku błędów wewnętrznych (nie ujawnia szczegółów błędów).
- Parametr `locale` wpływa na to, które kategorie są liczone (np. ukryte dla danej lokalizacji mogą nie być zliczane).
- Idealny do warunkowego renderowania sekcji kategorii w interfejsie.

**Źródło:** `template/app/api/categories/exists/route.ts`
