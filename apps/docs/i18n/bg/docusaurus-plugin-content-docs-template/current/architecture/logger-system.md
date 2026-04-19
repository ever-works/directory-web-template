---
id: logger-system
title: "Logger System"
sidebar_label: "Logger System"
sidebar_position: 44
---

# Logger System

## Преглед

Системата Logger предоставя лека, съобразена с околната среда помощна програма за регистриране за последователен изход на журнал в приложението. Той поддържа четири нива на регистрационни файлове (DEBUG, INFO, WARN, ERROR), екземпляри на регистър с контекстен обхват и специфично за средата форматиране -- стилизиран конзолен изход в браузъра по време на разработка и обикновен JSON-форматиран изход в Node.js и производствени среди.

## Архитектура

Модулът (`lib/logger.ts`) експортира два елемента:

- **`logger`** -- Единичен екземпляр по подразбиране без контекстен етикет, подходящ за регистриране с общо предназначение.
- **`Logger`** (клас) -- Самият клас за създаване на екземпляри на контекстно регистриране, обхванати от конкретни модули или функции.

Логерът следва проста стратегия за филтриране: в производството (`NODE_ENV !== 'development'`) се излъчват само съобщения WARN и ERROR. В разработката всички нива се регистрират. Това гарантира, че изходът за подробно отстраняване на грешки не изтича в производствените среди.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Справка за API

### Износ

#### `logger` (Сингълтън)

Предварително инстанциран `Logger` екземпляр без контекст. Използвайте за бързо регистриране без обхват.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Клас)

##### `static create(context: string): Logger`

Фабричен метод за създаване на регистратор с контекстен обхват. Контекстният низ се появява като префикс във всички съобщения в журнала.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Регистрира съобщение на ниво отстраняване на грешки. Емитира се само в процес на разработка.

##### `info(message: string, data?: any): void`

Регистрира информационно съобщение. Емитира се само в процес на разработка.

##### `warn(message: string, data?: any): void`

Записва предупредително съобщение. Излъчва се във всички среди.

##### `error(message: string, error?: any): void`

Записва съобщение за грешка. Ако параметърът `error` е `Error` екземпляр, регистраторът автоматично извлича `message`, `stack` и `name` свойства. Излъчва се във всички среди.

##### `api(method: string, url: string, data?: any): void`

Удобен метод за регистриране на API заявки. Делегати на `debug()` със структурирани данни. Само развитие.

##### `performance(label: string, duration: number): void`

Удобен метод за регистриране на показатели за ефективност. Записва етикета и продължителността в милисекунди. Само развитие.

### Вътрешни типове

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Подробности за изпълнението

**Откриване на среда**: Логерът проверява `process.env.NODE_ENV === 'development'` по време на изграждането и кешира резултата. Това избягва повтарящи се търсения на среда при всяко извикване на журнал.

**Стил на браузъра**: Когато се изпълнява в браузъра (`typeof window !== 'undefined'`) в режим на разработка, съобщенията в журнала се стилизират с помощта на `%c` CSS директиви:

|Ниво|Цвят|
|-------|-------|
|ОТСТРАНЯВАНЕ НА ГРЕШКИ|`#6366f1` (индиго)|
|ИНФО|`#3b82f6` (синьо)|
|ПРЕДУПРЕЖДЕНИЕ|`#f59e0b` (кехлибарено)|
|ГРЕШКА|`#ef4444` (червен)|

**Node.js изход**: В Node.js среда или производство съобщенията се форматират като обикновени низове с JSON-сериализирани данни (красиво отпечатани с отстъп от 2 интервала).

**Извличане на грешки**: Методът `error()` открива `Error` екземпляри и извлича `errorMessage`, `stack` и `name` в обект със структуриран данни за по-лесно отстраняване на грешки.

## Конфигурация

Логерът не изисква конфигурация. Поведението му се определя изцяло от `NODE_ENV`:

|`NODE_ENV`|ОТСТРАНЯВАНЕ НА ГРЕШКИ|ИНФО|ПРЕДУПРЕЖДЕНИЕ|ГРЕШКА|
|------------|-------|------|------|-------|
|`development`|да|да|да|да|
|`production`|не|не|да|да|
|`test`|не|не|да|да|

## Примери за използване

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Най-добри практики

- Създавайте регистратори с обхват на контекста за всеки модул или област с функции, като използвате `Logger.create('ModuleName')`, за да направите регистрационните файлове лесни за филтриране.
- Използвайте `debug()` за подробно проследяване, което никога не трябва да се появява в производството; използвайте `info()` за забележителни събития.
- Винаги предавайте `Error` обекти (не низове) към метода `error()`, така че следите на стека да се улавят автоматично.
- Използвайте метода `api()` за регистриране на HTTP заявки, за да поддържате последователна структура на журнала в извикванията на API.
- Не разчитайте на регистратора за наблюдение в производството; интегрирайте с подходяща платформа за наблюдение (PostHog, Sentry) за проследяване на производствени грешки.

## Свързани модули

- [API клиентски слой](/template/architecture/api-client-layer) -- Използва регистратора за регистриране на заявки/отговори
- [Config Manager System](./config-manager-system) -- ConfigService регистрира резултатите от проверката при стартиране
