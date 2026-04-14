---
id: config-feature-endpoints
title: "Dokumentacja API Config i Flag Funkcji"
sidebar_label: "Config i Funkcje"
---

# Dokumentacja API Config i Flag Funkcji

## Przegląd

Punkt końcowy Config Features udostępnia aktualne flagi dostępności funkcji aplikacji. Flagi wskazują, które funkcje zależne od bazy danych są aktywne, umożliwiając interfejsowi użytkownika łagodną degradację, gdy funkcje są niedostępne. Jest to publiczny, buforowany punkt końcowy zaprojektowany do użycia o wysokiej częstotliwości.

## Punkty końcowe

### GET /api/config/features

Zwraca aktualną dostępność funkcji na podstawie konfiguracji systemu i dostępności bazy danych.

**Żądanie**

Nie są wymagane żadne parametry ani treść żądania.

**Odpowiedź**
```typescript
{
  ratings: boolean;         // Whether the ratings feature is available
  comments: boolean;        // Whether the comments feature is available
  favorites: boolean;       // Whether the favorites feature is available
  featuredItems: boolean;   // Whether the featured items feature is available
  surveys: boolean;         // Whether the surveys feature is available
}
```

**Przykład**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Render rating component
}

if (!features.surveys) {
  // Hide survey section
}
```

## Uwierzytelnianie

Ten punkt końcowy jest **publiczny** -- uwierzytelnianie nie jest wymagane. Jest przeznaczony do użycia przez interfejs użytkownika podczas początkowego ładowania strony w celu ustalenia, które funkcje UI powinny być renderowane.

## Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 200 | Flagi funkcji pobrane pomyślnie |
| 500 | Błąd wewnętrzny -- zwraca wszystkie flagi jako `false` dla bezpieczeństwa z nagłówkiem `no-cache` |

W przypadku błędu punkt końcowy zwraca wszystkie funkcje jako `false`, aby zapewnić bezpieczną awarię aplikacji zamiast ujawniania uszkodzonej funkcjonalności.

## Ograniczanie liczby żądań

Odpowiedzi są buforowane z następującymi nagłówkami:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Efektywnie buforowane przez 5 minut na poziomie CDN z 10-minutowym oknem stale-while-revalidate.

Odpowiedzi błędów używają `Cache-Control: no-cache`, aby zapobiec buforowaniu zdegradowanego stanu.

## Powiązane punkty końcowe

- [Punkty końcowe Health](./health-endpoints) -- Sprawdzanie kondycji połączenia z bazą danych
