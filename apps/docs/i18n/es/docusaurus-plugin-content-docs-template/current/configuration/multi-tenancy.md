---
id: multi-tenancy
title: Configuración Multi-Tenant
sidebar_label: Multi-Tenant
sidebar_position: 13
---

# Configuración Multi-Tenant

Este documento explica cómo funciona el soporte multi-tenant en el Directory Web Template.

## Visión General

La plantilla usa un enfoque de **base de datos compartida con aislamiento a nivel de fila**:

- Una única base de datos PostgreSQL sirve a múltiples **inquilinos** (sitios web de directorio).
- Cada tabla tiene una columna `tenant_id` que circunscribe los datos a un inquilino específico.
- Todas las consultas filtran automáticamente por el inquilino actual — sin filtraciones de datos entre inquilinos.

## Configuración Rápida

### 1. Establecer la Variable de Entorno

En su plataforma de despliegue (Vercel, Docker, etc.) o `.env.local`:

```bash
TENANT_ID="your-unique-tenant-id"
```

Puede ser cualquier cadena única (p. ej., un UUID o un slug legible como `"my-directory"`).

### 2. Desplegar

En el primer arranque, la aplicación:

1. Ejecutará migraciones de base de datos (añade la columna `tenant_id` si no está presente)
2. Creará una fila de inquilino que coincida con el valor de `TENANT_ID`
3. Migrará los datos `tenant_id` NULL existentes a su inquilino
4. Poblará los datos predeterminados (usuario administrador, roles, permisos)

No se requiere SQL manual — todo es automático.

### 3. Verificar

Revise los logs del servidor para:

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Cómo Funciona la Resolución del Inquilino

Cuando la aplicación necesita determinar el inquilino actual, usa una estrategia en **cascada**:

| Prioridad | Fuente             | Descripción                                                        |
| --------- | ------------------ | ------------------------------------------------------------------ |
| 1         | **Sesión**         | `user.tenantId` del token JWT (usuarios autenticados)              |
| 2         | **Variable Env**   | Variable de entorno `TENANT_ID`                                    |
| 3         | **Cabecera HTTP**  | Cabecera `x-tenant-domain` (para enrutamiento por subdominio)      |
| 4         | **Base de Datos**  | Primera fila de inquilino activa (fallback último)                 |

La función `getTenantId()` de `lib/auth/tenant.ts` implementa esta cadena y es llamada por cada consulta a la base de datos.

## Arquitectura

### Archivos Clave

| Archivo                                  | Propósito                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` — resolución del inquilino en el servidor con caché         |
| `lib/config/env.ts`                      | Validación de la variable de entorno `TENANT_ID`                            |
| `lib/db/schema.ts`                       | Tabla de inquilinos + FK `tenant_id` en todas las tablas                    |
| `lib/db/initialize.ts`                   | Crea automáticamente el inquilino del entorno + ejecuta migración de datos al arrancar |
| `lib/db/migrate-tenant-data.ts`          | Asigna filas con `tenant_id` NULL al inquilino actual                       |
| `lib/auth/index.ts`                      | Los callbacks JWT/sesión inyectan `tenantId`                                |
| `components/context/tenant-provider.tsx` | Contexto React para acceso al inquilino en el cliente                       |
| `app/api/tenant/route.ts`                | `GET /api/tenant` — devuelve información del inquilino actual               |

### Flujo de Datos

```
Solicitud del Usuario → getTenantId() → Resuelve desde sesión/env/cabeceras/DB
                                                  ↓
                             Todas las consultas DB filtran por este tenant_id
                                                  ↓
                              Solo se devuelven datos para este inquilino
```

### Integración con Autenticación

- **Inicio de sesión con credenciales**: Los usuarios admin y cliente obtienen su `tenantId` de la columna `users.tenant_id`.
- **Inicio de sesión OAuth**: El adaptador Drizzle está envuelto para inyectar `tenantId` al crear el usuario.
- **Callback JWT**: Lee `tenantId` del registro del usuario y lo incorpora en el token.
- **Callback de sesión**: Propaga `tenantId` a `session.user.tenantId`.
- **Componentes cliente**: Usan el hook `useTenant()` de `TenantProvider` para información del inquilino.

## Múltiples Directorios (Multi-Tenant)

Para ejecutar múltiples sitios web de directorio en una única base de datos:

1. **Cada sitio web** establece un `TENANT_ID` diferente en su entorno:
    - Sitio A: `TENANT_ID="directory-a-uuid"`
    - Sitio B: `TENANT_ID="directory-b-uuid"`

2. **Todos los sitios web** se conectan a la **misma base de datos** (`DATABASE_URL`).

3. **El aislamiento de datos** es automático — el Sitio A solo ve filas donde `tenant_id = 'directory-a-uuid'`.

4. **Usuarios, roles, comentarios, suscripciones** y todos los demás datos están completamente aislados por inquilino.

## Manejo de Datos Existentes

Al actualizar desde una versión sin inquilinos:

- La columna `tenant_id` se añade como **nullable** (no rompe datos existentes)
- En el primer arranque, `migrateNullTenantIds()` asigna automáticamente las filas NULL al inquilino resuelto
- Esta migración es **idempotente** — segura para ejecutar múltiples veces
- Después de la migración, todos los datos existentes son visibles bajo el inquilino actual

## Enrutamiento por Subdominio (Avanzado)

Para el enrutamiento de inquilinos basado en subdominio (p. ej., `inquilino-a.example.com`):

1. Configure su reverse proxy para añadir la cabecera `x-tenant-domain`
2. Cree registros de inquilinos con los campos `domain` o `slug`:
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. La estrategia `resolveFromHeaders()` coincidirá con el dominio y resolverá el inquilino

## Esquema de la Tabla de Inquilinos

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
