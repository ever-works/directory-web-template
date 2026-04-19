---
id: location-endpoints
title: "Dokumentacja API Lokalizacji"
sidebar_label: "Lokalizacja"
---

# Dokumentacja API Lokalizacji

## Przegląd

Punkty końcowe Lokalizacji zapewniają dostęp do przestrzennego indeksu lokalizacji elementów w katalogu. Obsługują zapytania o elementy według miasta, kraju, wyszukiwania bliskościowego opartego na promieniu oraz pobieranie danych o współrzędnych do renderowania map. Wszystkie punkty końcowe lokalizacji wymagają włączenia funkcji lokalizacji w ustawieniach systemu.

## Punkty końcowe

### GET /api/location/cities

Zwraca listę odrębnych nazw miast z indeksu lokalizacji.

**Żądanie**

Nie są wymagane żadne parametry.

**Odpowiedź**
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**Przykład**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Zwraca listę odrębnych nazw krajów z indeksu lokalizacji.

**Żądanie**

Nie są wymagane żadne parametry.

**Odpowiedź**
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**Przykład**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Zwraca współrzędne dla wszystkich zindeksowanych elementów z opcjonalnym filtrowaniem według miasta lub kraju. Używany do renderowania znaczników mapy. Elementy zdalne są automatycznie wykluczone.

**Żądanie**

| Parametr | Typ    | W     | Opis |
|----------|--------|-------|------|
| city     | string | query | Filtruj według nazwy miasta (bez uwzględniania wielkości liter) |
| country  | string | query | Filtruj według nazwy kraju (bez uwzględniania wielkości liter) |

**Odpowiedź**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Item slug identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Przykład**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Wyszukuje elementy według lokalizacji geograficznej przy użyciu wyszukiwania bliskościowego opartego na promieniu, nazwy miasta lub nazwy kraju. Zwraca pasujące slugi elementów i opcjonalne informacje o odległości.

**Żądanie**

| Parametr | Typ    | W     | Opis |
|----------|--------|-------|------|
| near_lat | number | query | Szerokość geograficzna dla wyszukiwania promieniowego |
| near_lng | number | query | Długość geograficzna dla wyszukiwania promieniowego |
| radius   | number | query | Promień w km (domyślnie: 50) |
| city     | string | query | Filtruj według nazwy miasta |
| country  | string | query | Filtruj według nazwy kraju |

Wymagany jest co najmniej jeden parametr wyszukiwania: `near_lat` + `near_lng`, `city` lub `country`.

**Odpowiedź**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**Przykład**
```typescript
// Wyszukiwanie promieniowe: elementy w promieniu 25 km od San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Wyszukiwanie po mieście
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Uwierzytelnianie

Wszystkie punkty końcowe lokalizacji są **publiczne** -- uwierzytelnianie nie jest wymagane. Jednak funkcja lokalizacji musi być włączona w ustawieniach systemu. Jeśli funkcje lokalizacji są wyłączone, wszystkie punkty końcowe zwracają `404` z komunikatem `"Location features are disabled"`.

## Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 400 | Nieprawidłowe współrzędne, nieprawidłowy promień lub brakujące wymagane parametry wyszukiwania |
| 404 | Funkcje lokalizacji są wyłączone w ustawieniach systemu |
| 500 | Wewnętrzny błąd serwera -- awaria zapytania do bazy danych |

## Ograniczanie liczby żądań

Nie stosuje się żadnego jawnego ograniczania liczby żądań do tych punktów końcowych. Elementy zdalne/wirtualne są automatycznie wykluczane z wyników współrzędnych.
