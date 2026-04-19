---
id: survey-endpoints-deep-dive
title: "Справочник за API за проучвания"
sidebar_label: "Проучвания (дълбоко гмуркане)"
sidebar_position: 56
---

# Справочник за API за проучвания

## Преглед

API за анкети предоставя пълни CRUD операции за анкети и техните отговори. Проучванията могат да бъдат глобални или специфични за артикул и да поддържат състояния на чернова/публикуван/затворен жизнен цикъл. Създаването, актуализирането и изтриването на анкети изискват администраторско удостоверяване, докато обществените потребители могат да преглеждат публикувани анкети и да изпращат отговори.

## Крайни точки

### ВЗЕМЕТЕ /api/проучвания

Изтеглете анкети с незадължителни филтри и страниране. Проверява наличността на базата данни преди обработка.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------- | ----- | --------------------------------------------------------- |
|тип|низ|заявка|Филтриране по тип: `"global"` или `"item"`|
|itemId|низ|заявка|Филтриране по идентификатор на елемент|
|състояние|низ|заявка|Филтрирайте по статус: `"draft"`, `"published"` или `"closed"`|
|страница|цяло число|заявка|Номер на страницата (по подразбиране: 1, минимум: 1)|
|лимит|цяло число|заявка|Елементи на страница (по подразбиране: 10, мин.: 1, макс.: 100)|

**Отговор**

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

### POST /api/анкети

Създайте нова анкета. Изисква администраторско удостоверяване.

**Заявка**

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

**Отговор**

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

### ВЗЕМЕТЕ `/api/surveys/{surveyId}`

Извлечете конкретна анкета по ID или slug. Непубликувани анкети се виждат само от администраторите.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------ | ---- | ---------------------------- |
|surveyId|низ|път|Идентификационен номер на проучване или охлюв (задължително)|

**Отговор**

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

### ПОСТАВЕТЕ `/api/surveys/{surveyId}`

Актуализирайте проучване по ID или slug. Изисква администраторско удостоверяване.

**Заявка**

```typescript
{
  title?: string;
  description?: string;
  status?: "draft" | "published" | "closed";
  surveyJson?: object;
}
```

**Отговор**

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

### ИЗТРИВАНЕ `/api/surveys/{surveyId}`

Изтрийте анкета по ID или slug. Изисква администраторско удостоверяване.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------ | ---- | ---------------------------- |
|surveyId|низ|път|Идентификационен номер на проучване или охлюв (задължително)|

**Отговор**

```typescript
{
  success: true;
  data: null;
  message: "Survey deleted successfully";
}
```

### ВЗЕМЕТЕ `/api/surveys/{surveyId}/responses`

Извличане на пагинирани отговори за конкретно проучване. Изисква администраторско удостоверяване.

**Заявка**

|Параметър|Тип|в|Описание|
| --------- | ------ | ----- | ----------------------------- |
|surveyId|низ|път|ID на анкетата (задължително)|
|itemId|низ|заявка|Филтриране по идентификатор на елемент|
|userId|низ|заявка|Филтриране по потребителски идентификатор|
|начална дата|низ|заявка|Филтриране по дата (ISO формат)|
|крайна дата|низ|заявка|Филтриране до дата (ISO формат)|
|страница|номер|заявка|Номер на страницата|
|лимит|номер|заявка|Елементи на страница|

**Отговор**

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

### ПУБЛИКУВАНЕ `/api/surveys/{surveyId}/responses`

Изпратете отговор на публикувана анкета. Удостоверяването не е задължително - разрешени са анонимни изпращания.

**Заявка**

```typescript
{
  surveyId: string; // Must match the path parameter
  data: object; // Required -- survey answer data
}
```

**Отговор**

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

### ВЗЕМЕТЕ `/api/surveys/responses/{responseId}`

Извлечете конкретен отговор на анкетата по ID. Изисква администраторско удостоверяване.

**Заявка**

|Параметър|Тип|в|Описание|
| ---------- | ------ | ---- | ---------------------- |
|responseId|низ|път|ID на отговора (задължително)|

**Отговор**

```typescript
{
  success: true;
  data: SurveyResponse;
}
```

## Удостоверяване

|Крайна точка|Изисква се удостоверяване|
| ----------------------------------------- | -------------------------------------------- |
|ВЗЕМЕТЕ /api/проучвания|Публично (базата данни трябва да е налична)|
|POST /api/анкети|Само администратор|
|`GET /api/surveys/{surveyId}`|Публично за публикувано; администратор за чернова/затворено|
|`PUT /api/surveys/{surveyId}`|Само администратор|
|`DELETE /api/surveys/{surveyId}`|Само администратор|
|`GET /api/surveys/{surveyId}/responses`|Само администратор|
|`POST /api/surveys/{surveyId}/responses`|Публично (незадължително удостоверяване за проследяване на потребителите)|
|`GET /api/surveys/responses/{responseId}`|Само администратор|

## Отговори за грешки

|Статус|Описание|
| ------ | ----------------------------------------------------------------------- |
| 400    |Невалиден текст на заявката -- липсва задължително поле `data` или неправилно образуван JSON|
| 401    |Неупълномощено -- изисква се удостоверяване на администратор|
| 404    |Анкета или отговор не са намерени|
| 500    |Вътрешна грешка на сървъра -- грешка в базата данни|
| 503    |Базата данни не е налична или схемата не е инициализирана|

## Ограничаване на скоростта

Няма изрично ограничаване на скоростта. Подаването на отговор улавя IP адрес и потребителски агент за целите на одита. Крайната точка GET /api/surveys проверява наличността на базата данни преди обработка и връща `503`, ако базата данни е недостъпна.

## Свързани крайни точки

- [Конфигуриране на крайни точки на функция](./config-feature-endpoints) -- Проверете дали функцията за проучвания е активирана
