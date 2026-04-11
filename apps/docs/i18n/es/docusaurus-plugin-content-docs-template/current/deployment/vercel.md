---
id: vercel
title: Despliegue en Vercel
sidebar_label: Vercel
sidebar_position: 3
---

# Despliegue en Vercel

Despliega tu sitio de directorio Ever Works en Vercel para una distribución global rápida.

## Requisitos Previos

- Cuenta de Vercel
- Repositorio GitHub con tu proyecto Ever Works

## Despliegue Rápido

### 1. Conectar Repositorio

1. Visita [vercel.com](https://vercel.com)
2. Haz clic en "New Project"
3. Importa tu repositorio de GitHub
4. Selecciona la carpeta `website` como directorio raíz

### 2. Configurar Ajustes de Build

Vercel detectará Next.js automáticamente. Verifica estos ajustes:

- **Framework Preset**: Next.js
- **Directorio Raíz**: `website`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Variables de Entorno

Añade tus variables de entorno en el panel de Vercel:

```bash
# Required
NEXT_PUBLIC_API_BASE_URL=https://your-api.com
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.vercel.app

# OAuth Providers (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Desplegar

Haz clic en "Deploy" y Vercel construirá y desplegará tu sitio automáticamente.

## Dominio Personalizado

### 1. Añadir Dominio

En el panel de tu proyecto Vercel:
1. Ve a "Settings" → "Domains"
2. Añade tu dominio personalizado
3. Sigue las instrucciones de configuración DNS

### 2. Certificado SSL

Vercel aprovisiona automáticamente certificados SSL para todos los dominios.

## Configuración Avanzada

### Archivo de Configuración Vercel

Crea `vercel.json` en el directorio raíz del proyecto:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "website/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/website/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Optimización del Build

Optimiza tu build para Vercel:

```javascript
// next.config.js
module.exports = {
  // Enable static optimization
  output: 'standalone',
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Enable compression
  compress: true,
}
```

## Monitoreo y Analíticas

### Vercel Analytics

Habilita Vercel Analytics en tu proyecto:

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### Monitoreo de Rendimiento

Monitorea el rendimiento de tu despliegue:
- Core Web Vitals
- Tiempos de ejecución de funciones
- Rendimiento del build

## Solución de Problemas

### Problemas Comunes

1. **Errores de Build**: Revisa los logs de build en el panel de Vercel
2. **Variables de Entorno**: Asegúrate de que todas las variables requeridas estén configuradas
3. **Problemas de Dominio**: Verifica la configuración DNS

### Modo de Depuración

Habilita el modo de depuración para logs detallados:

```bash
# In your environment variables
DEBUG=1
```

## Próximos Pasos

- [Variables de Entorno](/docs/deployment/environment-variables) - Configura tu despliegue
- [Monitoreo](/docs/deployment/monitoring) - Monitorea tu aplicación
- [Soporte](/docs/advanced-guide/support) - Obtén ayuda con el despliegue
