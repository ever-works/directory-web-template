---
id: geocode-endpoints
title: "Referencia API Geocodificación"
sidebar_label: "Geocodificación"
sidebar_position: 50
---

# Referencia API Geocodificación

## Descripción General

Los puntos finales de Geocodificación proporcionan capacidades de geocodificación directa (dirección a coordenadas) e inversa (coordenadas a dirección). Los resultados se almacenan en caché durante 15 minutos para reducir las llamadas a la API externa. Estos puntos finales requieren autenticación de administrador para evitar el abuso de costos de los servicios de geocodificación subyacentes de Mapbox/Google.

## Puntos Finales

### POST /api/geocode

Convierte una dirección en coordenadas (geocodificación directa) o coordenadas en una dirección (geocodificación inversa). El cuerpo de la solicitud determina qué operación se realiza según si se proporcionan los campos `address` o `latitude`/`longitude`.

#### Geocodificación Directa (dirección a coordenadas)

**Solicitud**
```typescript
{
  address: string;          // 1-500 caracteres, requerido
  options?: {
    countryCodes?: string[];  // Códigos ISO 3166-1 alpha-2, ej. ["US", "CA"]
    language?: string;        // Código de idioma ISO 639-1, ej. "en"
    proximity?: {
      latitude: number;       // -90 a 90
      longitude: number;      // -180 a 180
    };
  };
}
```

**Respuesta**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 a 1
  };
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Geocodificación Inversa (coordenadas a dirección)

**Solicitud**
```typescript
{
  latitude: number;         // -90 a 90, requerido
  longitude: number;        // -180 a 180, requerido
  options?: {
    language?: string;        // Código de idioma ISO 639-1
  };
}
```

**Respuesta**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Devuelve el estado del servicio de geocodificación, incluyendo qué proveedores están configurados y estadísticas de caché.

**Solicitud**

No se requiere cuerpo de solicitud. Autenticación mediante cookie de sesión.

**Respuesta**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Si las funciones de ubicación están habilitadas
    configured: boolean;      // Si hay algún proveedor de geocodificación configurado
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Tamaño actual de la caché
      maxSize: number;        // Tamaño máximo de la caché (1000)
      ttlMs: number;          // TTL de la caché en milisegundos (900000 = 15 min)
    };
  };
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Autenticación

- **GET /api/geocode**: Requiere sesión autenticada (cualquier usuario).
- **POST /api/geocode**: Requiere sesión autenticada con **rol de administrador**. Los usuarios no administradores reciben una respuesta `403 Forbidden`. Esta restricción evita el abuso del costo de la API.

## Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | Datos de solicitud inválidos -- dirección mal formada, coordenadas inválidas o fallo de validación del esquema |
| 401 | No autorizado -- sin sesión autenticada |
| 403 | Prohibido -- se requiere acceso de administrador (solo POST) |
| 404 | No se encontraron resultados de geocodificación para la dirección o coordenadas dadas |
| 503 | Las funciones de ubicación están deshabilitadas en la configuración, o el servicio de geocodificación no está configurado |

## Limitación de Velocidad

Los resultados se almacenan en caché durante 15 minutos (TTL 900.000 ms) con un tamaño máximo de caché de 1.000 entradas. Todas las solicitudes de geocodificación se registran en una audítoría para el seguimiento de costos.

## Puntos Finales Relacionados

- [Puntos Finales de Ubicación](./location-endpoints) -- Búsqueda de ubicación, ciudades, países y coordenadas
