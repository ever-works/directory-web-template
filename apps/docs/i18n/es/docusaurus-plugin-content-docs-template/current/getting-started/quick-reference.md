---
id: quick-reference
title: Referencia rápida
sidebar_label: Referencia rápida
sidebar_position: 5
---

# Referencia rápida

Comandos esenciales, patrones y convenciones para el desarrollo con Ever Works.

## Comandos esenciales

### Desarrollo

```bash
# Iniciar servidor de desarrollo (todos los apps)
pnpm run dev

# Iniciar solo la aplicación web
pnpm run --filter @ever-works/web dev

# Construir para producción
pnpm run build

# Iniciar servidor de producción
pnpm start

# Ejecutar linter
pnpm run lint

# Verificación de tipos TypeScript
cd apps/web && pnpm tsc --noEmit
```

### Base de datos

```bash
# Ejecutar desde apps/web/

# Generar esquema de base de datos
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate

# Sembrar datos
pnpm db:seed

# Abrir Drizzle Studio
pnpm db:studio
```

### Contenido

```bash
# Clonar/actualizar el repositorio de contenido
cd apps/web && node scripts/clone.cjs

# Validar variables de entorno
cd apps/web && node scripts/check-env.js
```

## Estructura del proyecto

```
directory-web-template/           # Raíz del monorepo
├── apps/
│   ├── web/                      # Aplicación Next.js principal
│   │   ├── app/[locale]/         # Páginas del App Router
│   │   ├── components/           # Componentes React
│   │   ├── lib/                  # Lógica de negocio
│   │   │   ├── services/         # Servicios de negocio
│   │   │   ├── repositories/     # Capa de acceso a datos
│   │   │   └── db/               # Esquema Drizzle y migraciones
│   │   ├── public/               # Activos estáticos
│   │   └── .content/             # Contenido CMS (clonado de Git)
│   ├── docs/                     # Sitio de documentación Docusaurus
│   └── web-e2e/                  # Pruebas end-to-end Playwright
├── packages/
│   ├── eslint-config/            # Configuración ESLint compartida
│   └── tsconfig/                 # Configuración TypeScript compartida
└── docs/                         # Fuentes de la documentación Markdown
```

## Variables de entorno clave

| Variable | Requerida | Descripción |
| -------- | --------- | ----------- |
| `AUTH_SECRET` | ✅ | Secreto para tokens JWT |
| `COOKIE_SECRET` | ✅ | Secreto para cifrado de cookies |
| `DATABASE_URL` | ✅ | Cadena de conexión a la BD |
| `DATA_REPOSITORY` | ✅ | URL del repo de contenido Git |
| `GH_TOKEN` | ✅ | Token de acceso personal de GitHub |
| `NEXTAUTH_URL` | ✅ en producción | URL base de la aplicación |
| `GOOGLE_CLIENT_ID` | ⚪ | Para OAuth de Google |
| `STRIPE_SECRET_KEY` | ⚪ | Para pagos con Stripe |

## Puertos de desarrollo

| Servicio | Puerto |
| -------- | ------ |
| Aplicación web | 3000 |
| Documentación | 3001 |
| API | 3000/api |
| Drizzle Studio | 4983 |

## Rutas de archivos de configuración

| Archivo | Descripción |
| ------- | ----------- |
| `apps/web/.env.local` | Variables de entorno locales |
| `apps/web/.content/config.yml` | Configuración del sitio |
| `apps/web/drizzle.config.ts` | Configuración de Drizzle ORM |
| `apps/web/next.config.ts` | Configuración de Next.js |
| `apps/web/tailwind.config.ts` | Configuración de Tailwind CSS |
| `turbo.json` | Configuración de Turborepo |
