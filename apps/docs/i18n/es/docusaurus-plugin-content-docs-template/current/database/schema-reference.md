---
id: schema-reference
title: Referencia de esquema
sidebar_label: Referencia de esquema
sidebar_position: 1
---

# Referencia de esquema

Todas las tablas de la base de datos están definidas en `lib/db/schema.ts`. Este documento cataloga cada tabla, sus columnas clave, relaciones y propósito.

## Usuarios y autenticación

### usuarios

Tabla de usuarios principal, utilizada por NextAuth.js para la autenticación.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID, generado automáticamente|
|`email`|texto|Único|
|`image`|texto|URL de la imagen de perfil|
|`emailVerified`|marca de tiempo|Fecha de verificación del correo electrónico|
|`passwordHash`|texto|Hash Bcrypt para autenticación de credenciales|
|`createdAt`|marca de tiempo|Configuración automática|
|`updatedAt`|marca de tiempo|Configuración automática|
|`deletedAt`|marca de tiempo|eliminación suave|

**Índices**: `users_created_at_idx`

### cuentas

Vínculos de cuentas de OAuth y credenciales, siguiendo el esquema del adaptador NextAuth.js.

|columna|Tipo|Notas|
|--------|------|-------|
|`userId`|texto (FK)|Referencias `users.id` (eliminación en cascada)|
|`type`|texto|Tipo de cuenta (oauth, credenciales, etc.)|
|`provider`|texto|Nombre del proveedor (google, github, credenciales)|
|`providerAccountId`|texto|ID de cuenta específica del proveedor|
|`email`|texto|Correo electrónico de la cuenta|
|`passwordHash`|texto|Para autenticación de credenciales de cliente|
|`refresh_token`|texto|Token de actualización de OAuth|
|`access_token`|texto|token de acceso de OAuth|
|`expires_at`|entero|Caducidad del token|

**Clave principal**: Compuesto en (`provider`, `providerAccountId`)
**Índices**: `accounts_email_idx`, `accounts_provider_idx`

### sesiones

Sesiones de usuarios activos.

|columna|Tipo|Notas|
|--------|------|-------|
|`sessionToken`|texto (PK)|Identificador de sesión|
|`userId`|texto (FK)|Referencias `users.id`|
|`expires`|marca de tiempo|Caducidad de la sesión|

### tokens de verificación

Fichas de verificación de correo electrónico.

|columna|Tipo|Notas|
|--------|------|-------|
|`identifier`|texto|Identificador de usuario|
|`email`|texto|Dirección de correo electrónico|
|`token`|texto|Token de verificación|
|`expires`|marca de tiempo|Caducidad del token|

**Clave principal**: Compuesto en (`identifier`, `token`)

### autenticadores

Almacenamiento de credenciales WebAuthn/FIDO2.

|columna|Tipo|Notas|
|--------|------|-------|
|`credentialID`|texto|Identificador de credencial único|
|`userId`|texto (FK)|Referencias `users.id`|
|`providerAccountId`|texto|Referencia de cuenta del proveedor|
|`credentialPublicKey`|texto|Clave pública para verificación|
|`counter`|entero|Contador de autenticación|

### contraseñaResetTokens

Tokens de restablecimiento de contraseña para el flujo de contraseñas olvidadas.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`email`|texto|Correo electrónico de destino|
|`token`|texto|Token de reinicio único|
|`expires`|marca de tiempo|Caducidad del token|

### registros de actividad

Realiza un seguimiento de las actividades de los usuarios y clientes con fines de auditoría.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|serie (PK)|Incremento automático|
|`userId`|texto (FK)|Referencias `users.id` (anulable)|
|`clientId`|texto (FK)|Referencias `clientProfiles.id` (anulable)|
|`action`|texto|Tipo de actividad (SIGN_UP, SIGN_IN, etc.)|
|`timestamp`|marca de tiempo|Cuando ocurrió la actividad|
|`ipAddress`|varchar(45)|Dirección IP del cliente|

**Índices**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Roles y permisos

### roles

Definiciones de roles para RBAC.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|Identificador de función (por ejemplo, "admin", "cliente")|
|`name`|texto|Nombre de rol único|
|`description`|texto|Descripción legible por humanos|
|`isAdmin`|booleano|Si se trata de una función de administrador|
|`status`|texto|"activo" o "inactivo"|
|`created_by`|texto|¿Quién creó el papel?|

### permisos

Definiciones granulares de permisos.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`key`|texto|Clave de permiso única (por ejemplo, "elementos: crear")|
|`description`|texto|Descripción legible por humanos|

### rolPermisos

Tabla de unión de muchos a muchos que vincula roles con permisos.

|columna|Tipo|Notas|
|--------|------|-------|
|`roleId`|texto (FK)|Referencias `roles.id` (cascada)|
|`permissionId`|texto (FK)|Referencias `permissions.id` (cascada)|

**Clave principal**: Compuesto en (`roleId`, `permissionId`)

### roles de usuario

Tabla de unión de muchos a muchos que vincula a los usuarios con los roles.

|columna|Tipo|Notas|
|--------|------|-------|
|`userId`|texto (FK)|Referencias `users.id` (cascada)|
|`roleId`|texto (FK)|Referencias `roles.id` (cascada)|

**Clave principal**: Compuesto en (`userId`, `roleId`)

## Perfiles de clientes

### perfiles de cliente

Información de perfil ampliada para usuarios de clientes registrados.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `users.id` (única, en cascada)|
|`email`|texto|Correo electrónico del cliente|
|`name`|texto|nombre completo|
|`displayName`|texto|Nombre para mostrar|
|`username`|texto|Nombre de usuario único|
|`bio`|texto|Biografía del usuario|
|`jobTitle`|texto|Título profesional|
|`company`|texto|Nombre de la empresa|
|`industry`|texto|Sector industrial|
|`phone`|texto|Número de teléfono|
|`website`|texto|sitio web personal|
|`location`|texto|Cadena de ubicación|
|`avatar`|texto|URL de avatar|
|`accountType`|texto|"individuo", "negocio" o "empresa"|
|`status`|texto|"activo", "inactivo", "suspendido", "prohibido", "juicio"|
|`plan`|texto|"gratis", "estándar" o "premium"|
|`timezone`|texto|Zona horaria (predeterminada "UTC")|
|`language`|texto|Idioma preferido (predeterminado "en")|
|`country`|texto|código de país|
|`currency`|texto|Moneda preferida (por defecto "USD")|
|`defaultLatitude`|doble|Latitud de ubicación predeterminada|
|`defaultLongitude`|doble|Longitud de ubicación predeterminada|
|`twoFactorEnabled`|booleano|Estado 2FA|
|`totalSubmissions`|entero|Recuento de envíos|
|`warningCount`|entero|Recuento de advertencias de moderación|
|`suspendedAt`|marca de tiempo|Cuando suspendido|
|`bannedAt`|marca de tiempo|Cuando está prohibido|

**Índices**: Múltiples índices en `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Contenido y participación

### comentarios

Comentarios de usuarios sobre artículos.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`content`|texto|Texto del comentario|
|`userId`|texto (FK)|Referencias `clientProfiles.id`|
|`itemId`|texto|babosa de artículo|
|`rating`|entero|Calificación (0-5)|
|`editedAt`|marca de tiempo|Hora de la última edición|
|`deletedAt`|marca de tiempo|eliminación suave|

### votos

Votar a favor o en contra de artículos.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `clientProfiles.id`|
|`itemId`|texto|babosa de artículo|
|`voteType`|texto|"voto a favor" o "voto en contra"|

**Índice único**: (`userId`, `itemId`): un voto por usuario por artículo

### favoritos

Favoritos del usuario (marcadores).

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `users.id`|
|`itemSlug`|texto|babosa de artículo|
|`itemName`|texto|Nombre del elemento desnormalizado|
|`itemIconUrl`|texto|Icono de elemento desnormalizado|
|`itemCategory`|texto|Categoría desnormalizada|

**Índice único**: (`userId`, `itemSlug`)

### Vistas de elementos

Realiza un seguimiento de las vistas diarias únicas de artículos para realizar análisis.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`itemId`|texto|babosa de artículo|
|`viewerId`|texto|ID de espectador anónimo basado en cookies|
|`viewedDateUtc`|texto|Fecha en formato AAAA-MM-DD|
|`viewedAt`|marca de tiempo|Tiempo de visualización exacto|

**Índice único**: (`itemId`, `viewerId`, `viewedDateUtc`): una vista por espectador por día.

## Suscripciones y pagos

### suscripciones

Registros de suscripción de usuarios que admiten múltiples proveedores de pago.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `users.id`|
|`planId`|texto|Identificador del plan (gratis, estándar, premium)|
|`status`|texto|activo, cancelado, caducado, pendiente, en pausa|
|`paymentProvider`|texto|raya, exprimidor de limón, polar, solidgate|
|`subscriptionId`|texto|ID de suscripción del proveedor|
|`customerId`|texto|ID de cliente del proveedor|
|`autoRenewal`|booleano|Renovación automática habilitada|
|`cancelAtPeriodEnd`|booleano|Cancelar al final del período|
|`amount`|entero|Importe de la suscripción (céntimos)|
|`currency`|texto|Código de moneda|
|`interval`|texto|Intervalo de facturación (mes, año)|

**Índices**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (único)

### historial de suscripción

Seguimiento de auditoría para cambios de suscripción.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`subscriptionId`|texto (FK)|Referencias `subscriptions.id`|
|`action`|texto|Cambiar acción|
|`previousStatus`|texto|Estado antes del cambio|
|`newStatus`|texto|Estado después del cambio|

### pagoProveedores

Registro de proveedores de pago disponibles.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`name`|texto|Nombre del proveedor (único)|
|`isActive`|booleano|Si el proveedor está habilitado|

### pagoCuentas

Vincula a los usuarios a sus cuentas de proveedores de pagos.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `users.id`|
|`providerId`|texto (FK)|Referencias `paymentProviders.id`|
|`customerId`|texto|ID de cliente del proveedor|

**Índices únicos**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Administrador y moderación

### notificaciones

Notificaciones de administrador en la aplicación.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `users.id`|
|`type`|texto|artículo_envío, comentario_reportado, etc.|
|`title`|texto|Título de la notificación|
|`message`|texto|Organismo de notificación|
|`isRead`|booleano|Estado de lectura|

### informes

Sistema de reporte de contenidos para artículos y comentarios.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`contentType`|texto|"elemento" o "comentario"|
|`contentId`|texto|ID de contenido reportado|
|`reason`|texto|spam, acoso, inapropiado, otros|
|`status`|texto|pendiente, revisado, resuelto, desestimado|
|`resolution`|texto|contenido_eliminado, usuario_advertido, etc.|
|`reportedBy`|texto (FK)|Referencias `clientProfiles.id`|
|`reviewedBy`|texto (FK)|Referencias `users.id`|

### moderaciónHistoria

Historial completo de acciones de moderación.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`userId`|texto (FK)|Referencias `clientProfiles.id`|
|`action`|texto|advertir, suspender, prohibir, reactivar, desbancar, contenido eliminado|
|`reportId`|texto (FK)|Referencias `reports.id`|
|`performedBy`|texto (FK)|Referencias `users.id`|
|`details`|jsonb|Contexto adicional|

### itemAuditLogs

Realiza un seguimiento de los cambios en los elementos del panel de administración.

|columna|Tipo|Notas|
|--------|------|-------|
|`id`|texto (PK)|UUID|
|`itemId`|texto|Slug de artículo (no FK; los artículos están en Git)|
|`itemName`|texto|Nombre del elemento desnormalizado|
|`action`|texto|creado, actualizado, status_changed, revisado, eliminado, restaurado|
|`changes`|jsonb|Detalles de cambio a nivel de campo|
|`performedBy`|texto (FK)|Referencias `users.id`|

## Otras mesas

### anuncios de patrocinador

Anuncios de artículos patrocinados con ciclo de vida de pago completo.

Columnas clave: `userId`, `itemSlug`, `status` (pago_pendiente, pendiente, rechazado, activo, vencido, cancelado), `interval` (semanal, mensual), `amount`, `paymentProvider`, `subscriptionId`.

### empresas / artículosEmpresas

Registros de empresas y asociaciones de empresas de artículos para listados de directorios.

### encuestas / encuestaRespuestas

Creador de encuestas con definiciones de preguntas basadas en JSON y almacenamiento de respuestas.

### veinteCrmConfig/integraciónMappings

Tablas de integración de CRM para la funcionalidad de sincronización de Twenty CRM. La tabla de configuración aplica un patrón singleton (solo se permite una fila).

### newsletterSuscripciones

Seguimiento de la suscripción al boletín por correo electrónico con marcas de tiempo de suscripción/cancelación de suscripción.

### estado de la semilla

Estado de inicialización de la base de datos de seguimiento de tablas singleton (inicialización, completado, fallido) para evitar operaciones de inicialización simultáneas.

## Tipo Exportaciones

El archivo de esquema exporta tipos de TypeScript para cada tabla utilizando la inferencia de Drizzle:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

Estos tipos se utilizan en toda la aplicación para operaciones de bases de datos con seguridad de tipos.
