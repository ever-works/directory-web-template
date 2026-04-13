---
id: overview
title: Descripción general de rutas API
sidebar_label: Descripción general
sidebar_position: 0
---

# Descripción general de rutas API

La plantilla expone aproximadamente 151 manejadores de rutas API organizados en 29 grupos de rutas bajo el directorio `app/api/`. Todas las rutas utilizan la convención App Router de Next.js con archivos `route.ts` que exportan manejadores de métodos HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Grupos de rutas

| Grupo | Ruta | Descripción | Rutas aprox. |
|-------|------|-------------|--------------|
| **admin** | `/api/admin/*` | Operaciones CRUD del panel de administración | ~60 |
| **auth** | `/api/auth/*` | Manejadores NextAuth + gestión de contraseñas | 2 |
| **categories** | `/api/categories/*` | Consultas públicas de categorías | 1 |
| **client** | `/api/client/*` | Panel de cliente y gestión de elementos | ~7 |
| **collections** | `/api/collections/*` | Consultas públicas de colecciones | 1 |
| **config** | `/api/config/*` | Configuración de banderas de características | 1 |
| **cron** | `/api/cron/*` | Trabajos programados en segundo plano | 3 |
| **current-user** | `/api/current-user` | Información del usuario autenticado actual | 1 |
| **extract** | `/api/extract` | Extracción de metadatos de URL | 1 |
| **favorites** | `/api/favorites/*` | Elementos favoritos del usuario | 2 |
| **featured-items** | `/api/featured-items` | Listados de elementos destacados | 1 |
| **geocode** | `/api/geocode` | Geocodificación de direcciones | 1 |
| **health** | `/api/health/*` | Verificaciones de salud del sistema | 1 |
| **internal** | `/api/internal/*` | Operaciones internas (inicialización de BD) | 1 |
| **items** | `/api/items/*` | Endpoints públicos de elementos (comentarios, votos, vistas) | ~12 |
| **lemonsqueezy** | `/api/lemonsqueezy/*` | Integración de pago Lemon Squeezy | 7 |
| **location** | `/api/location/*` | Búsqueda y datos de ubicación | 4 |
| **payment** | `/api/payment/*` | Gestión genérica de pagos/suscripciones | 3 |
| **polar** | `/api/polar/*` | Integración de pago Polar | 5 |
| **reference** | `/api/reference` | Endpoint de datos de referencia | 1 |
| **reports** | `/api/reports` | Envío público de reportes | 1 |
| **solidgate** | `/api/solidgate/*` | Integración de pago Solidgate | 2 |
| **sponsor-ads** | `/api/sponsor-ads/*` | Gestión de anuncios patrocinados | 7 |
| **stripe** | `/api/stripe/*` | Integración de pago Stripe | ~17 |
| **surveys** | `/api/surveys/*` | CRUD de encuestas y respuestas | 4 |
| **user** | `/api/user/*` | Perfil de usuario y suscripción | 5 |
| **verify-recaptcha** | `/api/verify-recaptcha` | Verificación de reCAPTCHA | 1 |
| **version** | `/api/version/*` | Información de versión de la aplicación | 2 |

## Patrones de arquitectura

### Estructura de los manejadores de rutas

Los manejadores de rutas siguen un patrón consistente de manejador delgado:

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Analizar y validar la entrada (parámetros de consulta, cuerpo)
  // 2. Llamar al servicio o repositorio
  // 3. Retornar respuesta JSON
  return NextResponse.json({ success: true, data: result });
});
```

### Middleware de autenticación

| Middleware | Uso | Verifica |
|------------|-----|---------|
| `withAdminAuth` | Rutas de admin | Sesión JWT + rol admin en BD |
| `withClientAuth` | Rutas de cliente | Sesión JWT + perfil de cliente existente |
| `withAuth` | Rutas de usuario generales | Solo sesión JWT válida |
| Público | Rutas públicas | Sin autenticación requerida |

### Respuestas de error

Todas las rutas usan `safeErrorResponse` para errores no manejados:

```typescript
return safeErrorResponse(error, 'Contexto de la operación');
```

Esto retorna:
- En desarrollo: mensaje de error completo con traza de pila
- En producción: mensaje genérico (`'Internal server error'`)

## Organización de archivos

```
app/api/
├── admin/
│   ├── categories/
│   ├── clients/
│   ├── collections/
│   ├── comments/
│   ├── companies/
│   ├── dashboard/
│   ├── featured-items/
│   ├── items/
│   ├── navigation/
│   ├── notifications/
│   ├── roles/
│   ├── settings/
│   ├── sponsor-ads/
│   ├── surveys/
│   ├── tags/
│   └── users/
├── auth/
│   └── [...nextauth]/
├── client/
│   ├── dashboard/
│   └── items/
├── cron/
│   ├── subscription-expiration/
│   ├── subscription-reminders/
│   └── sync/
├── favorites/
├── items/
│   └── [slug]/
├── lemonsqueezy/
├── payment/
├── polar/
├── solidgate/
├── sponsor-ads/
├── stripe/
└── user/
```

## Códigos de estado HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| `200` | OK | Recuperación exitosa, actualización |
| `201` | Creado | Recurso creado correctamente |
| `400` | Solicitud incorrecta | Error de validación, parámetros faltantes |
| `401` | No autorizado | Autenticación requerida |
| `403` | Prohibido | Permisos insuficientes (no admin) |
| `404` | No encontrado | Recurso no encontrado |
| `409` | Conflicto | Recurso duplicado ya existente |
| `413` | Entidad demasiado grande | El cuerpo de la solicitud supera el límite |
| `500` | Error interno del servidor | Error no manejado |
