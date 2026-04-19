---
id: schema-relationships
title: Relaciones de esquema
sidebar_label: Relaciones de esquema
sidebar_position: 15
---

# Relaciones de esquema

Esta página documenta todas las relaciones de tablas, claves externas y tablas de unión en el esquema de la base de datos de plantilla. El esquema se define en `lib/db/schema.ts` usando Drizzle ORM con PostgreSQL.

## Descripción general de la relación entre entidades

La base de datos se centra en tres entidades principales: **usuarios** (administrador), **client_profiles** (usuarios finales) y **elementos** (almacenados en Git, referenciados por slug). La mayoría de las tablas de participación y comercio se relacionan con estos tres.

## Tablas de autenticación principales

### usuarios

La tabla de identidad de nivel superior para todas las cuentas autenticadas.

**Referenciado por:**
- `accounts.userId` (eliminación en cascada)
- `sessions.userId` (eliminación en cascada)
- `authenticators.userId` (eliminación en cascada)
- `activityLogs.userId` (eliminación en cascada)
- `client_profiles.userId` (eliminación en cascada)
- `subscriptions.userId` (eliminación en cascada)
- `payment_accounts.userId` (eliminación en cascada)
- `notifications.user_id` (eliminación en cascada)
- `favorites.userId` (eliminación en cascada)
- `user_roles.user_id` (eliminación en cascada)
- `reports.reviewed_by` (establecer nulo)
- `sponsor_ads.user_id` (eliminación en cascada)
- `moderation_history.performed_by` (establecer nulo)

### cuentas

OAuth y cuentas de credenciales vinculadas a los usuarios.

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

Clave primaria compuesta en `(provider, providerAccountId)`.

### sesiones

Sesiones de inicio de sesión activas.

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

### autenticadores

Credenciales WebAuthn/contraseña.

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

Clave primaria compuesta en `(userId, credentialID)`.

## Sistema de perfil de cliente

### perfiles_cliente

Perfiles de usuario final con datos de plan, estado y ubicación.

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

El índice único en `userId` garantiza un perfil por usuario.

**Referenciado por:**
- `comments.userId` (eliminación en cascada)
- `votes.userid` (eliminación en cascada)
- `reports.reported_by` (eliminación en cascada)
- `moderation_history.user_id` (eliminación en cascada)
- `activityLogs.clientId` (eliminación en cascada)

## Control de acceso basado en roles

El sistema RBAC utiliza tres tablas en un patrón de muchos a muchos.

### roles

Roles con nombre con bandera de administrador.

### permisos

Claves de permiso individuales (por ejemplo, `items:create`).

### role_permissions (tabla de unión)

Vincula roles a permisos.

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`role_id`|`roles.id`|CASCADA|
|`permission_id`|`permissions.id`|CASCADA|

Clave primaria compuesta en `(role_id, permission_id)`.

### user_roles (tabla de unión)

Asigna roles a los usuarios.

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADA|
|`role_id`|`roles.id`|CASCADA|

Clave primaria compuesta en `(user_id, role_id)`.

### Diagrama de entidad RBAC

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

Un usuario puede tener muchas funciones, cada función puede tener muchos permisos y varios usuarios pueden compartir la misma función.

## Mesas de compromiso

### comentarios

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`client_profiles.id`|CASCADA|

La columna `itemId` almacena el slug del elemento (no una clave externa, ya que los elementos se encuentran en Git).

### votos

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userid`|`client_profiles.id`|CASCADA|

El índice único en `(userid, item_id)` garantiza un voto por usuario por artículo. La columna `item_id` almacena el slug del elemento.

### favoritos

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

El índice único en `(userId, item_slug)` garantiza un favorito por usuario y por artículo. La columna `item_slug` almacena el slug del elemento.

### vistas_item

Sin claves foráneas. Utiliza un índice único en `(item_id, viewer_id, viewed_date_utc)` para la deduplicación diaria.

## Tablas de moderación de contenido

### informes

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`reported_by`|`client_profiles.id`|CASCADA|
|`reviewed_by`|`users.id`|ESTABLECER NULO|

Índices en `content_type`, `content_id`, `status`, `reported_by` y un `(content_type, content_id)` compuesto.

### historia_de_moderación

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`user_id`|`client_profiles.id`|CASCADA|
|`performed_by`|`users.id`|ESTABLECER NULO|
|`report_id`|`reports.id`|ESTABLECER NULO|

## Tablas de pago y suscripción

### suscripciones

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`userId`|`users.id`|CASCADA|

Índice único en `(payment_provider, subscription_id)`.

### historial de suscripción

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`subscription_id`|`subscriptions.id`|CASCADA|

### pagoProveedores

Sin claves foráneas. Almacena los proveedores de pago disponibles.

### pagoCuentas

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADA|
|`providerId`|`paymentProviders.id`|CASCADA|

Índices únicos en `(userId, providerId)` y `(customerId, providerId)`.

## Anuncios de patrocinadores

### anuncios_patrocinador

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`user_id`|`users.id`|CASCADA|
|`reviewed_by`|`users.id`|ESTABLECER NULO|

## Sistema de notificación

### notificaciones

|relación|Objetivo|Al eliminar|
|-------------|--------|-----------|
|`user_id`|`users.id`|CASCADA|

Índices en `user_id`, `type`, `is_read` y `created_at`.

## Registro de actividad

### registros de actividad

|columna|Objetivo|Al eliminar|
|--------|--------|-----------|
|`userId`|`users.id`|CASCADA|
|`clientId`|`client_profiles.id`|CASCADA|

Ambas columnas admiten valores NULL; cada entrada del registro se relaciona con un usuario administrador o un usuario cliente.

## Otras mesas

### newsletterSuscripciones

Sin claves foráneas. La columna `email` tiene un índice único.

### contraseñaResetTokens

Sin claves foráneas. Clave primaria compuesta en `(identifier, token)`.

### tokens de verificación

Sin claves foráneas. Clave primaria compuesta en `(identifier, token)`.

### artículos_destacados

Sin claves foráneas. Utiliza `item_slug` para hacer referencia a elementos basados ​​en Git y `featured_by` como un campo de texto sin formato (no una clave externa).

### encuestas

Sin claves foráneas. La columna `slug` tiene un índice único.

### veinte_crm_config

Sin claves foráneas. Patrón singleton aplicado por un índice de expresión único.

### asignaciones_de_integración

Sin claves foráneas. Índice único en `(ever_id, object_type)`.

### empresas

Sin claves foráneas.

### estado_semilla

Tabla singleton con un índice único en `id`.

## Resumen de eliminación en cascada

Cuando se elimina un **usuario**, lo siguiente se elimina en cascada:

- Cuentas, sesiones, autenticadores.
- Perfiles de clientes (y transitivamente: comentarios, votos, informes de ese cliente, historial de moderación)
- Suscripciones
- cuentas de pago
- Notificaciones
- Favoritos
- Asignaciones de roles de usuario
- Registros de actividad
- Anuncios patrocinados

Cuando se elimina un **perfil de cliente**:

- Comentarios de ese usuario
- Votos de ese usuario
- Informes presentados por ese usuario
- Historial de moderación para ese usuario
- Registros de actividad para ese cliente

Cuando se elimina un **rol**:

- Todas las asignaciones de permisos de rol para ese rol
- Todas las asignaciones de roles de usuario para ese rol

## Referencias de artículos

Los elementos se almacenan en el CMS basado en Git, no en la base de datos. Varias tablas hacen referencia a elementos por slug:

- `comments.itemId` -- elemento slug
- `votes.item_id` -- elemento slug
- `favorites.item_slug` -- elemento slug
- `item_views.item_id` -- elemento slug
- `featured_items.item_slug` -- elemento slug
- `sponsor_ads.item_slug` -- elemento slug

Estas son columnas de texto sin formato sin restricciones de clave externa.

## Documentación relacionada

- [Referencia de esquema](/template/database/schema-reference) -- Documentos de esquema a nivel de columna
- [Patrones de llovizna](/template/database/drizzle-patterns) -- Patrones de uso de ORM
- [Guía de migraciones](/template/database/migrations-guide) -- Migraciones de bases de datos
