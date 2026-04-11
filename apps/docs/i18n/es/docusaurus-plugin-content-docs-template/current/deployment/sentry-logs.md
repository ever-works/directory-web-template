---
id: sentry-logs
title: Configuración de Registros Sentry
sidebar_label: Registros Sentry
sidebar_position: 7
---

# Configuración de Registros Sentry

Este documento explica cómo configurar y usar Sentry Logs en el repositorio Template y en el repositorio Ever Works.

## Descripción General

Sentry Logs proporciona gestión centralizada de registros, permitiendo capturar, reenviar y analizar registros de aplicaciones en el Explorador de Registros de Sentry. Todos los registros se reenvían automáticamente a Sentry cuando está habilitado, proporcionando una vista unificada del comportamiento de la aplicación en diferentes entornos.

## Características

- ✅ Reenvío automático de registros a Sentry
- ✅ Soporte para todos los niveles de registro (debug, info, warn, error)
- ✅ Registro contextual con etiquetado automático
- ✅ Configuración específica por entorno
- ✅ Registro estructurado con soporte de metadatos
- ✅ Integración con la utilidad de logger existente

## Configuración

### Variables de Entorno

Agregue estas variables a su archivo `.env.local` para desarrollo local:

```env
# Configuración de Sentry (requerida para registros)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Habilitar Sentry en desarrollo (opcional, predeterminado solo en producción)
SENTRY_ENABLE_DEV=true

# Modo de depuración de Sentry (opcional)
SENTRY_DEBUG=false

# Configuración de registros de Sentry
SENTRY_LOGS_ENABLED=true  # Habilitar/deshabilitar Sentry Logs (predeterminado: true)
SENTRY_LOGS_LEVEL=info    # Nivel mínimo de registro a capturar (predeterminado: info)
```

### Configuración Específica por Entorno

#### Desarrollo Local

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Capturar todos los registros en desarrollo
```

#### Desarrollo/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Capturar registros info, warn y error
```

#### Producción

```env
SENTRY_ENABLE_DEV=false  # No necesario en producción
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Capturar solo advertencias y errores en producción
```

## Uso

### Registro Básico

El logger reenvía automáticamente registros a Sentry cuando está habilitado:

```typescript
import { logger } from '@/lib/logger';

// Registro de info
logger.info('User logged in', { userId: '12345' });

// Registro de advertencia
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Registro de error
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Registro de depuración (solo en desarrollo)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Registro Contextual

Cree un logger con un contexto específico para mejor organización:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Niveles de Registro

El logger admite cuatro niveles de registro, mapeados automáticamente a los niveles de severidad de Sentry:

| Nivel Logger | Nivel Sentry | Descripción |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Información detallada de depuración (solo desarrollo) |
| `INFO` | `info` | Mensajes informativos generales |
| `WARN` | `warning` | Mensajes de advertencia para problemas potenciales |
| `ERROR` | `error` | Mensajes de error para fallos |

## Cómo Funciona

### Inicialización

Sentry Logs se habilita tanto en la instrumentación del cliente como del servidor:

1. **Lado del servidor** (`instrumentation.ts`): Inicializa Sentry para el runtime de Node.js
2. **Lado del cliente** (`instrumentation-client.ts`): Inicializa Sentry para el runtime del navegador

Ambas configuraciones incluyen:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Reenvío de Registros

La utilidad de logger (`lib/logger.ts`) automáticamente:
1. Verifica si Sentry Logs está habilitado
2. Formatea las entradas de registro con contexto y metadatos
3. Reenvía registros a Sentry usando `Sentry.captureMessage()` con las etiquetas y niveles apropiados
4. Regresa graciosamente si Sentry no está disponible

### Estructura de Registros

Cada entrada de registro enviada a Sentry incluye:
- **Mensaje**: El mensaje de registro con prefijo de contexto opcional
- **Nivel**: Nivel de severidad (debug, info, warning, error)
- **Etiquetas**:
  - `logLevel`: El nivel de registro original
  - `logType`: Siempre `application_log`
  - `context`: Identificador de contexto opcional
- **Datos Adicionales**:
  - `data`: Cualquier dato adicional proporcionado
  - `timestamp`: Timestamp ISO

## Visualización de Registros en Sentry

### Explorador de Registros

1. Navegue a su proyecto de Sentry
2. Vaya a **Logs** → **Logs Explorer**
3. Use filtros para encontrar registros específicos:
   - Filtrar por etiqueta `logLevel` (debug, info, warn, error)
   - Filtrar por etiqueta `context` para ver registros de módulos específicos
   - Filtrar por `logType:application_log` para ver solo registros de la aplicación

### Consultas de Registros

Ejemplos de consultas en el Explorador de Registros de Sentry:

```
# Todos los registros de error
logLevel:error

# Registros de un contexto específico
context:PaymentService

# Todos los registros de aplicación
logType:application_log

# Errores de un rango de tiempo específico
logLevel:error timestamp:>2024-01-01
```

## Integración con el Paquete de Monitoreo

Si usa el paquete `@ever-works/monitoring`, asegúrese de que esté configurado para trabajar con Sentry Logs:

1. El paquete de monitoreo debe inicializar Sentry con registros habilitados
2. La utilidad de logger en esta plantilla reenviará automáticamente registros a Sentry
3. Ambos sistemas trabajan juntos para proporcionar monitoreo integral

## Solución de Problemas

### Registros No Aparecen en Sentry

1. **Verificar configuración del DSN**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Asegúrese de que el DSN esté correctamente establecido y sea accesible.

2. **Verificar si los registros están habilitados**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Debe ser `true` para que los registros se reenvíen.

3. **Verificar inicialización de Sentry**
   - Compruebe que `SENTRY_ENABLED` es true
   - Revise la consola del navegador por errores de inicialización de Sentry
   - Verifique que `_experiments.enableLogs` está establecido en `true`

4. **Verificar filtrado de nivel de registro**
   - Asegúrese de que su nivel de registro cumple el umbral `SENTRY_LOGS_LEVEL`
   - Los registros de depuración se capturan solo si el nivel está establecido en `debug`

### Consideraciones de Rendimiento

- Los registros se envían de forma asíncrona y no bloquearán su aplicación
- En producción, considere establecer `SENTRY_LOGS_LEVEL=warn` para reducir el volumen de registros
- Sentry maneja automáticamente la limitación de velocidad y el procesamiento por lotes

### Deshabilitar Registros

Para deshabilitar Sentry Logs sin deshabilitar Sentry completamente:

```env
SENTRY_LOGS_ENABLED=false
```

El logger seguirá funcionando normalmente, pero los registros no se reenviarán a Sentry.

## Mejores Prácticas

1. **Usar Niveles de Registro Apropiados**
   - Use `debug` para información detallada de desarrollo
   - Use `info` para el flujo general de la aplicación
   - Use `warn` para problemas potenciales que no comprometen la funcionalidad
   - Use `error` para errores reales y excepciones

2. **Incluir Contexto**
   - Use loggers contextuales para mejor organización
   - Incluya metadatos relevantes en los datos de registro

3. **Evitar Datos Sensibles**
   - Nunca registre contraseñas, tokens o datos personales
   - Sanitice los datos antes de registrarlos

4. **Configuración de Producción**
   - Establezca `SENTRY_LOGS_LEVEL=warn` en producción
   - Monitoree el uso de la cuota de Sentry
   - Revise los registros regularmente en busca de patrones

## Lista de Verificación de Validación

- [ ] DSN de Sentry está correctamente configurado
- [ ] `SENTRY_LOGS_ENABLED=true` está establecido
- [ ] Los registros aparecen en el Explorador de Registros de Sentry
- [ ] Los niveles de registro están correctamente mapeados (info, warn, error, debug)
- [ ] Las etiquetas de contexto son visibles en Sentry
- [ ] Los registros funcionan tanto localmente como en entornos de implementación
- [ ] QA puede ver y filtrar registros en el Explorador de Sentry

## Recursos Adicionales

- [Documentación Sentry Logs](https://docs.sentry.io/product/logs/)
- [Integración Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Guía Sentry Logs Explorer](https://docs.sentry.io/product/logs/explorer/)
