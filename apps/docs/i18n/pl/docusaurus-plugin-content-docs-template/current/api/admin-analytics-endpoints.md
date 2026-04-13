---
id: admin-analytics-endpoints
title: Punkty końcowe Analityki Administratora
sidebar_label: Admin Analytics
sidebar_position: 22
---

# Punkty końcowe Analityki Administratora

API analityki administratora udostępnia geograficzne dane analityczne dla panelu administratora, w tym statystyki pokrycia, rozkłady i dane do wizualizacji na mapie. Wszystkie punkty końcowe wymagają uwierzytelniania administratora.

## Przegląd

| Punkt końcowy | Metoda | Uwierzytelnianie | Opis |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Administrator | Pobierz geograficzne dane analityczne |

## Pobierz Geograficzne Dane Analityczne

```
GET /api/admin/geo-analytics
```

Zwraca kompleksowe dane analityki geograficznej, w tym statystyki pokrycia, rozkłady według krajów/miast/obszarów obsługi, współrzędne lokalizacji do znaczników na mapie oraz dane mapy ciepła. Ten punkt końcowy agreguje dane z indeksu lokalizacji i repozytorium elementów.

**Uwierzytelnianie:** Wymagane uprawnienia administratora (przez `checkAdminAuth()`)

**Buforowanie:** Wyłączone -- używa `force-dynamic`, `revalidate: 0` i `force-no-store`, aby zapewnić aktualne dane dla panelu administratora.

**Odpowiedź sukcesu (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Pola odpowiedzi

#### Obiekt Stats

| Pole | Typ | Opis |
|---|---|---|
| `totalIndexed` | integer | Całkowita liczba wpisów w indeksie lokalizacji |
| `totalItems` | integer | Całkowita liczba elementów w repozytorium |
| `itemsWithLocation` | integer | Elementy posiadające dane lokalizacji lub oznaczone jako zdalne |
| `itemsRemote` | integer | Elementy oznaczone jako zdalne/rozproszone |
| `coveragePercent` | number | Procent elementów z danymi lokalizacji (zaokrąglony do 1 miejsca po przecinku) |
| `indexHealth.synced` | boolean | Czy liczba wpisów w indeksie odpowiada oczekiwanej liczbie |
| `indexHealth.indexCount` | integer | Wpisy inne niż zdalne w indeksie |
| `indexHealth.expectedCount` | integer | Oczekiwane wpisy inne niż zdalne na podstawie danych źródłowych |
| `citiesCount` | integer | Liczba różnych miast w indeksie |
| `countriesCount` | integer | Liczba różnych krajów w indeksie |
| `remoteCount` | integer | Liczba zdalnych wpisów w indeksie |
| `lastIndexedAt` | string lub null | Znacznik czasu ISO ostatniej aktualizacji indeksu |
| `lastRebuildAt` | string lub null | Znacznik czasu ISO ostatniej pełnej przebudowy |

#### Obiekt Distributions

| Pole | Opis |
|---|---|
| `byCountry` | Tablica nazw krajów z liczbami, posortowana malejąco według liczby |
| `byCity` | 20 najlepszych miast z liczbami, posortowane malejąco według liczby |
| `byServiceArea` | Obszary obsługi z liczbami, posortowane malejąco według liczby |

#### Tablica Locations

Każdy obiekt lokalizacji dostarcza danych do znaczników na mapie. Zdalne elementy o współrzędnych `(0, 0)` są filtrowane, aby uniknąć mylących wyświetleń na mapie.

#### Dane Mapy Ciepła

Tablica par szerokość/długość geograficzna dla wpisów innych niż zdalne, odpowiednia do renderowania map gęstości.

### Źródła danych

Punkt końcowy agreguje dane z trzech równoległych zapytań:

1. **Usługa indeksu lokalizacji** (`getLocationIndexService().getIndexStats()`) -- dostarcza statystyki indeksu
2. **Wpisy indeksu lokalizacji** (`getAllLocationEntries()`) -- dostarcza wszystkie zaindeksowane lokalizacje do obliczeń rozkładów
3. **Repozytorium elementów** (`itemRepository.findAll()`) -- dostarcza dane elementów źródłowych do obliczeń pokrycia

### Obliczanie pokrycia

Procent pokrycia jest obliczany jako:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Element jest liczony jako „posiadający lokalizację", jeśli ma współrzędną szerokości geograficznej lub jest oznaczony jako zdalny (`is_remote: true`).

### Kondycja indeksu

Kondycja indeksu porównuje liczbę wpisów innych niż zdalne w indeksie lokalizacji z oczekiwaną liczbą wynikającą z danych źródłowych:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Gdy `synced` ma wartość false, administratorzy powinni rozważyć przebudowę indeksu lokalizacji za pomocą punktu końcowego `/api/admin/location-index`.

| Status | Warunek |
|---|---|
| 401 | Brak uwierzytelnienia jako administrator |
| 500 | Wewnętrzny błąd serwera |

**Źródło:** `template/app/api/admin/geo-analytics/route.ts`
