---
id: utility-endpoints
title: "Endpoints API de Utilidad"
sidebar_label: "Endpoints de Utilidad"
sidebar_position: 5
---

# Endpoints API de Utilidad

Endpoints de utilidad para estado de la base de datos, información de versión, configuración de características, extracción de metadatos de URL, geocodificación, datos de ubicación, verificación de reCAPTCHA, datos de referencia y operaciones internas.

## Salud de la Base de Datos (GET /api/health/database)

Verifica la conectividad de la base de datos. Sin autenticación requerida.

### Respuesta Saludable (200)

```json
{
  "status": "healthy",
  "message": "Database connection successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Respuesta No Saludable (503)

```json
{
  "status": "unhealthy",
  "message": "Database connection failed",
  "error": "Connection timeout",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Versión (GET /api/version)

Obtiene la información de versión actual del repositorio de contenido en Git. Sin autenticación requerida.

### Respuesta 200

```json
{
  "version": "abc1234",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Sincronización de Versión

### GET /api/version/sync

Obtiene el estado de sincronización del repositorio de contenido.

```json
{
  "syncInProgress": false,
  "lastSyncTime": "2024-01-01T00:00:00.000Z",
  "timeSinceLastSync": 3600000,
  "timeSinceLastSyncHuman": "1 hour ago",
  "uptime": 86400,
  "timestamp": "2024-01-01T01:00:00.000Z"
}
```

### POST /api/version/sync

Activa una sincronización del repositorio de contenido Git. Ver [Referencia API Versión y Syncronización](./version-sync-endpoints.md) para detalles completos.

## Configuración de Características (GET /api/config/features)

Obtiene la configuración de características habilitadas. Sin autenticación requerida.

### Respuesta 200

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

Estas banderas provienen de las variables de entorno y controlan qué características están activas en la aplicación.

## Extracción de URL (POST /api/extract)

Extrae metadatos de Open Graph de una URL. Requiere autenticación.

### Cuerpo de la Solicitud

```json
{
  "url": "https://example.com/article"
}
```

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "title": "Título del Artículo",
    "description": "Descripción de la página",
    "image": "https://example.com/og-image.jpg",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example Site"
  }
}
```

## Geocodificación (POST /api/geocode)

Geocodifica una cadena de dirección a coordenadas. Requiere autenticación.

### Cuerpo de la Solicitud

```json
{
  "address": "Brandenburg Gate, Berlin, Germany"
}
```

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "lat": 52.5163,
    "lng": 13.3777,
    "formattedAddress": "Brandenburg Gate, Pariser Platz, 10117 Berlin, Germany"
  }
}
```

## Datos de Ubicación

### GET /api/location/countries

Obtiene la lista de todos los países. Sin autenticación requerida.

```json
{
  "success": true,
  "data": [
    { "code": "DE", "name": "Germany" },
    { "code": "US", "name": "United States" }
  ]
}
```

### GET /api/location/cities

Obtiene ciudades, con filtro opcional de país. Sin autenticación requerida.

```
GET /api/location/cities?country=DE
```

```json
{
  "success": true,
  "data": [
    { "name": "Berlin", "country": "DE" },
    { "name": "Munich", "country": "DE" }
  ]
}
```

### GET /api/location/coordinates

Obtiene las coordenadas de una ubicación específica. Sin autenticación requerida.

### GET /api/location/search

Busca ubicaciones por nombre. Sin autenticación requerida.

```
GET /api/location/search?q=berlin
```

## Verificación de reCAPTCHA (POST /api/verify-recaptcha)

Verifica un token de reCAPTCHA v3 de Google. Sin autenticación requerida.

### Cuerpo de la Solicitud

```json
{
  "token": "03AGdBq..."
}
```

### Respuesta 200

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit"
}
```

Una puntuación `score` superior a 0.5 generalmente indica una interacción humana legítima.

## Datos de Referencia (GET /api/reference)

Obtiene datos de referencia estáticos usados en toda la aplicación (categorías, etiquetas, tipos de planes, etc.). Sin autenticación requerida.

## Operaciones Internas (POST /api/internal/db-init)

Endpoint interno de inicialización de la base de datos. Protegido mediante un encabezado secreto interno — no debe exponerse públicamente.

## Consideraciones de Seguridad

### Endpoints Públicos (Sin Autenticación)

- `GET /api/health/database`
- `GET /api/version`
- `GET /api/version/sync`
- `GET /api/config/features`
- `GET /api/location/*`
- `POST /api/verify-recaptcha`
- `GET /api/reference`

### Endpoints Protegidos (Autenticación Requerida)

- `POST /api/extract` — Requiere sesión de usuario
- `POST /api/geocode` — Requiere sesión de usuario
- `POST /api/version/sync` — Protegido según configuración
- `POST /api/internal/db-init` — Secreto interno del servidor

Los endpoints de datos de ubicación y verificación de reCAPTCHA son públicos pero aplican validación estricta de entrada.
