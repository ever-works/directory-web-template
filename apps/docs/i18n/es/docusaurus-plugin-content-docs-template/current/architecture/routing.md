---
id: routing
title: Arquitectura de enrutamiento
sidebar_label: Enrutamiento
sidebar_position: 6
---

# Arquitectura de enrutamiento

La plantilla Ever Works utiliza Next.js App Router con internacionalización a través de `next-intl`, proporcionando rutas con prefijo local, grupos de rutas para organización lógica y una capa API integral.

## Enrutador de aplicaciones con segmento local

Todas las páginas orientadas al usuario están anidadas en un segmento dinámico `[locale]`, lo que permite la compatibilidad con varios idiomas para 6 configuraciones regionales: `en`, `fr`, `es`, `de`, `ar` y `zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

Las URL siguen el patrón `/{locale}/path`, por ejemplo:
- `/en/pricing` -- Página de precios en inglés
- `/fr/admin/items` -- Página de elementos de administración en francés
- `/de/categories` -- Página de categorías alemanas

## Configuración de Next.js

El `next.config.ts` configura varios comportamientos de enrutamiento:

### Reescribe

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

Estas reescrituras redirigen la ruta de la configuración regional raíz y `/discover` a la primera página del listado de descubrimiento (`/discover/1`), proporcionando una URL predeterminada limpia.

### Encabezados de seguridad

Todas las rutas reciben encabezados de seguridad que incluyen:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` con una edad máxima de 2 años
- `Content-Security-Policy` con valores predeterminados restrictivos
- `Referrer-Policy: strict-origin-when-cross-origin`

### Complemento next-intl

El complemento `next-intl` se aplica a la configuración de Next.js, apuntando a `./i18n/request.ts` para la resolución local:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## Grupos de rutas

El directorio `[locale]` utiliza varias agrupaciones lógicas para organizar las páginas:

### (listado) - Páginas principales de listado

El grupo de rutas `(listing)` es un grupo entre paréntesis (sin segmento de URL) que envuelve las páginas de listado del directorio principal con un diseño compartido.

### admin/-Panel de administración

La sección de administración proporciona una interfaz administrativa completa:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ -- Páginas de autenticación

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### cliente/--Panel de cliente

La sección del cliente proporciona funciones de usuario autenticado para administrar sus propios envíos y cuentas.

### panel/-Panel de usuario

Panel de usuario general con descripción general, actividad y configuración de la cuenta.

## Rutas API (29 grupos)

Las rutas API se encuentran fuera del segmento `[locale]` en `app/api/` y no tienen prefijo local. Sirven como backend para la obtención de datos del lado del cliente.

|Grupo de ruta|Propósito|Puntos finales clave|
|-------------|---------|---------------|
|`admin/`|Operaciones de administración|Artículos, usuarios, categorías, configuraciones.|
|`auth/`|Autenticación|Sesión, devoluciones de llamada de OAuth|
|`categories/`|Datos de categoría|Lista, buscar|
|`client/`|Operaciones del cliente|Perfil, envíos, panel de control|
|`collections/`|Datos de recogida|Lista, detalle|
|`config/`|Configuración del sitio|Banderas de características, configuraciones|
|`cron/`|Tareas programadas|Comprobaciones de suscripción, limpieza.|
|`current-user/`|Información de usuario actual|Perfil, datos de sesión|
|`extract/`|extracción de URL|Extracción de metadatos de URL|
|`favorites/`|Favoritos|Agregar, eliminar, enumerar|
|`featured-items/`|Artículos destacados|Listar elementos destacados activos|
|`geocode/`|Geocodificación|Búsqueda de direcciones, codificación geográfica inversa|
|`health/`|control de salud|Estado de la base de datos y del servicio|
|`internal/`|Operaciones internas|Puntos finales a nivel de sistema|
|`items/`|Datos del artículo|Listado, detalle, búsqueda|
|`lemonsqueezy/`|LimónExprimible|Controlador de webhook|
|`location/`|Datos de ubicación|Artículos cercanos, búsqueda de ubicación|
|`payment/`|Operaciones de pago|Pago, métodos de pago|
|`polar/`|polares|Controlador de webhook|
|`reference/`|Datos de referencia|Enumeraciones, valores de búsqueda|
|`reports/`|Informes de contenido|Enviar, revisar informes|
|`solidgate/`|puerta solida|Controlador de webhook|
|`sponsor-ads/`|Anuncios patrocinados|CRUD, activación|
|`stripe/`|raya|Controlador de webhook, pago|
|`surveys/`|Encuestas|Listar, responder, resultados|
|`user/`|Operaciones de usuario|Perfil, configuración|
|`verify-recaptcha/`|reCAPTCHA|Verificación de tokens|
|`version/`|Información de versión|Versión de la aplicación e información de compilación|

## software intermedio

La aplicación utiliza `next-intl` middleware para la detección y el enrutamiento de la configuración regional. El middleware maneja:

1. **Detección de configuración regional**: determina la configuración regional del usuario a partir de la ruta URL, las cookies o el encabezado `Accept-Language`.
2. **Redirecciones locales**: redirecciona las solicitudes sin un prefijo local a la ubicación apropiada
3. **Configuración regional predeterminada**: vuelve al inglés (`en`) cuando no se detecta ninguna preferencia de configuración regional

El middleware se configura en el directorio `i18n/` con reglas de enrutamiento local definidas en `i18n/routing.ts` y manejo de solicitudes en `i18n/request.ts`.

## Generación estática y rutas dinámicas

La plantilla utiliza varias estrategias de obtención de datos:

- **Generación estática**: páginas como la política de privacidad, los términos de servicio y acerca de se generan estáticamente
- **Representación dinámica**: las páginas de administración, los paneles y las páginas autenticadas se representan dinámicamente
- **ISR (regeneración estática incremental)**: las páginas de listado de categorías y etiquetas utilizan ISR con revalidación
- **Generación de mapas del sitio**: `app/sitemap.ts` genera dinámicamente el mapa del sitio a partir de datos de contenido.

`staticPageGenerationTimeout` está configurado en 180 segundos en `next.config.ts` para dar cabida a grandes repositorios de contenido durante las compilaciones.
