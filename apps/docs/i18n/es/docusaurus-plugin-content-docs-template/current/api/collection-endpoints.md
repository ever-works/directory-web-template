---
id: collection-endpoints
title: "Endpoints API de Colecciones"
sidebar_label: "Colecciones"
sidebar_position: 11
---

# Endpoints API de Colecciones

La API de Colecciones proporciona un punto final público para verificar si existen colecciones activas en el sistema. Las colecciones se almacenan en la base de datos y se gestionan a través de la capa del repositorio de colecciones.

**Archivo fuente:** `template/app/api/collections/exists/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/collections/exists` | Ninguna | Verificar si existen colecciones activas |

---

## GET `/api/collections/exists`

Verifica si hay colecciones activas disponibles. Devuelve un indicador booleano `exists` junto con el recuento de colecciones activas. Este es un punto final público utilizado principalmente por el frontend para decidir si renderizar elementos de la interfaz relacionados con colecciones.

### Parámetros de Consulta

Ninguno.

### Cómo Funciona

El manejador usa el `collectionRepository` para obtener todas las colecciones activas y luego verifica si el resultado es un array no vacío:

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

### Forma de la Respuesta

#### 200 -- Colecciones Encontradas

```json
{
  "exists": true,
  "count": 5
}
```

#### 200 -- Sin Colecciones

```json
{
  "exists": false,
  "count": 0
}
```

#### 500 -- Error del Servidor

En caso de fallo, el punto final devuelve un estado 500 con un mensaje de error genérico. La información detallada del error se registra solo en el servidor:

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

### Autenticación

Este es un **punto final público** -- no se requiere autenticación.

### Ejemplo de Uso

```ts
// Verificar si existen colecciones antes de renderizar la sección de colecciones
const res = await fetch('/api/collections/exists');
const data = await res.json();

if (data.exists) {
  console.log(`${data.count} colecciones activas disponibles`);
  // Renderizar navegación de colecciones
}
```

### Diferencias con el Punto Final de Categorías

| Aspecto | Categorías | Colecciones |
|---------|-----------|-------------|
| Fuente de datos | Contenido CMS basado en Git | Base de datos vía capa de repositorio |
| Comportamiento en error | Devuelve 200 con `exists: false` | Devuelve 500 con mensaje de error |
| Soporte de filtros | Parámetro de idioma | Filtro solo-activos (fijo) |
| Requiere base de datos | No | Sí |

### Notas

- Solo se cuentan las colecciones **activas**. Las colecciones inactivas se excluyen mediante el filtro `includeInactive: false`.
- Los errores detallados se registran en el servidor y nunca se exponen al cliente (para evitar divulgación de información).
- El punto final requiere una conexión a la base de datos activa ya que las colecciones están respaldadas por la base de datos.

### Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|----------|
| `template/app/api/collections/exists/route.ts` | Manejador de ruta |
| `template/lib/repositories/collection.repository.ts` | Capa de acceso a datos de colecciones |
