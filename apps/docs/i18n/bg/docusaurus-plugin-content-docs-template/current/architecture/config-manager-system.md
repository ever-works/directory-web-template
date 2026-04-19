---
id: config-manager-system
title: "Система за управление на конфигурацията"
sidebar_label: "Система за управление на конфигурацията"
sidebar_position: 41
---

# Система за управление на конфигурацията

## Преглед

Системата Config Manager предоставя два допълващи се конфигурационни слоя: клас **ConfigManager** (`lib/config-manager.ts`) за управление на YAML-базиран конфигурационен файл на съдържание (`config.yml`) с постоянство, поддържано от Git, и **ConfigService** (`lib/config/`) за валидиране и достъп до конфигурация на приложения, базирана на променлива на средата с Зод схеми. Заедно те покриват както настройките за редактиране по време на изпълнение, така и конфигурацията на средата по време на внедряване.

## Архитектура

Системата е разделена на две отделни подсистеми:

### ConfigManager (базиран на YAML, с възможност за редактиране по време на изпълнение)

`lib/config-manager.ts` управлява файла `config.yml` в директорията `.content/` (клониран от хранилището на данни). Той чете и записва YAML конфигурация и автоматично извършва и изпраща промени в хранилището на Git с помощта на `isomorphic-git`. Това се използва за настройки, които администраторите могат да променят по време на изпълнение (страниране, навигация, горен/долен колонтитул).

### ConfigService (базиран на околната среда, валидиран при стартиране)

`lib/config/` предоставя валидиран от Zod сингълтон, който чете всички променливи на средата при стартиране и ги организира във въведени секции: ядро, удостоверяване, имейл, плащане, анализи и интеграции. Включва флагове за функции, помощни програми за откриване на среда и експорти, които могат да се разклащат в дърво.

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

## Справка за API

### ConfigManager (`lib/config-manager.ts`)

#### Видове

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

#### `configManager` (Сингълтън)

Експортираният по подразбиране единичен екземпляр на `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Връща пълния конфигурационен обект, обединявайки съдържанието на файла със стойностите по подразбиране.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Връща стойност на конфигурация от най-високо ниво по ключ.

#### `configManager.getNestedValue(keyPath: string): any`

Връща вложена конфигурационна стойност с помощта на точкова нотация (напр. `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Актуализира ключ от най-високо ниво и продължава във файл + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Актуализира вложен ключ с помощта на точкова нотация. Включва прототип за защита от замърсяване.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Удобен метод за актуализиране на настройките за страниране.

#### `configManager.getPaginationConfig(): PaginationConfig`

Връща текущата конфигурация за страниране.

### ConfigService (`lib/config/config-service.ts`)

#### `configService` (Сингълтън)

Само за сървър сингълтън, който валидира всички променливи на средата при стартиране.

|Собственост|Тип|Описание|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL адреси, информация за сайта, база данни|
|`configService.auth`|`AuthConfig`|Тайни, OAuth доставчици|
|`configService.email`|`EmailConfig`|SMTP, Повторно изпращане, Novu|
|`configService.payment`|`PaymentConfig`|Stripe, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Флагове за функции (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Функциите (оценки, коментари, любими, избрани елементи, анкети) са активирани, когато `DATABASE_URL` е конфигуриран.

#### Помощни програми за околната среда (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Подробности за изпълнението

**Опашка за операции на Git**: `ConfigManager` използва серийна опашка с модел на mutex, за да предотврати едновременни операции на Git. Когато се извика `writeConfig()`, файлът се записва незабавно и Git commit/push се поставя на опашка. Ако Git операциите са неуспешни, запазването на файла все още е успешно.

**Мързеливо заредени Git зависимости**: `isomorphic-git` и неговият HTTP модул се зареждат лениво чрез динамичен `import()` с единичен шаблон, за да се избегнат проблеми с групирането и да се предотврати дублиращо се импортиране.

**Защита от замърсяване на прототип**: Методът `updateNestedKey()` проверява за ключове `__proto__`, `constructor` и `prototype` на всяко ниво на пътя, за да предотврати атаки на замърсяване на прототип.

**Проверка при стартиране**: `ConfigService` валидира всички променливи на средата с помощта на Zod схеми по време на първото импортиране. Невалидната конфигурация причинява неуспешно стартиране с описателни съобщения за грешка. Схемите използват `.catch()` манипулатори за елегантно деградиране на незадължителни полета.

**Налагане само на сървъра**: `config-service.ts` импортира `'server-only'`, за да предотврати случайно включване в клиентски пакети. Безопасната за клиента конфигурация се експортира отделно от `lib/config/client.ts`.

## Конфигурация

### Променливи на средата на ConfigManager

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`DATA_REPOSITORY`|да|URL адрес на Git хранилище за съдържание|
|`GH_TOKEN`|За Git push|Токен за достъп до GitHub|
|`GITHUB_BRANCH`|не|Име на клон (по подразбиране: `main`)|
|`GIT_NAME`|не|Име на изпълнител (по подразбиране: `Website Bot`)|
|`GIT_EMAIL`|не|Имейл адрес на комитер (по подразбиране: `website@ever.works`)|

### Променливи на средата на ConfigService

Вижте `.env.example` за пълния списък. Ключовите раздели включват `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` и други, валидирани от схемите на Zod.

## Примери за използване

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

## Най-добри практики

- Използвайте `configManager` за настройки, които трябва да бъдат променени по време на изпълнение от администраторите без повторно разполагане.
- Използвайте `configService` за конфигурация по време на внедряване, която трябва да бъде валидирана при стартиране.
- Импортирайте конфигурация, безопасна за клиента, от `@/lib/config/client` в клиентските компоненти, никога от основния експорт на варела.
- Винаги обработвайте връщането `Promise<boolean>` от `updateKey` и `updateNestedKey`, за да откриете грешки при запис.
- Използвайте флагове на функции за елегантно влошаване на функционалността, когато незадължителните зависимости (като базата данни) не са конфигурирани.

## Свързани модули

- [Cache System](./cache-system) -- Използва `CACHE_TAGS.CONFIG` за кеширане на конфигурацията
- [Система за охрана](./guards-system-deep-dive) -- Консумира конфигурация на план/функция
- [Библиотека със съдържание](/template/architecture/content-library) -- Резолюция на пътя на съдържанието, използвана от ConfigManager
