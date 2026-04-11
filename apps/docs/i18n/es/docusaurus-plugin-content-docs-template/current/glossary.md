---
id: glossary
title: Glosario de Términos
sidebar_label: Glosario
---

# Glosario de Términos

Términos y conceptos clave utilizados en toda la documentación del Directory Web Template.

## Conceptos Core del Dominio

### Directorio

Una colección de listados organizados (items) en torno a un tema o nicho específico. Un directorio es la entidad de nivel superior. Ejemplos: un "SaaS Tools Directory," un "Developer Resources Directory," o un "Local Business Directory."

### Item

Una entrada o listado único dentro de un directorio. Un item representa una entidad que se cataloga (una herramienta, negocio, recurso o servicio). Los items tienen campos estructurados (nombre, descripción, URL, logo), pertenecen a categorías y pueden ser etiquetados.

### Categoría

Una clasificación jerárquica usada para organizar items. Las categorías forman una estructura de árbol (relaciones padre/hijo) y proporcionan el mecanismo principal de navegación y filtrado.

### Etiqueta

Una etiqueta plana y no jerárquica adjunta a los items para clasificación transversal. Las etiquetas se usan para filtrado secundario y descubrimiento. Un item puede tener múltiples etiquetas como "open-source," "freemium," o "API-available."

### Colección

Una agrupación curada de items, independiente de categorías o etiquetas. Las colecciones son conjuntos definidos por el usuario o curados editorialmente, como "Top 10 Selecciones" o "Nuevo Este Mes."

### Taxonomía

El sistema de clasificación general para un directorio, que comprende categorías, etiquetas y cualquier otra estructura organizativa.

### Slug

Un identificador amigable para URL, legible por humanos, derivado del nombre de una entidad. Los slugs se usan en URLs en lugar de IDs numéricos. Por ejemplo, "Visual Studio Code" se convierte en `visual-studio-code`.

## Patrones de Arquitectura

### Repository

Una clase de capa de acceso a datos que encapsula las consultas y mutaciones de la base de datos para una entidad específica. Los repositories abstraen Drizzle ORM y proporcionan una interfaz limpia para los services. Se encuentra en `lib/repositories/`.

### Service

Una clase de capa de lógica de negocio que orquesta operaciones entre repositories, APIs externas y otros services. Los services contienen la lógica central de la aplicación y son llamados por los manejadores de rutas de API. Se encuentra en `lib/services/`.

### Webhook

Un callback HTTP activado por un evento. El Template usa webhooks para notificaciones de proveedores de pago (Stripe, LemonSqueezy, Polar) y actualizaciones de estado de despliegue. Los endpoints de webhook validan las solicitudes entrantes usando firmas o secretos compartidos.

## Gestión de Contenido

### CMS Basado en Git

El enfoque de gestión de contenido usado por el Template. Los datos del directorio (items, categorías, metadatos) se almacenan como archivos estructurados (YAML, Markdown) en un repositorio Git. El Template clona este repositorio en tiempo de build y lee el contenido del sistema de archivos local. Los cambios se realizan mediante commits y pull requests.

### Community PR

Un pull request enviado por un miembro de la comunidad para agregar o actualizar items en el repositorio CMS basado en Git de un directorio. Los Community PRs pasan por un proceso de revisión antes de ser fusionados.

## Base de Datos

### Drizzle ORM

El ORM ligero y TypeScript-first utilizado por el Template. Drizzle proporciona un query builder similar a SQL con total seguridad de tipos. Las definiciones de esquema se escriben como código TypeScript, y las migraciones se generan como archivos SQL simples a través de Drizzle Kit.

### Migración

Un cambio de esquema de base de datos versionado. Las migraciones se generan con `pnpm db:generate` y se aplican con `pnpm db:migrate`. Los archivos de migración se almacenan en `lib/db/migrations/`.

## Autenticación

### NextAuth.js

La biblioteca de autenticación (v5) utilizada por el Template. Proporciona soporte OAuth para múltiples proveedores (Google, GitHub, Facebook, Twitter, Microsoft) con gestión de sesiones y tokens JWT.

### Supabase Auth

Un backend de autenticación alternativo compatible con el Template. Supabase Auth proporciona autenticación por email/contraseña, magic links y OAuth social a través del servicio gestionado de Supabase.

## Pagos

### Suscripción

Un acuerdo de pago recurrente gestionado a través de uno de los proveedores de pago compatibles (Stripe, LemonSqueezy o Polar). El Template gestiona la creación, gestión y procesamiento de webhooks de suscripciones.

## Despliegue

### Vercel

La plataforma de despliegue principal para el Template. Vercel proporciona despliegue sin configuración para aplicaciones Next.js, incluidos despliegues de vista previa automáticos, edge functions y distribución CDN.

### Docker

Un método de despliegue alternativo. El Template puede ser containerizado y desplegado en cualquier entorno de hosting compatible con Docker.
