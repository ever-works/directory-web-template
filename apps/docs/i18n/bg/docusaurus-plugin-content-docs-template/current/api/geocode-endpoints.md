---
id: geocode-endpoints
title: "Geocode API Reference"
sidebar_label: "Геокод"
sidebar_position: 50
---

# Geocode API Reference

## Преглед

Крайните точки на Geocode осигуряват възможности за геокодиране напред (адрес към координати) и обратно геокодиране (координати към адрес). Резултатите се кешират за 15 минути, за да се намалят външните извиквания на API. Тези крайни точки изискват администраторско удостоверяване, за да предотвратят злоупотреба с разходите на основните услуги за геокодиране на Mapbox/Google.

## Крайни точки

### POST /api/геокод

Преобразува адрес в координати (напред геокодиране) или координати в адрес (обратно геокодиране). Основният текст на заявката определя коя операция се изпълнява въз основа на това дали са предоставени полета `address` или `latitude`/`longitude`.

#### Препращане на геокодиране (адрес към координати)

**Заявка**
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

**Отговор**
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

#### Обратно геокодиране (координати към адрес)

**Заявка**
```typescript
{
  latitude: number;         // -90 to 90, required
  longitude: number;        // -180 to 180, required
  options?: {
    language?: string;        // ISO 639-1 language code
  };
}
```

**Отговор**
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

### ВЗЕМЕТЕ /api/геокод

Връща състоянието на услугата за геокодиране, включително кои доставчици са конфигурирани и кеш статистика.

**Заявка**

Не се изисква тяло на заявката. Удостоверяване чрез сесийна бисквитка.

**Отговор**
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

## Удостоверяване

- **GET /api/geocode**: Изисква удостоверена сесия (всеки потребител).
- **POST /api/geocode**: Изисква удостоверена сесия с **административна роля**. Потребителите, които не са администратори, получават отговор `403 Forbidden`. Това ограничение предотвратява злоупотреба с разходите за API.

## Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Невалидни данни в заявката -- неправилно образуван адрес, невалидни координати или неуспешно валидиране на схемата|
| 401 |Неоторизиран -- няма удостоверена сесия|
| 403 |Забранено -- изисква се администраторски достъп (само POST)|
| 404 |Няма намерени резултати от геокодиране за дадения адрес или координати|
| 503 |Функциите за местоположение са деактивирани в настройките или услугата за геокодиране не е конфигурирана|

## Ограничаване на скоростта

Резултатите се кешират за 15 минути (TTL 900 000 ms) с максимален размер на кеша от 1000 записа. Всички заявки за геокодиране се регистрират за целите на проследяването на разходите.

## Свързани крайни точки

- [Крайни точки на местоположение](./location-endpoints) -- Търсене на местоположение, градове, държави и координати
