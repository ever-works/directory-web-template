---
id: categories-api-endpoints
title: "Endpoints API Categorías"
sidebar_label: "API Categorías"
sidebar_position: 56
---

# Endpoints API Categorías

La API de Categorías proporciona un punto final público para verificar si existe alguna categoría en el sistema de contenido. Las categorías provienen del repositorio de contenido basado en Git y representan la taxonomía de nivel superior para organizar elementos.

**Fuente:** `template/app/api/categories/exists/route.ts`

---

## Verificar Existencia de Categorías

Verifica si hay categorías disponibles en el sistema y devuelve el recuento.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/categories/exists` |
| **Autenticación** | Ninguna (pública) |

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|-----------|----------------|-------------|
| `locale` | `string` | No | `"en"` | Código de idioma para obtener categorías (p. ej., `en`, `fr`, `de`) |

### Respuesta

**Estado 200** -- Existencia de categorías verificada exitosamente.

```json
{
  "exists": true,
  "count": 12
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `exists` | `boolean` | Si existen categorías |
| `count` | `number` | Número de categorías encontradas |

### Manejo de Errores

En caso de error, el punto final devuelve una respuesta `200` con valores predeterminados seguros en lugar de un código de error:

```json
{
  "exists": false,
  "count": 0
}
```

Este comportamiento a prueba de fallos garantiza que la interfaz pueda degradarse con elegancia cuando el sistema de contenido no esté disponible.

### Ejemplo con curl

```bash
# Verificar si existen categorías (idioma predeterminado)
curl -s http://localhost:3000/api/categories/exists

# Verificar categorías para el idioma francés
curl -s http://localhost:3000/api/categories/exists?locale=fr
```

### Uso en TypeScript

```typescript
interface CategoriesExistResponse {
  exists: boolean;
  count: number;
}

async function checkCategoriesExist(locale: string = 'en'): Promise<CategoriesExistResponse> {
  const res = await fetch(`/api/categories/exists?locale=${locale}`);
  return res.json();
}

// Uso
const { exists, count } = await checkCategoriesExist('en');
if (exists) {
  console.log(`Se encontraron ${count} categorías`);
}
```

### Notas de Implementación

- Las categorías se obtienen del CMS basado en Git mediante `fetchItems()` desde `@/lib/content`.
- El punto final no requiere autenticación -- está diseñado para uso de la interfaz pública para renderizar condicionalmente elementos de navegación de categorías.
- Los errores solo se registran en modo desarrollo (`NODE_ENV === 'development'`).
- El parámetro `locale` se mapea a la opción `lang` en la capa de obtención de contenido.
