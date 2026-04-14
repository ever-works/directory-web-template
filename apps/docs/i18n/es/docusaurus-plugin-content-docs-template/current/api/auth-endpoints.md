---
id: auth-endpoints
title: "Endpoints API de Autenticación"
sidebar_label: "Endpoints de Auth"
sidebar_position: 4
---

# Endpoints API de Autenticación

Los puntos finales de autenticación gestionan el manejo de rutas de NextAuth.js, la gestión de contraseñas y la recuperación de la sesión del usuario actual. La ruta comodín principal de NextAuth gestiona automáticamente todos los callbacks de OAuth, la gestión de sesiones y la protección CSRF.

## Manejador NextAuth (`/api/auth/[...nextauth]`)

La ruta comodín exporta los manejadores de NextAuth desde `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Esta única ruta gestiona todas las operaciones de NextAuth:

### Puntos Finales GET (vía NextAuth)

| Ruta | Descripción |
|------|-------------|
| `/api/auth/signin` | Renderizar página de inicio de sesión o redirigir al proveedor |
| `/api/auth/signout` | Gestionar cierre de sesión |
| `/api/auth/session` | Obtener sesión actual como JSON |
| `/api/auth/csrf` | Obtener token CSRF |
| `/api/auth/providers` | Listar proveedores de autenticación disponibles |
| `/api/auth/callback/[provider]` | Manejador de callback OAuth |

### Puntos Finales POST (vía NextAuth)

| Ruta | Descripción |
|------|-------------|
| `/api/auth/signin/[provider]` | Iniciar inicio de sesión con proveedor |
| `/api/auth/signout` | Procesar cierre de sesión |
| `/api/auth/callback/credentials` | Procesar inicio de sesión con credenciales |
| `/api/auth/_log` | Registro interno de Auth.js |

### Flujo de Callback OAuth

Cuando un usuario se autentica con un proveedor OAuth:

```
1. El usuario hace clic en "Iniciar sesión con Google"
2. Redirección a la pantalla de consentimiento de Google
3. Google redirige de vuelta a /api/auth/callback/google
4. NextAuth verifica el código OAuth
5. Se ejecuta el callback signIn (lib/auth/index.ts)
   -> Valida el correo del usuario
   -> Permite vinculación de cuentas para OAuth
6. El callback jwt enriquece el token
   -> Establece userId, provider, isAdmin
   -> Crea perfil de cliente para nuevos usuarios OAuth
7. Sesión creada, usuario redirigido a la URL de callback
```

### Páginas Personalizadas

NextAuth está configurado para usar páginas de autenticación personalizadas en lugar de la interfaz por defecto de NextAuth:

| Propósito | Ruta Personalizada |
|-----------|-------------------|
| Inicio de Sesión | `/auth/signin` |
| Cierre de Sesión | `/auth/signout` |
| Error | `/auth/error` |
| Verificar Solicitud | `/auth/verify-request` |
| Registro de Nuevo Usuario | `/auth/register` |

## Gestión de Contraseñas (`/api/auth/change-password`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/change-password` | Cambiar contraseña del usuario autenticado |

### Cuerpo de la Solicitud

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Autenticación

Requiere una sesión válida. El punto final verifica la contraseña actual antes de actualizar.

### Respuesta

```json
// Éxito
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## Usuario Actual (`/api/current-user`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/current-user` | Obtener datos del usuario autenticado actual |

### Respuesta

Devuelve el objeto de usuario de sesión enriquecido con campos específicos de la aplicación:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### Respuesta Sin Autenticación

Devuelve `null` o un estado `401` cuando no existe una sesión válida.

## Manejo de Tokens de Sesión

NextAuth almacena los tokens de sesión en cookies HTTP-only:

| Nombre de Cookie | Entorno |
|-----------------|---------|
| `next-auth.session-token` | Desarrollo (HTTP) |
| `__Secure-next-auth.session-token` | Producción (HTTPS) |

### Protección CSRF

NextAuth incluye protección CSRF integrada. Se establece una cookie de token CSRF (`next-auth.csrf-token`) en el cliente y debe incluirse en las solicitudes POST a los puntos finales de NextAuth.

## Manejo de Errores

Los errores de autenticación se mapean a mensajes amigables para el usuario en `lib/auth/error-handler.ts`:

| Patrón de Error | Mensaje al Usuario |
|----------------|-------------------|
| Relacionado con `GOOGLE_CLIENT_ID` | La autenticación de Google no está correctamente configurada |
| Relacionado con `GITHUB_CLIENT_ID` | La autenticación de GitHub no está correctamente configurada |
| Relacionado con `FB_CLIENT_ID` | La autenticación de Facebook no está correctamente configurada |
| Relacionado con `MICROSOFT_CLIENT_ID` | La autenticación de Microsoft no está correctamente configurada |
| Relacionado con `SUPABASE` | La autenticación de Supabase no está correctamente configurada |
| Relacionado con `NEXTAUTH` | NextAuth no está correctamente configurado |

La función `handleAuthError()` captura estos errores y devuelve una respuesta estructurada `{ error: string }`.

## Eventos de Auth

La configuración de NextAuth en `lib/auth/index.ts` maneja eventos del ciclo de vida:

### Evento de Cierre de Sesión

Invalida la caché de sesión del usuario para asegurar que no se sirvan datos de sesión obsoletos:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### Evento de Actualización de Usuario

Invalida la caché de sesión cuando cambian los datos del usuario (p. ej., actualización de perfil, cambio de rol):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Configuración Relacionada

| Archivo | Propósito |
|---------|-----------|
| `auth.config.ts` | Configuración de proveedores de alto nivel |
| `lib/auth/index.ts` | Instancia de NextAuth con callbacks y eventos |
| `lib/auth/providers.ts` | Fábrica de proveedores OAuth |
| `lib/auth/credentials.ts` | Proveedor de correo/contraseña |
| `lib/auth/cached-session.ts` | Capa de caché de sesión |
