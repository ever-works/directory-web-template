---
id: extraction-endpoints
title: "Endpoints de Extracción y Verificación"
sidebar_label: "Extracción & Verificación"
sidebar_position: 19
---

# Endpoints de Extracción y Verificación

Este módulo documenta los puntos finales de la API utilizados para la extracción de metadatos de URLs mediante IA y la verificación de tokens reCAPTCHA de Google. Ambos actúan como proxies del lado del servidor para mantener las claves API fuera del cliente.

**Fuentes:** `template/app/api/extract/route.ts`, `template/app/api/verify-recaptcha/route.ts`

---

## 1. Extraer Metadatos de una URL

Envía una URL a la API de la Plataforma Ever Works para extraer metadatos del elemento (nombre, descripción, categorías sugeridas, etiquetas).

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/extract` |
| **Autenticación** | Ninguna (proxy del servidor) |

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
| `existingCategories` | `string[]` | No | Nombres de categorías existentes para la categorización asistida por IA |

### Respuestas

**Estado 200** -- Extracción exitosa.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

**Estado 200** -- Función deshabilitada (sin `PLATFORM_API_URL`).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available."
}
```

**Estado 400** -- Datos de solicitud inválidos.

```json
{ "success": false, "error": "Invalid URL format" }
```

**Estado 500** -- Error del servidor al llamar a la API de la Plataforma.

```json
{ "success": false, "error": "Internal server error during extraction" }
```

### Ejemplo con curl

```bash
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools"]
  }'
```

### Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PLATFORM_API_URL` | No | URL base de la API de la Plataforma. Sin esto, la función se deshabilita con elegancia. |
| `PLATFORM_API_SECRET_TOKEN` | No | Token Bearer para la API de la Plataforma. |

---

## 2. Verificar Token reCAPTCHA

Verifica un token reCAPTCHA de Google (v2 o v3) contra la API de siteverify de Google del lado del servidor.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/verify-recaptcha` |
| **Autenticación** | Ninguna (proxy del servidor) |

### Cuerpo de la Solicitud

```json
{
  "token": "03AGdBq24PBCbwiy...",
  "action": "submit_form"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `token` | `string` | Sí | El token reCAPTCHA devuelto por el widget del lado del cliente |
| `action` | `string` | No | El nombre de la acción reCAPTCHA v3 para validación |

### Respuestas

**Estado 200** -- Verificación exitosa.

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit_form",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | `boolean` | Si el token pasó la verificación |
| `score` | `number` | Solo reCAPTCHA v3 -- puntuación de 0.0 (robot) a 1.0 (humano) |
| `action` | `string` | Nombre de la acción verificada (reCAPTCHA v3) |
| `hostname` | `string` | Nombre de host del sitio donde se usó el widget |
| `challenge_ts` | `string` | Marca de tiempo del desafío en formato ISO 8601 |
| `error_codes` | `string[]` | Errores de la API de Google si la verificación falló |

**Estado 200** -- Modo de derivación de desarrollo (sin `RECAPTCHA_SECRET_KEY`).

Cuando `RECAPTCHA_SECRET_KEY` no está configurado, el punto final devuelve inmediatamente:

```json
{
  "success": true,
  "score": 1.0,
  "action": "dev_bypass",
  "hostname": "localhost",
  "challenge_ts": "2024-01-15T10:30:00.000Z",
  "error_codes": []
}
```

:::note
El modo de derivación de desarrollo está diseñado para facilitar el desarrollo local sin requerir claves de reCAPTCHA. **Nunca despliegues en producción sin `RECAPTCHA_SECRET_KEY` configurado.**
:::

**Estado 400** -- Cuerpo de la solicitud inválido o falta el token.

```json
{ "error": "Invalid request body" }
```

**Estado 500** -- Error del servidor al llamar a la API de Google.

```json
{ "error": "Internal server error" }
```

### Ejemplo con curl

```bash
# Verificar un token reCAPTCHA v3
curl -s -X POST http://localhost:3000/api/verify-recaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "03AGdBq24PBCbwiy...",
    "action": "submit_form"
  }'
```

### Uso en TypeScript

```typescript
interface RecaptchaVerifyRequest {
  token: string;
  action?: string;
}

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  error_codes?: string[];
  error?: string;
}

async function verifyRecaptcha(
  token: string,
  action?: string
): Promise<RecaptchaVerifyResponse> {
  const res = await fetch('/api/verify-recaptcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  });
  return res.json();
}

// Uso en un controlador de envío de formulario
async function handleFormSubmit(recaptchaToken: string) {
  const result = await verifyRecaptcha(recaptchaToken, 'submit_form');

  if (!result.success) {
    throw new Error('La verificación reCAPTCHA falló');
  }

  // Para reCAPTCHA v3, verifica también la puntuación
  if (result.score !== undefined && result.score < 0.5) {
    throw new Error('La puntuación de reCAPTCHA es demasiado baja');
  }

  // Proceder con el envío del formulario...
}
```

### Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `RECAPTCHA_SECRET_KEY` | No* | Clave secreta de Google reCAPTCHA. Si no está configurada, habilita el modo de derivación de desarrollo. |

*Requerida para entornos de producción.

### Notas de Implementación

- El punto final llama a `https://www.google.com/recaptcha/api/siteverify` con la clave secreta y el token del cliente.
- Tanto reCAPTCHA **v2** (verificación de checkbox) como **v3** (puntuación basada en riesgo) son compatibles.
- Para reCAPTCHA v3, considera rechazar envíos con `score < 0.5`.
- La clave del sitio (pública) está expuesta al cliente; solo la **clave secreta** permanece en el servidor.

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `app/api/extract/route.ts` | Proxy de extracción de metadatos de URL |
| `app/api/verify-recaptcha/route.ts` | Proxy de verificación de tokens reCAPTCHA |
| `lib/services/extract.service.ts` | Lógica de servicio para extracción de elementos |
