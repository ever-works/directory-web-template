---
id: response-patterns
title: "Шаблоны ответов API"
sidebar_label: "Шаблоны ответов"
sidebar_position: 9
---

# Шаблоны ответов API

Все маршруты API соответствуют согласованным соглашениям об ответах: различающиеся типы объединения для успеха/ошибки, сообщения об ошибках с учетом среды, стандартные коды состояния HTTP и документация Swagger/JSDoc. На этой странице описан каждый шаблон.

## Система типов ответов

### Дискриминированный союз (`lib/api/types.ts`)

В ответах API в качестве дискриминанта используется логическое значение `success`:

```typescript
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };
```

Это позволяет вызывающим абонентам безопасно сузить тип:

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

### Разбитый на страницы ответ

Конечные точки списка используют специальную оболочку с разбиением на страницы:

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

### Типы ошибок

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

## Стандартные формы ответов

### Успешные ответы

#### Единый ресурс

```typescript
return NextResponse.json({
  success: true,
  item,
  message: "Item created successfully",
}, { status: 201 });
```

#### Список с нумерацией страниц

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

#### Подтверждение действия

```typescript
return NextResponse.json({
  success: true,
  message: "Profile updated successfully",
});
```

### Реакции на ошибки

Все ответы об ошибках включают `success: false` и строку `error`:

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

## Соглашения о коде состояния HTTP

|Статус|Использование|Пример|
|--------|-------|---------|
| `200` |Успешное ПОЛУЧЕНИЕ, ПОЛОЖЕНИЕ, ИСПРАВЛЕНИЕ, УДАЛЕНИЕ|Список элементов, обновление профиля|
| `201` |Успешный POST (ресурс создан)|Создать элемент, создать комментарий|
| `400` |Неверные параметры или тело|Плохая нумерация страниц, отсутствуют обязательные поля.|
| `401` |Требуется или не прошла аутентификация|Отсутствует сеанс, пользователь без прав администратора|
| `404` |Ресурс не найден|Товар не найден, профиль не найден|
| `409` |Конфликт (дубликат ресурса)|Повторяющийся идентификатор элемента или ярлык|
| `413` |Тело запроса слишком велико|Тело превышает `readBodyWithLimit` макс.|
| `500` |Внутренняя ошибка сервера|Необработанные исключения|

## Безопасное реагирование на ошибки (`lib/utils/api-error.ts`)

### `safeErrorResponse`

Предотвращает утечку информации, показывая общие сообщения в рабочей среде и подробные сообщения в разработке:

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

Использование в обработчиках маршрутов:

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

Извлекает безопасную строку сообщения без создания `NextResponse`:

```typescript
export function safeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : String(error);
  }
  return fallbackMessage;
}
```

### Поведение в окружающей среде

|Окружающая среда|Вывод ошибки|Журнал сервера|
|-------------|-------------|------------|
|Развитие|`error.message` (полная информация)|Полная ошибка зарегистрирована|
|Производство|`fallbackMessage` (общий)|Полная ошибка зарегистрирована|

## Структура обработчика маршрута

Все обработчики маршрутов API имеют единую структуру:

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

### Пример канонического обработчика GET

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

### Пример канонического обработчика POST

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

## Документация Swagger/JSDoc

Маршруты API документируются с помощью встроенных аннотаций Swagger для автоматически создаваемой документации API:

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

## Типы клиентских API

Конфигурация клиента API и параметры получения:

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

## Краткое изложение конвенций

|Конвенция|Описание|
|------------|-------------|
|Все ответы включают `success`|Дискриминированное объединение для безопасности типов|
|При ошибках используйте `{ success: false, error: string }`|Постоянная форма ошибки|
|`safeErrorResponse` оборачивает блоки catch|Маскирование ошибок с учетом окружающей среды|
|Разбивка на страницы использует `total`, `page`, `limit`, `totalPages`|Согласованные метаданные|
|Проверка аутентификации — первая операция|Безотказный шаблон|
|Проверка возвращается раньше в случае сбоя|Нет вложенных условий|
|Аннотации Swagger на всех маршрутах администратора|Автоматически созданная документация API|
