---
id: location-endpoints
title: "Справочник за API за местоположение"
sidebar_label: "Местоположение"
sidebar_position: 51
---

# Справочник за API за местоположение

## Преглед

Крайните точки на местоположението осигуряват достъп до индекса на пространствено местоположение за елементи в директорията. Те поддържат търсене на елементи по град, държава, базирано на радиус търсене на близост и извличане на координатни данни за изобразяване на карта. Всички крайни точки за местоположение изискват функцията за местоположение да бъде активирана в системните настройки.

## Крайни точки

### GET /api/location/cities

Връща списък с отделни имена на градове от индекса на местоположението.

**Заявка**

Не са необходими параметри.

**Отговор**
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

### GET /api/location/countries

Връща списък с отделни имена на държави от индекса на местоположението.

**Заявка**

Не са необходими параметри.

**Отговор**
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

### GET /api/location/coordinates

Връща координати за всички индексирани елементи, с незадължително филтриране по град или държава. Използва се за изобразяване на маркери на картата. Отдалечените елементи се изключват автоматично.

**Заявка**

|Параметър|Тип|в|Описание|
|-----------|--------|-------|-------------|
|град|низ|заявка|Филтриране по име на град (малки и малки букви)|
|държава|низ|заявка|Филтриране по име на държава (малки и малки букви)|

**Отговор**
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

### GET /api/location/search

Търси артикули по географско местоположение, използвайки близост, базирана на радиус, име на град или име на държава. Връща съвпадащи охлюви за артикули и незадължителна информация за разстоянието.

**Заявка**

|Параметър|Тип|в|Описание|
|-----------|--------|-------|-------------|
|близо до_шир|номер|заявка|Latitude за търсене в радиус|
|near_lng|номер|заявка|Географска дължина за търсене на радиус|
|радиус|номер|заявка|Радиус в км (по подразбиране: 50)|
|град|низ|заявка|Филтриране по име на град|
|държава|низ|заявка|Филтриране по име на държава|

Изисква се поне един параметър за търсене: `near_lat` + `near_lng`, `city` или `country`.

**Отговор**
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

## Удостоверяване

Всички крайни точки за местоположение са **публични** -- не се изисква удостоверяване. Функцията за местоположение обаче трябва да е активирана в системните настройки. Ако функциите за местоположение са деактивирани, всички крайни точки връщат `404` с `"Location features are disabled"`.

## Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Невалидни координати, невалиден радиус или липсващи задължителни параметри за търсене|
| 404 |Функциите за местоположение са деактивирани в системните настройки|
| 500 |Вътрешна грешка в сървъра -- неуспешна заявка в базата данни|

## Ограничаване на скоростта

Към тези крайни точки не се прилага изрично ограничаване на скоростта. Отдалечените/виртуалните елементи се изключват автоматично от резултатите от координатите.

## Свързани крайни точки

- [Геокодиране на крайни точки](./geocode-endpoints) -- Предно и обратно геокодиране (само за администратор)
