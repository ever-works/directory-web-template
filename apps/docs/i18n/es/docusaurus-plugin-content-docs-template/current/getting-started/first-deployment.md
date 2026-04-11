---
id: first-deployment
title: Primer despliegue
sidebar_label: Primer despliegue
sidebar_position: 4
---

# Primer despliegue

Esta guía te lleva paso a paso por el despliegue de Ever Works en producción por primera vez.

## Lista de verificación previa al despliegue

Antes de desplegar, asegúrate de haber:

- [ ] Completado la [configuración del entorno](./environment-setup)
- [ ] Probado localmente con `pnpm run dev`
- [ ] Configurado tu repositorio de datos
- [ ] Configurado al menos un proveedor de autenticación
- [ ] Generado secretos de producción
- [ ] Preparado tu dominio (si usas dominio personalizado)

## Opciones de despliegue

### Opción 1: Vercel (recomendado)

Vercel proporciona la mejor experiencia para aplicaciones Next.js.

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Iniciar sesión en Vercel

```bash
vercel login
```

#### 3. Desplegar

```bash
vercel
```

Sigue las indicaciones:

- ¿Enlazar a proyecto existente? **No**
- Nombre del proyecto: `tu-nombre-de-proyecto`
- Directorio: `./` (directorio actual)
- ¿Sobreescribir configuración? **No**

#### 4. Configurar variables de entorno

En el panel de Vercel:

1. Ve a tu proyecto → Settings → Environment Variables
2. Añade todas las variables de entorno de producción
3. Establece valores diferentes para Production, Preview y Development

**Variables críticas de producción:**

```bash
NODE_ENV=production
NEXTAUTH_URL=https://tu-dominio.vercel.app
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
AUTH_SECRET=tu-secreto-de-produccion
DATABASE_URL=tu-url-de-base-de-datos-de-produccion
```

### Opción 2: Docker

Para despliegues en servidores propios o con contenedores:

```bash
# Construir la imagen Docker
docker build -t directory-web-template .

# Ejecutar el contenedor
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=tu-url-de-bd \
  -e AUTH_SECRET=tu-secreto \
  directory-web-template
```

### Opción 3: Servidor propio

Para despliegue manual en un servidor:

```bash
# Construir para producción
pnpm run build

# Iniciar el servidor de producción
pnpm start
```

## Post-despliegue

Después de desplegar exitosamente:

1. **Verifica el sitio** — Visita tu URL de producción
2. **Prueba la autenticación** — Inicia sesión con un proveedor OAuth
3. **Comprueba la sincronización de contenido** — Verifica que los elementos del directorio se carguen
4. **Configura webhooks** — Configura webhooks de GitHub para actualizaciones de contenido automáticas
5. **Monitoreo** — Configura Sentry para rastreo de errores en producción

## Solución de problemas

| Problema | Solución |
| -------- | -------- |
| Error de variable de entorno | Verifica que todas las variables requeridas estén configuradas |
| Error de base de datos | Comprueba que `DATABASE_URL` apunte a la base de datos de producción |
| Error de OAuth | Verifica que las URL de callback estén actualizadas en los paneles de los proveedores |
| Contenido no se carga | Comprueba que `GH_TOKEN` tenga permisos correctos de repositorio |
