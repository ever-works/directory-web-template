---
id: pagination-system
title: "Sistema de paginación"
sidebar_label: "Sistema de paginación"
sidebar_position: 45
---

# Sistema de paginación

## Descripción general

El sistema de paginación proporciona utilidades de cálculo de paginación del lado del servidor y navegación de páginas del lado del cliente. Consta de dos módulos pequeños y enfocados: `lib/paginate.ts` para calcular los metadatos de la página (números de página, desplazamientos) y `utils/pagination.ts` para sujetar de forma segura los números de página y activar el comportamiento de desplazamiento hacia arriba en los cambios de página.

## Arquitectura

El sistema de paginación es intencionalmente liviano y se divide en dos capas:

- **`lib/paginate.ts`** (Servidor/compartido) -- Funciones puras para matemáticas de paginación. Se utiliza en rutas API, componentes de servidor y lógica de recuperación de datos para calcular qué segmento de datos devolver.
- **`utils/pagination.ts`** (Cliente): un asistente de interfaz de usuario que ajusta los números de página a rangos válidos y desplaza la página hacia la parte superior. Utilizado por componentes de paginación y vistas de lista.

Ambos módulos son consumidos por los componentes de la interfaz de usuario de paginación y las páginas de listado de contenido. El `ConfigManager` proporciona el valor `itemsPerPage` que alimenta estos cálculos.

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## Referencia de API

### Exportaciones desde `lib/paginate.ts`

#### `PER_PAGE: number`

Elementos predeterminados por constante de página. Valor: `12`.

#### `totalPages(size: number, perPage?: number): number`

Calcula el número total de páginas para un tamaño de colección determinado. Utiliza `Math.ceil()` para garantizar que se incluya la última página parcial.

**Parámetros:**
- `size` -- Número total de elementos de la colección
- `perPage` -- Elementos por página (el valor predeterminado es `PER_PAGE`)

**Devoluciones:** Recuento total de páginas (mínimo 1 para colecciones que no estén vacías)

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

Calcula los metadatos de paginación a partir de un parámetro de página sin formato (que puede venir como una cadena de parámetros de consulta de URL).

**Parámetros:**
- `rawPage`: el número de página solicitado (el valor predeterminado es `1`). Acepta tanto `number` como `string`.
- `perPage` -- Elementos por página (el valor predeterminado es `PER_PAGE`)

**Devoluciones:**
- `page` -- El número de página analizado como un número entero
- `start` -- El desplazamiento del índice de base cero para dividir la matriz de datos

### Exportaciones desde `utils/pagination.ts`

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

Navega de forma segura a una nueva página fijando el valor en el rango válido `[1, total]`, actualizando el estado de la página y desplazando la ventana hacia la parte superior con una animación suave.

**Parámetros:**
- `newPage` -- El número de página solicitado (puede estar fuera de rango)
- `total` -- Número total de páginas
- `setPage` -- Función de establecimiento de estado de reacción para la página actual

**Comportamiento:**
- Sujeta los valores `NaN` a la página 1
- Sujeta los valores inferiores a 1 en la página 1
- Sujeta los valores superiores a `total` a `total`
- Llama a `window.scrollTo({ top: 0, behavior: 'smooth' })` (seguro para SSR; comprueba `typeof window`)

## Detalles de implementación

**Análisis de cadenas**: `paginateMeta` acepta `string | number` para el parámetro `rawPage` porque los parámetros de consulta de URL llegan como cadenas. Utiliza `parseInt()` para la conversión.

**Compensación de base cero**: el valor `start` devuelto por `paginateMeta` se calcula como `(page - 1) * perPage`, lo que proporciona un índice de base cero adecuado para cláusulas `Array.slice()` o SQL `OFFSET`.

**Seguridad SSR**: `clampAndScrollToTop` comprueba `typeof window !== 'undefined'` antes de llamar a `window.scrollTo()`, lo que hace que sea seguro llamar en contextos de representación del lado del servidor.

**Manejo de NaN**: `clampAndScrollToTop` convierte la entrada con `Number()` y vuelve a la página 1 si el resultado es `NaN`.

## Configuración

El tamaño de página predeterminado (`PER_PAGE = 12`) es una constante en `lib/paginate.ts`. El tamaño de la página en tiempo de ejecución se puede anular mediante `ConfigManager`:

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

El `ConfigManager` admite dos tipos de paginación:
- `'standard'` -- Navegación tradicional página por página
- `'infinite'` -- Desplazamiento infinito / patrón de carga-más

## Ejemplos de uso

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## Mejores prácticas

- Utilice siempre `paginateMeta()` para analizar los parámetros de la página de las cadenas de consulta de URL para manejar la coerción de tipos y los valores predeterminados de forma segura.
- Pase la anulación `perPage` de `ConfigManager` en lugar de confiar en la constante `PER_PAGE` codificada cuando el administrador haya cambiado el tamaño de la página.
- Utilice `clampAndScrollToTop()` en toda la navegación de páginas del lado del cliente para evitar números de página fuera de rango y proporcionar una experiencia de usuario consistente.
- Para implementaciones de desplazamiento infinito, use el desplazamiento `start` de `paginateMeta()` para calcular la siguiente porción de elementos a agregar.
- Considere la paginación `type` de `ConfigManager` (`'standard'` frente a `'infinite'`) al elegir qué componente de interfaz de usuario de paginación representar.

## Módulos relacionados

- [Sistema de administrador de configuración] (./config-manager-system): proporciona configuración de paginación en tiempo de ejecución (`type`, `itemsPerPage`)
- [Biblioteca de contenido](/template/architecture/content-library): utiliza paginación para páginas de listado de contenido
