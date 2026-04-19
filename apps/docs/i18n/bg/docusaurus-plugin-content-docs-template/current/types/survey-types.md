---
id: survey-types
title: Дефиниции на типа анкета
sidebar_label: Видове анкети
sidebar_position: 6
---

# Дефиниции на типа анкета

**Източник:** `lib/types/survey.ts`

Този модул дефинира всички дефиниции на споделен тип за анкети и отговори на анкети. Той служи като единствен източник на истина за структурите на данни, свързани с проучването, използвани от Survey Service, Survey API Client и API манипулатори на маршрути.

## Енуми

### `SurveyTypeEnum`

Определя дали проучването се прилага глобално или е обхванато от конкретен елемент.

```typescript
enum SurveyTypeEnum {
  GLOBAL = 'global',
  ITEM = 'item',
}
```

|Стойност|Описание|
|-------|-------------|
|`GLOBAL`|Проучването изглежда за целия сайт, без да е обвързано с конкретен елемент|
|`ITEM`|Проучването е свързано с конкретен артикул (чрез `itemId`)|

### `SurveyStatusEnum`

Състояния на жизнения цикъл за проучване.

```typescript
enum SurveyStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}
```

|Стойност|Описание|
|-------|-------------|
|`DRAFT`|Анкетата се създава/редактира и не се вижда от респондентите|
|`PUBLISHED`|Проучването е на живо и приема отговори|
|`CLOSED`|Проучването вече не приема отговори, но данните се запазват|

## Интерфейси

### `CreateSurveyData`

Необходими данни за създаване на ново проучване.

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

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`title`|`string`|да|Показване на заглавието на анкетата|
|`description`|`string`|не|Описание/подзаглавие по избор|
|`type`|`SurveyTypeEnum`|да|Дали проучването е глобално или с обхват на елемент|
|`itemId`|`string`|не|ID на артикул (изисква се, когато `type` е `ITEM`)|
|`status`|`SurveyStatusEnum`|не|Първоначално състояние (по подразбиране `DRAFT`)|
|`surveyJson`|`any`|да|JSON дефиниция, съвместима с Survey.js|

### `UpdateSurveyData`

Данни за актуализиране на съществуващо проучване. Всички полета не са задължителни.

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

Данни за изпращане на отговор на анкета от респондент.

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

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`surveyId`|`string`|да|ID на анкетата, на която се отговаря|
|`userId`|`string`|не|ID на удостоверен потребител (нулево за анонимен)|
|`itemId`|`string`|не|Контекст на елемент за проучвания с обхват на елемент|
|`data`|`any`|да|Обект с данни за отговор Survey.js|
|`ipAddress`|`string`|не|IP на респондент за анализ/дедупликация|
|`userAgent`|`string`|не|Низ на потребителски агент на браузъра|

### `SurveyFilters`

Филтри за заявки за анкети в крайни точки на списък.

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

Филтри за търсене на отговори на анкетата.

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
|`itemId`|`string?`|Филтриране на отговорите по елемент|
|`userId`|`string?`|Филтриране на отговорите по потребител|
|`startDate`|`string?`|ISO низ за дата за начало на диапазона|
|`endDate`|`string?`|ISO низ за дата за края на диапазона|
|`page`|`number?`|Номер на страница за пагинация|
|`limit`|`number?`|Резултати на страница|

## Примери за използване

### Създаване на глобално проучване

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

### Създаване на проучване с обхват на елемент

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

### Филтриране на анкети

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

### Изпращане на отговор

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

### Филтриране на отговорите по период от време

```typescript
import type { ResponseFilters } from '@/lib/types/survey';

const responseFilters: ResponseFilters = {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
};
```

## Бележки по дизайна

### Интегриране на Survey.js

Полето `surveyJson` използва типа `any`, за да приеме Survey.js JSON дефиниции. Survey.js е библиотека на трета страна, която дефинира анкетите като JSON обекти, описващи страници, елементи и тяхната конфигурация. Шаблонът съхранява този JSON такъв, какъвто е, и го изобразява с помощта на компонента Survey.js React.

### Жизнен цикъл на проучването

1. **Чернова** - Анкетата е създадена и може да се редактира свободно
2. **Публикувано** - Проучването е на живо; могат да се изпращат отговори
3. **Затворено** - Анкетата спира да приема отговори; съществуващите данни се запазват

### Глобални срещу предметни проучвания

- **Глобални проучвания** (`SurveyTypeEnum.GLOBAL`) се появяват в целия сайт и не са обвързани с никакъв елемент
- **Проучванията на артикули** (`SurveyTypeEnum.ITEM`) се показват на страници с подробности за конкретни артикули и изискват `itemId`

Полето `ItemData.showSurveys` (от `item.ts`) контролира дали секцията с анкети се показва на страница с артикул.

## Свързани типове

- [`ItemData.showSurveys`](./item-types.md) - Контролира видимостта на проучването за всеки артикул
- [`ItemData.action`](./item-types.md) - Действието `'start-survey'` препраща към анкета
