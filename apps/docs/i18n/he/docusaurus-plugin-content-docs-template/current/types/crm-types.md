---
id: crm-types
title: הגדרות סוג אינטגרציה של CRM
sidebar_label: סוגי CRM
sidebar_position: 9
---

# הגדרות סוג אינטגרציה של CRM

**קבצי מקור:**
- `lib/types/twenty-crm-config.types.ts` - תצורה וסוגי חיבור
- `lib/types/twenty-crm-entities.types.ts` - סוגי ישויות של אדם ושל חברה
- `lib/types/twenty-crm-errors.types.ts` - קודי שגיאה, שגיאות מובנות ושמירה על סוגים
- `lib/types/twenty-crm-sync.types.ts` - העלאת פעולות, ערכי מטמון ואפשרויות סנכרון

התבנית משתלבת עם [Twenty CRM](https://twenty.com/), פלטפורמת CRM בקוד פתוח. סוגים אלו מגדירים את הממשק המלא עבור תצורה, מיפוי ישויות, טיפול בשגיאות וסנכרון.

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

## סוגי ישויות (`twenty-crm-entities.types.ts`)

### `TwentyPerson`

מייצג איש קשר/אדם ב-Twenty CRM:

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

מייצג חברה/ארגון ב-Twenty CRM:

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

## סוגי סנכרון (`twenty-crm-sync.types.ts`)

### `UpsertResult<T>`

תוצאה כללית של פעולת העלאה (יצירה או עדכון):

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

קלט לביטול רשומת חברה:

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

קלט לביטול רשומת אדם/איש קשר:

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

### סוגי מטמון

#### `CacheEntry`

הזנת מטמון בסיסית למיפוי מזהים חיצוניים למזהי CRM:

```typescript
interface CacheEntry {
  crmId: string;        // CRM UUID from Twenty CRM
  externalId: string;   // External ID from our system
  cachedAt: number;     // Timestamp (ms since epoch)
}
```

#### `PersonCacheEntry`

ערך מטמון עבור ישויות אדם:

```typescript
interface PersonCacheEntry extends CacheEntry {
  type: 'person';
}
```

#### `CompanyCacheEntry`

הזנת מטמון עבור ישויות של החברה:

```typescript
interface CompanyCacheEntry extends CacheEntry {
  type: 'company';
}
```

#### `AnyCacheEntry`

איחוד של כל סוגי הזנת המטמון:

```typescript
type AnyCacheEntry = PersonCacheEntry | CompanyCacheEntry;
```

### `UpsertOptions`

אפשרויות לשליטה על התנהגות מופרעת:

```typescript
interface UpsertOptions {
  useCache?: boolean;         // Use cache for lookups (default: true)
  maxConflictRetries?: number; // Max retries for 409 conflicts (default: 3)
  conflictRetryDelay?: number; // Delay between retries in ms (default: 100)
}
```

## דוגמאות לשימוש

### בדיקת חיבור CRM

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

### מרגיז אדם

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

### טיפול בשגיאות CRM

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

### שימוש בסוג התגובה הגנרית

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

### הגדרת לקוח CRM

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

## הערות עיצוב

### מיפוי מזהה חיצוני

שילוב ה-CRM משתמש בשדות `external_id` כדי לשמור על מיפוי דו-כיווני בין ישויות מקומיות ורשומות CRM. זה מאפשר:

- **העלאות אימפוטנטיות** - אותו מזהה חיצוני ממופה תמיד לאותה רשומת CRM
- **אופטימיזציה של מטמון** - מיפוי מזהה חיצוני ל-CRM נשמרות במטמון כדי לצמצם קריאות API
- **פתרון סכסוכים** - 409 התנגשויות במהלך העלאות מקבילות מנוסים שוב באופן אוטומטי

### נסה שוב אסטרטגיה

הלקוח משתמש ב-backoff אקספוננציאלי עם ברירות המחדל הבאות:
- גיבוי ראשוני: 200ms
- השבתה מקסימלית: 5000ms
- מקסימום ניסיונות חוזרים: 3
- הדגל `isRetryable` על שגיאות מציין אם ניסיון חוזר אוטומטי מתאים

### סיווג שגיאות

שגיאות מסווגות לפי `TwentyCrmErrorCode` כדי לאפשר טיפול מתאים:
- `AUTH_ERROR` - מפתח API לא חוקי או שפג תוקפו
- `RATE_LIMIT` - יותר מדי בקשות (ניתן לנסות שוב)
- `TIMEOUT` - תם הזמן הקצוב לבקשה (ניתן לנסות שוב)
- `VALIDATION_ERROR` - נתונים לא חוקיים נשלחו ל-CRM
- `NOT_FOUND` - הישות אינה קיימת
- `NETWORK_ERROR` - בעיות חיבור (ניתן לנסות שוב)

## סוגים קשורים

- [`ClientProfileWithAuth`](./user-types.md) - פרופיל לקוח מקומי שממפה ל-`TwentyPerson`
- [`CreateClientRequest`](./user-types.md) - שדות ליצירת לקוח המוזנים לסנכרון CRM
