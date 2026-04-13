---
id: moderation-endpoints
title: "Sistema de Moderación"
sidebar_label: "Moderación"
sidebar_position: 28
---

# Sistema de Moderación

El sistema de moderación proporciona moderación de contenido programática a través de una capa de servicio en lugar de puntos finales API independientes. Las acciones de moderación se desencadenan automáticamente cuando los administradores resuelven informes de contenido a través de la API de Reportes. El sistema admite advertir a usuarios, suspender cuentas, banear cuentas y eliminar contenido, con historial de audítoría completo y notificaciones por email.

## Descripción General

La moderación no está expuesta como puntos finales REST separados. En cambio, se invoca a través del flujo de trabajo de resolución de reportes:

```
PUT /api/admin/reports/[id]  -->  la resolución dispara la acción de moderación
```

Cuando un administrador establece un valor de `resolution` en un reporte, la función de moderación correspondiente se ejecuta automáticamente.

| Valor de Resolución | Función de Moderación | Efecto |
|---|---|---|
| `content_removed` | `removeContent()` | Elimina suavemente el comentario o elemento reportado |
| `user_warned` | `warnUser()` | Incrementa el conteo de advertencias del usuario |
| `user_suspended` | `suspendUser()` | Establece el estado del usuario a `"suspended"` |
| `user_banned` | `banUser()` | Establece el estado del usuario a `"banned"` |
| `no_action` | Ninguna | No se toma ninguna acción de moderación |

## Acciones de Moderación

### Eliminar Contenido

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Elimina el contenido reportado según su tipo. Para comentarios, realiza una eliminación suave (establece `deletedAt`). Para elementos, elimina el elemento del repositorio de contenido basado en Git.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `contentType` | `"item"` o `"comment"` | Tipo de contenido a eliminar |
| `contentId` | string | ID o slug del contenido |
| `reportId` | string | ID del reporte asociado |
| `adminId` | string | Usuario administrador que realiza la acción |

**Pasos de Procesamiento:**

1. Buscar propietario del contenido mediante `getContentOwner()`
2. Si es comentario: eliminación suave mediante `deleteComment()`
3. Si es elemento: eliminar del repositorio Git mediante `itemRepository.delete()`
4. Registrar historial de moderación con acción `CONTENT_REMOVED`
5. Enviar email de notificación de eliminación de contenido al propietario

**Fuente:** `template/lib/services/moderation.service.ts`

### Advertir Usuario

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Emite una advertencia a un usuario incrementando su campo `warningCount`. Los usuarios que ya están baneados no pueden recibir advertencias.

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `userId` | string | ID del perfil de cliente del usuario |
| `reason` | string | Razón de la advertencia |
| `reportId` | string | ID del reporte asociado |
| `adminId` | string | Usuario administrador que realiza la acción |

**Pasos de Procesamiento:**

1. Verificar que el usuario existe y no está ya baneado
2. Incrementar el conteo de advertencias mediante `incrementWarningCount()`
3. Registrar historial de moderación con acción `WARN`
4. Enviar notificación por email de advertencia con el conteo actual de advertencias

**Resultado Exitoso:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Fuente:** `template/lib/services/moderation.service.ts`

### Suspender Usuario

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Suspende una cuenta de usuario estableciendo su estado a `"suspended"` y registrando una marca de tiempo `suspendedAt`. Los usuarios suspendidos no pueden crear comentarios, enviar votos ni presentar reportes.

**Restricciones:**

- Devuelve error si el usuario ya está suspendido
- Devuelve error si el usuario ya está baneado

**Pasos de Procesamiento:**

1. Verificar que el usuario existe y no está ya suspendido o baneado
2. Establecer estado a `"suspended"` con marca de tiempo `suspendedAt`
3. Registrar historial de moderación con acción `SUSPEND`
4. Enviar notificación por email de suspensión

**Fuente:** `template/lib/services/moderation.service.ts`

### Banear Usuario

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Banea permanentemente una cuenta de usuario estableciendo su estado a `"banned"` y registrando una marca de tiempo `bannedAt`. Los usuarios baneados están bloqueados de todas las acciones autenticadas.

**Restricciones:**

- Devuelve error si el usuario ya está baneado

**Pasos de Procesamiento:**

1. Verificar que el usuario existe y no está ya baneado
2. Establecer estado a `"banned"` con marca de tiempo `bannedAt`
3. Registrar historial de moderación con acción `BAN`
4. Enviar notificación por email de baneo

**Fuente:** `template/lib/services/moderation.service.ts`

## Resolución del Propietario del Contenido

La función `getContentOwner()` determina quién posee el contenido reportado:

| Tipo de Contenido | Fuente del Propietario |
|---|---|
| `comment` | Campo `comment.userId` de la tabla de comentarios |
| `item` | Campo `item.submitted_by` del repositorio de elementos |

Esto es usado por todas las acciones de moderación a nivel de usuario (`user_warned`, `user_suspended`, `user_banned`) para identificar al usuario objetivo de la acción.

**Fuente:** `template/lib/services/moderation.service.ts`

## Historial de Moderación

Todas las acciones de moderación crean una pista de audítoría en la tabla de base de datos `moderationHistory`.

### Campos del Registro de Historial

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del registro |
| `userId` | string | ID del perfil de cliente del usuario afectado |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` o `"BAN"` |
| `reason` | string o null | Razón de la acción de moderación |
| `reportId` | string o null | ID del reporte asociado |
| `performedBy` | string o null | ID del administrador que realizó la acción |
| `contentType` | string o null | `"item"` o `"comment"` (para eliminación de contenido) |
| `contentId` | string o null | ID del contenido eliminado |
| `details` | object o null | Contexto adicional (ej. conteo de advertencias, nombre del elemento) |
| `createdAt` | timestamp | Cuándo se realizó la acción |

### Consultas de Historial

| Función | Descripción |
|---------|-------------|
| `getModerationHistoryByUser(userId, limit)` | Obtener todas las acciones de moderación para un usuario (límite por defecto: 50) |
| `getModerationHistoryByReport(reportId)` | Obtener acciones de moderación vinculadas a un reporte específico |

Ambas funciones de consulta enriquecen los resultados con información del perfil del usuario y los detalles del administrador que realizó la acción.

**Fuente:** `template/lib/db/queries/moderation.queries.ts`

## Gestión de Estado del Usuario

### Valores de Estado

| Estado | Descripción |
|--------|-------------|
| `active` | Cuenta normal, todas las características disponibles |
| `suspended` | Temporalmente restringido, no puede crear contenido |
| `banned` | Permanentemente restringido, bloqueado de todas las acciones |

### Operaciones de Base de Datos

| Función | Descripción |
|---------|-------------|
| `suspendUser(userId)` | Establece estado a `"suspended"`, registra `suspendedAt` |
| `unsuspendUser(userId)` | Restaura estado a `"active"`, borra `suspendedAt` |
| `banUser(userId)` | Establece estado a `"banned"`, registra `bannedAt` |
| `unbanUser(userId)` | Restaura estado a `"active"`, borra `bannedAt` |
| `incrementWarningCount(userId)` | Incrementa `warningCount` usando SQL `COALESCE` |

### Verificaciones de Usuario Bloqueado

Dos funciones auxiliares verifican el estado del usuario en toda la aplicación:

- **`isUserBlocked(status)`** -- Devuelve `true` si el estado es `"suspended"` o `"banned"`
- **`getBlockReasonMessage(status)`** -- Devuelve un mensaje orientado al usuario explicando por qué está restringida la acción

Estas verificaciones son usadas por los puntos finales de comentarios, votos y reportes para evitar que los usuarios bloqueados creen contenido.

**Fuente:** `template/lib/db/queries/moderation.queries.ts`

## Notificaciones por Email

El `EmailNotificationService` envía notificaciones no bloqueantes para las acciones de moderación:

| Método | Disparador |
|--------|----------|
| `sendContentRemovedEmail(email, type, reason)` | Contenido eliminado por administrador |
| `sendUserWarningEmail(email, reason, count)` | Advertencia emitida |
| `sendUserSuspensionEmail(email, reason)` | Cuenta suspendida |
| `sendUserBanEmail(email, reason)` | Cuenta baneada |

Todos los envíos de email usan `.catch()` para evitar que los fallos interrumpan el flujo de moderación. Un email fallido no hace que la acción de moderación falle.

## Detalles Clave de Implementación

- **Patrón de Capa de Servicio:** La lógica de moderación vive en `lib/services/moderation.service.ts`, no en los manejadores de rutas API. Esto permite reutilización en diferentes puntos de entrada.
- **Pista de Audítoría:** Cada acción de moderación crea un registro `moderationHistory`, proporcionando un registro de audítoría completo para cumplimiento normativo y revisión.
- **Emails No Bloqueantes:** Las notificaciones por email se envían asíncronamente con manejadores `.catch()`. Si el servicio de email no está disponible, la acción de moderación igual tiene éxito.
- **Restricciones de Idempotencia:** Cada acción verifica el estado actual del usuario antes de proceder. Banear a un usuario ya baneado devuelve un error en lugar de crear una acción duplicada.
- **Eliminación Suave vs. Eliminación Definitiva:** Los comentarios se eliminan suavemente (estableciendo `deletedAt`), mientras que los elementos se eliminan completamente del repositorio Git. Esta diferencia refleja el modelo de almacenamiento (base de datos vs. contenido basado en archivos).
