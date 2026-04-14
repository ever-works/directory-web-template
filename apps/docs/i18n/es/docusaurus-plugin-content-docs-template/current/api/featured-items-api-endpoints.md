---
id: featured-items-api-endpoints
title: "Endpoints API Elementos Destacados"
sidebar_label: "API Elementos Destacados"
sidebar_position: 63
---

# Endpoints API Elementos Destacados

La API de Elementos Destacados proporciona un punto final público para recuperar elementos destacados que se muestran en el sitio web. Los elementos destacados son gestionados a través del panel de administración y almacenados en la base de datos con soporte para ordenamiento, activación y fechas de expiración.

**Fuente:** `template/app/api/featured-items/route.ts`

---

## Obtener Elementos Destacados

Devuelve una lista de elementos destacados activos para visualización pública. Filtra automáticamente los elementos inactivos y, opcionalmente, los expirados.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/featured-items` |
| **Autenticación** | Ninguna (público) |

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Valor por defecto | Descripción |
|-----------|------|-----------|-------------------|-------------|
| `limit` | `integer` | No | `6` | Número máximo de elementos destacados a devolver (1-50) |
| `includeExpired` | `boolean` | No | `false` | Si se deben incluir elementos pasada su fecha `featured_until` |

### Respuesta

**Estado 200** -- Elementos destacados recuperados exitosamente.

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
    }
  ],
  "count": 1
}
```

### Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `data` | `array` | Arreglo de objetos de elementos destacados |
| `count` | `number` | Número de elementos destacados devueltos |
| `data[].id` | `string` | ID del registro del elemento destacado |
| `data[].itemSlug` | `string` | Identificador slug del elemento |
| `data[].itemName` | `string` | Nombre para mostrar del elemento |
| `data[].itemDescription` | `string \| null` | Descripción del elemento destacado |
| `data[].itemIconUrl` | `string \| null` | URL del icono del elemento |
| `data[].itemImageUrl` | `string \| null` | URL de la imagen del banner destacado |
| `data[].featuredOrder` | `number` | Orden de visualización (mayor = más prominente) |
| `data[].isActive` | `boolean` | Si el elemento está actualmente destacado |
| `data[].featuredAt` | `string` (ISO 8601) | Cuándo fue destacado el elemento |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Fecha de expiración (`null` = sin expiración) |
| `data[].createdAt` | `string` (ISO 8601) | Marca de tiempo de creación del registro |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Marca de tiempo de última actualización |

### Ordenamiento

Los elementos se ordenan por:
1. `featuredOrder` descendente (el mayor orden primero)
2. `featuredAt` descendente (el más recientemente destacado primero)

### Lógica de Filtrado

El punto final aplica estos filtros:

1. **Solo activos:** Solo se devuelven elementos con `isActive = true`.
2. **Verificación de expiración** (cuando `includeExpired` es `false`):
   - Los elementos con `featuredUntil = null` siempre se incluyen (sin expiración).
   - Los elementos con `featuredUntil >= fecha actual` se incluyen (aún no expirados).
   - Los elementos con `featuredUntil < fecha actual` se excluyen.

### Respuesta de Error

**Estado 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Ejemplos con curl

```bash
# Obtener elementos destacados por defecto (top 6, excluir expirados)
curl -s http://localhost:3000/api/featured-items

# Obtener los 3 primeros elementos destacados
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Incluir elementos destacados expirados
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Combinar parámetros
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### Uso en TypeScript

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Uso
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (order: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Expires: ${item.featuredUntil}`);
  }
});
```

### Notas de Implementación

- La disponibilidad de la base de datos se verifica al inicio mediante `checkDatabaseAvailability()`.
- El parámetro `limit` se analiza de la cadena de consulta con un valor por defecto de `6`. Las entradas superiores a 50 no se recortan (validadas en el lado del cliente).
- Los errores solo se registran en modo desarrollo para evitar ruido en los registros de producción.
- Los elementos destacados se gestionan a través de los puntos finales del panel de administración (ver [Puntos Finales de Administración](/template/api/admin-endpoints)).
- El campo `featuredUntil` admite tanto el destacado permanente (`null`) como el destacado de duración limitada.
