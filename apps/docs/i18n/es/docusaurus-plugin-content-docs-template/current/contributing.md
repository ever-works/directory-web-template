---
id: contributing
title: Guía de Contribución
sidebar_label: Contribución
---

# Guía de Contribución

Gracias por tu interés en contribuir al Directory Web Template. Esta guía cubre todo lo que necesitas saber para hacer contribuciones significativas.

## Repositorio

El código fuente del Template está alojado en [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Para contribuciones a la Plataforma Ever Works, consulta el [repositorio de la Plataforma](https://github.com/ever-works/ever-works) y su guía de contribución en [docs.ever.works](https://docs.ever.works).

## Requisitos previos

Antes de comenzar, asegúrate de tener lo siguiente instalado:

- **Node.js** >= 20.19.0 (LTS recomendado)
- **pnpm** >= 10.x (estrictamente aplicado; no uses npm ni yarn)
- **Git** >= 2.30
- **PostgreSQL** (para la base de datos; Supabase proporciona una opción alojada)

### Instalando pnpm

```bash
# Usando corepack (recomendado, incluido con Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# O via npm (bootstrap único)
npm install -g pnpm
```

**Importante:** El repositorio usa campos `packageManager` y archivos de bloqueo específicos para pnpm. Ejecutar `npm install` o `yarn install` fallará o producirá árboles de dependencias incorrectos.

## Configuración de Desarrollo

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Copiar el archivo de entorno y configurar
cp .env.example .env.local
# Edita .env.local con tus valores (consulta el README para más detalles)

pnpm dev        # Servidor de desarrollo Next.js en el puerto 3000
```

## Estándares de Código

### TypeScript

El Template usa TypeScript en todas partes. No introduzcas archivos `.js` simples. Sigue las prácticas estrictas de TypeScript:

- Habilita y respeta la configuración del modo `strict` en `tsconfig.json`
- Prefiere tipos de retorno explícitos en funciones exportadas
- Usa `unknown` sobre `any` donde sea posible
- Valida la entrada con esquemas **Zod**

### Formateo (Prettier)

El formateo se aplica mediante Prettier. La configuración se encuentra en el `package.json` raíz:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Ejecuta el formateador antes de hacer commits:

```bash
pnpm format          # Formatea todos los archivos
pnpm format:check    # Verifica sin modificar (compatible con CI)
```

### Linting (ESLint)

El Template usa la configuración plana de ESLint (`eslint.config.mjs`) con plugins de React, React Hooks y TypeScript:

```bash
pnpm lint
```

### Convenciones de Nomenclatura

| Elemento                    | Convención       | Ejemplo                               |
| --------------------------- | ---------------- | ------------------------------------- |
| Archivos                    | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Clases, Interfaces, Tipos   | PascalCase       | `DirectoryService`, `UserProfile`     |
| Funciones, Variables        | camelCase        | `getDirectoryById`, `itemCount`       |
| Constantes                  | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Convenciones de Commits

El repositorio aplica [Conventional Commits](https://www.conventionalcommits.org/) mediante **commitlint** y los hooks pre-commit de **husky**.

| Prefijo     | Uso                                                   |
| ----------- | ----------------------------------------------------- |
| `feat:`     | Nuevas características                                |
| `fix:`      | Correcciones de errores                               |
| `docs:`     | Cambios en la documentación                           |
| `refactor:` | Reestructuración de código sin cambio de comportamiento |
| `test:`     | Agregar o actualizar pruebas                          |
| `chore:`    | Tareas de mantenimiento, actualizaciones de dependencias |
| `style:`    | Cambios de formato (sin cambio de lógica)             |
| `perf:`     | Mejoras de rendimiento                                |
| `ci:`       | Cambios en la configuración CI/CD                     |

Ejemplo:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Nomenclatura de Ramas

Usa nombres de rama descriptivos con un prefijo:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Proceso de Pull Request

1. **Haz un fork** del repositorio (o crea una rama si tienes acceso de escritura).
2. **Crea una rama de feature** desde `main`.
3. **Realiza tus cambios** siguiendo los estándares de código anteriores.
4. **Ejecuta verificaciones de calidad** antes de hacer push (ver más abajo).
5. **Haz push** de tu rama y abre un Pull Request contra `main`.
6. **Completa la plantilla de PR** con una descripción, issues relacionadas y notas de prueba.
7. **Espera la revisión.** Un mantenedor revisará tu PR y puede solicitar cambios.
8. Una vez aprobado, un mantenedor hará merge de tu PR.

### Verificaciones de Calidad Antes de Enviar un PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Verificación de TypeScript
pnpm build          # Build de producción completo
```

### Pruebas

El Template usa **Playwright** para pruebas end-to-end:

```bash
pnpm test:e2e
```

Si tus cambios tocan funcionalidad existente, asegúrate de que todas las pruebas relacionadas pasen. Si agregas nueva funcionalidad, incluye pruebas para ella.

## Licencia

El Directory Web Template está licenciado bajo la **GNU Affero General Public License v3.0 (AGPL-3.0)**. Al enviar una contribución, aceptas que tu trabajo se licenciará bajo la misma licencia.

## Código de Conducta

Se espera que todos los colaboradores sigan el Código de Conducta del proyecto. Sé respetuoso, constructivo y colaborativo.

## Obtener Ayuda

Si tienes preguntas sobre cómo contribuir:

- Abre una [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Únete a la [comunidad Discord](https://discord.gg/ever) para ayuda en tiempo real
- Email a [ever@ever.co](mailto:ever@ever.co) para consultas privadas
