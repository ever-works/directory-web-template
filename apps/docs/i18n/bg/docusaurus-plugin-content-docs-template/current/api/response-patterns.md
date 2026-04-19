---
id: response-patterns
title: "Модели на отговор на API"
sidebar_label: "Модели на отговор"
sidebar_position: 9
---

# Модели на отговор на API

Всички маршрути на API следват последователни конвенции за отговор: дискриминирани типове обединение за успех/грешка, съобщения за грешка, съобразени с околната среда, стандартни HTTP кодове за състояние и документация на Swagger/JSDoc. Тази страница обхваща всеки модел.

## Система тип отговор

### Дискриминиран съюз (`lib/api/types.ts`)

Отговорите на API използват `success` булев като дискриминант:

```typescript
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };
```

Това позволява на обаждащите се да стеснят безопасно типа:

```typescript
const response: ApiResponse<User[]> = await fetchUsers();
if (response.success) {
  // TypeScript knows: response.data is User[]
  console.log(response.data);
} else {
  // TypeScript knows: response.error is string
  console.error(response.error);
}
```

### Страниран отговор

Крайните точки на списъка използват специална пагинирана обвивка:

```typescript
export type PaginatedResponse<T> =
  | {
      success: true;
      data: T[];
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };
```

### Видове грешки

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
```

## Стандартни форми на отговор

### Успешни отговори

#### Единичен ресурс

```typescript
return NextResponse.json({
  success: true,
  item,
  message: "Item created successfully",
}, { status: 201 });
```

#### Списък с пагинация

```typescript
return NextResponse.json({
  success: true,
  items: result.items,
  total: result.total,
  page: result.page,
  limit: result.limit,
  totalPages: result.totalPages,
});
```

#### Потвърждение на действие

```typescript
return NextResponse.json({
  success: true,
  message: "Profile updated successfully",
});
```

### Отговори за грешки

Всички отговори за грешка включват `success: false` и `error` низ:

```typescript
// Unauthorized
return NextResponse.json(
  { success: false, error: "Unauthorized. Admin access required." },
  { status: 401 }
);

// Validation error
return NextResponse.json(
  { success: false, error: "Invalid page parameter. Must be a positive integer." },
  { status: 400 }
);

// Conflict
return NextResponse.json(
  { success: false, error: `Item with slug '${slug}' already exists` },
  { status: 409 }
);
```

## Конвенции за кода на състоянието на HTTP

|Статус|Използване|Пример|
|--------|-------|---------|
| `200` |Успешни GET, PUT, PATCH, DELETE|Списък с елементи, актуализиране на профила|
| `201` |Успешно POST (ресурсът е създаден)|Създайте елемент, създайте коментар|
| `400` |Невалидни параметри или тяло|Лоша пагинация, липсват задължителни полета|
| `401` |Изисква се или е неуспешно удостоверяване|Липсваща сесия, потребител без администратор|
| `404` |Ресурсът не е намерен|Артикулът не е намерен, профилът не е намерен|
| `409` |Конфликт (дублиращ се ресурс)|Дублиран идентификатор на елемент или охлюв|
| `413` |Твърде голямо съдържание на заявката|Тяло надвишава `readBodyWithLimit` макс|
| `500` |Вътрешна грешка на сървъра|Необработени изключения|

## Безопасна реакция при грешка (`lib/utils/api-error.ts`)

### `safeErrorResponse`

Предотвратява изтичането на информация чрез показване на общи съобщения в производство и подробни съобщения в процес на разработка:

```typescript
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status: number = 500
): NextResponse {
  const detail = error instanceof Error ? error.message : String(error);

  // Always log full details server-side
  console.error(`[API Error] ${fallbackMessage}:`, detail);

  const message = process.env.NODE_ENV === "development" ? detail : fallbackMessage;

  return NextResponse.json({ success: false, error: message }, { status });
}
```

Използване в манипулатори на маршрути:

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch items');
  }
}
```

### `safeErrorMessage`

Извлича безопасен низ от съобщения, без да създава `NextResponse`:

```typescript
export function safeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : String(error);
  }
  return fallbackMessage;
}
```

### Поведение в околната среда

|Околна среда|Изход за грешка|Дневник на сървъра|
|-------------|-------------|------------|
|развитие|`error.message` (пълни подробности)|Регистрирана е пълна грешка|
|производство|`fallbackMessage` (общо)|Регистрирана е пълна грешка|

## Структура на манипулатора на маршрута

Всички манипулатори на API маршрути следват последователна структура:

```mermaid
flowchart TD
    A[Request] --> B[try/catch wrapper]
    B --> C[Auth check]
    C -->|Fail| D[401 Response]
    C -->|Pass| E[Parse & validate params]
    E -->|Invalid| F[400 Response]
    E -->|Valid| G[Call service/repository]
    G -->|Not found| H[404 Response]
    G -->|Conflict| I[409 Response]
    G -->|Success| J[200/201 Response]
    B -->|Exception| K[safeErrorResponse 500]
```

### Пример за каноничен GET манипулатор

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // 2. Parse and validate parameters
    const { searchParams } = new URL(request.url);
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }

    // 3. Call service layer
    const result = await repository.findAll(paginationResult);

    // 4. Return structured response
    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch items');
  }
}
```

### Пример за каноничен POST манипулатор

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    if (!body.name || !body.description) {
      return NextResponse.json(
        { success: false, error: "Name and description are required" },
        { status: 400 }
      );
    }

    // 3. Check for conflicts
    const existing = await repository.findBySlug(body.slug);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Resource with slug '${body.slug}' already exists` },
        { status: 409 }
      );
    }

    // 4. Create resource
    const item = await repository.create(body);

    // 5. Return created resource
    return NextResponse.json({
      success: true,
      item,
      message: "Created successfully",
    }, { status: 201 });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to create resource');
  }
}
```

## Swagger / JSDoc Документация

API маршрутите са документирани с вградени анотации на Swagger за автоматично генерирана API документация:

```typescript
/**
 * @swagger
 * /api/admin/items:
 *   get:
 *     tags: ["Admin - Items"]
 *     summary: "Get paginated items list"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       200:
 *         description: "Items list retrieved successfully"
 *       400:
 *         description: "Bad request"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
```

## Типове API от страна на клиента

Клиентската конфигурация на API и опциите за извличане:

```typescript
export interface ApiClientConfig extends Partial<AxiosRequestConfig> {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  accessToken?: string;
  frontendUrl?: string;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}
```

## Резюме на конвенциите

|конвенция|Описание|
|------------|-------------|
|Всички отговори включват `success`|Дискриминиран съюз за безопасност на типа|
|Грешките използват `{ success: false, error: string }`|Постоянна форма на грешка|
|`safeErrorResponse` обвива блоковете за улавяне|Маскиране на грешки, съобразено с околната среда|
|Странирането използва `total`, `page`, `limit`, `totalPages`|Последователни метаданни|
|Проверката на автентичността е първата операция|Fail-fast модел|
|Валидирането се връща рано при повреда|Без вложени условия|
|Разкошни анотации по всички администраторски маршрути|Автоматично генерирани API документи|
