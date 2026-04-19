---
id: config-feature-endpoints
title: "Referencia API Config y Flags de Características"
sidebar_label: "Config & Características"
sidebar_position: 53
---

# Referencia API Config y Flags de Características

## Descripción General

El punto final de Características de Configuración expone los indicadores de disponibilidad de características actuales de la aplicación. Estos indicadores señalan qué características dependientes de la base de datos están activas, permitiendo que el frontend degrade con elegancia cuando las características no estén disponibles. Este es un punto final público y en caché diseñado para consumo de alta frecuencia.

## Puntos Finales

### GET /api/config/features

Devuelve la disponibilidad de características actuales según la configuración del sistema y la disponibilidad de la base de datos.

**Solicitud**

No se requieren parámetros ni cuerpo.

**Respuesta**
```typescript
{
  ratings: boolean;         // Si la función de calificaciones está disponible
  comments: boolean;        // Si la función de comentarios está disponible
  favorites: boolean;       // Si la función de favoritos está disponible
  featuredItems: boolean;   // Si la función de elementos destacados está disponible
  surveys: boolean;         // Si la función de encuestas está disponible
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Renderizar componente de calificaciones
}

if (!features.surveys) {
  // Ocultar sección de encuestas
}
```

## Autenticación

Este punto final es **público** -- no se requiere autenticación. Está diseñado para ser consumido por el frontend en la carga inicial de la página para determinar qué características de la interfaz deben renderizarse.

## Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 200 | Flags de características recuperados exitosamente |
| 500 | Error interno -- devuelve todos los flags como `false` por seguridad con encabezado `no-cache` |

En caso de error, el punto final devuelve todas las características como `false` para garantizar que la aplicación falle de manera segura en lugar de exponer funcionalidad rota.

## Límite de Rate

Las respuestas se almacenan en caché con los siguientes encabezados:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Efectivamente en caché durante 5 minutos a nivel CDN con una ventana de stale-while-revalidate de 10 minutos.

Las respuestas de error usan `Cache-Control: no-cache` para evitar el almacenamiento en caché del estado degradado.

## Puntos Finales Relacionados

- [Puntos Finales de Salud](./health-endpoints) -- Verificación de conectividad de base de datos
