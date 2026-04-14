---
id: logger-system
title: "Sistema de registro"
sidebar_label: "Sistema de registro"
sidebar_position: 44
---

# Sistema de registro

## Descripción general

El sistema Logger proporciona una utilidad de registro liviana y respetuosa con el medio ambiente para una salida de registro consistente en toda la aplicación. Admite cuatro niveles de registro (DEBUG, INFO, WARN, ERROR), instancias de registrador con ámbito de contexto y formato específico del entorno: salida de consola con estilo en el navegador durante el desarrollo y salida con formato JSON simple en Node.js y entornos de producción.

## Arquitectura

El módulo (`lib/logger.ts`) exporta dos elementos:

- **`logger`**: una instancia única predeterminada sin una etiqueta de contexto, adecuada para registros de propósito general.
- **`Logger`** (clase): la clase en sí, para crear instancias de registrador contextual con alcance para módulos o características específicas.

El registrador sigue una estrategia de filtrado simple: en producción (`NODE_ENV !== 'development'`), solo se emiten mensajes de ADVERTENCIA y ERROR. En desarrollo, todos los niveles están registrados. Esto garantiza que los resultados de la depuración detallada no se filtren en los entornos de producción.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Referencia de API

### Exportaciones

#### `logger` (singleton)

Una instancia `Logger` preinstanciada sin contexto. Úselo para un registro rápido y sin alcance.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Clase)

##### `static create(context: string): Logger`

Método de fábrica para crear un registrador de ámbito contextual. La cadena de contexto aparece como prefijo en todos los mensajes de registro.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Registra un mensaje de nivel de depuración. Sólo emitido en desarrollo.

##### `info(message: string, data?: any): void`

Registra un mensaje informativo. Sólo emitido en desarrollo.

##### `warn(message: string, data?: any): void`

Registra un mensaje de advertencia. Emitido en todos los ambientes.

##### `error(message: string, error?: any): void`

Registra un mensaje de error. Si el parámetro `error` es una instancia `Error`, el registrador extrae automáticamente las propiedades `message`, `stack` y `name`. Emitido en todos los ambientes.

##### `api(method: string, url: string, data?: any): void`

Método conveniente para registrar solicitudes de API. Delega a `debug()` con datos estructurados. Sólo desarrollo.

##### `performance(label: string, duration: number): void`

Método conveniente para registrar métricas de rendimiento. Registra la etiqueta y la duración en milisegundos. Sólo desarrollo.

### Tipos internos

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Detalles de implementación

**Detección del entorno**: el registrador comprueba `process.env.NODE_ENV === 'development'` en el momento de la construcción y almacena en caché el resultado. Esto evita búsquedas repetidas de entorno en cada llamada de registro.

**Estilo del navegador**: cuando se ejecuta en el navegador (`typeof window !== 'undefined'`) en modo de desarrollo, los mensajes de registro se diseñan utilizando directivas CSS `%c`:

|Nivel|Color|
|-------|-------|
|DEPURAR|`#6366f1` (índigo)|
|INFORMACIÓN|`#3b82f6` (azul)|
|ADVERTENCIA|`#f59e0b` (ámbar)|
|ERROR|`#ef4444` (rojo)|

**Salida de Node.js**: en entornos o producción de Node.js, los mensajes se formatean como cadenas simples con datos serializados en JSON (bastante impresos con sangría de 2 espacios).

**Extracción de errores**: el método `error()` detecta instancias de `Error` y extrae `errorMessage`, `stack` y `name` en un objeto de datos estructurados para facilitar la depuración.

## Configuración

El registrador no requiere configuración. Su comportamiento está determinado enteramente por `NODE_ENV`:

|`NODE_ENV`|DEPURAR|INFORMACIÓN|ADVERTENCIA|ERROR|
|------------|-------|------|------|-------|
|`development`|si|si|si|si|
|`production`|No|No|si|si|
|`test`|No|No|si|si|

## Ejemplos de uso

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Mejores prácticas

- Cree registradores de ámbito contextual para cada módulo o área de funciones utilizando `Logger.create('ModuleName')` para que los registros sean fáciles de filtrar.
- Utilice `debug()` para un seguimiento detallado que nunca debería aparecer en producción; utilice `info()` para eventos notables.
- Pase siempre objetos `Error` (no cadenas) al método `error()` para que los seguimientos de la pila se capturen automáticamente.
- Utilice el método `api()` para el registro de solicitudes HTTP para mantener una estructura de registro coherente en todas las llamadas API.
- No confíe en el registrador para el seguimiento en producción; integrar con una plataforma de observabilidad adecuada (PostHog, Sentry) para el seguimiento de errores de producción.

## Módulos relacionados

- [Capa de cliente API](/template/architecture/api-client-layer): utiliza el registrador para el registro de solicitudes/respuestas
- [Sistema de administrador de configuración] (./config-manager-system): ConfigService registra los resultados de validación al inicio
