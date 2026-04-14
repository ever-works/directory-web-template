---
id: tech-stack
title: Pila de tecnología
sidebar_label: Pila de tecnología
sidebar_position: 2
---

# Pila de tecnología

Este documento proporciona una descripción general completa de todas las tecnologías utilizadas en Ever Works.

## Requisitos del sistema

- **Node.js**: 20.19.0 o superior
- **PostgreSQL**: 14.0 o superior
- **Administrador de paquetes**: npm, pnpm, hilo o moño

## Tecnologías frontend {#frontend}

### Marco central

- **[Next.js 15.4.7](https://nextjs.org/)** - Marco de reacción con App Router
  - Representación del lado del servidor (SSR)
  - Generación de sitios estáticos (SSG)
  - Regeneración estática incremental (ISR)
  - Acciones del servidor para mutaciones
  - Optimización incorporada
  - Enrutamiento basado en archivos con `[locale]` segmentos dinámicos

- **[Reaccionar 19.1.0](https://react.dev/)** - Biblioteca de interfaz de usuario
  - Últimas funciones y mejoras
  - Representación concurrente
  - Lotes automáticos
  - Suspenso por la obtención de datos
  - Componentes del servidor por defecto

### Seguridad de idioma y tipo

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Comprobación de tipo estático
  - Modo estricto habilitado
  - Mapeo de ruta configurado (`@/` alias)
  - Definiciones de tipos personalizados
  - inferencia de tipo completo

### Estilo y interfaz de usuario

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Marco CSS de utilidad primero
  - Sistema de diseño personalizado
  - Soporte de modo oscuro
  - Utilidades de diseño responsivo
  - Compilación JIT
  - Sistema de color dinámico (50-950 tonos)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Componentes modernos de React
  - Componentes accesibles
  - Temas personalizables
  - Compatibilidad con mecanografiado
  - sacudible

- **[Radix UI](https://www.radix-ui.com/)** - Componentes accesibles sin estilo
  - Primitivas de interfaz de usuario sin cabeza
  - Navegación completa con el teclado
  - Cumple con ARIA
  - componible

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Biblioteca de animación
  - Animaciones declarativas
  - Soporte de gestos
  - animaciones de diseño
  - animaciones SVG

### Edición de texto enriquecido

- **[TipTap](https://tiptap.dev/)** - Editor de texto enriquecido sin cabeza
  - Arquitectura extensible
  - Soporte de rebajas
  - Edición colaborativa lista
  - Extensiones personalizadas

### Gestión del Estado

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Gestión de estado ligera
  - API sencilla
  - Compatibilidad con mecanografiado
  - Repetición mínima
  - Integración de herramientas de desarrollo
  - Soporte de software intermedio

- **[TanStack React Query 5](https://tanstack.com/query/)** - Gestión del estado del servidor
  - Almacenamiento en caché y sincronización
  - Actualizaciones en segundo plano
  - Actualizaciones optimistas
  - Manejo de errores
  - consultas infinitas

### Visualización de datos

- **[Tabla TanStack](https://tanstack.com/table/)** - Biblioteca de tablas sin cabeza
  - Ordenar, filtrar, paginar
  - Cambio de tamaño de columna
  - Selección de fila
  - Compatibilidad con mecanografiado

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Biblioteca de virtualización
  - Desplazamiento virtual
  - Optimización del rendimiento
  - Alturas de fila dinámicas

### Manejo de formularios

- **[React Hook Form 7](https://react-hook-form.com/)** - Formularios de rendimiento
  - Renderizados mínimos
  - Validación incorporada
  - Compatibilidad con mecanografiado
  - Fácil integración
  - Soporte de matrices de campo

- **[Zod 4](https://zod.dev/)** - Validación de esquema
  - TypeScript primero
  - Validación en tiempo de ejecución
  - Inferencia de tipos
  - Manejo de errores
  - Validadores personalizados

## Tecnologías de back-end

### Base de datos y ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Base de datos relacional
  - Cumplimiento ACID
  - Funciones avanzadas (JSONB, búsqueda de texto completo)
  - Excelente rendimiento
  - Soporte JSON
  - Desencadenadores y procedimientos almacenados

- **[Llovizna ORM 0.40.0](https://orm.drizzle.team/)** - ORM de TypeScript
  - Consultas de tipo seguro
  - Gastos generales mínimos
  - Sintaxis similar a SQL
  - Sistema de migración
  - Consultas de relación
  - Declaraciones preparadas

- **[Supabase](https://supabase.com/)** - Backend como servicio (opcional)
  - PostgreSQL alojado
  - Suscripciones en tiempo real
  - Seguridad a nivel de fila
  - autenticación incorporada
  - Cubos de almacenamiento
  - Funciones de borde

### Autenticación

- **[NextAuth.js 5.0 (beta)](https://authjs.dev/)** - Biblioteca de autenticación
  - Múltiples proveedores de OAuth (Google, GitHub, Facebook, Twitter)
  - JWT y sesiones de base de datos.
  - Compatibilidad con mecanografiado
  - Mejores prácticas de seguridad
  - Autenticación basada en credenciales
  - Gestión de sesiones

- **[Autenticación de Supabase](https://supabase.com/auth)** - Solución de autenticación alternativa
  - Gestión de usuarios integrada
  - Proveedores sociales
  - Verificación de correo electrónico
  - Restablecer contraseña
  - Enlaces mágicos
  - autenticación telefónica

### Arquitectura de autenticación dual

Ever Works admite **NextAuth.js y Supabase Auth** simultáneamente:

- NextAuth para flujos OAuth tradicionales
- Supabase Auth para funciones en tiempo real
- Gestión de sesiones unificada
- Cambio de proveedor sin problemas

## Gestión de contenidos

### CMS basado en Git

- **[isomorphic-git](https://isomorphic-git.org/)** - Operaciones de Git en JavaScript
  - Clonar repositorios
  - Tirar cambios
  - Confirmar archivos
  - Gestión de sucursales

- **[js-yaml](https://github.com/nodeca/js-yaml)** - analizador YAML
  - Analizar archivos YAML
  - Generar YAML
  - Validación de esquema
  - Manejo de errores

### Procesamiento de archivos

- **[materia gris](https://github.com/jonschlinkert/gray-matter)** - Analizador de materia frontal
  - Analizar archivos de rebajas
  - Extraer metadatos
  - Soporta múltiples formatos

## Internacionalización

- **[siguiente-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n para Next.js
  - Soporte de enrutador de aplicaciones
  - Traducciones con seguridad de escritura
  - Pluralización
  - Formato de fecha/número

### Idiomas admitidos

Ever Works admite **más de 13 idiomas** desde el primer momento:

- 🇬🇧 Inglés (es)
- 🇫🇷 Francés (fr)
- 🇪🇸 Español (es)
- 🇨🇳 chino (zh)
- 🇩🇪 alemán (de)
- 🇸🇦 Árabe (ar) - con soporte RTL
- 🇮🇹 italiano (eso)
- 🇵🇹 Portugués (pt)
- 🇯🇵 Japonés (ja)
- 🇰🇷 Coreano (ko)
- 🇷🇺 Ruso (ru)
- 🇳🇱 Holandés (nl)
- 🇵🇱 Polaco (pl)

[Más información sobre internacionalización →](/internacionalización)

## Análisis y monitoreo

### Analítica

- **[PostHog](https://posthog.com/)** - Análisis de productos
  - Seguimiento de eventos
  - Identificación de usuario
  - Banderas de características
  - Grabación de sesión

### Seguimiento de errores

- **[Sentry 9.38](https://sentry.io/)** - Monitoreo de errores
  - Seguimiento de errores
  - Monitoreo del desempeño
  - Seguimiento de lanzamientos
  - Comentarios de los usuarios

### Rendimiento

- **[Vercel Analytics](https://vercel.com/analytics)** - Web vitals
  - Elementos vitales web básicos
  - Monitoreo de usuarios reales
  - Información sobre el rendimiento

## Procesamiento de pagos

### Proveedores de pago

- **[Stripe](https://stripe.com/)** - Plataforma de pago integral
  - Pagos únicos
  - Suscripciones recurrentes
  - Múltiples métodos de pago (tarjetas, Apple Pay, Google Pay)
  - Múltiples monedas
  - Análisis e informes avanzados
  - Portal del cliente
  - Facturación
  - Ganchos web

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Plataforma de comerciante de registro
  - Cumplimiento tributario automático
  - Pagos globales (más de 135 países)
  - Suscripciones
  - Prevención de fraude
  - Configuración simplificada
  - Soporte del programa de afiliados

[Más información sobre la integración de pagos →](/pago)

### SDK de pago

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - SDK del cliente Stripe
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - SDK del servidor Stripe
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - SDK de LemonSqueezy

## Integración de CRM

- **[Veinte CRM](https://twenty.com/)** - CRM de código abierto
  - Gestión de relaciones con el cliente.
  - Sincronización de contactos
  - Seguimiento de actividad
  - Campos personalizados
  - Integración API
  - Autohospedado o en la nube

### Funciones de CRM

- Creación automática de contactos a partir de registros de usuarios.
- Sincronizar las actividades e interacciones de los usuarios
- Seguimiento de suscripciones y pagos
- Mapeo de campos personalizados
- Sincronización basada en webhook

## Servicios de correo electrónico

- **[Reenviar 4](https://resend.com/)** - API de correo electrónico
  - Correos electrónicos transaccionales
  - Soporte de plantilla
  - Seguimiento de entrega
  - Fácil de usar para desarrolladores

- **[Novu 2.6](https://novu.co/)** - Infraestructura de notificación
  - Notificaciones multicanal
  - Gestión de plantillas
  - Automatización del flujo de trabajo
  - Analítica

## Sistema de encuestas

- **[SurveyJS](https://surveyjs.io/)** - Creador de encuestas y formularios
  - Múltiples tipos de preguntas (opción múltiple, texto, calificación, matriz)
  - Lógica condicional
  - Vista previa de la encuesta
  - Análisis de respuesta
  - Exportar a CSV/Excel
  - Respuestas anónimas o autenticadas
  - Temas personalizados

[Más información sobre encuestas →](/guides/survey-system)

## Seguridad

### Seguridad de autenticación

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Hash de contraseña
  - Almacenamiento seguro de contraseñas
  - Generación de sal
  - Protección contra ataques de tiempo

- **[jose 6](https://github.com/panva/jose)** - Operaciones JWT
  - Generación de tokens
  - Verificación de tokens
  - Soporte de cifrado

### Validación de entrada

- **[Reaccionar Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - Protección contra bots
  - Protección de formularios
  - reCAPTCHA invisible
  - Verificación basada en puntuación

## Herramientas de desarrollo

### Calidad del código

- **[ESLint 9](https://eslint.org/)** - Linter de JavaScript
  - Reglas de calidad del código
  - Configuraciones personalizadas
  - Compatibilidad con mecanografiado
  - Reglas de Next.js

- **[Prettier 3.5](https://prettier.io/)** - Formateador de código
  - Formato consistente
  - Integración del editor
  - Reglas personalizadas

### Herramientas de construcción

- **[PostCSS 8](https://postcss.org/)** - Procesador CSS
  - Procesamiento CSS de viento de cola
  - Prefijo automático
  - Optimización CSS

- **[Webpack 5](https://webpack.js.org/)** - Paquete de módulos (a través de Next.js)
  - División de código
  - Sacudiendo el arbol
  - Optimización de activos

## Implementación e infraestructura

### Plataformas de alojamiento

- **[Vercel](https://vercel.com/)** - Plataforma recomendada
  - Optimización de Next.js
  - Funciones de borde
  - CDN global
  - Implementaciones automáticas

- **[Netlify](https://netlify.com/)** - Plataforma alternativa
  - Alojamiento de sitios estáticos
  - Funciones sin servidor
  - Manejo de formularios

### Alojamiento de bases de datos

- **[Supabase](https://supabase.com/)** - PostgreSQL administrado
  - Copias de seguridad automáticas
  - Agrupación de conexiones
  - Funciones en tiempo real

- **[PlanetScale](https://planetscale.com/)** - MySQL sin servidor
  - Flujo de trabajo de ramificación
  - Escalado automático
  - Gestión de esquemas

- **[Neón](https://neon.tech/)** - PostgreSQL sin servidor
  - Ramificación instantánea
  - Escalado automático
  - Recuperación en un momento dado

## Gestión de paquetes

- **[pnpm](https://pnpm.io/)** - Administrador de paquetes rápido y eficiente en espacio en disco
  - Instalaciones más rápidas
  - Dependencias compartidas
  - Resolución de dependencia estricta

- **[npm](https://npmjs.com/)** - Administrador de paquetes predeterminado de Node.js
  - Ampliamente apoyado
  - Gran ecosistema
  - Auditoría de seguridad

## Requisitos de versión

### Nodo.js

- **Mínimo**: Node.js 20.19.0
- **Recomendado**: Última versión LTS
- **Administrador de paquetes**: npm 10+, hilo 1.13+ o pnpm 8+

### Soporte del navegador

- **Navegadores modernos**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Móvil**: iOS Safari 14+, Chrome Móvil 90+
- **No es compatible con IE**: solo funciones modernas

## Consideraciones de rendimiento

### Tamaño del paquete

- **Paquete principal**: ~200 KB comprimidos con gzip
- **División de código**: basada en rutas y basada en componentes
- **Sacudida de árboles**: eliminación de código no utilizado
- **Importaciones dinámicas**: carga diferida para componentes no críticos

### Rendimiento en tiempo de ejecución

- **React 19**: funciones simultáneas para una mejor experiencia de usuario
- **Next.js 15**: renderizado y almacenamiento en caché optimizados
- **Optimización de imágenes**: compatibilidad con WebP/AVIF con carga diferida
- **Optimización de fuentes**: fuentes autohospedadas con precarga

### Rendimiento de la base de datos

- **Agrupación de conexiones**: conexiones de bases de datos eficientes
- **Optimización de consultas**: consultas indexadas y uniones eficientes
- **Almacenamiento en caché**: almacenamiento en caché a nivel de aplicación y de base de datos

## Pila de seguridad

### Seguridad de aplicaciones

- **HTTPS**: aplicado en producción
- **Protección CSRF**: integrada en NextAuth.js
- **Protección XSS**: desinfección de contenido
- **Inyección SQL**: consultas parametrizadas mediante Drizzle

### Seguridad de infraestructura

- **Variables de entorno**: Gestión segura de secretos
- **Limitación de velocidad**: protección API de endpoints
- **Validación de entrada**: validación del esquema Zod
- **Seguridad de carga de archivos**: Restricciones de tipo y tamaño

## Pila de monitoreo

### Monitoreo de aplicaciones

- **Seguimiento de errores**: Sentry para monitoreo de errores
- **Rendimiento**: seguimiento de Core Web Vitals
- **Análisis**: PostHog para el comportamiento del usuario
- **Tiempo de actividad**: servicios de monitoreo externo

### Monitoreo de infraestructura

- **Base de datos**: Monitoreo de conexiones y consultas
- **API**: seguimiento del tiempo de respuesta y tasa de errores
- **CDN**: Tasas de aciertos de caché y rendimiento
- **Implementación**: supervisión de compilación e implementación

## Consideraciones futuras

### Actualizaciones planificadas

- **React 19**: Adopción de versión estable
- **Next.js 16**: Cuando esté disponible
- **TypeScript 5.x**: funciones más recientes
- **Node.js 22**: actualización LTS

### Posibles adiciones

- **GraphQL**: Para requisitos de datos complejos
- **WebSockets**: funciones en tiempo real
- **PWA**: funciones progresivas de la aplicación web
- **Computación de vanguardia**: rendimiento mejorado

## Matriz de decisión tecnológica

|Requisito|Elección de tecnología|Justificación|
|-------------|-------------------|-----------|
|**Marco**|Siguiente.js 15|El mejor marco React de su clase con App Router|
|**Base de datos**|PostgreSQL + llovizna|Tipo seguro, eficiente y escalable|
|**Autenticación**|SiguienteAuth.js + Supabase|Flexibilidad de doble proveedor|
|**Estilo**|Viento de cola CSS + HeroUI|Desarrollo rápido, diseño consistente|
|**Estado**|Consulta Zustand + Reaccionar|Estado de cliente simple + estado de servidor potente|
|**Formularios**|Forma de gancho de reacción + Zod|Rendimiento + seguridad tipo|
|**i18n**|siguiente-intl|Mejor compatibilidad con el enrutador de aplicaciones Next.js|
|**Pago**|Raya + LimónSqueezy|Flexibilidad + cumplimiento global|
|**Correo electrónico**|Reenviar + Nuevo|Apto para desarrolladores + multicanal|
|**Análisis**|PostHog + Centinela|Información sobre el producto + seguimiento de errores|

## Próximos pasos

- [Descripción general de la arquitectura] (./overview): comprensión de la arquitectura del sistema
- [Características de la plataforma](./features): explora todas las funciones de la plataforma
- [Configuración de desarrollo](/development/local-setup) - Configure su entorno

## Recursos

### Documentación oficial

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de reacción](https://react.dev/)
- [Manual de TypeScript](https://www.typescriptlang.org/docs/)
- [Documentos CSS de Tailwind] (https://tailwindcss.com/docs)
- [Documentos ORM de llovizna](https://orm.drizzle.team/docs/overview)

### Recursos comunitarios

- [Siguiente.js GitHub](https://github.com/vercel/next.js)
- [Reaccionar GitHub](https://github.com/facebook/react)
- [Viento de cola GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Comunidad Ever Works] (https://github.com/ever-co/ever-works)
