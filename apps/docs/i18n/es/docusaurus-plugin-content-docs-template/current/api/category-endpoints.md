---
id: category-endpoints
title: "Endpoints API de Categorías"
sidebar_label: "Categorías"
sidebar_position: 10
---

# Endpoints API de Categorías

La API de Categorías proporciona un punto final público ligero para verificar si existen categorías en el sistema. Las categorías provienen de la capa de contenido (CMS basado en Git) en lugar de una base de datos, lo que hace que este punto final esté disponible incluso sin conexión a la base de datos.

**Archivo fuente:** `template/app/api/categories/exists/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/categories/exists` | Ninguna | Verificar si existen categorías |

---

## GET `/api/categories/exists`

Verifica si hay categorías disponibles en el repositorio de contenido. Devuelve un indicador booleano `exists` junto con el recuento total. Este punto final es útil para el renderizado condicional de la interfaz -- por ejemplo, ocultar un filtro de categorías cuando no hay categorías definidas.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|-----------|----------------|-------------|
| `locale` | string | No | `"en"` | Código de idioma para obtener categorías localizadas |

### Cómo Funciona

El manejador llama a `fetchItems` desde la capa de contenido con el idioma solicitado y luego inspecciona el array `categories` devuelto:

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

### Forma de la Respuesta

#### 200 -- Categorías Encontradas

```json
{
  "exists": true,
  "count": 12
}
```

#### 200 -- Sin Categorías

```json
{
  "exists": false,
  "count": 0
}
```

#### Manejo de Errores

En caso de error, el punto final devuelve un valor de respaldo seguro en lugar de un error 500. Esto garantiza que los consumidores siempre puedan confiar en la forma de la respuesta:

```json
{
  "exists": false,
  "count": 0
}
```

Los errores solo se registran en modo desarrollo (`NODE_ENV === 'development'`).

### Autenticación

Este es un **punto final público** -- no se requiere autenticación.

### Ejemplo de Uso

```ts
// Verificar si existen categorías antes de renderizar la interfaz de filtros
const res = await fetch('/api/categories/exists?locale=fr');
const { exists, count } = await res.json();

if (exists) {
  console.log(`Se encontraron ${count} categorías`);
  // Renderizar filtro de categorías
}
```

### Notas

- Las categorías provienen de la capa de contenido del CMS basado en Git, no de la base de datos.
- El punto final es consciente del idioma, por lo que diferentes idiomas pueden tener recuentos de categorías distintos.
- Los errores se manejan silenciosamente para evitar romper la interfaz -- el punto final siempre devuelve JSON válido.
- El manejador no establece encabezados de caché; el almacenamiento en caché se gestiona a nivel de infraestructura.

### Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|----------|
| `template/app/api/categories/exists/route.ts` | Manejador de ruta |
| `template/lib/content.ts` | Función `fetchItems` que resuelve categorías |
