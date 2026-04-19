---
id: geocode-endpoints
title: "Справочник по API геокодирования"
sidebar_label: "Геокодирование"
sidebar_position: 50
---

# Справочник по API геокодирования

## Обзор

Конечные точки геокодирования обеспечивают возможности прямого геокодирования (от координат к координатам) и обратного геокодирования (от координат к адресу). Результаты кэшируются в течение 15 минут, чтобы сократить количество вызовов внешних API. Эти конечные точки требуют аутентификации администратора, чтобы предотвратить злоупотребление расходами на базовые службы геокодирования Mapbox/Google.

## Конечные точки

### POST/api/геокод

Преобразует адрес в координаты (прямое геокодирование) или координаты в адрес (обратное геокодирование). Тело запроса определяет, какая операция выполняется, на основе того, предоставлены ли поля `address` или `latitude`/`longitude`.

#### Прямое геокодирование (адрес по координатам)

**Запрос**
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

**Ответ**
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

**Пример**
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

#### Обратное геокодирование (координаты по адресу)

**Запрос**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**Ответ**
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

**Пример**
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

### ПОЛУЧИТЬ /api/геокод

Возвращает статус службы геокодирования, включая сведения о том, какие поставщики настроены, и статистику кэширования.

**Запрос**

Тело запроса не требуется. Аутентификация через сеансовый cookie.

**Ответ**
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

**Пример**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Аутентификация

- **GET /api/geocode**: требуется сеанс с аутентификацией (любой пользователь).
- **POST /api/geocode**: требуется сеанс с аутентификацией и **ролью администратора**. Пользователи, не являющиеся администраторами, получают ответ `403 Forbidden`. Это ограничение предотвращает злоупотребление стоимостью API.

## Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Неверные данные запроса – неправильный адрес, неверные координаты или сбой проверки схемы.|
| 401 |Неавторизованный – нет аутентифицированного сеанса|
| 403 |Запрещено – требуется доступ администратора (только POST)|
| 404 |Для данного адреса или координат не найдено результатов геокодирования.|
| 503 |Функции определения местоположения отключены в настройках или не настроена служба геокодирования.|

## Ограничение скорости

Результаты кэшируются на 15 минут (TTL 900 000 мс) с максимальным размером кэша 1000 записей. Все запросы на геокодирование регистрируются в журнале аудита для целей отслеживания затрат.

## Связанные конечные точки

- [Конечные точки местоположения](./location-endpoints) — поиск местоположения, городов, стран и координат.
