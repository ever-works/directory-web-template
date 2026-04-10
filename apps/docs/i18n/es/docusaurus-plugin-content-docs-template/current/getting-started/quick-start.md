---
id: quick-start
title: Inicio rápido
sidebar_label: Inicio rápido
sidebar_position: 3
---

# Inicio rápido

¡Pon tu sitio web de directorio en funcionamiento en menos de 10 minutos! Esta guía asume que ya has completado la [instalación](./installation).

## Paso 1: Configuración básica

### Configurar los ajustes del sitio

Edita `apps/web/.content/config.yml` (este archivo se creará después de la primera sincronización):

```yaml
# Configuración básica del sitio
company_name: 'Tu Empresa'
item_name: 'Herramienta'
items_name: 'Herramientas'
copyright_year: 2024

# Activar funcionalidades
content_table: true
auth:
    credentials: true
    google: true
    github: true

# Configuración de pagos
payment:
    provider: 'stripe'
pricing:
    free: 0
    pro: 10
    sponsor: 20
```

### Configurar el repositorio de datos

1. **Haz un fork del repositorio de datos**:
    - Visita [awesome-data](https://github.com/ever-works/awesome-data)
    - Haz clic en "Fork" para crear tu copia

2. **Actualiza las variables de entorno**:

    ```bash
    # En apps/web/.env.local
    DATA_REPOSITORY="https://github.com/TU_USUARIO/awesome-data"
    GH_TOKEN="tu_token_de_github"
    ```

3. **Genera el token de GitHub**:
    - Ve a GitHub Settings → Developer settings → Personal access tokens
    - Crea un token con permisos `repo`
    - Añádelo a tu `apps/web/.env.local`

## Paso 2: Iniciar la aplicación

Desde la raíz del monorepo:

```bash
pnpm run dev
```

Esto inicia:
- La aplicación web en [http://localhost:3000](http://localhost:3000)
- La documentación en [http://localhost:3001](http://localhost:3001)

## Paso 3: Sincronizar el contenido

El contenido se sincroniza automáticamente desde tu repositorio de datos al iniciar. Para sincronizar manualmente:

```bash
cd apps/web
node scripts/clone.cjs
```

## Paso 4: Explorar el sitio

Una vez en funcionamiento, explora estas áreas clave:

| URL | Descripción |
| --- | ----------- |
| `http://localhost:3000` | Página de inicio del directorio |
| `http://localhost:3000/admin` | Panel de administración |
| `http://localhost:3000/api/docs` | Documentación de la API |
| `http://localhost:3000/auth/sign-in` | Página de inicio de sesión |

## Paso 5: Configurar la autenticación

Para habilitar el inicio de sesión, configura al menos un proveedor en tu `.env.local`:

```bash
# Autenticación con credenciales (correo/contraseña)
# No requiere variables adicionales

# OAuth con Google
GOOGLE_CLIENT_ID="tu-client-id"
GOOGLE_CLIENT_SECRET="tu-client-secret"

# OAuth con GitHub
GITHUB_CLIENT_ID="tu-client-id"
GITHUB_CLIENT_SECRET="tu-client-secret"
```

## Próximos pasos

- [Primer despliegue](/docs/getting-started/first-deployment) — Despliega en producción
- [Descripción de la arquitectura](/docs/architecture/overview) — Entiende cómo funciona
- [Guía de configuración](/docs/configuration) — Personaliza tu directorio
