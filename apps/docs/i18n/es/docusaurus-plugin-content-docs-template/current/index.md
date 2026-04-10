---
id: index
title: Directorio Web Template
sidebar_label: Inicio
sidebar_position: 0
slug: /
---

# Directorio Web Template

El Directorio Web Template es una solución moderna y full-stack para sitios web de directorios, construida con Next.js 16 y organizada como un **monorepo Turborepo**. Está diseñada para ayudarte a crear sitios web de directorios profesionales para herramientas, servicios, productos o cualquier otro tipo de plataforma de listados.

## Características principales

- **Stack tecnológico moderno**: Next.js 16, React 19, TypeScript, Tailwind CSS, HeroUI React
- **Monorepo Turborepo**: espacios de trabajo pnpm con configuraciones compartidas, aplicación web, pruebas e2e y documentación
- **Autenticación flexible**: NextAuth.js v5, Supabase Auth, proveedores OAuth (Google, GitHub, Facebook, Twitter, Microsoft)
- **Integración de pagos**: Stripe, LemonSqueezy, Polar, gestión de suscripciones
- **Internacionalización**: Múltiples idiomas con soporte completo RTL a través de next-intl
- **CMS basado en Git**: Sincronización de contenido desde repositorios Git con estructura YAML
- **Sistema de temas**: Temas integrados con generación dinámica de colores
- **Análisis y monitoreo**: PostHog, Sentry, monitoreo de rendimiento
- **Panel de administración**: Gestión de contenido, usuarios y análisis
- **Optimizado para SEO**: Generación de sitemap, datos estructurados (JSON-LD), metaetiquetas

## Inicio rápido

```bash
# Clonar el monorepo
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template

# Instalar dependencias (se requiere pnpm)
pnpm install

# Configurar el entorno para la aplicación web
cp apps/web/.env.example apps/web/.env.local
# Editar apps/web/.env.local con tu configuración

# Iniciar el servidor de desarrollo
pnpm run dev
```

¡Visita [http://localhost:3000](http://localhost:3000) para ver tu sitio!

## Próximos pasos

- [Guía de instalación](/getting-started/installation) — Instrucciones completas de configuración
- [Guía de inicio rápido](/getting-started/quick-start) — Pon todo en marcha en menos de 10 minutos
- [Descripción de la arquitectura](/architecture/overview) — Entiende el diseño del sistema
- [Guía de implementación](/deployment/deployment-introduction) — Despliega en producción

## Casos de uso

Este proyecto de plantilla es perfecto para:

- **Directorios de herramientas** (como ProductHunt para herramientas)
- **Mercados de servicios**
- **Catálogos de recursos**
- **Directorios profesionales**
- **Escaparates de productos**
- **Plataformas comunitarias**

## Plataforma Ever Works

La plantilla puede usarse de forma independiente o combinada con la **Plataforma Ever Works** para la generación de contenido potenciada por IA. Para la documentación de la plataforma, visita [docs.ever.works](https://docs.ever.works). Consulta [Plataforma vs Plantilla](/comparison) para una comparación detallada.

## ¿Necesitas ayuda?

- Consulta nuestra [documentación](/docs) para información general
- Únete a nuestra [comunidad de Discord](https://discord.gg/ever) para obtener apoyo
- Visita el [sitio de demostración](https://demo.ever.works) para verlo en acción
- Contacta con [soporte](/support) para asistencia técnica
