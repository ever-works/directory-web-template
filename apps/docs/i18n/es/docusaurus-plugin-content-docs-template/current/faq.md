---
id: faq
title: Preguntas frecuentes
sidebar_label: FAQ
---

# Preguntas frecuentes

## General

### ¿Qué es el Directorio Web Template?

El Directorio Web Template es una solución full-stack lista para producción para sitios web de directorios, construida con Next.js, React, TypeScript y Tailwind CSS. Puedes clonarlo, personalizarlo y desplegarlo para crear sitios web de directorios profesionales.

### ¿Puedo usar la plantilla sin la plataforma Ever Works?

Sí. La plantilla funciona de forma independiente como una aplicación Next.js autocontenida con sus propias rutas API, autenticación, base de datos y procesamiento de pagos. La plataforma es un producto separado que puede opcionalmente potenciar la generación de contenido mediante IA. Consulta [docs.ever.works](https://docs.ever.works) para la documentación de la plataforma.

### ¿Qué es Pinler.com?

[Pinler.com](https://pinler.com) es un servicio SaaS de directorio en producción construido sobre el ecosistema Ever Works, que demuestra un despliegue en el mundo real.

## Stack tecnológico

### ¿Qué tecnologías utiliza la plantilla?

- **Framework:** Next.js 15, React 19
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 4, HeroUI React, Radix UI
- **ORM:** Drizzle ORM con PostgreSQL
- **Auth:** NextAuth.js v5, Supabase Auth
- **Pagos:** Stripe, LemonSqueezy, Polar

### ¿Qué proveedores de autenticación son compatibles?

Google, GitHub, Facebook, Twitter y Microsoft a través de NextAuth.js v5, además de Supabase Auth como backend de autenticación alternativo.

### ¿Qué proveedores de pago son compatibles?

Stripe, LemonSqueezy y Polar, todos con soporte de gestión de suscripciones.

## Despliegue

### ¿Cómo despliego la plantilla?

El objetivo de despliegue recomendado es **Vercel** para hosting Next.js sin configuración. Docker también es compatible como alternativa. Consulta la [Guía de despliegue](/deployment/deployment-introduction) para instrucciones detalladas.

### ¿Qué base de datos debo usar?

PostgreSQL es la base de datos principal, generalmente proporcionada a través de **Supabase** (gestionado) o una instancia directa de PostgreSQL. La plantilla usa Drizzle ORM para acceso a la base de datos con seguridad de tipos.

## Contenido

### ¿Cómo funciona el CMS basado en Git?

La plantilla lee el contenido del directorio (elementos, categorías, metadatos) de archivos estructurados (YAML, Markdown) almacenados en un repositorio Git. En el momento de la compilación, el contenido se clona en el directorio `.content/` y es renderizado por Next.js. Puedes gestionar el contenido editando los archivos directamente o usando la Plataforma Ever Works para la generación automática de contenido con IA.

### ¿Puedo añadir elementos manualmente?

Sí. Puedes crear y editar archivos YAML y Markdown en el repositorio de datos CMS sin necesitar la Plataforma. Las contribuciones de la comunidad también se pueden enviar como pull requests.

## Soporte

### ¿Dónde puedo obtener ayuda?

Consulta la [página de Soporte](/support) para canales comunitarios, opciones de soporte profesional y guías de resolución de problemas.
