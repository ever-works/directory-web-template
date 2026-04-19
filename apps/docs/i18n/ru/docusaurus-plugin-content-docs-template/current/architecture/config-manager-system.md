---
id: config-manager-system
title: "Система диспетчера конфигурации"
sidebar_label: "Система диспетчера конфигурации"
sidebar_position: 41
---

# Система диспетчера конфигурации

## Обзор

Система Config Manager предоставляет два взаимодополняющих уровня конфигурации: класс **ConfigManager** (`lib/config-manager.ts`) для управления файлом конфигурации контента на основе YAML (`config.yml`) с сохранением на основе Git и **ConfigService** (`lib/config/`) для проверки и доступа к конфигурации приложения на основе переменных среды с помощью схем Zod. Вместе они охватывают как параметры, редактируемые во время выполнения, так и конфигурацию среды во время развертывания.

## Архитектура

Система разделена на две отдельные подсистемы:

### ConfigManager (на основе YAML, редактируемый во время выполнения)

`lib/config-manager.ts` управляет файлом `config.yml` внутри каталога `.content/` (клонированным из хранилища данных). Он считывает и записывает конфигурацию YAML, а также автоматически фиксирует и отправляет изменения в репозиторий Git, используя `isomorphic-git`. Используется для настроек, которые администраторы могут изменять во время выполнения (нумерация страниц, навигация, верхний/нижний колонтитул).

### ConfigService (на основе среды, проверенный при запуске)

`lib/config/` предоставляет проверенный Zod синглтон, который считывает все переменные среды при запуске и организует их в типизированные разделы: ядро, аутентификация, электронная почта, оплата, аналитика и интеграция. Он включает в себя флаги функций, утилиты определения среды и экспорт с возможностью встряхивания дерева.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## Справочник по API

### Менеджер конфигураций (`lib/config-manager.ts`)

#### Типы

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (Синглтон)

Экспортируемый по умолчанию одноэлементный экземпляр `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Возвращает полный объект конфигурации, объединяя содержимое файла со значениями по умолчанию.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Возвращает значение конфигурации верхнего уровня по ключу.

#### `configManager.getNestedValue(keyPath: string): any`

Возвращает вложенное значение конфигурации, используя точечную запись (например, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Обновляет ключ верхнего уровня и сохраняется в файле + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Обновляет вложенный ключ, используя точечную запись. Включает защиту от загрязнения прототипа.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Удобный способ обновления настроек пагинации.

#### `configManager.getPaginationConfig(): PaginationConfig`

Возвращает текущую конфигурацию нумерации страниц.

### Служба конфигурации (`lib/config/config-service.ts`)

#### `configService` (Синглтон)

Синглтон только для сервера, который проверяет все переменные среды при запуске.

|Недвижимость|Тип|Описание|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL-адреса, информация о сайте, база данных|
|`configService.auth`|`AuthConfig`|Секреты, провайдеры OAuth|
|`configService.email`|`EmailConfig`|SMTP, повторная отправка, новая|
|`configService.payment`|`PaymentConfig`|Полоса, LemonSqueezy, Полярный|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Рекапча|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Флаги функций (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Функции (рейтинги, комментарии, избранное, избранные элементы, опросы) включены, если настроен `DATABASE_URL`.

#### Утилиты окружающей среды (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Детали реализации

**Очередь операций Git**: `ConfigManager` использует последовательную очередь с шаблоном мьютекса для предотвращения одновременных операций Git. При вызове `writeConfig()` файл сохраняется немедленно, а фиксация/отправка Git ставится в очередь. Если операции Git завершатся неудачно, сохранение файла все равно будет успешным.

**Зависимости Git с отложенной загрузкой**: `isomorphic-git` и его HTTP-модуль загружаются лениво через динамический `import()` с одноэлементным шаблоном, чтобы избежать проблем с объединением и предотвращения дублирования импорта.

**Защита от загрязнения прототипа**: метод `updateNestedKey()` проверяет наличие ключей `__proto__`, `constructor` и `prototype` на каждом уровне пути, чтобы предотвратить атаки на прототип с загрязнением.

**Проверка при запуске**: `ConfigService` проверяет все переменные среды с использованием схем Zod во время первого импорта. Неверная конфигурация приводит к сбою запуска с описательными сообщениями об ошибках. Схемы используют обработчики `.catch()` для плавной деградации необязательных полей.

**Применение только на сервере**: `config-service.ts` импортирует `'server-only'`, чтобы предотвратить случайное включение в клиентские пакеты. Клиентобезопасная конфигурация экспортируется отдельно из `lib/config/client.ts`.

## Конфигурация

### Переменные среды ConfigManager

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Да|URL-адрес репозитория Git для контента|
|`GH_TOKEN`|Для нажатия Git|Токен доступа GitHub|
|`GITHUB_BRANCH`|Нет|Название филиала (по умолчанию: `main`)|
|`GIT_NAME`|Нет|Имя коммиттера (по умолчанию: `Website Bot`)|
|`GIT_EMAIL`|Нет|Электронная почта коммиттера (по умолчанию: `website@ever.works`)|

### Переменные среды ConfigService

Полный список см. в `.env.example`. Ключевые разделы включают `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` и другие, проверенные схемами Zod.

## Примеры использования

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Лучшие практики

- Используйте `configManager` для настроек, которые администраторы должны изменить во время выполнения без повторного развертывания.
- Используйте `configService` для конфигурации времени развертывания, которая должна проверяться при запуске.
- Импортируйте конфигурацию, безопасную для клиента, из `@/lib/config/client` в клиентских компонентах, а не из основного экспорта.
- Всегда обрабатывайте возврат `Promise<boolean>` от `updateKey` и `updateNestedKey` для обнаружения ошибок записи.
- Используйте флаги функций, чтобы корректно снизить функциональность, если дополнительные зависимости (например, база данных) не настроены.

## Связанные модули

- [Система кэширования](./cache-system) — использует `CACHE_TAGS.CONFIG` для кэширования конфигурации.
- [Guards System](./guards-system-deep-dive) — использует конфигурацию плана/функции.
- [Библиотека контента](/template/architecture/content-library) — разрешение пути к содержимому, используемое ConfigManager.
