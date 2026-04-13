---
id: collections-api-endpoints
title: "Endpoints API Colecciones"
sidebar_label: "API Colecciones"
sidebar_position: 57
---

# Endpoints API Colecciones

La API de Colecciones proporciona un punto final público para verificar si existen colecciones activas en la base de datos. Las colecciones son agrupaciones curadas de elementos gestionadas a través del panel de administración y almacenadas en la base de datos mediante el repositorio de colecciones.

**Fuente:** `template/app/api/collections/exists/route.ts`

---

## Verificar Existencia de Colecciones

Verifica si hay colecciones activas disponibles en el sistema.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/collections/exists` |
| **Autenticación** | Ninguna (pública) |

### Parámetros de Consulta

Ninguno.

### Respuesta

**Estado 200** -- Existencia de colecciones verificada exitosamente.

```json
{
  "exists": true,
  "count": 5
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `exists` | `boolean` | Si existen colecciones activas |
| `count` | `number` | Número de colecciones activas |

### Respuesta de Error

**Estado 500** -- Error interno del servidor.

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `exists` | `boolean` | Siempre `false` en caso de error |
| `count` | `number` | Siempre `0` en caso de error |
| `error` | `string` | Mensaje de error genérico (los errores detallados se registran solo en el servidor) |

### Ejemplo con curl

```bash
# Verificar si existen colecciones activas
curl -s http://localhost:3000/api/collections/exists
```

### Uso en TypeScript

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

// Uso
const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`Se encontraron ${count} colecciones activas`);
} else {
  console.log('No hay colecciones disponibles');
}
```

### Notas de Implementación

- Las colecciones se obtienen de la base de datos vía `collectionRepository.findAll()` con `includeInactive: false`, lo que significa que solo se cuentan las colecciones activas.
- A diferencia del punto final de categorías, este punto final devuelve un estado `500` adecuado en caso de error en lugar de devolver valores predeterminados seguros silenciosamente.
- La respuesta de error incluye un campo `error` genérico -- la información detallada del error se registra en el servidor para evitar la divulgación de información.
- Este punto final es utilizado por el frontend para renderizar condicionalmente la sección de navegación de colecciones.
