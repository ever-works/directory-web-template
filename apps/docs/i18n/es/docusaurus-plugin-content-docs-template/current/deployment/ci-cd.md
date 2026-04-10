---
id: ci-cd
title: Pipeline CI/CD
sidebar_label: CI/CD Pipeline
sidebar_position: 3
---

# Pipeline CI/CD

La plantilla Ever Works incluye un pipeline CI/CD completo construido con GitHub Actions. Esta guía cubre la estructura del flujo de trabajo, el escaneo de seguridad, la estrategia de protección de ramas y el flujo de promoción de despliegues.

## Descripción General del Flujo de Trabajo

El pipeline consiste en seis archivos de flujo de trabajo en `.github/workflows/`:

| Flujo de Trabajo | Archivo | Disparador | Propósito |
|---|---|---|---|
| CI | `ci.yml` | Push/PR a `main`, `develop` | Lint, verificación de tipos, build |
| CodeQL | `codeql.yml` | Push/PR a `main`, `develop` + horario semanal | Análisis de vulnerabilidades de seguridad |
| Dev Deploy | `deploy_dev.yaml` | Push a `develop` | Despliegue en entorno de vista previa |
| Prod Deploy | `deploy_prod.yaml` | Push a `main` | Despliegue en entorno de producción |
| Vercel Deploy | `deploy_vercel.yaml` | Invocado por dev/prod | Lógica de despliegue Vercel compartida |
| Disable CodeQL | `disable-default-codeql.yml` | Solo manual | Herramienta de resolución de conflictos CodeQL |

### Flujo del Pipeline

```
Feature Branch --> PR to develop --> CI runs
                                     |
                                     v
                               Merge to develop --> Dev Deploy (preview)
                                     |
                                     v
                               PR to main --> CI runs
                                     |
                                     v
                               Merge to main --> Prod Deploy (production)
```

## Flujo de Trabajo CI (ci.yml)

El flujo CI se ejecuta en cada push y pull request a `main` y `develop`. Verifica la calidad del código y asegura que el proyecto se construya correctamente.

### Trabajos

El flujo de trabajo contiene un único trabajo `lint-and-build` que se ejecuta en `ubuntu-latest`:

**Pasos**:

1. **Checkout del código** -- Clona el repositorio
2. **Detección del gestor de paquetes** -- Detecta automáticamente pnpm, yarn o npm desde lockfiles
3. **Configuración de pnpm** -- Instala pnpm v9 si se detecta
4. **Configuración de Node.js** -- Instala Node 20 con caché del gestor de paquetes
5. **Instalación de dependencias** -- Ejecuta `pnpm install`
6. **Ejecutar lint** -- Ejecuta `pnpm lint` (continúa con errores para PRs)
7. **Verificación de tipos** -- Ejecuta `pnpm typecheck` o `pnpm check:types`
8. **Crear directorios de contenido** -- Crea `.content/data` para el build
9. **Construir el proyecto** -- Ejecuta `pnpm build` con todas las variables de entorno requeridas
10. **Verificar éxito del build** -- Valida que se haya creado el directorio `.next`

### Control de Concurrencia

```yaml
concurrency:
  group: ${{ github.ref }}-${{ github.workflow }}
  cancel-in-progress: true
```

Si se hace un nuevo push en la misma rama mientras se ejecuta CI, la ejecución anterior se cancela automáticamente. Esto ahorra minutos de CI y garantiza que solo se valide el commit más reciente.

### Variables de Entorno

El flujo CI usa una combinación de valores predeterminados codificados y secretos de GitHub:

| Variable | Fuente | Propósito |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Codificada | URL de la aplicación para el build |
| `DATABASE_URL` | Secreto o predeterminado | Conexión de base de datos para el build |
| `AUTH_SECRET` | Valor CI codificado | Firma de tokens de autenticación (no para producción) |
| `DATA_REPOSITORY` | Secreto o predeterminado | URL del repositorio de contenido |
| `CONTENT_WARNINGS_SILENT` | Codificado `true` | Silencia advertencias de contenido en CI |
| `CI` | Codificado `true` | Indica entorno CI |
| Secretos OAuth | Secretos de GitHub | Credenciales de Google, GitHub, Facebook, Twitter |
| `RESEND_API_KEY` | Secreto de GitHub | Servicio de email para verificaciones de build |

### Permisos

El flujo de trabajo solicita permisos mínimos:

```yaml
permissions:
  contents: read
```

Solo se necesita acceso de lectura al contenido del repositorio para el trabajo CI.

## Análisis de Seguridad CodeQL (codeql.yml)

### Qué Hace

CodeQL realiza análisis semántico del código para detectar vulnerabilidades de seguridad en código JavaScript/TypeScript. Se ejecuta:

- En cada push y PR a `main` y `develop`
- Semanalmente los lunes a las 6 AM UTC (análisis programado)
- En activación manual

### Pasos de Análisis

1. **Checkout** y **configuración** de Node.js + pnpm
2. **Inicialización de CodeQL** con el lenguaje `javascript-typescript`
3. **Configuración del entorno CodeQL** mediante `scripts/codeql-setup.js`
4. **Instalación de dependencias** para contexto de análisis
5. **Autobuild** -- Detección automática del build por CodeQL
6. **Análisis con carga** -- Sube resultados a la pestaña Security de GitHub
7. **Análisis de reserva** -- Si la carga falla, análisis sin carga

### Permisos

CodeQL requiere permisos más amplios para reportar eventos de seguridad:

```yaml
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
```

### Ver Resultados

Después de una ejecución exitosa con carga:
1. Navegue a su repositorio en GitHub
2. Vaya a **Security** > **Code scanning**
3. Revise los resultados, filtre por severidad y gestione alertas

### Resolver Conflictos CodeQL

Si encuentra conflictos de procesamiento SARIF con la configuración predeterminada de CodeQL de GitHub, use el flujo de trabajo `disable-default-codeql.yml`:

```bash
# Trigger manually from GitHub Actions tab
# This disables the default configuration that may conflict with your custom setup
```

## Flujos de Despliegue

### Mapeo Rama-Entorno

| Rama | Flujo de Trabajo | Entorno | Dominio |
|---|---|---|---|
| `develop` | `deploy_dev.yaml` | `preview` | URL de vista previa de Vercel |
| `main` | `deploy_prod.yaml` | `production` | Dominio de producción |

### Puerta del Proveedor de Despliegue

Ambos flujos de despliegue verifican una variable de repositorio antes de continuar:

```yaml
jobs:
  Vercel:
    if: ${{ vars.DEPLOY_PROVIDER == 'vercel' }}
```

Establezca `DEPLOY_PROVIDER=vercel` en **Configuración > Variables** de su repositorio para habilitar despliegues de Vercel. Esto permite cambiar de proveedores de despliegue sin modificar archivos de flujo de trabajo.

### Despliegue Vercel (deploy_vercel.yaml)

El flujo de despliegue Vercel compartido maneja despliegues tanto de vista previa como de producción.

**Estrategia de Despliegue**: El flujo de trabajo usa un enfoque de dos fases:

1. **Despliegue por API** (principal): Activa el despliegue a través de la API de Vercel para builds más rápidos
2. **Fallback CLI**: Si la llamada a la API falla, recurre a `vercel build` + `vercel deploy --prebuilt`

**Pasos**:

1. **Checkout** del código
2. **Detección del gestor de paquetes** y configuración de pnpm
3. **Instalación global de Vercel CLI**
4. **Vinculación del proyecto Vercel** usando `VERCEL_TOKEN` y alcance de equipo opcional
5. **Establece variables de entorno** (DATA_REPOSITORY, GH_TOKEN, CRON_SECRET) mediante Vercel CLI
6. **Obtiene configuración de Vercel** para el entorno objetivo
7. **Activa despliegue por API** o recurre al build/deploy CLI
8. **Actualiza programación cron** mediante `scripts/update-cron.ts`

### Secretos Requeridos

Configúrelos en los secretos de su repositorio GitHub:

| Secreto | Requerido | Propósito |
|---|---|---|
| `VERCEL_TOKEN` | Sí | Autenticación de API Vercel |
| `VERCEL_TEAM_SCOPE` | Al usar equipos | Slug del equipo Vercel |
| `DATA_REPOSITORY` | Sí | Nombre del repositorio de contenido |
| `GH_TOKEN` | Sí | Token de GitHub para clonar contenido |
| `CRON_SECRET` | Recomendado | Autentica llamadas al endpoint cron |
| `DATABASE_URL` | Para el build | Cadena de conexión de base de datos |
| Secretos OAuth | Al usar OAuth | Credenciales del proveedor |

### Actualizaciones de Programación Cron

Después de un despliegue exitoso, el flujo de trabajo ejecuta `scripts/update-cron.ts` para sincronizar horarios cron:

```yaml
- name: Update cron schedule
  if: success() && steps.trigger_deployment.outputs.deployment_id != ''
  run: npx tsx scripts/update-cron.ts
```

## Reglas de Protección de Ramas

### Configuración Recomendada para `main`

| Configuración | Valor | Propósito |
|---|---|---|
| Requerir pull request | Sí | Sin pushes directos a producción |
| Revisiones requeridas | 1+ | Revisión de código antes de fusionar |
| Requerir verificaciones de estado | CI (lint-and-build) | CI debe pasar antes de fusionar |
| Requerir CodeQL | Análisis CodeQL | El análisis de seguridad debe pasar |
| Requerir ramas actualizadas | Sí | El PR debe estar rebasado en el main más reciente |
| Incluir administradores | Sí | Las reglas se aplican a todos |

### Configuración Recomendada para `develop`

| Configuración | Valor | Propósito |
|---|---|---|
| Requerir pull request | Opcional | Pushes directos permitidos para iter. rápida |
| Verificaciones de estado requeridas | CI (lint-and-build) | Puerta básica de calidad |
| Requerir ramas actualizadas | No | Permite iteración más rápida |

### Configurar Protección de Ramas

1. Navegue a **Configuración** > **Ramas** de su repositorio
2. Haga clic en **Agregar regla de protección de rama**
3. Ingrese el patrón de nombre de rama (p. ej., `main`)
4. Configure los ajustes de las tablas anteriores
5. Guarde los cambios

## Flujo de Promoción

La plantilla sigue un flujo de promoción estándar:

### Ciclo de Desarrollo

```
1. Create feature branch from develop
2. Implement changes
3. Open PR to develop
4. CI validates (lint, type check, build)
5. CodeQL scans for vulnerabilities
6. Code review and approval
7. Merge to develop --> automatic preview deployment
```

### Lanzamiento de Producción

```
1. Open PR from develop to main
2. CI validates against main
3. CodeQL security scan
4. Final code review
5. Merge to main --> automatic production deployment
```

### Proceso de Hotfix

```
1. Create hotfix branch from main
2. Implement fix
3. Open PR directly to main
4. CI + CodeQL validation
5. Emergency review and merge
6. Backport to develop
```

## Personalización

### Agregar Nuevos Pasos CI

Para agregar pruebas o validación adicional, añada pasos al trabajo de `ci.yml`:

```yaml
- name: Run unit tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test

- name: Run E2E tests
  run: ${{ steps.detect-pm.outputs.run-cmd }} test:e2e
```

### Agregar Notificaciones de Despliegue

Añada un paso de notificación al final del flujo de despliegue:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: '{"text": "Deployed to ${{ inputs.environment }}"}'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Variables por Entorno

Use **Entornos** de GitHub para limitar secretos a objetivos de despliegue específicos:

1. Navegue a **Configuración** > **Entornos**
2. Cree entornos `production` y `preview`
3. Añada secretos específicos por entorno
4. Refiéralos en los flujos de trabajo con la configuración `environment:`
