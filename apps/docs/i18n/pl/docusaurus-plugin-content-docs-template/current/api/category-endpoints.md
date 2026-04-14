---
id: category-endpoints
title: Punkty końcowe Kategorii
sidebar_label: Categories
sidebar_position: 10
---

# Punkty końcowe Kategorii

Publiczny punkt końcowy kategorii pozwala sprawdzić, czy w systemie istnieją jakiekolwiek kategorie. Używany jest do warunkowego renderowania nawigacji i interfejsu przeglądania.

## Przegląd tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|------|------------------|------|
| `GET` | `/api/categories/exists` | Brak (publiczny) | Sprawdź, czy istnieje co najmniej jedna kategoria |

---

## Sprawdź istnienie kategorii

```
GET /api/categories/exists
```

Zwraca informację, czy w systemie istnieje co najmniej jedna aktywna kategoria.

**Uwierzytelnianie:** Brak (publiczny)

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|-----------|-----|----------|------|
| `locale` | string | Nie | Kod lokalizacji (domyślnie: `en`) |

---

### Jak to działa

```typescript
// Uproszczona logika
const categories = await getCachedCategories({ locale });
return Response.json({
  exists: categories.length > 0,
  count: categories.length,
});
```

Kategorie są odczytywane z buforu treści. Jeśli bufor jest nieważny lub pusty, następuje pobranie z repozytorium kategorii.

---

### Kształt odpowiedzi — znaleziono

```json
{
  "exists": true,
  "count": 8
}
```

### Kształt odpowiedzi — brak kategorii

```json
{
  "exists": false,
  "count": 0
}
```

### Kształt odpowiedzi — błąd (200 z bezpiecznymi wartościami domyślnymi)

```json
{
  "exists": false,
  "count": 0
}
```

:::info
Ten punkt końcowy **nigdy** nie zwraca odpowiedzi 4xx ani 5xx. Błędy wewnętrzne są ciche i zwracają wartości domyślne, zapewniając, że interfejs renderuje się poprawnie.
:::

---

## Publiczny dostęp

Ten punkt końcowy jest całkowicie publiczny i **nie wymaga** sesji ani tokenu API. Może być wywoływany przez dowolnego klienta bez uwierzytelniania.

---

## Przykład użycia

```typescript
// Komponent Next.js (Server Component)
async function CategoryNav() {
  const res = await fetch('/api/categories/exists?locale=en', {
    next: { revalidate: 60 }
  });
  const { exists, count } = await res.json();

  if (!exists) return null;

  return <nav>Przeglądaj {count} kategorii</nav>;
}
```

---

## Uwagi

- Parametr `locale` wpływa na to, które kategorie są liczone po odfiltrowaniu wyników zależnych od lokalizacji.
- Odpowiedź jest lekkia (`exists` + `count`) i nadaje się do częstego wywoływania.
- Buforowanie po stronie klienta jest zalecane (`Cache-Control: max-age=60`).

---

## Powiązane pliki źródłowe

| Plik | Opis |
|------|------|
| `app/api/categories/exists/route.ts` | Procedura obsługi tras |
| `lib/repositories/categoryRepository.ts` | Warstwa dostępu do danych |
| `lib/services/contentCache.ts` | Buforowanie treści |

**Źródło:** `template/app/api/categories/exists/route.ts`
