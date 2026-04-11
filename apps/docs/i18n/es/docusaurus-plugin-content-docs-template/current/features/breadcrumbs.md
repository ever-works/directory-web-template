---
id: breadcrumbs
title: Navegación de ruta de navegación
sidebar_label: Pan rallado
sidebar_position: 26
---

# Navegación de ruta de navegación

La plantilla proporciona un sistema de navegación de ruta de navegación con componentes de interfaz de usuario reutilizables, rutas de navegación específicas de la página y soporte de internacionalización. Las rutas de navegación mejoran tanto la navegación del usuario como el SEO al mostrar la jerarquía de páginas actual.

## Descripción general de la arquitectura

Las rutas de navegación se implementan en tres niveles:

| Capa | Archivo | Propósito |
|-------|------|---------|
| **IU reutilizable** | `components/ui/breadcrumb.tsx` | Componente de ruta de navegación genérico que acepta una variedad de elementos |
| **Detalle del artículo** | `components/item-detail/breadcrumb.tsx` | Ruta de navegación específica del artículo con reconocimiento de categoría |
| **Colecciones** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | Ruta de navegación de la página de colecciones con i18n |

## Componente de ruta de navegación reutilizable

El componente de ruta de navegación base vive en `components/ui/breadcrumb.tsx` y acepta una variedad escrita de elementos de ruta de navegación.

### Interfaz de elemento de ruta de navegación

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Cada elemento tiene un `label` para mostrar y un `href` opcional para vincular. El último elemento de la matriz se representa automáticamente como texto sin formato (la página actual) en lugar de como un enlace.

### Accesorios de ruta de navegación

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **elementos**: conjunto de segmentos de ruta de navegación que se mostrarán después del enlace Inicio
- **homeLabel**: etiqueta para el enlace de inicio (el valor predeterminado es `'Home'` )
- **className** -- Clases CSS adicionales para aplicar al elemento de navegación

### Uso básico

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### Comportamiento de renderizado

El componente representa un elemento `nav` accesible con una lista ordenada:

1. **Enlace de inicio**: siempre se muestra primero con un ícono de casa SVG y el texto `homeLabel` 2. **Elementos intermedios** -- Representados como `Link` elementos en los que se puede hacer clic (desde `next/link` ) con separadores de chevron
3. **Último elemento** -- Representado como un simple `span` con `aria-current="page"` para accesibilidad

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## Ruta de navegación detallada del artículo

El componente `ItemBreadcrumb` en `components/item-detail/breadcrumb.tsx` está diseñado específicamente para páginas de detalles de artículos. Se integra automáticamente con el sistema de categorías.

### Accesorios

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### Navegación basada en categorías

La ruta de navegación del elemento utiliza el gancho `useCategoriesEnabled` para representar condicionalmente el segmento de categoría. Cuando las categorías están habilitadas, la ruta de navegación muestra:

**Inicio** > **Nombre de categoría** > **Nombre del artículo**

Cuando las categorías están deshabilitadas, se simplifica:

**Inicio** > **Nombre del artículo**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### Generación de babosas

El componente procesa identificadores de categoría a través de la utilidad `slugify` para generar rutas URL seguras:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

Los enlaces de categorías siguen el patrón `/categories/{encoded-slug}` .

### Truncamiento de texto

El nombre del elemento se trunca a un ancho máximo de 200 px utilizando las clases `truncate max-w-[200px]` Tailwind, lo que evita que los nombres de elementos largos rompan el diseño.

## Ruta de navegación de colecciones

El componente `CollectionsBreadcrumb` en `app/[locale]/collections/components/collections-breadcrumb.tsx` demuestra el patrón compatible con i18n.

### Internacionalización

Este componente utiliza `next-intl` para traducir las etiquetas de ruta de navegación:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

Las claves de traducción se definen en el directorio `messages/` para cada configuración regional admitida.

## Estilo y modo oscuro

Todos los componentes de ruta de navegación admiten el modo oscuro a través de las clases de prefijo `dark:` de Tailwind:

| Elemento | Modo de luz | Modo oscuro |
|---------|-----------|-----------|
| Texto | `text-black` | `dark:text-white` |
| Enlaces | `text-gray-800` | `dark:text-white/50` |
| Iconos de Chevron | `text-dark--theme-800` | `dark:text-white/50` |
| Estado de desplazamiento | `hover:text-gray-900` | `dark:hover:text-white` |

Las transiciones se aplican con `transition-colors duration-300` para lograr efectos de desplazamiento suaves.

## Accesibilidad

Los componentes de ruta de navegación siguen las mejores prácticas de navegación de ruta de navegación WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** en el elemento `nav` identifica el punto de referencia
- ** `aria-current="page"` ** en el último elemento de ruta de navegación marca la página actual
- ** `aria-hidden="true"` ** en los íconos SVG decorativos (inicio y chevron) los oculta de los lectores de pantalla
- **HTML semántico** utiliza la estructura `nav > ol > li` para un esquema adecuado del documento.

## Agregar rutas de navegación personalizadas

Para crear una nueva ruta de navegación para una página específica, utilice el componente reutilizable `Breadcrumb` :

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

Para páginas que necesitan etiquetas traducidas, ajuste el componente y pase cadenas traducidas:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## Archivos relacionados

| Archivo | Descripción |
|------|-------------|
| `components/ui/breadcrumb.tsx` | Componente de ruta de navegación genérico reutilizable |
| `components/item-detail/breadcrumb.tsx` | Ruta de navegación de la página de detalles del artículo |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | Ruta de navegación de la página de colecciones |
| `hooks/use-categories-enabled.ts` | Gancho para comprobar si la función de categorías está activa |
| `lib/utils/slug.ts` | Utilidades de generación de slugs ( `slugify` , `deslugify` ) |
