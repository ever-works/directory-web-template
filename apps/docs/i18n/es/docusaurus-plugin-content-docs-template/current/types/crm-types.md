---
id: crm-types
title: Definiciones de tipos de integración de CRM
sidebar_label: Tipos de CRM
sidebar_position: 9
---

# Definiciones de tipos de integración de CRM

**Archivos fuente:**
- `lib/types/twenty-crm-config.types.ts` - Configuración y tipos de conexión
- `lib/types/twenty-crm-entities.types.ts` - Tipos de entidad de persona y empresa
- `lib/types/twenty-crm-errors.types.ts` - Códigos de error, errores estructurados y protecciones de tipo
- `lib/types/twenty-crm-sync.types.ts` - Operaciones de actualización, entradas de caché y opciones de sincronización

La plantilla se integra con [Twenty CRM](https://twenty.com/),, una plataforma CRM de código abierto. Estos tipos definen la interfaz completa para la configuración, el mapeo de entidades, el manejo de errores y las operaciones de sincronización.

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

## Tipos de entidad (`twenty-crm-entities.types.ts`)

### `TwentyPerson`

Representa un contacto/persona en Twenty CRM:

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

Representa una empresa/organización en Twenty CRM:

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

## Tipos de sincronización (`twenty-crm-sync.types.ts`)

### `UpsertResult<T>`

Resultado genérico de una operación upsert (crear o actualizar):

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

Entrada para insertar un registro de empresa:

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

Entrada para insertar un registro de persona/contacto:

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

### Tipos de caché

#### `CacheEntry`

Entrada de caché base para asignar ID externos a ID de CRM:

```typescript
interface CacheEntry {
  crmId: string;        // CRM UUID from Twenty CRM
  externalId: string;   // External ID from our system
  cachedAt: number;     // Timestamp (ms since epoch)
}
```

#### `PersonCacheEntry`

Entrada de caché para entidades personales:

```typescript
interface PersonCacheEntry extends CacheEntry {
  type: 'person';
}
```

#### `CompanyCacheEntry`

Entrada de caché para entidades de la empresa:

```typescript
interface CompanyCacheEntry extends CacheEntry {
  type: 'company';
}
```

#### `AnyCacheEntry`

Unión de todos los tipos de entradas de caché:

```typescript
type AnyCacheEntry = PersonCacheEntry | CompanyCacheEntry;
```

### `UpsertOptions`

Opciones para controlar el comportamiento de upsert:

```typescript
interface UpsertOptions {
  useCache?: boolean;         // Use cache for lookups (default: true)
  maxConflictRetries?: number; // Max retries for 409 conflicts (default: 3)
  conflictRetryDelay?: number; // Delay between retries in ms (default: 100)
}
```

## Ejemplos de uso

### Probando la conexión CRM

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

### Molestar a una persona

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

### Manejo de errores de CRM

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

### Usando el tipo de respuesta genérico

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

### Configurar el cliente CRM

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

## Notas de diseño

### Mapeo de ID externo

La integración de CRM utiliza campos `external_id` para mantener el mapeo bidireccional entre entidades locales y registros de CRM. Esto permite:

- **Inserciones idempotentes**: el mismo ID externo siempre se asigna al mismo registro de CRM
- **Optimización de caché**: las asignaciones de ID de externo a CRM se almacenan en caché para reducir las llamadas API
- **Resolución de conflictos**: 409 conflictos durante las inserciones paralelas se reintentan automáticamente

### Estrategia de reintento

El cliente utiliza un retroceso exponencial con los siguientes valores predeterminados:
- Retroceso inicial: 200 ms
- Retroceso máximo: 5000 ms
- Reintentos máximos: 3
- El indicador `isRetryable` en errores indica si el reintento automático es apropiado

### Clasificación de errores

Los errores se clasifican por `TwentyCrmErrorCode` para permitir un manejo adecuado:
- `AUTH_ERROR` - Clave API no válida o caducada
- `RATE_LIMIT` - Demasiadas solicitudes (reintentables)
- `TIMEOUT` - Se agotó el tiempo de espera de la solicitud (reintentable)
- `VALIDATION_ERROR` - Datos no válidos enviados a CRM
- `NOT_FOUND` - La entidad no existe
- `NETWORK_ERROR` - Problemas de conexión (reintentable)

## Tipos relacionados

- [`ClientProfileWithAuth`](./user-types.md): perfil de cliente local que se asigna a `TwentyPerson`
- [`CreateClientRequest`](./user-types.md): campos de creación de clientes que alimentan la sincronización de CRM
