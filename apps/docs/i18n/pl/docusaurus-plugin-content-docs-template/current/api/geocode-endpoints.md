---
id: geocode-endpoints
title: "Dokumentacja API Geokodowania"
sidebar_label: "Geokodowanie"
---

# Dokumentacja API Geokodowania

## Przegląd

Punkty końcowe Geocode zapewniają możliwości geokodowania wprost (adres na współrzędne) i odwrotnego (współrzędne na adres). Wyniki są buforowane przez 15 minut w celu zmniejszenia liczby wywołań zewnętrznego API. Te punkty końcowe wymagają uwierzytelnienia administratora, aby zapobiec nadużyciu kosztów leżących u podstaw usług geokodowania Mapbox/Google.

## Punkty końcowe

### POST /api/geocode

Konwertuje adres na współrzędne (geokodowanie wprost) lub współrzędne na adres (geokodowanie odwrotne). Treść żądania określa, która operacja jest wykonywana na podstawie tego, czy podane są pola `address`, czy `latitude`/`longitude`.

#### Geokodowanie wprost (adres na współrzędne)

**Żądanie**
```typescript
{
  address: string;          // 1-500 characters, required
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2 codes, e.g. ["US", "CA"]
    language?: string;        // ISO 639-1 language code, e.g. "en"
    proximity?: {
      latitude: number;       // -90 to 90
      longitude: number;      // -180 to 180
    };
  };
}
```

**Odpowiedź**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 to 1
  };
}
```

**Przykład**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Geokodowanie odwrotne (współrzędne na adres)

**Żądanie**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**Odpowiedź**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**Przykład**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Zwraca status usługi geokodowania, w tym skonfigurowane dostawcy i statystyki pamięci podręcznej.

**Żądanie**

Nie jest wymagana treść żądania. Uwierzytelnianie poprzez ciasteczko sesji.

**Odpowiedź**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Whether location features are enabled
    configured: boolean;      // Whether any geocoding provider is configured
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Current cache size
      maxSize: number;        // Maximum cache size (1000)
      ttlMs: number;          // Cache TTL in milliseconds (900000 = 15 min)
    };
  };
}
```

**Przykład**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Uwierzytelnianie

- **GET /api/geocode**: Wymaga uwierzytelnionej sesji (dowolny użytkownik).
- **POST /api/geocode**: Wymaga uwierzytelnionej sesji z **rolą administratora**. Użytkownicy bez uprawnień administratora otrzymają odpowiedź `403 Forbidden`. To ograniczenie zapobiega nadużyciu kosztów API.

## Odpowiedzi błędów

| Status | Opis |
|--------|------|
| 400 | Nieprawidłowe dane żądania -- zniekształcony adres, nieprawidłowe współrzędne lub błąd walidacji schematu |
| 401 | Nieautoryzowany -- brak uwierzytelnionej sesji |
| 403 | Zabroniony -- wymagany dostęp administratora (tylko POST) |
| 404 | Nie znaleziono wyników geokodowania dla podanego adresu lub współrzędnych |
| 503 | Funkcje lokalizacji są wyłączone w ustawieniach lub usługa geokodowania nie jest skonfigurowana |

## Ograniczanie liczby żądań

Wyniki są buforowane przez 15 minut (TTL 900 000 ms) z maksymalnym rozmiarem pamięci podręcznej 1000 wpisów. Wszystkie żądania geokodowania są rejestrowane w dzienniku audytu do celów śledzenia kosztów.

## Powiązane punkty końcowe

- [Punkty końcowe Lokalizacji](./location-endpoints) -- Wyszukiwanie lokalizacji, miasta, kraje i współrzędne
