---
id: changelog
title: Changelog & Versiones
sidebar_label: Changelog
---

# Changelog & Versiones

Esta página explica cómo el Directory Web Template gestiona el versionado, los lanzamientos y las rutas de actualización.

## Versionado Semántico

El Template sigue el [Semantic Versioning (SemVer)](https://semver.org/). Los números de versión usan el formato **MAJOR.MINOR.PATCH**:

| Componente | Cuándo incrementar                                              |
| ---------- | --------------------------------------------------------------- |
| **MAJOR**  | Cambios incompatibles que requieren pasos de migración          |
| **MINOR**  | Nuevas funcionalidades añadidas de forma retrocompatible        |
| **PATCH**  | Correcciones de errores retrocompatibles y mejoras menores      |

Las versiones preliminares pueden usar sufijos como `-alpha.1`, `-beta.2` o `-rc.1` para pruebas tempranas.

## Migraciones de Base de Datos

El Template usa **Drizzle ORM** con PostgreSQL. Los cambios en el esquema de base de datos se gestionan a través de Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Los archivos de migración se almacenan en el directorio `lib/db/migrations/`. Cada migración es un archivo SQL generado a partir de cambios en las definiciones de esquema Drizzle en `lib/db/schema/`.

## Actualizar el Template

Al actualizar a una versión más reciente:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Manejo de Conflictos Durante las Actualizaciones

Si ha personalizado el Template, puede encontrar conflictos de fusión al extraer actualizaciones. El enfoque recomendado:

1. **Mantén las personalizaciones en archivos separados** cuando sea posible (componentes personalizados, nuevas rutas, servicios adicionales).
2. **Usa el CMS basado en Git** para cambios de contenido en lugar de modificar archivos principales.
3. **Revisa las notas de lanzamiento** antes de actualizar para entender qué archivos han cambiado.
4. **Prueba exhaustivamente** después de resolver conflictos ejecutando `pnpm lint`, `pnpm tsc --noEmit` y `pnpm build`.

## Seguimiento de Lanzamientos

### GitHub Releases

Los lanzamientos se publican en GitHub en [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Cada lanzamiento incluye:

- Una etiqueta de versión (p. ej., `v0.1.0`)
- Notas de lanzamiento que describen cambios, nuevas funcionalidades, correcciones de errores y cambios incompatibles
- Enlaces a pull requests e issues relevantes

### Historial de Commits

El repositorio usa [Conventional Commits](https://www.conventionalcommits.org/), lo que facilita escanear el historial de commits en busca de cambios:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Política de Cambios Incompatibles

Los cambios incompatibles se toman en serio. El proyecto sigue estos principios:

1. **Aviso previo.** Los cambios incompatibles se anuncian al menos una versión minor antes de que entren en vigencia, cuando sea posible.
2. **Guías de migración.** Cada cambio incompatible incluye una guía de migración en las notas de lanzamiento.
3. **Minimizar interrupciones.** Los cambios incompatibles se agrupan en lanzamientos major en lugar de distribuirse en múltiples lanzamientos minor.
4. **Compatibilidad retroactiva de la base de datos.** Las migraciones están diseñadas para ser no destructivas. Se prefieren adiciones de columnas y creaciones de tablas sobre eliminaciones o renombramientos.

### Ejemplos de Cambios Incompatibles

- Eliminación o cambio de nombre de un endpoint de API público
- Cambio en la estructura de los cuerpos de solicitud o respuesta de la API
- Eliminación o cambio de nombre de columnas o tablas de base de datos
- Cambio de variables de entorno requeridas
- Abandono del soporte para una versión de Node.js
- Cambio en el comportamiento de autenticación o autorización
- Eliminación o cambio de nombre de tipos o interfaces TypeScript exportados

### Ejemplos de Cambios Compatibles

- Añadir nuevos endpoints de API
- Añadir nuevos campos opcionales a los cuerpos de solicitud o respuesta
- Añadir nuevas columnas de base de datos con valores por defecto
- Añadir nuevas variables de entorno con valores predeterminados razonables
- Añadir nuevas funcionalidades o integraciones
- Mejoras de rendimiento
- Correcciones de errores

## Formato del Changelog

Las notas de lanzamiento siguen esta estructura:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

Este formato sigue las convenciones de [Keep a Changelog](https://keepachangelog.com/).
