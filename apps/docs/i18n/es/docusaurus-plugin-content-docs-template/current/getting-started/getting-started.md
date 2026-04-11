---
id: getting-started
title: Primeros pasos con la plantilla
sidebar_label: Descripción general
sidebar_position: 0
---

# Primeros pasos con la plantilla

Bienvenido al Directorio Web Template de Ever Works. Esta sección te guiará a través de cada paso necesario para pasar desde un clone reciente hasta una aplicación en funcionamiento, tanto localmente como en producción.

## ¿Qué es la plantilla Ever Works?

La plantilla Ever Works es un **sitio web de directorio Next.js** completo organizado como un **monorepo Turborepo** con espacios de trabajo pnpm. Está construida con TypeScript, React 19 y el App Router. Incluye autenticación, pagos, un panel de administración, internacionalización, un CMS basado en Git y mucho más. El monorepo contiene la aplicación web principal (`apps/web/`), una suite de pruebas end-to-end (`apps/web-e2e/`), y un sitio de documentación (`apps/docs/`). La plantilla está diseñada para que puedas clonarla, apuntarla a tu propio repositorio de datos y tener un sitio de directorio listo para producción sin tener que escribirlo todo desde cero.

Datos clave del manifiesto del proyecto:

| Detalle                     | Valor                                                  |
| --------------------------- | ------------------------------------------------------ |
| **Nombre del paquete**      | `directory-web-template` (raíz del monorepo)           |
| **Licencia**                | AGPL-3.0                                               |
| **Requisito de Node.js**    | >= 20.19.0                                             |
| **Gestor de paquetes**      | pnpm con Turborepo (lockfile: `pnpm-lock.yaml`)        |
| **Framework**               | Next.js 16 con React 19                                |
| **ORM de base de datos**    | Drizzle ORM con PostgreSQL (o SQLite para desarrollo)  |
| **Autenticación**           | NextAuth.js v5 (beta) con múltiples proveedores        |

## Lo que aprenderás

Esta sección de primeros pasos está organizada en cuatro guías secuenciales más una tarjeta de referencia. Al finalizar podrás:

1. **Instalar la plantilla** y todas sus dependencias en tu máquina.
2. **Configurar tu entorno** con los secretos necesarios, la conexión a la base de datos y el repositorio de contenido.
3. **Ejecutar la aplicación localmente** y verificar que el servidor de desarrollo, la base de datos y el pipeline de contenido funcionen correctamente.
4. **Desplegar en producción** en Vercel, Docker o un servidor propio.
5. **Consultar comandos rápidamente** usando la hoja de referencia rápida.

## Hoja de ruta de la sección

Trabaja las guías en orden. Cada una se basa en el paso anterior.

### 1. Instalación

Configura Node.js (>= 20.19.0), pnpm y clona el monorepo. La guía de instalación cubre los requisitos del sistema, la instalación de dependencias y la orientación inicial sobre la estructura del proyecto.

**Leer a continuación:** [Instalación](/docs/getting-started/installation)

### 2. Configuración del entorno

Crea tu archivo `apps/web/.env.local` y configura todas las variables requeridas y opcionales. La plantilla incluye una utilidad `scripts/check-env.js` que valida tu configuración antes de que el servidor de desarrollo se inicie, por lo que sabrás inmediatamente si falta algo.

Temas cubiertos:

- Variables principales (`AUTH_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`)
- Repositorio de contenido (`DATA_REPOSITORY` y el pipeline de `scripts/clone.cjs`)
- Proveedores de autenticación (Google, GitHub, credenciales)
- Integraciones de pago (Stripe, Polar, LemonSqueezy, Solidgate)
- Servicios de correo electrónico, análisis y monitoreo

**Leer a continuación:** [Configuración del entorno](/docs/getting-started/environment-setup)

### 3. Inicio rápido

Una vez configurado tu entorno, la guía de inicio rápido pone la aplicación en funcionamiento en menos de diez minutos. Iniciarás el servidor de desarrollo, sembrarás la base de datos y explorarás el sitio en `http://localhost:3000`.

**Leer a continuación:** [Inicio rápido](/docs/getting-started/quick-start)

### 4. Primer despliegue

Toma tu configuración verificada localmente y despliégala en un entorno en vivo. La guía de despliegue cubre Vercel (recomendado), builds standalone de Docker y alojamiento manual. Incluye una lista de verificación previa al despliegue para que no se pierda nada.

**Leer a continuación:** [Primer despliegue](/docs/getting-started/first-deployment)

### 5. Referencia rápida

Una hoja de referencia de una sola página con los comandos, rutas de archivos y convenciones más comunes. Tenla abierta en una pestaña mientras desarrollas.

**Leer a continuación:** [Referencia rápida](/docs/getting-started/quick-reference)

## Requisitos previos

Antes de comenzar la guía de instalación, asegúrate de tener las siguientes herramientas disponibles:

- **Node.js 20.19.0 o superior** — el campo `engines` en `package.json` impone este mínimo.
- **pnpm** — el proyecto usa pnpm como gestor de paquetes. Instálalo globalmente con `npm install -g pnpm`.
- **Git** — necesario tanto para clonar la plantilla como para el pipeline de contenido del CMS basado en Git.
- **Un editor de código** — se recomienda VS Code; el repositorio incluye configuraciones del espacio de trabajo.
- **PostgreSQL** (opcional para desarrollo local) — puedes usar SQLite localmente configurando `DATABASE_URL=file:./dev.db`, pero los despliegues en producción requieren PostgreSQL.

## Comandos esenciales de un vistazo

Estos son los comandos que usarás con mayor frecuencia. Cada uno se explica en detalle en la guía correspondiente.

```bash
# Instalar dependencias (desde la raíz del monorepo)
pnpm install

# Iniciar todas las apps (web, docs) a través de Turborepo
pnpm run dev

# Iniciar solo la aplicación web
pnpm run --filter @ever-works/web dev

# Construir para producción
pnpm run build

# Ejecutar linting
pnpm run lint

# Verificación de tipos TypeScript
cd apps/web && pnpm tsc --noEmit
```
