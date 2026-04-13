---
id: survey-endpoints-deep-dive
title: "Справочник по API опросов"
sidebar_label: "Опросы (подробное описание)"
sidebar_position: 56
---

# Справочник по API опросов

## Обзор

API опросов обеспечивает полные операции CRUD для опросов и их ответов. Опросы могут быть глобальными или ориентированными на конкретные элементы и поддерживать состояния чернового/опубликованного/закрытого жизненного цикла. Для создания, обновления и удаления опросов требуется проверка подлинности администратора, а общедоступные пользователи могут просматривать опубликованные опросы и отправлять ответы.

## Конечные точки

### ПОЛУЧИТЬ /api/опросы

Получайте опросы с дополнительными фильтрами и нумерацией страниц. Проверяет доступность базы данных перед обработкой.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------- | ----- | --------------------------------------------------------- |
|тип|строка|запрос|Фильтровать по типу: `"global"` или `"item"`|
|идентификатор элемента|строка|запрос|Фильтровать по идентификатору товара|
|статус|строка|запрос|Фильтровать по статусу: `"draft"`, `"published"` или `"closed"`.|
|страница|целое число|запрос|Номер страницы (по умолчанию: 1, минимум: 1)|
|предел|целое число|запрос|Элементов на странице (по умолчанию: 10, мин: 1, макс: 100)|

**Ответ**

```typescript
{
  success: true;
  data: {
    surveys: Array<Survey>;
    total: number;
    totalPages: number;
    page: number;
  }
}
```

**Пример**

```typescript
const response = await fetch(
  "/api/surveys?type=global&status=published&page=1&limit=10",
);
const { data } = await response.json();
// data.surveys = [{ id: "...", title: "User Satisfaction", type: "global", ... }]
```

### POST/api/опросы

Создайте новый опрос. Требуется аутентификация администратора.

**Запрос**

```typescript
{
  title: string;              // Required
  description?: string;
  type: "global" | "item";    // Required
  itemId?: string;            // Required if type is "item"
  status?: "draft" | "published" | "closed";
  surveyJson: object;         // Required -- SurveyJS-compatible JSON definition
}
```

**Ответ**

```typescript
{
  success: true;
  data: Survey; // The created survey object
}
```

**Пример**

```typescript
const response = await fetch("/api/surveys", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "User Satisfaction Survey",
    type: "global",
    status: "draft",
    surveyJson: {
      pages: [
        {
          elements: [
            {
              type: "rating",
              name: "satisfaction",
              title: "How satisfied are you?",
            },
          ],
        },
      ],
    },
  }),
});
const { data: survey } = await response.json();
```

### ПОЛУЧИТЬ `/api/surveys/{surveyId}`

Получите конкретный опрос по идентификатору или ярлыку. Неопубликованные опросы видны только администраторам.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------ | ---- | ---------------------------- |
|идентификатор опроса|строка|путь|Идентификатор опроса или ярлык (обязательно)|

**Ответ**

```typescript
{
  success: true;
  data: Survey;
}
```

**Пример**

```typescript
const response = await fetch("/api/surveys/user-satisfaction-2024");
const { data: survey } = await response.json();
```

### ПОСТАВЬТЕ `/api/surveys/{surveyId}`

Обновите опрос по идентификатору или слагу. Требуется аутентификация администратора.

**Запрос**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Ответ**

```typescript
{
  success: true;
  data: Survey;
  message: "Survey updated successfully";
}
```

**Пример**

```typescript
const response = await fetch("/api/surveys/abc-123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});
```

### УДАЛИТЬ `/api/surveys/{surveyId}`

Удаление опроса по идентификатору или ярлыку. Требуется аутентификация администратора.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------ | ---- | ---------------------------- |
|идентификатор опроса|строка|путь|Идентификатор опроса или ярлык (обязательно)|

**Ответ**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### ПОЛУЧИТЬ `/api/surveys/{surveyId}/responses`

Получите ответы с разбивкой по страницам для конкретного опроса. Требуется аутентификация администратора.

**Запрос**

|Параметр|Тип|В|Описание|
| --------- | ------ | ----- | ----------------------------- |
|идентификатор опроса|строка|путь|Идентификатор опроса (обязательно)|
|идентификатор элемента|строка|запрос|Фильтровать по идентификатору товара|
|идентификатор пользователя|строка|запрос|Фильтровать по идентификатору пользователя|
|дата начала|строка|запрос|Фильтровать по дате (формат ISO)|
|КонечнаяДата|строка|запрос|Фильтровать по дате (формат ISO)|
|страница|номер|запрос|Номер страницы|
|предел|номер|запрос|Элементов на странице|

**Ответ**

```typescript
{
  success: true;
  data: {
    responses: Array<{
      id: string;
      surveyId: string;
      userId: string | null;
      itemId: string | null;
      data: object; // Survey answer data
      completedAt: string; // ISO 8601
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    totalPages: number;
  }
}
```

### ПОСТ `/api/surveys/{surveyId}/responses`

Отправьте ответ на опубликованный опрос. Аутентификация необязательна: анонимные отправки разрешены.

**Запрос**

```typescript
{
  surveyId: string; // Must match the path parameter
  data: object; // Required -- survey answer data
}
```

**Ответ**

```typescript
{
  success: true;
  data: {
    id: string;
    surveyId: string;
    userId: string | null; // Set if user is authenticated
    itemId: string | null;
    data: object;
    completedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
  }
  message: "Response submitted successfully";
}
```

**Пример**

```typescript
const response = await fetch("/api/surveys/abc-123/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    surveyId: "abc-123",
    data: { satisfaction: 5, feedback: "Great product!" },
  }),
});
```

### ПОЛУЧИТЬ `/api/surveys/responses/{responseId}`

Получите конкретный ответ на опрос по идентификатору. Требуется аутентификация администратора.

**Запрос**

|Параметр|Тип|В|Описание|
| ---------- | ------ | ---- | ---------------------- |
|идентификатор ответа|строка|путь|Идентификатор ответа (обязательно)|

**Ответ**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Аутентификация

|Конечная точка|Требуется авторизация|
| ----------------------------------------- | -------------------------------------------- |
|ПОЛУЧИТЬ /api/опросы|Публичный (база данных должна быть доступна)|
|POST/api/опросы|Только администратор|
|`GET /api/surveys/{surveyId}`|Публичное для опубликованного; администратор для проекта/закрыто|
|`PUT /api/surveys/{surveyId}`|Только администратор|
|`DELETE /api/surveys/{surveyId}`|Только администратор|
|`GET /api/surveys/{surveyId}/responses`|Только администратор|
|`POST /api/surveys/{surveyId}/responses`|Публичный (дополнительная авторизация для отслеживания пользователей)|
|`GET /api/surveys/responses/{responseId}`|Только администратор|

## Реакции на ошибки

|Статус|Описание|
| ------ | ----------------------------------------------------------------------- |
| 400    |Недопустимое тело запроса: отсутствует обязательное поле `data` или неверный формат JSON.|
| 401    |Несанкционировано – требуется аутентификация администратора.|
| 404    |Опрос или ответ не найден|
| 500    |Внутренняя ошибка сервера — сбой базы данных.|
| 503    |База данных недоступна или схема не инициализирована.|

## Ограничение скорости

Нет явного ограничения скорости. В ответах фиксируются IP-адрес и пользовательский агент для целей аудита. Конечная точка GET /api/surveys проверяет доступность базы данных перед обработкой и возвращает `503`, если база данных недоступна.

## Связанные конечные точки

- [Конечные точки функции конфигурации](./config-feature-endpoints) – проверьте, включена ли функция опросов.
