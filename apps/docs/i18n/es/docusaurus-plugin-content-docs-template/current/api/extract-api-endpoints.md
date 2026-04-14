---
id: extract-api-endpoints
title: "Endpoints API Extracción"
sidebar_label: "API Extracción"
sidebar_position: 61
---

# Endpoints API Extracción

La API de Extracción proporciona un punto final proxy seguro para extraer metadatos de elementos (nombre, descripción, categorías, etc.) de una URL dada. Reenvía solicitudes a la API de la Plataforma Ever Works para extracción de contenido impulsada por IA.

**Fuente:** `template/app/api/extract/route.ts`

---

## Extraer Metadatos de una URL

Extrae metadatos de elementos de una URL dada mediante proxy de la solicitud a la API de la Plataforma.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/extract` |
| **Autenticación** | Ninguna (pública, pero requiere que `PLATFORM_API_URL` esté configurado) |

### Cuerpo de la Solicitud

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `url` | `string` (URI) | Sí | La URL de la que se extraerán los metadatos |
| `existingCategories` | `string[]` | No | Nombres de categorías existentes para ayudar con la categorización por IA |

### Respuestas

**Estado 200** -- Extracción exitosa.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

La forma de `data` depende de la respuesta de la API de la Plataforma -- típicamente incluye campos `name`, `description` y categorización sugerida.

**Estado 200** -- Función deshabilitada (API de la Plataforma no configurada).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Cuando `PLATFORM_API_URL` no está configurado, el punto final devuelve un estado `200` con `featureDisabled: true` en lugar de un error. Esto permite que el frontend oculte con elegancia la función de extracción.
:::

**Estado 400** -- Solicitud inválida.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Estado 500** -- Error del servidor durante la extracción.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validación

El cuerpo de la solicitud se valida con Zod:

- `url` debe ser una cadena de URL válida.
- `existingCategories` es un array opcional de cadenas.

### Ejemplos con curl

```bash
# Extraer metadatos de una URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Solicitud mínima (solo URL)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### Uso en TypeScript

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}

interface ExtractSuccessResponse {
  success: true;
  data: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface ExtractDisabledResponse {
  success: false;
  featureDisabled: true;
  message: string;
}

interface ExtractErrorResponse {
  success: false;
  error: string;
}

type ExtractResponse = ExtractSuccessResponse | ExtractDisabledResponse | ExtractErrorResponse;

async function extractMetadata(
  url: string,
  existingCategories?: string[]
): Promise<ExtractResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, existingCategories }),
  });
  return res.json();
}

// Uso
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('La función de extracción no está disponible');
} else if (result.success) {
  console.log('Extraído:', result.data.name, result.data.description);
} else {
  console.error('Extracción fallida:', result.error);
}
```

### Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PLATFORM_API_URL` | No | URL base de la API de la Plataforma Ever Works. Si no está configurada, la función se deshabilita con elegancia. |
| `PLATFORM_API_SECRET_TOKEN` | No | Token Bearer opcional para autenticar con la API de la Plataforma. |

### Notas de Implementación

- Este punto final actúa como un **proxy seguro** -- la URL y el token de la API de la Plataforma nunca se exponen al cliente.
- El punto final elimina las barras diagonales finales de `PLATFORM_API_URL` antes de construir la URL de extracción.
- El punto final de la API de la Plataforma llamado es `<PLATFORM_API_URL>/extract-item-details`.
- El campo `existingCategories` se reenvía como `existing_data` en el cuerpo de la solicitud de la API de la Plataforma.
- Las respuestas de error no JSON de la API de la Plataforma (p. ej., páginas de error HTML) se manejan con elegancia con un respaldo a `statusText`.
