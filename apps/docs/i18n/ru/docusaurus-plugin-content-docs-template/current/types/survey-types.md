---
id: survey-types
title: Определения типов опросов
sidebar_label: Типы опросов
sidebar_position: 6
---

# Определения типов опросов

**Источник:** `lib/types/survey.ts`

Этот модуль определяет все определения общих типов для опросов и ответов на опросы. Он служит единственным источником достоверных данных для структур данных, связанных с опросами, используемых Службой опросов, Клиентом API опроса и обработчиками маршрутов API.

## Перечисления

### `SurveyTypeEnum`

Определяет, применяется ли опрос глобально или ограничивается конкретным элементом.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Значение|Описание|
|-------|-------------|
|`GLOBAL`|Опрос доступен для всего сайта и не привязан к какому-либо конкретному элементу.|
|`ITEM`|Опрос связан с конкретным элементом (через `itemId`)|

### `SurveyStatusEnum`

Состояния жизненного цикла для опроса.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Значение|Описание|
|-------|-------------|
|`DRAFT`|Опрос создается/редактируется и не виден респондентам.|
|`PUBLISHED`|Опрос активен и принимает ответы|
|`CLOSED`|Опрос больше не принимает ответы, но данные сохраняются|

## Интерфейсы

### `CreateSurveyData`

Данные, необходимые для создания нового опроса.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  surveyJson: any;
}
```

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`title`|`string`|Да|Отображение названия опроса|
|`description`|`string`|Нет|Дополнительное описание/подзаголовок|
|`type`|`SurveyTypeEnum`|Да|Является ли опрос глобальным или поэлементным|
|`itemId`|`string`|Нет|Идентификатор товара (требуется, если `type` равен `ITEM`)|
|`status`|`SurveyStatusEnum`|Нет|Исходное состояние (по умолчанию `DRAFT`)|
|`surveyJson`|`any`|Да|Определение JSON, совместимое с Survey.js|

### `UpdateSurveyData`

Данные для обновления существующего опроса. Все поля являются необязательными.

```typescript
interface UpdateSurveyData {
  title?: string;
  slug?: string;
  description?: string;
  status?: SurveyStatusEnum;
  surveyJson?: any;
}
```

### `SubmitResponseData`

Данные для подачи ответа на опрос от респондента.

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;
  itemId?: string;
  data: any;
  ipAddress?: string;
  userAgent?: string;
}
```

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`surveyId`|`string`|Да|Идентификатор опроса, на который ответили|
|`userId`|`string`|Нет|Идентификатор аутентифицированного пользователя (нулевой для анонимного)|
|`itemId`|`string`|Нет|Контекст элемента для опросов на уровне элемента|
|`data`|`any`|Да|Объект данных ответа Survey.js|
|`ipAddress`|`string`|Нет|IP-адрес респондента для аналитики/дедупликации|
|`userAgent`|`string`|Нет|Строка пользовательского агента браузера|

### `SurveyFilters`

Фильтры для запроса опросов в конечных точках списка.

```typescript
interface SurveyFilters {
  type?: SurveyTypeEnum;
  itemId?: string;
  status?: SurveyStatusEnum;
  page?: number;
  limit?: number;
}
```

### `ResponseFilters`

Фильтры для запроса ответов на опросы.

```typescript
interface ResponseFilters {
  itemId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`itemId`|`string?`|Фильтрация ответов по элементу|
|`userId`|`string?`|Фильтрация ответов по пользователю|
|`startDate`|`string?`|Строка даты ISO для начала диапазона|
|`endDate`|`string?`|Строка даты ISO для конца диапазона|
|`page`|`number?`|Номер страницы пагинации|
|`limit`|`number?`|Результаты на странице|

## Примеры использования

### Создание глобального опроса

```typescript
import type { CreateSurveyData } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const surveyData: CreateSurveyData = {
  title: 'User Satisfaction Survey',
  description: 'Help us improve by sharing your experience',
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.DRAFT,
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'satisfaction',
            title: 'How satisfied are you with our platform?',
            rateMin: 1,
            rateMax: 5,
          },
          {
            type: 'comment',
            name: 'feedback',
            title: 'Any additional feedback?',
          },
        ],
      },
    ],
  },
};
```

### Создание опроса по элементам

```typescript
import { SurveyTypeEnum } from '@/lib/types/survey';

const itemSurvey: CreateSurveyData = {
  title: 'Product Review',
  type: SurveyTypeEnum.ITEM,
  itemId: 'my-tool-slug',
  surveyJson: {
    pages: [
      {
        elements: [
          {
            type: 'rating',
            name: 'quality',
            title: 'Rate this product',
          },
        ],
      },
    ],
  },
};
```

### Фильтрация опросов

```typescript
import type { SurveyFilters } from '@/lib/types/survey';
import { SurveyTypeEnum, SurveyStatusEnum } from '@/lib/types/survey';

const filters: SurveyFilters = {
  type: SurveyTypeEnum.GLOBAL,
  status: SurveyStatusEnum.PUBLISHED,
  page: 1,
  limit: 10,
};
```

### Отправка ответа

```typescript
import type { SubmitResponseData } from '@/lib/types/survey';

const response: SubmitResponseData = {
  surveyId: 'survey-uuid-123',
  userId: 'user-uuid-456',
  data: {
    satisfaction: 4,
    feedback: 'The platform is easy to use!',
  },
};
```

### Фильтрация ответов по диапазону дат

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Примечания к проектированию

### Интеграция Survey.js

Поле `surveyJson` использует тип `any` для принятия определений JSON Survey.js. Survey.js — это сторонняя библиотека, которая определяет опросы как объекты JSON, описывающие страницы, элементы и их конфигурацию. Шаблон сохраняет этот JSON как есть и отображает его с помощью компонента Survey.js React.

### Жизненный цикл опроса

1. **Черновик** – опрос создан, и его можно свободно редактировать.
2. **Опубликовано** – опрос уже доступен; ответы можно отправлять
3. **Закрыто** — опрос перестает принимать ответы; существующие данные сохраняются

### Глобальные и предметные опросы

- **Глобальные опросы** (`SurveyTypeEnum.GLOBAL`) отображаются по всему сайту и не привязаны к какому-либо элементу.
- **Опросы по товарам** (`SurveyTypeEnum.ITEM`) отображаются на страницах сведений об определенных товарах и требуют `itemId`

Поле `ItemData.showSurveys` (из `item.ts`) управляет отображением раздела опросов на странице элемента.

## Связанные типы

- [`ItemData.showSurveys`](./item-types.md) — контролирует видимость опроса для каждого элемента.
- [`ItemData.action`](./item-types.md) — действие `'start-survey'` ссылается на опрос.
