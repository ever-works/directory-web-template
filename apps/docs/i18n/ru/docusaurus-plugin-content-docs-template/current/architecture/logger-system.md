---
id: logger-system
title: "Система регистрации"
sidebar_label: "Система регистрации"
sidebar_position: 44
---

# Система регистрации

## Обзор

Система Logger представляет собой легкую, учитывающую окружающую среду утилиту ведения журналов для единообразного вывода журналов во всем приложении. Он поддерживает четыре уровня журнала (DEBUG, INFO, WARN, ERROR), экземпляры средства ведения журнала с контекстной областью и форматирование для конкретной среды — стилизованный вывод консоли в браузере во время разработки и простой вывод в формате JSON в Node.js и производственных средах.

## Архитектура

Модуль (`lib/logger.ts`) экспортирует два элемента:

- **`logger`** — одноэлементный экземпляр по умолчанию без контекстной метки, подходящий для ведения журнала общего назначения.
- **`Logger`** (класс) — сам класс для создания экземпляров контекстного средства ведения журнала, привязанных к конкретным модулям или функциям.

Регистратор использует простую стратегию фильтрации: в рабочей среде (`NODE_ENV !== 'development'`) выдаются только сообщения WARN и ERROR. В разработке все уровни логируются. Это гарантирует, что подробный вывод отладки не попадет в рабочую среду.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Справочник по API

### Экспорт

#### `logger` (Синглтон)

Предварительно созданный экземпляр `Logger` без контекста. Используйте для быстрого ведения журнала без ограничения области действия.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Класс)

##### `static create(context: string): Logger`

Фабричный метод для создания средства ведения журнала с контекстной областью. Строка контекста отображается в качестве префикса во всех сообщениях журнала.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Регистрирует сообщение уровня отладки. Выпускается только в разработке.

##### `info(message: string, data?: any): void`

Регистрирует информационное сообщение. Выпускается только в разработке.

##### `warn(message: string, data?: any): void`

Регистрирует предупреждающее сообщение. Излучается во всех средах.

##### `error(message: string, error?: any): void`

Регистрирует сообщение об ошибке. Если параметр `error` является экземпляром `Error`, средство ведения журнала автоматически извлекает свойства `message`, `stack` и `name`. Излучается во всех средах.

##### `api(method: string, url: string, data?: any): void`

Удобный метод логирования запросов API. Делегирует `debug()` со структурированными данными. Только развитие.

##### `performance(label: string, duration: number): void`

Удобный метод регистрации показателей производительности. Регистрирует метку и продолжительность в миллисекундах. Только развитие.

### Внутренние типы

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

## Детали реализации

**Обнаружение среды**: регистратор проверяет `process.env.NODE_ENV === 'development'` во время создания и кэширует результат. Это позволяет избежать повторного поиска среды при каждом вызове журнала.

**Стиль браузера**: при работе в браузере (`typeof window !== 'undefined'`) в режиме разработки стили сообщений журнала оформляются с помощью директив CSS `%c`:

|Уровень|Цвет|
|-------|-------|
|ОТЛАДКА|`#6366f1` (индиго)|
|ИНФОРМАЦИЯ|`#3b82f6` (синий)|
|ПРЕДУПРЕЖДАТЬ|`#f59e0b` (янтарный)|
|ОШИБКА|`#ef4444` (красный)|

**Вывод Node.js**. В средах Node.js или в рабочей среде сообщения форматируются как простые строки с данными, сериализованными в формате JSON (хорошо напечатанными с отступом в два пробела).

**Извлечение ошибок**: метод `error()` обнаруживает экземпляры `Error` и извлекает `errorMessage`, `stack` и `name` в структурированный объект данных для упрощения отладки.

## Конфигурация

Регистратор не требует настройки. Его поведение полностью определяется `NODE_ENV`:

|`NODE_ENV`|ОТЛАДКА|ИНФОРМАЦИЯ|ПРЕДУПРЕЖДАТЬ|ОШИБКА|
|------------|-------|------|------|-------|
|`development`|Да|Да|Да|Да|
|`production`|Нет|Нет|Да|Да|
|`test`|Нет|Нет|Да|Да|

## Примеры использования

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

## Лучшие практики

- Создавайте средства ведения журнала с контекстной областью для каждого модуля или функциональной области, используя `Logger.create('ModuleName')`, чтобы упростить фильтрацию журналов.
- Используйте `debug()` для детальной трассировки, которая никогда не должна появляться в рабочей среде; используйте `info()` для заметных событий.
- Всегда передавайте объекты `Error` (а не строки) в метод `error()`, чтобы трассировки стека автоматически записывались.
- Используйте метод `api()` для ведения журнала HTTP-запросов, чтобы поддерживать согласованную структуру журнала для вызовов API.
- Не полагайтесь на регистратор для мониторинга в производстве; интеграция с соответствующей платформой наблюдения (PostHog, Sentry) для отслеживания производственных ошибок.

## Связанные модули

- [API Client Layer](/template/architecture/api-client-layer) — использует регистратор для регистрации запросов/ответов.
- [Система диспетчера конфигураций](./config-manager-system) — ConfigService регистрирует результаты проверки при запуске.
