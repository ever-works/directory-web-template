---
id: auth-config-reference
title: Referencia de Configuración Auth.js
sidebar_label: Referencia de Configuración Auth
sidebar_position: 11
---

# Referencia de Configuración Auth.js

Esta página documenta la configuración de NextAuth (Auth.js) definida en `auth.config.ts`. Este archivo configura los proveedores de autenticación, la estrategia de sesión y el manejo de errores para el template.

## Descripción General

El template admite múltiples estrategias de autenticación a través de una configuración unificada:

- **NextAuth (Auth.js)** -- Autenticación basada en OAuth y credenciales
- **Supabase Auth** -- Autenticación nativa de Supabase
- **Ambos** -- Modo dual-proveedor para máxima flexibilidad

El archivo `auth.config.ts` configura específicamente el lado NextAuth de este sistema.

## Archivo de Configuración

El archivo root `auth.config.ts` exporta un objeto `NextAuthConfig`:

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## Propiedades Principales

### `trustHost`

Establecido en `true` para confiar en el encabezado del host cuando se ejecuta detrás de un proxy inverso (como Vercel). Esto es necesario para la generación correcta de URLs de redirección en entornos de producción.

### `providers`

El array de proveedores se construye dinámicamente basándose en qué proveedores OAuth tienen credenciales configuradas válidas. La función `configureProviders()`:

1. Llama a `configureOAuthProviders()` para validar las variables de entorno
2. Mapea cada proveedor habilitado a su configuración de proveedor NextAuth
3. Siempre incluye el proveedor de credenciales como fallback

## Proveedores Admitidos

| Proveedor | Variables de Entorno Requeridas | Notas |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vinculación de cuenta por correo deshabilitada por defecto |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Flujo OAuth estándar |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | Flujo OAuth estándar |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | Flujo OAuth 2.0 |
| Credentials | Ninguna (siempre habilitado) | Autenticación por correo/contraseña |

## Arquitectura del Proveedor

El pipeline de creación de proveedores involucra varios archivos trabajando juntos.

### Factory del Proveedor (`lib/auth/providers.ts`)

La función `createNextAuthProviders` mapea objetos de configuración a instancias reales de proveedores NextAuth:

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
```

### Manejador de Errores Auth (`lib/auth/error-handler.ts`)

El manejador de errores auth valida las variables de entorno y proporciona mensajes de error legibles:

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## Degradación Controlada

Un principio de diseño clave es la degradación controlada. Si la configuración OAuth falla al inicio:

1. El error se captura como un `AppError` estructurado con tipo `CONFIG` y código `OAUTH_CONFIG_FAILED`
2. El error se registra con el contexto `"Auth Config"`
3. El sistema regresa a la autenticación solo por credenciales
4. La aplicación continúa iniciándose normalmente

Esto significa que un secreto OAuth de Google mal configurado no impedirá que toda la aplicación funcione -- los usuarios aún pueden iniciar sesión con correo y contraseña.

## Proveedores Parcialmente Configurados

Cuando un proveedor tiene algunas pero no todas las variables de entorno requeridas, se registra una advertencia:

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

Esto ayuda a identificar problemas de configuración sin hacer que la aplicación falle.

## Variables de Entorno Requeridas

Configura como mínimo estas variables para que NextAuth funcione:

```env
# Requerido para todas las configuraciones NextAuth
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opcional: agregar credenciales del proveedor para habilitar OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Genera `AUTH_SECRET` usando:

```bash
openssl rand -base64 32
```

## Recursos Relacionados

- [Configuración del Proveedor](/template/configuration/provider-config) -- Elegir entre NextAuth, Supabase o ambos
- [Referencia de Entorno](/template/configuration/environment-reference) -- Listado completo de variables de entorno
- [Patrones de Manejo de Errores](/template/guides/error-handler-patterns) -- Cómo se estructuran los errores auth
