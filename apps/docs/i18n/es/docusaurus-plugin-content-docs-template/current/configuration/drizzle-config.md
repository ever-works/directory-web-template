---
id: drizzle-config
title: Configuración de Drizzle ORM
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Configuración de Drizzle ORM

Esta página documenta la configuración de Drizzle ORM utilizada por el template para la gestión de esquemas de base de datos, migraciones y construcción de consultas con seguridad de tipos. La configuración se encuentra en `drizzle.config.ts` en la raíz del proyecto.

## Descripción General

El template utiliza [Drizzle ORM](https://orm.drizzle.team/) con PostgreSQL como dialecto de base de datos. Drizzle proporciona acceso a la base de datos con seguridad de tipos, generación automática de migraciones y un estudio visual para inspeccionar la base de datos.

## Archivo de Configuración

La configuración completa está definida en `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Use a dummy URL if DATABASE_URL is not set (DB is optional for this project)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Propiedades de Configuración

### `schema`

- **Valor:** `"./lib/db/schema.ts"`
- **Propósito:** Apunta al archivo que contiene todas las definiciones de tablas de Drizzle. Aquí se encuentran sus declaraciones `pgTable`.

El archivo de esquema en `lib/db/schema.ts` define tablas usando los builders de columnas PostgreSQL de Drizzle:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...columnas adicionales
});
```

### `out`

- **Valor:** `"./lib/db/migrations"`
- **Propósito:** Directorio donde se almacenan los archivos de migración SQL generados. Cada vez que ejecuta `drizzle-kit generate`, aquí aparecen nuevos archivos de migración.

### `dialect`

- **Valor:** `"postgresql"`
- **Propósito:** Especifica el motor de base de datos. El template apunta a PostgreSQL para implementaciones en producción.

### `dbCredentials`

- **Valor:** `{ url: databaseUrl }`
- **Propósito:** Cadena de conexión para la base de datos. Se lee de la variable de entorno `DATABASE_URL`.

## Carga de Variables de Entorno

La configuración carga variables de entorno desde dos archivos, en orden:

1. `.env` -- Variables de entorno base
2. `.env.local` -- Anulaciones locales (tienen prioridad)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Este enfoque de carga doble permite mantener valores predeterminados compartidos en `.env` mientras se anulan URLs de bases de datos y secretos localmente.

## URL de Base de Datos de Reserva

La configuración incluye una URL dummy de reserva:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Esta reserva existe porque la base de datos es opcional para este proyecto. Permite que los comandos de Drizzle Kit como `generate` se ejecuten incluso cuando no hay una base de datos real disponible — útil durante CI/CD o la configuración inicial del proyecto.

## Comandos Comunes

El template define varios scripts relacionados con la base de datos en `package.json`:

| Comando | Descripción |
|---------|-------------|
| `pnpm db:generate` | Generar archivos de migración a partir de cambios en el esquema |
| `pnpm db:migrate` | Aplicar migraciones pendientes a la base de datos |
| `pnpm db:seed` | Poblar la base de datos con datos iniciales |
| `pnpm db:studio` | Abrir Drizzle Studio para gestión visual de la base de datos |

### Generando Migraciones

Después de modificar el esquema en `lib/db/schema.ts`, genere una nueva migración:

```bash
pnpm db:generate
```

Esto crea un nuevo archivo de migración SQL en `lib/db/migrations/` que contiene las instrucciones DDL necesarias para sincronizar la base de datos con su esquema.

### Ejecutando Migraciones

Aplicar todas las migraciones pendientes:

```bash
pnpm db:migrate
```

### Migración Automática al Iniciar

El template también admite migraciones automáticas durante el inicio de la aplicación a través del archivo de instrumentación. Esto sirve como reserva para implementaciones de vista previa:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // In production, re-throw to signal critical failure
    // In development, allow app to start for debugging
  }
}
```

Para builds de producción en Vercel, las migraciones en tiempo de compilación mediante `scripts/build-migrate.ts` son el enfoque preferido.

## Configurando DATABASE_URL

### Desarrollo Local (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Producción

Establezca `DATABASE_URL` en las variables de entorno de su proyecto Vercel, apuntando típicamente a una instancia PostgreSQL gestionada (Neon, Supabase, Railway, etc.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Seguridad de Tipos

Dado que Drizzle genera tipos TypeScript directamente desde su esquema, todas las consultas se verifican completamente por tipos en tiempo de compilación. No se requiere ningún paso separado de generación de código -- el archivo de esquema en sí es la única fuente de verdad tanto para la estructura de la base de datos como para los tipos TypeScript.

## Recursos Relacionados

- [Referencia de Entorno](/template/configuration/environment-reference) -- Lista completa de variables de entorno incluyendo `DATABASE_URL`
- [Verificación de Estado de la Base de Datos](/template/guides/database-health-check) -- Monitoreo de la conectividad de la base de datos
- [Guía de Instrumentación](/template/guides/instrumentation) -- Inicialización automática de la base de datos al iniciar
