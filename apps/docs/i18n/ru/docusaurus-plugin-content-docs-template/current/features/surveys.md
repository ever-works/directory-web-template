---
id: surveys
title: Система опросов
sidebar_label: Опросы
sidebar_position: 11
---

# Система опросов

Шаблон Ever Works включает встроенную систему опросов, которая поддерживает как глобальные опросы (обратная связь по всему сайту), так и опросы по конкретным элементам (прикрепленные к отдельным элементам каталога). Опросы управляются через панель администратора, а ответы собираются от аутентифицированных пользователей.

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

## Типы опросов

| Тип | Описание | Вариант использования |
|------|-------------|----------|
| **Глобальный** | Опрос всего сайта, не привязанный к какому-либо элементу | Общие отзывы, опросы NPS, удовлетворенность пользователей |
| **Для конкретного товара** | Связан с конкретным элементом через `itemId` | Отзывы о продуктах, обзоры услуг, пожелания по функциям |

## Обзорная служба

Класс `SurveyService` ( `lib/services/survey.service.ts` ) обрабатывает всю бизнес-логику. Это служба только на стороне сервера (не импортируйте ее в клиентские компоненты).

### CRUD-операции

| Метод | Описание |
|--------|-------------|
| `create(data)` | Создайте новый опрос с автоматически созданным ярлыком |
| `getOne(id)` | Получить опрос по ID |
| `getBySlug(slug)` | Получите опрос по URL-адресу |
| `getMany(filters?, userId?)` | Список опросов с нумерацией страниц, фильтрацией и статусом завершения |
| `update(id, data)` | Обновите поля опроса и обработайте переходы статусов |
| `delete(id)` | Удалить опрос (заблокировано, если есть ответы) |

### Операции реагирования

| Метод | Описание |
|--------|-------------|
| `submitResponse(data)` | Отправьте ответ на опрос (подтверждает публикацию опроса) |
| `getResponses(surveyId, filters?)` | Получите ответы на опросы с разбивкой по страницам |
| `getResponseById(id)` | Получите один ответ |

### Генерация слизней

Ссылки на опросы автоматически генерируются из заголовка с поддержкой Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

Служба обеспечивает уникальность пула, добавляя счетчик в случае обнаружения коллизии.

## Жизненный цикл опроса

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Статус | Описание |
|--------|-------------|
| `draft` | Опрос редактируется, не виден пользователям |
| `published` | Опрос уже запущен и принимаются ответы |
| `closed` | Опрос больше не принимает ответы |

Переходы состояний обновляют метки времени метаданных:

- Установка статуса на `published` устанавливает `publishedAt` - Установка статуса на `closed` устанавливает `closedAt` ## Структура данных опроса

В опросах используется определение вопроса на основе JSON, хранящееся в столбце `surveyJson` . Это позволяет создавать гибкие структуры опросов без изменения схемы.

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

### Структура ответов на опрос

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

## Административное управление

Страницы опросов для администраторов предоставляют полный интерфейс управления жизненным циклом:

### Маршруты администратора

| Маршрут | Описание |
|-------|-------------|
| `/admin/surveys` | Список опросов с вкладками статуса |
| `/admin/surveys/create` | Новая форма создания опроса |
| `/admin/surveys/[slug]/edit` | Редактировать существующий опрос |
| `/admin/surveys/[slug]/preview` | Предварительный просмотр опроса перед публикацией |
| `/admin/surveys/[slug]/responses` | Просмотр и анализ ответов |

### Возможности администратора

- **Создавайте опросы** с названием, описанием, типом и вопросом в формате JSON.
- **Редактирование опросов** в черновом или опубликованном состоянии.
- **Предварительный просмотр** перед публикацией для проверки внешнего вида.
- **Публиковать/закрывать** опросы для контроля сбора ответов.
- **Просмотр ответов** с фильтрацией и нумерацией страниц.
- **Удалить опросы** (только если ответы не получены)

Метод `getMany` поддерживает эффективный запрос с помощью:

- **Подсчет ответов** через SQL JOIN (одиночный запрос, без N+1)
- **Статус завершения** для каждого пользователя (показывает, ответил ли уже текущий пользователь)
- **Разбиение на страницы** с параметрами количества страниц и лимита.
- **Фильтрация** по статусу и типу

## Обработка ошибок

Служба включает надежную обработку ошибок для распространенных проблем с базой данных:

| Состояние ошибки | Поведение |
|----------------|----------|
| Таблица не найдена | Очистить сообщение: «Выполнить миграцию базы данных» |
| В соединении отказано | «Не удалось подключиться к базе данных» |
| DATABASE_URL отсутствует | «База данных не настроена» |
| Опрос не найден | Ошибка стиля 404 |
| Опрос не опубликован | «Опрос находится в [статусе] и ответы не принимаются» |
| Удалить с ответами | «Невозможно удалить опрос с N ответами» |

## Флаги функций

Опросы контролируются системой флагов функций. Флаг `surveys` автоматически включается при настройке `DATABASE_URL` :

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Использование на стороне клиента

Клиентские компоненты используют оболочку клиента API вместо службы напрямую:

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

## E2E-тестирование

Опросы покрываются несколькими тестовыми файлами E2E:

- `e2e/tests/admin/surveys.spec.ts` -- Рабочие процессы административного управления
- `e2e/tests/public/surveys.spec.ts` -- Отображение и отправка общественного опроса
- `e2e/page-objects/admin/surveys.page.ts` -- Объект страницы опроса администратора

## Связанные файлы

- `lib/services/survey.service.ts` -- Служба бизнес-логики
- `lib/db/schema.ts` -- определения таблиц `surveys` и `survey_responses` - `lib/db/queries/` -- Запросы к базе данных опросов
- `lib/types/survey.ts` -- Определения типов TypeScript
- `lib/api/survey-api.client.ts` -- Оболочка клиентского API
- `app/[locale]/admin/surveys/` -- Страницы администратора
- `components/admin/` -- Компоненты пользовательского интерфейса администратора
- `e2e/tests/admin/surveys.spec.ts` -- Административные тесты E2E
- `e2e/tests/public/surveys.spec.ts` -- Публичные E2E-тесты
