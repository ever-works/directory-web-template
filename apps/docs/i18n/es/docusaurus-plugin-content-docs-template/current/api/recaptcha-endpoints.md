---
id: recaptcha-endpoints
title: "Referencia API ReCAPTCHA"
sidebar_label: "ReCAPTCHA"
sidebar_position: 57
---

# Referencia API ReCAPTCHA

## Descripción General

El punto final de verificación ReCAPTCHA valida los tokens de Google reCAPTCHA v3 generados en el lado del cliente. Se usa como protección contra bots en formularios públicos como registro, inicio de sesión y envío de contenido.

## POST /api/verify-recaptcha

Verifica un token de reCAPTCHA v3 contra la API de verificación de Google.

### Autenticación

Público -- no se requiere autenticación.

### Cuerpo de la Solicitud

```typescript
type VerifyRecaptchaRequest = {
  token: string;    // Token reCAPTCHA generado en el cliente
  action?: string;  // Nombre de acción esperado para verificación
};
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `token` | string | **Sí** | El token reCAPTCHA v3 del widget del cliente |
| `action` | string | No | El nombre de acción esperado (ej. `"login"`, `"register"`) |

### Respuesta Exitosa

```typescript
type VerifyRecaptchaResponse = {
  success: true;
  score: number;     // Puntuación de confianza de Google: 0.0 (bot) a 1.0 (humano)
  action: string;    // Acción devuelta por Google
};
```

### Respuestas de Error

| Estado | Error | Descripción |
|--------|-------|-------------|
| 400 | `"Token is required"` | El campo `token` falta en el cuerpo de la solicitud |
| 400 | `"reCAPTCHA verification failed"` | Google rechazó el token (expirado, inválido, o reutilizado) |
| 500 | `"Internal server error"` | Fallo de red al contactar la API de Google |

### Ejemplo de Uso

```typescript
// En un componente cliente o manejador de formulario
const token = await grecaptcha.execute(
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  { action: 'login' }
);

const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, action: 'login' }),
});

const result = await response.json();
// result = { success: true, score: 0.9, action: "login" }

if (!result.success || result.score < 0.5) {
  // Tratar como bot o pedir desafío adicional
}
```

## Modo de Desarrollo (Bypass)

Cuando `NODE_ENV=development` o cuando se omiten las claves de reCAPTCHA, el punto final devuelve una respuesta de bypass en lugar de llamar a Google:

```json
{
  "success": true,
  "score": 1.0,
  "action": "bypass"
}
```

Esto permite el desarrollo y las pruebas de formularios sin configurar credenciales de reCAPTCHA.

## Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `RECAPTCHA_SECRET_KEY` | Clave secreta del servidor de Google reCAPTCHA v3 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Clave del sitio público para el widget del cliente |

## Consideraciones de Limitación de Velocidad

Este punto final llama a la API externa de Google y debería estar protegido contra abuso. Considera agregar limitación de velocidad a nivel de IP para entornos de producción de alto tráfico.

## Detalles de Implementación

- **Fuente:** `template/app/api/verify-recaptcha/route.ts`
- Utiliza la URL de verificación de Google: `https://www.google.com/recaptcha/api/siteverify`
- El `secretKey` se pasa como parámetro de formulario junto con el token del cliente
- Errores de validación de Google (el array `error-codes`) se registran del lado del servidor pero no se exponen al cliente
