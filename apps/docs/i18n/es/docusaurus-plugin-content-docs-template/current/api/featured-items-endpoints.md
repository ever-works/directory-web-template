---
id: featured-items-endpoints
title: "Endpoints API de Elementos Destacados"
sidebar_label: "Elementos Destacados"
sidebar_position: 18
---

# Endpoints API de Elementos Destacados

La API de Elementos Destacados proporciona un punto final público para recuperar elementos que han sido resaltados para una visualización prominente en el sitio web. Los elementos destacados admiten ordenamiento, fechas de expiración y estados activo/inactivo.

**Archivo fuente:** `template/app/api/featured-items/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/featured-items` | Ninguna | Obtener elementos destacados activos para visualización pública |

---

## GET `/api/featured-items`

Devuelve una lista de elementos destacados activos para visualización pública. Filtra automáticamente los elementos inactivos y opcionalmente excluye los expirados según su fecha `featuredUntil`. Los elementos se ordenan por orden destacado (descendente) y fecha destacada (descendente) para una presentación óptima.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Valor por defecto | Descripción |
|-----------|------|-----------|-------------------|-------------|
| `limit` | integer | No | 6 | Máximo de elementos a devolver (1-50) |
| `includeExpired` | boolean | No | `false` | Si se deben incluir elementos pasada su fecha `featuredUntil` |

### Requisito de Base de Datos

El punto final verifica la disponibilidad de la base de datos antes de procesar. Si la base de datos no está configurada, la verificación `checkDatabaseAvailability()` devuelve una respuesta de error apropiada.

### Cómo Funciona

La consulta construye condiciones dinámicamente según los parámetros:

```ts
// Siempre filtrar por elementos activos
const conditions = [eq(featuredItems.isActive, true)];

// Opcionalmente excluir elementos expirados
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Lógica de Ordenamiento

Los elementos se ordenan por dos campos en orden descendente:

1. **`featuredOrder`** -- Los valores más altos aparecen primero (prioridad controlada por el administrador)
2. **`featuredAt`** -- Los elementos destacados más recientemente aparecen primero (desempate)

### Forma de la Respuesta

#### 200 -- Elementos Destacados Recuperados

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- Sin Elementos Destacados

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Error del Servidor

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Modelo de Datos

Cada registro de elemento destacado contiene:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del registro del elemento destacado |
| `itemSlug` | string | Slug del elemento destacado |
| `itemName` | string | Nombre para mostrar |
| `itemDescription` | string (nullable) | Descripción para la visualización destacada |
| `itemIconUrl` | string (nullable) | URL del icono del elemento |
| `itemImageUrl` | string (nullable) | URL de la imagen del banner destacado |
| `featuredOrder` | integer | Prioridad de visualización (mayor = más prominente) |
| `isActive` | boolean | Si está actualmente destacado |
| `featuredAt` | datetime | Cuándo fue destacado el elemento |
| `featuredUntil` | datetime (nullable) | Fecha de expiración (null significa sin expiración) |
| `createdAt` | datetime | Marca de tiempo de creación del registro |
| `updatedAt` | datetime (nullable) | Marca de tiempo de última actualización |

### Comportamiento de Expiración

- Los elementos con `featuredUntil: null` nunca expiran y siempre se incluyen.
- Los elementos con una fecha `featuredUntil` en el pasado se excluyen por defecto.
- Establecer `includeExpired=true` omite el filtrado de expiración (útil para vistas de administrador).

### Ejemplo de Uso

```ts
// Obtener los 3 mejores elementos destacados para la sección hero de la página de inicio
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Featured: ${item.itemName} (order: ${item.featuredOrder})`);
  });
}
```

### Notas

- Los errores solo se registran en modo desarrollo (`NODE_ENV === 'development'`).
- Este es un **punto final público** -- no se requiere autenticación.
- Los elementos destacados son gestionados por administradores a través del panel de administración (ver Puntos Finales de Administración).

---

## Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|----------|
| `template/app/api/featured-items/route.ts` | Punto final público de elementos destacados |
| `template/lib/db/schema.ts` | Definición de la tabla `featuredItems` |
| `template/lib/utils/database-check.ts` | Verificación de disponibilidad de la base de datos |
