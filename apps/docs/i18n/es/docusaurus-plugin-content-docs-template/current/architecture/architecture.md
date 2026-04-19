---
id: architecture
title: Descripción general de la arquitectura
sidebar_label: Descripción general
sidebar_position: 0
---

# Descripción general de la arquitectura

Esta página proporciona un mapa de alto nivel de la arquitectura de la plantilla de Ever Works. Úselo como punto de partida antes de sumergirse en las páginas detalladas que siguen.

## Fundación Tecnológica

La plantilla es una aplicación **Next.js 16** que utiliza el **App Router** con **React 19**. Produce una salida `standalone` para implementaciones en contenedores y aplica varias optimizaciones a nivel de marco en `next.config.ts`:

|capa|Tecnología|Propósito|
|---|---|---|
|**Marco**|Next.js 16 (enrutador de aplicaciones)|Representación de servidor y cliente, enrutamiento, rutas API|
|**IU**|Reaccionar 19, HeroUI, Radix UI, Tailwind CSS 4|Biblioteca de componentes, primitivas, estilo.|
|**Base de datos**|Llovizna ORM + PostgreSQL (o SQLite localmente)|Gestión de esquemas, migraciones, consultas.|
|**Autenticación**|SiguienteAuth.js v5 (beta)|Autenticación multiproveedor con almacenamiento en caché de sesiones|
|**Internacionalización**|siguiente-intl|Paquetes de mensajes y enrutamiento según la configuración regional|
|**Pagos**|Raya, Polar, LemonSqueezy, Solidgate|Flujos de suscripción y pago único|
|**Contenido**|CMS basado en Git (`.content/` directorio)|Contenido Markdown/YAML clonado desde un repositorio de datos|
|**Monitoreo**|Centinela, PostHog, Vercel Analytics|Seguimiento de errores, análisis de productos, rendimiento.|
|**Correo electrónico**|Reenviar|Entrega de correo electrónico transaccional|
|**Texto enriquecido**|toque|Editor WYSIWYG para contenido administrativo|

## Estructura del proyecto

La plantilla sigue una organización en capas basada en características. Estos son los directorios de nivel superior y sus responsabilidades:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

Para obtener un tutorial completo del directorio, consulte la página [Estructura del proyecto](/architecture/project-structure).

## Arquitectura en capas

El código base impone una clara separación de preocupaciones en tres capas:

### Capa de presentación

Los componentes de React en `components/` y los archivos de página en `app/[locale]/` manejan la representación y la interacción del usuario. Los componentes del servidor obtienen datos directamente; Los componentes del cliente utilizan enlaces de consulta de React de `hooks/` para el estado del lado del cliente.

### Capa de lógica empresarial

Los servicios en `lib/services/` contienen las reglas comerciales básicas. La plantilla se entrega con más de 30 archivos de servicios que cubren análisis, suscripciones, moderación, sincronización de CRM, codificación geográfica, notificaciones y más. Los servicios son llamados por controladores de rutas API y componentes del servidor, pero nunca directamente por el código de la interfaz de usuario en el navegador.

### Capa de acceso a datos

Los repositorios en `lib/repositories/` encapsulan todas las consultas de bases de datos utilizando Drizzle ORM. Cada entidad de dominio (elementos, categorías, colecciones, usuarios, roles, etiquetas, anuncios patrocinadores) tiene su propio archivo de repositorio. Esto mantiene los detalles a nivel de SQL fuera de la capa de servicio.

Para obtener una visión más profunda del flujo de datos entre estas capas, consulte [Flujo de datos](/architecture/data-flow).

## Enrutador y enrutamiento de la aplicación Next.js

Todas las rutas orientadas al usuario se encuentran en `app/[locale]/`, lo que habilita URL con prefijo local listo para usar a través de `next-intl`. La aplicación utiliza varias funciones de App Router:

- **Diseños**: archivos `layout.tsx` anidados para administración, panel de cliente y áreas públicas.
- **Grupos de rutas**: el grupo `(listing)` maneja el listado del directorio principal y la exploración de etiquetas sin afectar la estructura de la URL.
- **Rutas dinámicas**: `[page]`, `[...tag]` y segmentos con nombre para artículos, categorías y colecciones.
- **Reescrituras**: definidas en `next.config.ts` para redirigir rutas de categorías desnudas a su vista de descubrimiento paginada.

Consulte [Enrutamiento](/architecture/routing) para obtener el mapa de ruta completo.

## Sistema de autenticación

La autenticación se basa en **NextAuth.js v5** con un sistema de configuración de proveedor en `lib/auth/`. El archivo `auth.config.ts` en la raíz del proyecto organiza:

- **Proveedores de OAuth**: Google y GitHub, configurados a través de variables de entorno y habilitados/deshabilitados dinámicamente.
- **Proveedor de credenciales**: autenticación de correo electrónico/contraseña con hash bcrypt.
- **Adaptador Supabase**: almacenamiento de sesión opcional respaldado por Supabase.
- **Almacenamiento en caché de sesiones**: `lib/auth/cached-session.ts` reduce las búsquedas de sesiones redundantes.
- **Sistema de guardia**: `lib/auth/guards.ts` y `lib/guards/` imponen el acceso basado en roles a nivel de ruta.

Para obtener detalles sobre el sistema de guardia y los permisos basados en roles, consulte [Sistema de guardias](/architecture/guards-system) y [Sistema de permisos](/architecture/permissions-system).

## Llovizna ORM y base de datos

La capa de base de datos utiliza **Drizzle ORM** con el esquema definido en `lib/db/schema.ts`. Aspectos clave:

- **Las migraciones** se generan con `drizzle-kit generate` y se aplican con `drizzle-kit migrate`.
- **Los scripts de siembra** en `lib/db/seed.ts` y `scripts/cli-seed.ts` completan los datos iniciales, incluidos los roles.
- **La configuración** reside en `drizzle.config.ts` en la raíz del proyecto.
- Se requiere PostgreSQL para la producción; SQLite es compatible con el desarrollo local.

Consulte [Patrones de repositorio](/architecture/repository-patterns) para saber cómo está estructurada la capa de acceso a datos.

## Cadena de middleware

La plantilla utiliza middleware Next.js (a través del complemento `next-intl` aplicado en `next.config.ts`) combinado con comprobaciones de permisos personalizadas en `lib/middleware/permission-check.ts`. La canalización de middleware maneja:

- Detección y enrutamiento local
- Verificación del estado de autenticación
- Protección de rutas basada en roles
- Encabezados de seguridad (HSTS, CSP, X-Frame-Options y más, configurados en `next.config.ts`)

Para obtener un desglose detallado, consulte [Middleware](/architecture/middleware) y [Middleware Deep Dive](/architecture/middleware-deep-dive).

## Configuración y seguridad

El archivo `next.config.ts` establece varios valores predeterminados de seguridad y rendimiento:

- **Salida independiente** para implementaciones compatibles con Docker.
- **Encabezados de seguridad** que incluyen Content-Security-Policy, HSTS, X-Content-Type-Options y X-Frame-Options.
- **Optimización de imágenes** con soporte de patrones remotos y políticas de seguridad SVG.
- **Integración Sentry** aplicada como el contenedor de configuración más externo para el seguimiento de errores.
- **Optimización del paquete** para HeroUI y Lucide React para reducir el tamaño del paquete.

## Páginas de arquitectura detallada

Explore estas páginas para obtener una cobertura más profunda de los sistemas individuales:

|Página|Qué cubre|
|---|---|
|[Pila tecnológica](/arquitectura/pila tecnológica)|Inventario de dependencia completo y detalles de versión|
|[Estructura del proyecto](/arquitectura/estructura-del proyecto)|Tutorial directorio por directorio|
|[Flujo de datos](/arquitectura/flujo de datos)|Solicitar ciclo de vida desde el navegador a la base de datos|
|[Enrutamiento](/arquitectura/enrutamiento)|Estructura de App Router y patrones de URL|
|[Patrones de componentes](/architecture/component-patterns)|Componentes de servidor versus cliente, patrones de composición|
|[Gestión del Estado](/arquitectura/gestion-del-estado)|React Query, Zustand y estado del servidor|
|[Capa API](/arquitectura/capa-api)|Diseño de API REST y patrones de controlador de rutas|
|[Middleware](/arquitectura/middleware)|Canalización de middleware y procesamiento de solicitudes|
|[Sistema de guardias](/arquitectura/sistema-de-guardias)|Control de acceso basado en roles a nivel de ruta|
|[Sistema de permisos](/arquitectura/sistema-de-permisos)|Definiciones de permisos detalladas|
|[Patrones de repositorio](/arquitectura/patrones-de-repositorio)|Convenciones de la capa de acceso a datos|
|[Patrones de validación](/arquitectura/patrones-de-validación)|Esquemas Zod y validación de entradas.|
|[Sistema temático](/arquitectura/sistema-temático)|Arquitectura tematizada y gestión del color.|
|[Sistema de color](/arquitectura/sistema-de color)|Canal de generación de color dinámico|
|[Sistema SEO](/arquitectura/seo-sistema)|Metadatos, mapas de sitio y datos estructurados|
|[Biblioteca de pagos](/arquitectura/biblioteca de pagos)|Integración de pagos multiproveedor|
|[Biblioteca de contenido](/architecture/content-library)|Canalización de contenido CMS basado en Git|
|[Sistema editor](/arquitectura/sistema-editor)|Integración del editor de texto enriquecido Tiptap|
|[Patrones de mapeador](/architecture/mapper-patterns)|Transformación de datos entre capas.|
|[Límites de error](/arquitectura/límites de error)|Manejo de errores y recuperación|
|[Capa de análisis](/arquitectura/capa de análisis)|Canalización de análisis y seguimiento de eventos|
|[Sistema Swagger](/arquitectura/sistema-swagger)|Generación de documentación OpenAPI|

## Adónde ir a continuación

- **¿Nuevo en el proyecto?** Comience con [Introducción](/getting-started) para instalar y ejecutar la plantilla.
- **¿Listo para personalizar?** Vaya a la sección [Guías](/guides) para ver tutoriales paso a paso.
- **¿Quieres el inventario tecnológico completo?** Consulta [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
