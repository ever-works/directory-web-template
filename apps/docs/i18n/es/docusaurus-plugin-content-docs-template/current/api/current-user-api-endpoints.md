---
id: current-user-api-endpoints
title: "Endpoints API Usuario Actual"
sidebar_label: "API Usuario Actual"
sidebar_position: 60
---

# Endpoints API Usuario Actual

La API de Usuario Actual proporciona un único punto final para recuperar la información del perfil del usuario autenticado. Es utilizada por el frontend para determinar el estado de autenticación y los privilegios del usuario.

**Fuente:** `template/app/api/current-user/route.ts`

---

## Obtener Usuario Actual

Devuelve la información segura del perfil del usuario autenticado actualmente. Devuelve `null` si no hay usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/current-user` |
| **Autenticación** | No requerida (devuelve `null` si no está autenticado) |

### Respuesta

**Estado 200** -- Usuario autenticado.

```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://example.com/avatars/john.jpg",
  "provider": "google",
  "isAdmin": false
}
```

**Estado 200** -- Sin usuario autenticado.

```json
null
```

### Campos de Respuesta

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `id` | `string` | No | Identificador único del usuario |
| `name` | `string` | Sí | Nombre completo del usuario |
| `email` | `string` | Sí | Dirección de correo del usuario |
| `image` | `string` | Sí | URL de imagen de perfil |
| `provider` | `string` | Sí | Proveedor de autenticación (p. ej., `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | No | Si el usuario tiene privilegios de administrador (predeterminado: `false`) |

### Ejemplos de Respuesta

**Usuario OAuth (Google):**
```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "provider": "google",
  "isAdmin": false
}
```

**Usuario administrador (credenciales):**
```json
{
  "id": "user_456def",
  "name": "Jane Admin",
  "email": "jane.admin@example.com",
  "image": null,
  "provider": "credentials",
  "isAdmin": true
}
```

**Usuario GitHub:**
```json
{
  "id": "user_789ghi",
  "name": "GitHub User",
  "email": "github.user@example.com",
  "image": "https://avatars.githubusercontent.com/u/123456",
  "provider": "github",
  "isAdmin": false
}
```

### Ejemplos con curl

```bash
# Obtener usuario actual (autenticado)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Obtener usuario actual (no autenticado -- devuelve null)
curl -s http://localhost:3000/api/current-user
```

### Uso en TypeScript

```typescript
interface SafeUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  provider: string | null;
  isAdmin: boolean;
}

async function getCurrentUser(): Promise<SafeUser | null> {
  const res = await fetch('/api/current-user');
  return res.json();
}

// Uso
const user = await getCurrentUser();
if (user) {
  console.log(`Conectado como ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('El usuario tiene privilegios de administrador');
  }
} else {
  console.log('No autenticado');
}
```

### Notas de Implementación

- El punto final usa la función `auth()` de `@/lib/auth` (NextAuth.js) para leer la sesión del lado del servidor.
- La respuesta está saneada -- solo se devuelven campos de perfil seguros. Los campos sensibles como hashes de contraseña, metadatos internos y tokens están excluidos.
- Este punto final siempre devuelve HTTP 200, incluso cuando no hay usuario autenticado. El llamador distingue comprobando si la respuesta es `null`.
- El campo `isAdmin` tiene como valor predeterminado `false` si no está establecido en la sesión, garantizando un comportamiento seguro para usuarios no administradores.
