---
id: health-endpoints
title: "Referencia API Salud"
sidebar_label: "Salud"
sidebar_position: 52
---

# Referencia API Salud

## Descripción General

El punto final de Salud proporciona una verificación simple de conectividad de la base de datos para propósitos de monitoreo e infraestructura. Ejecuta una consulta ligera para verificar que la conexión a la base de datos esté activa y receptiva, devolviendo información de estado con marcas de tiempo.

## Puntos Finales

### GET /api/health/database

Realiza una verificación básica del estado de la base de datos ejecutando una consulta `SELECT 1` para verificar la conexión.

**Solicitud**

No se requieren parámetros ni cuerpo.

**Respuesta**
```typescript
// Respuesta saludable
{
  status: "healthy";
  database: "connected";
  timestamp: string;        // Formato ISO 8601, ej. "2024-01-15T10:30:00.000Z"
  result: object;           // Resultado de la consulta SELECT 1
}

// Respuesta no saludable (estado 500)
{
  status: "unhealthy";
  database: "disconnected";
  error: "Database connection check failed";
  timestamp: string;
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/health/database');
const health = await response.json();

if (health.status === 'healthy') {
  console.log('Database is connected at', health.timestamp);
} else {
  console.error('Database is disconnected:', health.error);
}
```

## Autenticación

Este punto final es **público** -- no se requiere autenticación. Está destinado para uso por balanceadores de carga, monitores de disponibilidad y verificaciones de salud en el despliegue.

## Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 200 | La conexión a la base de datos es saludable |
| 500 | La conexión a la base de datos falló -- devuelve estado `"unhealthy"` con detalles del error |

## Limitación de Velocidad

No se aplica limitación de velocidad explícita. Este punto final es ligero y adecuado para sondeos frecuentes por sistemas de monitoreo.

## Puntos Finales Relacionados

- [Puntos Finales de Configuración de Características](./config-feature-endpoints) -- Indicadores de disponibilidad de características (también depende de la base de datos)
- [Puntos Finales de Sincronización de Versión](./version-sync-endpoints) -- Versión del sistema y estado de sincronización
