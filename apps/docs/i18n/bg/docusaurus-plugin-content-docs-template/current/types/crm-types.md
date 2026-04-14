---
id: crm-types
title: Дефиниции на тип интеграция на CRM
sidebar_label: Видове CRM
sidebar_position: 9
---

# Дефиниции на тип интеграция на CRM

**Изходни файлове:**
- `lib/types/twenty-crm-config.types.ts` - Типове конфигурация и връзка
- `lib/types/twenty-crm-entities.types.ts` - Типове лица и фирми
- `lib/types/twenty-crm-errors.types.ts` - Кодове за грешки, структурирани грешки и предпазители за тип
- `lib/types/twenty-crm-sync.types.ts` - Операции за връщане, записи в кеша и опции за синхронизиране

Шаблонът се интегрира с [Twenty CRM] (https://twenty.com/), CRM платформа с отворен код. Тези типове дефинират пълния интерфейс за конфигурация, съпоставяне на обекти, обработка на грешки и операции за синхронизиране.

---

## Configuration Types (`twenty-crm-config.types.ts`)

### `TwentyCrmSyncMode`

Sync mode options for the CRM integration:

```typescript
type TwentyCrmSyncMode = 'disabled' | 'platform' | 'direct_crm';
```

| Mode | Description |
|------|-------------|
| `disabled` | CRM sync is turned off |
| `platform` | Sync through the platform's event system |
| `direct_crm` | Direct API calls to Twenty CRM |

### `TwentyCrmConfig`

Full CRM configuration stored in the database:

```typescript
interface TwentyCrmConfig {
  id: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### `TwentyCrmConfigResponse`

Configuration response with a masked API key for safe transmission to the admin UI:

```typescript
interface TwentyCrmConfigResponse {
  id: string;
  baseUrl: string;
  apiKey: string; // Masked value (e.g., "****key123")
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
  updatedBy: string | null;
  updatedAt: Date;
}
```

### `UpdateTwentyCrmConfigRequest`

Request payload for creating or updating the CRM configuration:

```typescript
interface UpdateTwentyCrmConfigRequest {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
}
```

### `TwentyCrmEnvConfig`

Configuration from environment variables (used as defaults):

```typescript
interface TwentyCrmEnvConfig {
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  syncMode: TwentyCrmSyncMode;
}
```

### `TwentyCrmTestConnectionResult`

Result from testing the CRM connection:

```typescript
interface TwentyCrmTestConnectionResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  details?: {
    status?: number;
    error?: string;
  };
}
```

### `TwentyCrmClientConfig`

Configuration for the REST client that communicates with Twenty CRM:

```typescript
interface TwentyCrmClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}
```

### Generic Response Types

```typescript
interface TwentyCrmSuccessResponse<T> {
  success: true;
  data: T;
}

interface TwentyCrmErrorResponse {
  success: false;
  error: TwentyCrmError;
}

type TwentyCrmResponse<T> =
  TwentyCrmSuccessResponse<T> | TwentyCrmErrorResponse;
```

---

## Типове обекти (`twenty-crm-entities.types.ts`)

### `TwentyPerson`

Представлява контакт/лице в Twenty CRM:

```typescript
interface TwentyPerson {
  external_id: string;       // Maps to local clientProfile.id
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  website?: string | null;
  city?: string | null;
  account_type?: string | null;  // individual, business, enterprise
  plan?: string | null;          // free, standard, premium
  total_submissions?: number | null;
}
```

### `TwentyCompany`

Представлява фирма/организация в Twenty CRM:

```typescript
interface TwentyCompany {
  external_id: string;        // Maps to local company.id
  name: string;
  domain_name?: string | null; // e.g., example.com
  website?: string | null;
  status?: string | null;      // active, inactive
}
```

---

## Error Types (`twenty-crm-errors.types.ts`)

### `TwentyCrmErrorCode`

Error codes enum for categorizing CRM API errors:

```typescript
enum TwentyCrmErrorCode {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}
```

### `TwentyCrmError`

Structured error for CRM API interactions:

```typescript
interface TwentyCrmError {
  code: TwentyCrmErrorCode;
  message: string;
  status?: number;
  isRetryable: boolean;
  details?: {
    originalError?: string;
    attempt?: number;
    maxRetries?: number;
    [key: string]: unknown;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `TwentyCrmErrorCode` | Machine-readable error classification |
| `message` | `string` | Human-readable error description |
| `status` | `number?` | HTTP status code (if applicable) |
| `isRetryable` | `boolean` | Whether the operation can be retried |
| `details` | `object?` | Additional context including retry info |

### Error Functions

#### `isTwentyCrmError`

Type guard to check if an unknown value is a `TwentyCrmError`:

```typescript
function isTwentyCrmError(error: unknown): error is TwentyCrmError;
```

#### `createTwentyCrmError`

Factory function to create a `TwentyCrmError`:

```typescript
function createTwentyCrmError(
  code: TwentyCrmErrorCode,
  message: string,
  options?: {
    status?: number;
    isRetryable?: boolean;
    details?: TwentyCrmError['details'];
  }
): TwentyCrmError;
```

---

## Типове синхронизиране (`twenty-crm-sync.types.ts`)

### `UpsertResult<T>`

Общ резултат от операция upsert (създаване или актуализиране):

```typescript
interface UpsertResult<T> {
  id: string;          // CRM UUID assigned by Twenty CRM
  externalId: string;  // External ID from our system
  created: boolean;    // True if a new record was created
  updated: boolean;    // True for both create and update operations
  data: T;             // Full entity data from the CRM
}
```

### `UpsertCompanyInput`

Вход за въвеждане на фирмен запис:

```typescript
interface UpsertCompanyInput {
  external_id: string;
  name: string;
  domain_name?: string | null;
  website?: string | null;
  status?: string | null;
}
```

### `UpsertPersonInput`

Вход за въвеждане на запис на лице/контакт:

```typescript
interface UpsertPersonInput {
  external_id: string;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  website?: string | null;
  city?: string | null;
  account_type?: string | null;
  plan?: string | null;
  total_submissions?: number | null;
  company_external_id?: string | null; // Links person to company
}
```

### Типове кеш

#### `CacheEntry`

Основен запис в кеша за съпоставяне на външни идентификатори към CRM идентификатори:

```typescript
interface CacheEntry {
  crmId: string;        // CRM UUID from Twenty CRM
  externalId: string;   // External ID from our system
  cachedAt: number;     // Timestamp (ms since epoch)
}
```

#### `PersonCacheEntry`

Кеш запис за лица лица:

```typescript
interface PersonCacheEntry extends CacheEntry {
  type: 'person';
}
```

#### `CompanyCacheEntry`

Запис в кеша за фирмени субекти:

```typescript
interface CompanyCacheEntry extends CacheEntry {
  type: 'company';
}
```

#### `AnyCacheEntry`

Обединение на всички типове записи в кеша:

```typescript
type AnyCacheEntry = PersonCacheEntry | CompanyCacheEntry;
```

### `UpsertOptions`

Опции за контролиране на поведението на upsert:

```typescript
interface UpsertOptions {
  useCache?: boolean;         // Use cache for lookups (default: true)
  maxConflictRetries?: number; // Max retries for 409 conflicts (default: 3)
  conflictRetryDelay?: number; // Delay between retries in ms (default: 100)
}
```

## Примери за използване

### Тестване на CRM връзка

```typescript
import type { TwentyCrmTestConnectionResult } from '@/lib/types/twenty-crm-config.types';

async function testConnection(): Promise<TwentyCrmTestConnectionResult> {
  const res = await fetch('/api/admin/crm/test-connection', {
    method: 'POST',
  });
  return res.json();
}

const result = await testConnection();
if (result.ok) {
  console.log(`Connected in ${result.latencyMs}ms`);
} else {
  console.error(`Connection failed: ${result.message}`);
}
```

### Покачване на човек

```typescript
import type { UpsertPersonInput, UpsertOptions } from '@/lib/types/twenty-crm-sync.types';

const personInput: UpsertPersonInput = {
  external_id: 'client-profile-uuid',
  name: 'Jane Smith',
  email: 'jane@example.com',
  job_title: 'Product Manager',
  company_name: 'Acme Corp',
  account_type: 'business',
  plan: 'premium',
  total_submissions: 5,
  company_external_id: 'company-uuid',
};

const options: UpsertOptions = {
  useCache: true,
  maxConflictRetries: 3,
  conflictRetryDelay: 100,
};
```

### Обработка на CRM грешки

```typescript
import {
  TwentyCrmErrorCode,
  isTwentyCrmError,
  createTwentyCrmError,
} from '@/lib/types/twenty-crm-errors.types';
import type { TwentyCrmError } from '@/lib/types/twenty-crm-errors.types';

function handleCrmError(error: unknown) {
  if (isTwentyCrmError(error)) {
    switch (error.code) {
      case TwentyCrmErrorCode.AUTH_ERROR:
        console.error('Authentication failed - check API key');
        break;
      case TwentyCrmErrorCode.RATE_LIMIT:
        console.warn('Rate limited - will retry');
        break;
      case TwentyCrmErrorCode.TIMEOUT:
        if (error.isRetryable) {
          console.warn('Timeout - retrying...');
        }
        break;
      default:
        console.error(`CRM error: ${error.message}`);
    }
  }
}
```

### Използване на общия тип отговор

```typescript
import type {
  TwentyCrmResponse,
} from '@/lib/types/twenty-crm-config.types';
import type { TwentyPerson } from '@/lib/types/twenty-crm-entities.types';

function handlePersonResponse(
  response: TwentyCrmResponse<TwentyPerson>
) {
  if (response.success) {
    console.log('Person synced:', response.data.name);
  } else {
    console.error(
      `Sync failed [${response.error.code}]: ${response.error.message}`
    );
    if (response.error.isRetryable) {
      // Schedule retry
    }
  }
}
```

### Конфигуриране на CRM клиента

```typescript
import type { TwentyCrmClientConfig } from '@/lib/types/twenty-crm-config.types';

const clientConfig: TwentyCrmClientConfig = {
  baseUrl: 'https://crm.example.com',
  apiKey: 'your-api-key',
  timeout: 10000,
  maxRetries: 3,
  initialBackoffMs: 200,
  maxBackoffMs: 5000,
};
```

## Бележки по дизайна

### Картографиране на външен идентификатор

CRM интеграцията използва `external_id` полета за поддържане на двупосочно съпоставяне между локални обекти и CRM записи. Това позволява:

- **Idempotent upserts** – Един и същи външен идентификатор винаги се свързва с един и същ CRM запис
- **Оптимизиране на кеша** - съпоставянията на външен към CRM ID се кешират, за да се намалят извикванията на API
- **Разрешаване на конфликти** - 409 конфликта по време на паралелни качвания автоматично се опитват повторно

### Опитайте отново стратегия

Клиентът използва експоненциално забавяне със следните настройки по подразбиране:
- Първоначално забавяне: 200ms
- Максимално забавяне: 5000ms
- Макс. повторни опити: 3
- Флагът `isRetryable` при грешки показва дали автоматичният повторен опит е подходящ

### Класификация на грешките

Грешките се класифицират по `TwentyCrmErrorCode`, за да се даде възможност за подходяща обработка:
- `AUTH_ERROR` - Невалиден или изтекъл API ключ
- `RATE_LIMIT` - Твърде много заявки (повторен опит)
- `TIMEOUT` - Времето за изчакване на заявката изтече (повторен опит)
- `VALIDATION_ERROR` - Невалидни данни, изпратени до CRM
- `NOT_FOUND` - Обектът не съществува
- `NETWORK_ERROR` - Проблеми с връзката (повторен опит)

## Свързани типове

- [`ClientProfileWithAuth`](./user-types.md) - Локален клиентски профил, който съответства на `TwentyPerson`
- [`CreateClientRequest`](./user-types.md) - Полета за създаване на клиент, които се подават в синхронизирането на CRM
