---
id: location-endpoints
title: "Справочник по API определения местоположения"
sidebar_label: "Расположение"
sidebar_position: 51
---

# Справочник по API определения местоположения

## Обзор

Конечные точки местоположения предоставляют доступ к индексу пространственного местоположения для элементов в каталоге. Они поддерживают запрос элементов по городу, стране, поиск по радиусу и получение данных координат для рендеринга карты. Для всех конечных точек определения местоположения требуется, чтобы функция определения местоположения была включена в настройках системы.

## Конечные точки

### ПОЛУЧИТЬ /api/location/cities

Возвращает список различных названий городов из индекса местоположения.

**Запрос**

Никаких параметров не требуется.

**Ответ**
```typescript
{
  success: true;
  data: string[];   // Array of city names, e.g. ["San Francisco", "London", "Tokyo"]
}
```

**Пример**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### ПОЛУЧИТЬ /api/location/countries

Возвращает список различных названий стран из индекса местоположения.

**Запрос**

Никаких параметров не требуется.

**Ответ**
```typescript
{
  success: true;
  data: string[];   // Array of country names, e.g. ["United States", "United Kingdom"]
}
```

**Пример**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### ПОЛУЧИТЬ /api/location/coordinates

Возвращает координаты для всех проиндексированных элементов с дополнительной фильтрацией по городу или стране. Используется для рендеринга маркеров карты. Удаленные элементы автоматически исключаются.

**Запрос**

|Параметр|Тип|В|Описание|
|-----------|--------|-------|-------------|
|город|строка|запрос|Фильтровать по названию города (без учета регистра)|
|страна|строка|запрос|Фильтровать по названию страны (без учета регистра)|

**Ответ**
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

**Пример**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### ПОЛУЧИТЬ /api/местоположение/поиск

Ищет объекты по географическому местоположению, используя радиус близости, название города или название страны. Возвращает соответствующие номера элементов и дополнительную информацию о расстоянии.

**Запрос**

|Параметр|Тип|В|Описание|
|-----------|--------|-------|-------------|
|около_широты|номер|запрос|Широта для поиска по радиусу|
|около_lng|номер|запрос|Долгота для поиска радиуса|
|радиус|номер|запрос|Радиус в км (по умолчанию: 50)|
|город|строка|запрос|Фильтровать по названию города|
|страна|строка|запрос|Фильтровать по названию страны|

Требуется хотя бы один параметр поиска: `near_lat` + `near_lng`, `city` или `country`.

**Ответ**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array of matching item slugs
    distances: Record<string, number>;  // Slug-to-distance-km map (radius search only)
  };
}
```

**Пример**
```typescript
// Radius search: items within 25km of San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// City search
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Аутентификация

Все конечные точки местоположения являются **общедоступными** – аутентификация не требуется. Однако функцию определения местоположения необходимо включить в настройках системы. Если функции определения местоположения отключены, все конечные точки возвращают `404` с `"Location features are disabled"`.

## Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Неверные координаты, неверный радиус или отсутствуют необходимые параметры поиска.|
| 404 |Функции определения местоположения отключены в настройках системы.|
| 500 |Внутренняя ошибка сервера — сбой запроса к базе данных.|

## Ограничение скорости

К этим конечным точкам не применяется явное ограничение скорости. Удаленные/виртуальные объекты автоматически исключаются из результатов координат.

## Связанные конечные точки

- [Конечные точки геокода](./geocode-endpoints) – прямое и обратное геокодирование (только администратор)
