---
id: internal-api-endpoints
title: "Endpoints API Internos"
sidebar_label: "API Internos"
sidebar_position: 64
---

# Endpoints API Internos

La API Interna proporciona puntos finales a nivel de sistema utilizados para operaciones de infraestructura. Estos puntos finales están restringidos al modo de desarrollo y no son accesibles en producción.

**Directorio fuente:** `template/app/api/internal/`

---

## Inicialización de Base de Datos

Dispara la migración automática y la siembra de la base de datos si aún no está inicializada.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/internal/db-init` |
| **Autenticación** | Solo modo desarrollo |
| **Runtime** | `nodejs` |
| **Caché** | `force-dynamic` |
| **Fuente** | `internal/db-init/route.ts` |

### Seguridad

Este punto final **solo es accesible en modo de desarrollo** (`NODE_ENV === 'development'`). En producción, devuelve una respuesta `403 Forbidden`.

### Respuesta

**Estado 200** -- Inicialización de base de datos completada.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Estado 403** -- Entorno de producción (acceso denegado).

```json
{
  "error": "Not available in production"
}
```

**Estado 500** -- La inicialización falló.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### Qué Hace

Cuando se invoca, el punto final importa y ejecuta dinámicamente `initializeDatabase()` desde `@/lib/db/initialize`, que:

1. Ejecuta las migraciones de base de datos Drizzle pendientes.
2. Siembra datos iniciales si la base de datos está vacía (ej. usuario administrador predeterminado, configuración inicial).
3. Garantiza que el esquema de la base de datos esté actualizado para el desarrollo.

### Ejemplo con curl

```bash
# Inicializar base de datos (solo desarrollo)
curl -s http://localhost:3000/api/internal/db-init
```

### Uso en TypeScript

```typescript
// Normalmente se llama durante la configuración de desarrollo
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed:', data.error);
  }
}
```

### Notas de Implementación

- La función `initializeDatabase()` se importa dinámicamente usando `await import()` para evitar cargar código de inicialización de base de datos en los bundles de producción.
- La ruta está configurada con `export const runtime = 'nodejs'` para garantizar que se ejecute en el runtime de Node.js (no el Edge runtime), ya que las operaciones de base de datos requieren las APIs completas de Node.js.
- La ruta usa `export const dynamic = 'force-dynamic'` para evitar que Next.js almacene en caché la respuesta.
- El manejo de errores usa `safeErrorResponse()` para devolver mensajes de error genéricos mientras registra errores detallados en el servidor.
- Este punto final está diseñado para uso durante la configuración del desarrollo local y los pipelines de CI/CD. Nunca debe exponerse en producción.

### Comandos Relacionados

Para operaciones manuales de base de datos fuera de la API, use los comandos CLI:

```bash
# Generar archivos de migración
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate

# Sembrar base de datos
pnpm db:seed

# Abrir studio de base de datos
pnpm db:studio
```
