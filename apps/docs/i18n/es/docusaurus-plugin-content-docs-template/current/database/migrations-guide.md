---
id: migrations-guide
title: Guía de migraciones
sidebar_label: Migraciones
sidebar_position: 4
---

# Guía de migraciones

La plantilla de Ever Works utiliza **Drizzle Kit** para las migraciones de bases de datos. Las migraciones son archivos SQL que rastrean los cambios de esquema a lo largo del tiempo, lo que garantiza un estado coherente de la base de datos en todos los entornos y miembros del equipo.

## Cómo funcionan las migraciones

Drizzle Kit compara la definición de esquema actual (`lib/db/schema.ts`) con las migraciones generadas previamente y produce archivos de migración SQL para cualquier diferencia.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## Estructura del directorio de migración

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

El directorio `meta/` contiene los metadatos de seguimiento internos de Drizzle Kit. Los archivos `relations.ts` y `schema.ts` en el directorio de migraciones son instantáneas de referencia y no deben editarse manualmente.

## Comandos

### Generar una migración

Después de modificar `lib/db/schema.ts`, genere una migración:

```bash
pnpm db:generate
```

Esto ejecuta `drizzle-kit generate` que:
1. Lee el esquema actual de `lib/db/schema.ts`
2. Lo compara con la última instantánea de migración.
3. Genera un nuevo archivo SQL en `lib/db/migrations/`
4. Actualiza los metadatos de migración en `meta/`

### Ejecutar migraciones pendientes

Aplique cualquier migración no aplicada a su base de datos:

```bash
pnpm db:migrate
```

Esto llama a `lib/db/migrate.ts` que:
1. Se conecta a la base de datos usando `DATABASE_URL`
2. Comprueba la tabla `drizzle.__drizzle_migrations` para migraciones aplicadas.
3. Ejecuta cualquier migración que no se haya aplicado.
4. Actualiza la tabla de seguimiento.

### Estudio abierto de llovizna

Inicie un editor de base de datos visual:

```bash
pnpm db:studio
```

## Corredor de migración (`lib/db/migrate.ts`)

El corredor de migración (`runMigrations()`) es idempotente y seguro para invocar en cada inicio:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

Comportamientos clave:
- **Idempotente**: Drizzle rastrea las migraciones aplicadas en `drizzle.__drizzle_migrations`; se omiten las migraciones ya aplicadas
- **Registro**: informa las migraciones aplicadas recientemente antes y después de la ejecución.
- **Manejo de errores**: Devuelve `false` en caso de falla con mensajes de error detallados
- **Inicio automático**: Llamado durante el inicio de la aplicación a través de `lib/db/initialize.ts`

## Migración automática al iniciar

La plantilla ejecuta migraciones automáticamente cuando se inicia la aplicación. Esto lo activa `instrumentation.ts`, que llama a `initializeDatabase()` desde `lib/db/initialize.ts`.

El flujo de inicio:
1. Compruebe si `DATABASE_URL` está configurado (omita si no)
2. Ejecute todas las migraciones pendientes
3. Comprobar si la base de datos ha sido sembrada
4. Si no está sembrado, adquiera un bloqueo de aviso y ejecute la semilla.

En producción, las fallas de migración arrojan un error para señalar a los sistemas de monitoreo. En entornos de desarrollo y vista previa, la aplicación continúa con una advertencia.

## Creando nuevas migraciones

### Paso 1: modificar el esquema

Edite `lib/db/schema.ts` para agregar, modificar o eliminar definiciones de tablas:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### Paso 2: Generar la Migración

```bash
pnpm db:generate
```

Esto crea un nuevo archivo SQL como `0029_some_name.sql`.

### Paso 3: revisar el SQL generado

Revise siempre la migración generada antes de aplicarla. Compruebe por:
- Nombres correctos de tablas y columnas.
- Tipos de datos y restricciones adecuados
- Definiciones de índice
- Relaciones de clave externa
- Cualquier operación destructiva (DROP TABLE, DROP COLUMN)

### Paso 4: aplicar la migración

```bash
pnpm db:migrate
```

### Paso 5: comprometerse

Confirme tanto el cambio de esquema como el archivo de migración generado:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (metadatos actualizados)

## Flujo de trabajo del equipo

### Manejo de cambios de esquema simultáneos

Cuando varios miembros del equipo modifican el esquema simultáneamente:

1. Cada desarrollador genera su propia migración localmente
2. Al fusionarse, es posible que sea necesario volver a numerar los archivos de migración si los números de secuencia entran en conflicto
3. Drizzle Kit rastrea las migraciones por hash, no por número, por lo que se maneja la ejecución fuera de orden
4. Después de fusionar, ejecute `pnpm db:migrate` para aplicar todas las migraciones nuevas.

### Consideraciones ambientales

|Medio ambiente|Estrategia de migración|
|-------------|-------------------|
|Desarrollo|Ejecución automática al inicio; generar y probar localmente|
|Vista previa/puesta en escena|Ejecución automática en la implementación a través de `instrumentation.ts`|
|Producción|Ejecución automática durante la implementación; monitorear fallas|

### Mejores prácticas

1. **Una preocupación por migración**: mantenga las migraciones centradas en una sola característica o cambio
2. **Nunca edites migraciones existentes**: una vez que una migración se haya aplicado en cualquier lugar, trátala como inmutable
3. **Revisar SQL generado**: siempre verifique lo que genera Drizzle Kit antes de aplicar
4. **Migraciones de prueba**: ejecute migraciones en una base de datos de prueba antes de implementarlas en producción.
5. **Incluir archivos de migración en la revisión del código**: el SQL de migración debe revisarse como el código de la aplicación.
6. **Haga una copia de seguridad antes de migraciones destructivas**: siempre haga una copia de seguridad antes de ejecutar migraciones que eliminen tablas o columnas.
