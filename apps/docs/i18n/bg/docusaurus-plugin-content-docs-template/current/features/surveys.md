---
id: surveys
title: Система за проучвания
sidebar_label: Проучвания
sidebar_position: 11
---

# Система за анкети

Шаблонът Ever Works включва вградена система за проучвания, която поддържа както глобални проучвания (обратна връзка за целия сайт), така и проучвания за конкретни елементи (прикачени към отделни елементи от директорията). Проучванията се управляват чрез таблото за управление на администратора и отговорите се събират от удостоверени потребители.

## Архитектура

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Типове анкети

| Тип | Описание | Случай на употреба |
|------|-------------|----------|
| **Глобален** | Анкета за целия сайт, необвързана с нито един елемент | Обща обратна връзка, NPS проучвания, потребителска удовлетвореност |
| **Специфичен артикул** | Свързан с конкретен артикул чрез `itemId` | Отзиви за продукти, прегледи на услуги, заявки за функции |

## SurveyService

Класът `SurveyService` ( `lib/services/survey.service.ts` ) управлява цялата бизнес логика. Това е услуга само от страна на сървъра (не импортирайте в клиентски компоненти).

### CRUD операции

| Метод | Описание |
|--------|-------------|
| `create(data)` | Създайте ново проучване с автоматично генериран охлюв |
| `getOne(id)` | Вземете проучване по ID |
| `getBySlug(slug)` | Вземете проучване от удобен за URL охлюв |
| `getMany(filters?, userId?)` | Списък на анкети с пагинация, филтриране и статус на завършване |
| `update(id, data)` | Актуализирайте полетата на анкетата и управлявайте преходите на състоянието |
| `delete(id)` | Изтриване на анкетата (блокирана, ако има отговори) |

### Операции за отговор

| Метод | Описание |
|--------|-------------|
| `submitResponse(data)` | Изпратете отговор на анкетата (проверява анкетата е публикувана) |
| `getResponses(surveyId, filters?)` | Вземете пагинирани отговори за анкета |
| `getResponseById(id)` | Получете един отговор |

### Генериране на охлюв

Проучванията се генерират автоматично от заглавието с поддръжка на Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

Услугата гарантира уникалност на охлюва чрез добавяне на брояч, ако бъде открит сблъсък.

## Жизнен цикъл на проучването

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Статус | Описание |
|--------|-------------|
| `draft` | Анкетата се редактира, не се вижда от потребителите |
| `published` | Анкетата е на живо и приема отговори |
| `closed` | Анкетата вече не приема отговори |

Преходите на състоянието актуализират времеви клеймца на метаданни:

- Задаване на статус на `published` задава `publishedAt` - Задаване на статус на `closed` задава `closedAt` ## Структура на данните от проучването

Проучванията използват дефиниция на въпрос, базирана на JSON, съхранена в колона `surveyJson` . Това позволява гъвкави структури на проучването без промени в схемата.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Структура на отговора на проучването

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Управление на администратора

Страниците с анкети на администраторите предоставят пълен интерфейс за управление на жизнения цикъл:

### Административни маршрути

| Маршрут | Описание |
|-------|-------------|
| `/admin/surveys` | Списък с анкети с раздели за състояние |
| `/admin/surveys/create` | Нов формуляр за създаване на анкета |
| `/admin/surveys/[slug]/edit` | Редактиране на съществуваща анкета |
| `/admin/surveys/[slug]/preview` | Преглед на анкетата преди публикуване |
| `/admin/surveys/[slug]/responses` | Вижте и анализирайте отговорите |

### Административни възможности

- **Създавайте анкети** със заглавие, описание, тип и JSON въпрос
- **Редактиране на анкети** в чернова или публикувано състояние
- **Преглед** преди публикуване, за да проверите външния вид
- **Публикуване/затваряне** на анкети за контрол на събирането на отговори
- **Преглед на отговорите** с филтриране и пагиниране
- **Изтриване на анкети** (само ако не са събрани отговори)

Методът `getMany` поддържа ефективно запитване с:

- **Отчитане на отговорите** чрез SQL JOINs (единична заявка, без N+1)
- **Състояние на завършване** за потребител (показва дали текущият потребител вече е отговорил)
- **Пагинация** с параметри за страница/лимит
- **Филтриране** по статус и тип

## Обработка на грешки

Услугата включва надеждна обработка на грешки за често срещани проблеми с базата данни:

| Състояние на грешка | Поведение |
|----------------|----------|
| Таблицата не е намерена | Изчистете съобщението: „Изпълнете миграции на база данни“ |
| Връзката е отказана | „Неуспешна връзка с базата данни“ |
| DATABASE_URL липсва | „Базата данни не е конфигурирана“ |
| Проучването не е намерено | Грешка в стил 404 |
| Проучването не е публикувано | „Проучването е [състояние] и не приема отговори“ |
| Изтриване с отговори | „Не може да се изтрие анкета с N отговора“ |

## Флагове за функции

Проучванията се контролират от системата за флагове на функции. Флагът `surveys` се активира автоматично, когато `DATABASE_URL` е конфигуриран:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Използване от страна на клиента

Клиентските компоненти използват обвивката на клиента на API вместо директно услугата:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## E2E тестване

Проучванията са обхванати от множество E2E тестови файлове:

- `e2e/tests/admin/surveys.spec.ts` -- Работни процеси за управление на администратора
- `e2e/tests/public/surveys.spec.ts` -- Показване и подаване на публично проучване
- `e2e/page-objects/admin/surveys.page.ts` -- Обект на страница за проучване на администратора

## Свързани файлове

- `lib/services/survey.service.ts` -- Услуга бизнес логика
- `lib/db/schema.ts` -- `surveys` и `survey_responses` дефиниции на таблици
- `lib/db/queries/` -- Заявки за база данни от проучвания
- `lib/types/survey.ts` -- Типови дефиниции на TypeScript
- `lib/api/survey-api.client.ts` -- Обвивка на API от страна на клиента
- `app/[locale]/admin/surveys/` -- Административни страници
- `components/admin/` -- Компоненти на потребителския интерфейс на администратора
- `e2e/tests/admin/surveys.spec.ts` -- Admin E2E тестове
- `e2e/tests/public/surveys.spec.ts` -- Публични E2E тестове
