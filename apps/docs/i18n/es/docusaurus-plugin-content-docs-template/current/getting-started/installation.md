---
id: installation
title: Instalación
sidebar_label: Instalación
sidebar_position: 1
---

# Instalación

Esta guía te llevará paso a paso por la configuración de Ever Works en tu máquina local.

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- **Node.js >= 20.19.0** - [Descargar aquí](https://nodejs.org/)
- **pnpm** - Gestor de paquetes requerido (instalar con `npm install -g pnpm`)
- **Git** - Para control de versiones
- **PostgreSQL** (opcional) - Para la base de datos

## Requisitos del sistema

- **Sistema operativo**: Windows, macOS o Linux
- **Memoria**: 4 GB RAM mínimo, 8 GB recomendado
- **Almacenamiento**: 2 GB de espacio libre
- **Red**: Conexión a internet para las dependencias

## Pasos de instalación

### 1. Clonar el repositorio

La plantilla es un **monorepo Turborepo** gestionado con espacios de trabajo pnpm. Al clonar obtienes la raíz del monorepo, que contiene la aplicación web en `apps/web/`, una suite de pruebas end-to-end en `apps/web-e2e/` y un sitio de documentación en `apps/docs/`.

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Instalar dependencias

Ejecuta el comando de instalación desde la **raíz del monorepo**. pnpm es el gestor de paquetes requerido:

```bash
pnpm install
```

### 3. Configuración del entorno

Copia el archivo de entorno de ejemplo en el directorio de la **aplicación web**:

```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Configurar variables de entorno

Edita `apps/web/.env.local` con tu configuración:

```bash
# Configuración básica
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"

# Autenticación
AUTH_SECRET="tu-clave-secreta"  # Generar con: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Base de datos (opcional)
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/everworks"

# Integración con GitHub (requerida para sincronización de contenido)
GH_TOKEN="tu-token-de-github"
DATA_REPOSITORY="https://github.com/ever-works/awesome-data"
```

### 5. Generar el secreto de autenticación

Genera un secreto seguro para la autenticación:

```bash
openssl rand -base64 32
```

Copia el resultado y configúralo como tu `AUTH_SECRET` en `apps/web/.env.local`.

### 6. Configuración de la base de datos (opcional)

Si quieres usar una base de datos, ejecuta los comandos de base de datos desde el directorio `apps/web/`:

```bash
cd apps/web

# Generar esquema de base de datos
pnpm db:generate

# Ejecutar migraciones
pnpm db:migrate

# Sembrar datos iniciales
pnpm db:seed
```

### 7. Iniciar el servidor de desarrollo

Desde la raíz del monorepo, inicia todas las apps (web, docs, etc.):

```bash
pnpm run dev
```

O inicia solo la aplicación web:

```bash
pnpm run dev:web
```

Tu aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Verificación

Para verificar tu instalación:

1. **Comprobar la página de inicio** — Navega a `http://localhost:3000`
2. **Probar la sincronización de contenido** — Los elementos deben cargarse desde el repositorio de datos
3. **Verificar la autenticación** — Intenta iniciar sesión (si está configurado)
4. **Verificar la API** — Visita `http://localhost:3000/api/version`
