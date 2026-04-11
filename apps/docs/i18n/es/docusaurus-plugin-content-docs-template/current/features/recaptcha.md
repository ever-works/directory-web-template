---
id: recaptcha
title: Integración reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Integración reCAPTCHA

La plantilla integra Google reCAPTCHA v3 para la protección contra bots en los flujos de autenticación y envío de formularios. Incluye un punto final de verificación del lado del servidor, enlaces del lado del cliente para la administración de tokens y un modo de desarrollo que omite la verificación cuando las credenciales no están configuradas.

## Descripción general de la arquitectura

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## Punto final de verificación del lado del servidor

La ruta `POST /api/verify-recaptcha` en `app/api/verify-recaptcha/route.ts` maneja la verificación del token contra la API reCAPTCHA de Google:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### Detalles clave de implementación

- **Validación de token**: devuelve 400 si no se proporciona ningún token en el cuerpo de la solicitud.
- **Omisión de desarrollo**: cuando la clave secreta no está configurada y `NODE_ENV` es `development` , el endpoint devuelve una respuesta exitosa con `score: 1.0` y `action: "bypass"` sin contactar a Google.
- **Cliente externo**: Utiliza el `externalClient` preconfigurado de `lib/api/server-api-client.ts` con su método `postForm` , que envía datos de `application/x-www-form-urlencoded` a la API de verificación de Google.
- **Utilidades API**: utiliza `apiUtils.isSuccess()` y `apiUtils.getErrorMessage()` para un manejo de respuestas consistente.
- **Reenvío de respuesta completa**: devuelve el resultado de la verificación completo, incluida la puntuación, la acción, el nombre de host, la marca de tiempo del desafío y los códigos de error.

### Omisión del modo de desarrollo

Cuando `RECAPTCHA_SECRET_KEY` no está configurado y la aplicación se ejecuta en modo de desarrollo, el punto final omite automáticamente la verificación:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

En producción, una clave secreta faltante devuelve un error 500 en lugar de omitirla silenciosamente.

## Gancho de verificación del lado del cliente

El gancho `useRecaptchaVerification` en `app/[locale]/auth/hooks/useRecaptchaVerification.ts` envuelve la llamada de verificación en una mutación de React Query:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Valores devueltos

| Propiedad | Tipo | Descripción |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Función de mutación para verificar un token |
| `isVerifying` | `boolean` | Si la verificación está en curso |
| `isVerified` | `boolean` | Si la verificación fue exitosa |
| `error` | `Error or null` | Error del último intento de verificación |
| `reset` | `() => void` | Restablecer estado de verificación |

## Gancho de verificación automática

El gancho `useAutoRecaptchaVerification` activa la verificación reCAPTCHA automáticamente cuando se monta un componente o cuando una condición se vuelve verdadera:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### Ejemplo de uso

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Integración de la API de Google

El punto final se comunica con la API reCAPTCHA de Google mediante el método `externalClient.postForm` de `lib/api/server-api-client.ts` . Este método envía datos de formulario codificados en URL:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

El `externalClient` es una instancia `ServerClient` preconfigurada diseñada para llamadas API externas. El método `postForm` maneja el tipo de contenido `application/x-www-form-urlencoded` automáticamente.

### Interpretación de partituras

reCAPTCHA v3 arroja una puntuación entre 0,0 y 1,0:

| Rango de puntuación | Interpretación | Acción típica |
|-------------|---------------|----------------|
| 0,7 - 1,0 | Probablemente humano | Permitir envío |
| 0,3 - 0,7 | Incierto | Puede requerir verificación adicional |
| 0,0 - 0,3 | Robot probable | Bloquear envío |

## Integración con autenticación

El componente `CredentialsForm` utiliza la verificación reCAPTCHA antes de enviar las credenciales:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## Variables de entorno

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

Se accede a la clave secreta a través de `analyticsConfig.recaptcha.secretKey` desde el servicio de configuración centralizado, no directamente desde `process.env` .

## Documentación de arrogancia

El punto final de verificación incluye anotaciones Swagger/JSDoc completas que documentan todos los esquemas de solicitud y respuesta, códigos de estado y ejemplos. Esto se realiza a través del sistema de documentación API integrado en la plantilla.

## Activación condicional

| Condición | Comportamiento |
|-----------|----------|
| Conjunto de claves secretas | Verificación completa contra la API de Google |
| Falta clave secreta, modo de desarrollo | Bypass automático con `success: true` |
| Falta clave secreta, modo de producción | Devuelve error 500 |
| Clave de sitio no configurada en el cliente | Script no cargado, formularios enviados sin verificación |

## Manejo de errores

El punto final maneja tres categorías de errores:

1. **Errores del cliente (400)**: token faltante o no válido en el cuerpo de la solicitud
2. **Errores de configuración (500)**: Falta clave secreta en producción
3. **Errores ascendentes (500)**: errores de solicitud de API de Google o excepciones inesperadas

Todos los errores se registran en la consola del servidor y devuelven una estructura JSON consistente con un mensaje `success: false` y `error` .

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Punto final de verificación del lado del servidor |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | Mutación de verificación de consulta de reacción |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Gancho de verificación de activación automática |
| `lib/api/server-api-client.ts` | Método `externalClient` y `postForm` |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |
