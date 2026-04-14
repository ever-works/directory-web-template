---
id: component-patterns
title: Arquitectura y patrones de componentes
sidebar_label: Patrones de componentes
sidebar_position: 7
---

# Arquitectura y patrones de componentes

La plantilla Ever Works organiza sus componentes de React utilizando una estructura de directorio basada en funciones, con una clara separación entre los componentes de funciones, los componentes compartidos y las primitivas de la interfaz de usuario básica.

## Organización del directorio

El directorio `components/` sigue una organización que prioriza las funciones, donde cada dominio principal tiene su propio subdirectorio, junto con componentes compartidos y a nivel de interfaz de usuario.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## Componentes basados en funciones

Cada directorio de funciones contiene todos los componentes relacionados con ese dominio. Esto mantiene el código relacionado ubicado en el mismo lugar y facilita la búsqueda de componentes para una característica determinada.

### administrador/

Contiene todos los componentes del panel de administración, incluidas tablas de datos, formularios, modales e interfaces de administración. Estos son componentes de cliente que utilizan enlaces específicos de administrador de `hooks/use-admin-*.ts`.

### autenticación/

Componentes de autenticación que incluyen formularios de inicio de sesión, formularios de registro, flujos de restablecimiento de contraseña, botones OAuth y pantallas de verificación de correo electrónico.

### facturación/

Componentes de gestión de suscripciones y facturación que incluyen selección de planes, formularios de métodos de pago, visualización de facturas e indicadores de estado de suscripción.

### filtros/

Componentes de búsqueda y filtrado utilizados en las páginas de listado. Estos interactúan con los parámetros de búsqueda de URL y el estado del filtro Zustand para proporcionar filtrado en tiempo real.

### precios/

Componentes de la página de precios que incluyen tarjetas de comparación de planes, matrices de características e integración de pago.

## Componentes compartidos

### compartido/

El directorio `shared/` contiene componentes reutilizables que se utilizan en múltiples funciones. Estos son bloques de construcción independientes del dominio que combinan primitivas de interfaz de usuario en patrones funcionales.

### tarjeta compartida/

Componentes de tarjeta compartidos que se utilizan para mostrar elementos, colecciones y otro contenido en diseños de tarjetas en toda la aplicación.

## Componentes de nivel raíz

Existen varios archivos de componentes independientes en la raíz de `components/`:

|Componente|Propósito|
|-----------|---------|
|`categories-grid.tsx`|Visualización de cuadrícula para categorías|
|`custom-hero.tsx`|Sección de héroe personalizable|
|`error-boundary.tsx`|Límite de error con interfaz de usuario alternativa|
|`error-provider.tsx`|Proveedor de contexto de error|
|`favorite-button.tsx`|Botón de alternar favorito|
|`hero.tsx`|Sección de héroe predeterminada|
|`item.tsx`|Componente de tarjeta de artículo|
|`items-categories.tsx`|Artículos organizados por categorías|
|`item-skeleton.tsx`|Cargando esqueleto para artículos|
|`item-tags.tsx`|Visualización de etiquetas para artículos|
|`language-switcher.tsx`|Componente de conmutación local|
|`layout-switcher.tsx`|Alternar diseño de cuadrícula/lista|
|`report-button.tsx`|Botón de informe de contenido|
|`sort-menu.tsx`|Menú desplegable de opciones de clasificación|
|`tags-cards.tsx`|Visualización de tarjeta de etiqueta|
|`tags-items.tsx`|Artículos por visualización de etiquetas|
|`theme-toggler.tsx`|Alternar tema claro/oscuro|
|`universal-pagination.tsx`|Componente de paginación reutilizable|
|`view-toggle.tsx`|Alternar modo de visualización|

## Primitivas de UI (componentes/ui/)

El directorio `ui/` contiene componentes de interfaz de usuario de nivel básico que proporcionan la base del sistema de diseño. Estos están construidos sobre HeroUI (anteriormente NextUI) y Tailwind CSS.

Las primitivas clave de la interfaz de usuario incluyen:

|Componente|Descripción|
|-----------|-------------|
|`button.tsx`|Botón con variantes (primario, secundario, fantasma, etc.)|
|`card.tsx`|Contenedor de tarjetas con secciones de encabezado, cuerpo y pie de página|
|`input.tsx`|Entrada de texto con soporte de validación|
|`label.tsx`|Componente de etiqueta de formulario|
|`modal.tsx`|Diálogo modal con superposición|
|`select.tsx`|Seleccione el menú desplegable con capacidad de búsqueda|
|`pagination.tsx`|Componente de navegación de página|
|`badge.tsx`|Componente de insignia de estado|
|`accordion.tsx`|Secciones de contenido ampliables|
|`alert.tsx`|Banner de alerta/notificación|
|`breadcrumb.tsx`|Navegación de ruta de navegación|
|`loading-spinner.tsx`|Indicador de carga|
|`password-strength.tsx`|Medidor de seguridad de contraseña|
|`rating.tsx`|Visualización/entrada de calificación de estrellas|
|`infinity-scroll.tsx`|Envoltorio de desplazamiento infinito|
|`searchable-select.tsx`|Seleccionar con filtrado de búsqueda|
|`animations.tsx`|Componentes de la utilidad de animación|
|`auth-illustrations.tsx`|Ilustraciones de la página de autenticación|

## Componentes de servidor versus cliente

La plantilla sigue las convenciones de Next.js para la separación de componentes de servidor y cliente:

### Componentes del servidor

Los componentes del servidor son los predeterminados en App Router. Se utilizan para:
- Diseños de página y envoltorios
- Obtención de datos a nivel de página
- Representación de contenido estático
- Contenido crítico para SEO

Los componentes del servidor se encuentran principalmente en `app/[locale]/` archivos de página y diseño. Pueden importar directamente funciones de consulta de bases de datos y métodos de repositorio.

### Componentes del cliente

Los componentes del cliente están marcados con `'use client'` y se utilizan para:
- Elementos interactivos de la interfaz de usuario (formularios, botones, conmutadores)
- Componentes que usan ganchos de React (useState, useEffect, ganchos personalizados)
- Componentes que utilizan API del navegador
- Componentes que dependen de React Query o Zustand

La mayoría de los componentes del directorio `components/` son componentes de cliente porque manejan la interacción y el estado del usuario.

## Proveedores de contexto

### componentes/contexto/

Proveedores de contexto de React para compartir el estado entre árboles de componentes:
- Contexto de error para el estado límite de error
- Contexto del indicador de característica para la activación de características en tiempo de ejecución

### componentes/proveedores/

Componentes contenedores de proveedores que componen varios proveedores:
- Consultar proveedor de cliente (TanStack Query)
- Proveedor de temas
- Proveedor de sesión (NextAuth)
- Proveedor de brindis

El contenedor de proveedores raíz en `app/[locale]/providers.tsx` compone todos los proveedores necesarios para la aplicación.

## Convenciones de componentes

1. **Nombres de archivos**: los componentes utilizan nombres de archivos tipo kebab (p. ej., `favorite-button.tsx`)
2. **Patrón de exportación**: los componentes utilizan exportaciones con nombre, archivos de barril (`index.ts`) en directorios de funciones
3. **Coubicación de ganchos**: los ganchos específicos de funciones se encuentran en el directorio `hooks/` de nivel superior, no dentro de los directorios de componentes.
4. **Estilo**: Los componentes utilizan clases de utilidad Tailwind CSS; algunos usan módulos SCSS para estilos complejos
5. **Tipos**: Los tipos de accesorios de componentes se definen en línea o en archivos de tipos adyacentes dentro del directorio `types/`.
6. **Iconos**: Los iconos personalizados están centralizados en `components/icons/`; Los iconos estándar utilizan `lucide-react`
