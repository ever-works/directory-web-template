---
id: config-manager-system
title: "Sistema de administrador de configuración"
sidebar_label: "Sistema de administrador de configuración"
sidebar_position: 41
---

# Sistema de administrador de configuración

## Descripción general

El sistema Config Manager proporciona dos capas de configuración complementarias: la clase **ConfigManager** (`lib/config-manager.ts`) para administrar el archivo de configuración de contenido basado en YAML (`config.yml`) con persistencia respaldada por Git, y **ConfigService** (`lib/config/`) para validar y acceder a la configuración de aplicaciones basada en variables de entorno con esquemas Zod. Juntos cubren tanto la configuración editable en tiempo de ejecución como la configuración del entorno en tiempo de implementación.

## Arquitectura

El sistema se divide en dos subsistemas distintos:

### ConfigManager (basado en YAML, editable en tiempo de ejecución)

`lib/config-manager.ts` administra el archivo `config.yml` dentro del directorio `.content/` (clonado del repositorio de datos). Lee y escribe la configuración de YAML y automáticamente confirma y envía cambios al repositorio de Git usando `isomorphic-git`. Esto se utiliza para configuraciones que los administradores pueden cambiar en tiempo de ejecución (paginación, navegación, encabezado/pie de página).

### ConfigService (basado en el entorno, validado en el inicio)

`lib/config/` proporciona un singleton validado por Zod que lee todas las variables de entorno al inicio y las organiza en secciones escritas: núcleo, autenticación, correo electrónico, pago, análisis e integraciones. Incluye indicadores de funciones, utilidades de detección de entornos y exportaciones que se pueden sacudir en árbol.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## Referencia de API

### Administrador de configuración (`lib/config-manager.ts`)

#### Tipos

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (singleton)

La instancia singleton exportada predeterminada de `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Devuelve el objeto de configuración completo, fusionando el contenido del archivo con los valores predeterminados.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Devuelve un valor de configuración de nivel superior por clave.

#### `configManager.getNestedValue(keyPath: string): any`

Devuelve un valor de configuración anidado usando notación de puntos (por ejemplo, `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Actualiza una clave de nivel superior y persiste en el archivo + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Actualiza una clave anidada usando notación de puntos. Incluye prototipo de protección contra la contaminación.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Método conveniente para actualizar la configuración de paginación.

#### `configManager.getPaginationConfig(): PaginationConfig`

Devuelve la configuración de paginación actual.

### Servicio de configuración (`lib/config/config-service.ts`)

#### `configService` (singleton)

Singleton solo de servidor que valida todas las variables de entorno al inicio.

|Propiedad|Tipo|Descripción|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|URL, información del sitio, base de datos|
|`configService.auth`|`AuthConfig`|Secretos, proveedores de OAuth|
|`configService.email`|`EmailConfig`|SMTP, reenvío, nuevo|
|`configService.payment`|`PaymentConfig`|Raya, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Veinte CRM|

#### Indicadores de funciones (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Las funciones (calificaciones, comentarios, favoritos, artículos destacados, encuestas) se habilitan cuando se configura `DATABASE_URL`.

#### Utilidades del entorno (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Detalles de implementación

**Cola de operaciones de Git**: `ConfigManager` utiliza una cola en serie con un patrón mutex para evitar operaciones Git simultáneas. Cuando se llama a `writeConfig()`, el archivo se guarda inmediatamente y la confirmación/envío de Git se pone en cola. Si las operaciones de Git fallan, el archivo se guarda igualmente correctamente.

**Dependencias de Git cargadas de forma diferida**: `isomorphic-git` y su módulo HTTP se cargan de forma diferida mediante `import()` dinámico con un patrón singleton para evitar problemas de agrupación y evitar importaciones duplicadas.

**Prototipo de protección contra la contaminación**: el método `updateNestedKey()` busca claves `__proto__`, `constructor` y `prototype` en cada nivel de la ruta para evitar ataques de prototipos de contaminación.

**Validación de inicio**: `ConfigService` valida todas las variables de entorno utilizando esquemas Zod durante la primera importación. La configuración no válida provoca un error de inicio con mensajes de error descriptivos. Los esquemas utilizan controladores `.catch()` para una degradación elegante en campos opcionales.

**Aplicación solo del servidor**: `config-service.ts` importa `'server-only'` para evitar la inclusión accidental en paquetes de clientes. La configuración segura para el cliente se exporta por separado desde `lib/config/client.ts`.

## Configuración

### Variables de entorno de ConfigManager

|variable|Requerido|Descripción|
|----------|----------|-------------|
|`DATA_REPOSITORY`|si|URL del repositorio de Git para contenido|
|`GH_TOKEN`|Para Git empujar|token de acceso a GitHub|
|`GITHUB_BRANCH`|No|Nombre de la sucursal (predeterminado: `main`)|
|`GIT_NAME`|No|Nombre del confirmador (predeterminado: `Website Bot`)|
|`GIT_EMAIL`|No|Correo electrónico del confirmador (predeterminado: `website@ever.works`)|

### Variables de entorno del servicio de configuración

Consulte `.env.example` para obtener la lista completa. Las secciones clave incluyen `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` y otras validadas por esquemas Zod.

## Ejemplos de uso

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Mejores prácticas

- Utilice `configManager` para las configuraciones que los administradores deben cambiar en tiempo de ejecución sin volver a implementarlas.
- Utilice `configService` para la configuración en el momento de la implementación que debe validarse al inicio.
- Importe la configuración segura del cliente desde `@/lib/config/client` en los componentes del cliente, nunca desde la exportación del barril principal.
- Maneje siempre el retorno `Promise<boolean>` de `updateKey` y `updateNestedKey` para detectar fallas de escritura.
- Utilice indicadores de funciones para degradar elegantemente la funcionalidad cuando las dependencias opcionales (como la base de datos) no estén configuradas.

## Módulos relacionados

- [Sistema de caché](./cache-system) -- Utiliza `CACHE_TAGS.CONFIG` para el almacenamiento en caché de la configuración
- [Sistema de guardias](./guards-system-deep-dive) -- Consume la configuración del plan/funciones
- [Biblioteca de contenido](/template/architecture/content-library) -- Resolución de ruta de contenido utilizada por ConfigManager
