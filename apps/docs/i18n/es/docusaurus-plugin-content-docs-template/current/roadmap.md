---
id: roadmap
title: Hoja de Ruta & Dirección Futura
sidebar_label: Hoja de Ruta
---

# Hoja de Ruta & Dirección Futura

Esta página describe la dirección de desarrollo actual del Directory Web Template y cómo la comunidad puede participar en la definición de su futuro.

## Visión del Producto

El Directory Web Template aspira a ser la solución open-source más completa para construir sitios web de directorio profesionales. La visión a largo plazo abarca:

- **Sitios web de directorio listos para producción** que sean hermosos, performantes y completamente personalizables
- **Gestión fácil de contenidos** a través del CMS basado en Git con generación de contenido opcional impulsada por IA mediante la [Ever Works Platform](https://docs.ever.works)
- **Pagos y autenticación extensibles** con soporte para múltiples proveedores listos para usar
- **Internacionalización de primer nivel** con soporte RTL completo y cobertura de idiomas en crecimiento

## Áreas de Desarrollo Activo

### Rendimiento y Core Web Vitals

- Optimización del Largest Contentful Paint (LCP) para páginas de listado y detalle de elementos
- Reducción del tamaño del bundle JavaScript mediante mejor code splitting y tree shaking
- Mejora del pipeline de optimización de imágenes para capturas de pantalla y logotipos de elementos del directorio
- Implementación de prerendering parcial para cargas iniciales de página más rápidas

### Mejoras de Funcionalidades

- Añadir más capacidades de filtrado y búsqueda (búsqueda facetada, filtros avanzados)
- Implementar funciones de contenido generado por usuarios (reseñas, valoraciones, comentarios)
- Añadir más integraciones de proveedores de pago y funciones de gestión de suscripciones
- Ampliar el sistema de temas con más temas integrados y personalización más sencilla

### Experiencia del Desarrollador

- Mejorar la configuración del entorno de desarrollo local con mejor documentación y mensajes de error
- Añadir cobertura de pruebas E2E más completa con Playwright
- Crear plantillas de inicio para tipos comunes de directorio (SaaS, negocios locales, recursos)
- Mejorar la seguridad de tipos TypeScript en toda la base de código

### Internacionalización

- Añadir más traducciones de idiomas integradas
- Mejorar el soporte de diseño RTL para árabe y hebreo
- Soportar configuración de idioma por directorio
- Añadir flujos de trabajo de traducción automatizados

### Documentación

- Ampliar la documentación de referencia de la API con más ejemplos
- Añadir tutoriales en vídeo para tareas comunes
- Crear architecture decision records (ADRs) para decisiones de diseño importantes
- Construir guías interactivas y entornos playground

## Cómo Proponer Funcionalidades

### GitHub Issues

La forma principal de proponer funcionalidades es a través de GitHub Issues en [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Al crear una solicitud de funcionalidad:

1. **Comprueba las issues existentes** primero para evitar duplicados.
2. **Describe el problema** que intentas resolver, no solo la solución que deseas.
3. **Proporciona contexto** sobre tu caso de uso, tipo de directorio y escala.
4. **Incluye ejemplos** (mockups, esquemas de API, ejemplos de configuración).

### GitHub Discussions

Para ideas más amplias que necesitan contribución de la comunidad: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Únete al [Discord de Ever Works](https://discord.gg/ever) para conversaciones en tiempo real sobre funcionalidades y dirección del proyecto.

## Cómo Se Deciden las Prioridades

| Factor                          | Peso   | Descripción                                                              |
| ------------------------------- | ------ | ------------------------------------------------------------------------ |
| **Demanda de usuarios**         | Alto   | Número de solicitudes, upvotes e interés de la comunidad                 |
| **Alineación estratégica**      | Alto   | Qué tan bien la funcionalidad se alinea con la visión del producto       |
| **Esfuerzo de implementación**  | Medio  | Complejidad, inversión de tiempo y carga de mantenimiento                |
| **Riesgo de breaking change**   | Medio  | Potencial de interrumpir a los usuarios existentes                       |
| **Disponibilidad de contribuidores** | Medio | Si los mantenedores o miembros de la comunidad pueden asumir la tarea |

### Niveles de Prioridad

- **P0 (Crítico):** Vulnerabilidades de seguridad, bugs de pérdida de datos o problemas bloqueadores. Se abordan de inmediato.
- **P1 (Alto):** Funcionalidades o correcciones en las que se trabaja activamente para la próxima versión.
- **P2 (Medio):** Funcionalidades aprobadas planificadas pero aún no programadas.
- **P3 (Bajo):** Mejoras agradables de tener. Buenos candidatos para contribuciones de la comunidad.

## Contribuir al Roadmap

1. **Enviar solicitudes de funcionalidad bien escritas** con declaraciones claras de problemas y casos de uso.
2. **Contribuir código.** Los pull requests son el camino más rápido de la idea a la realidad. Ver la [Guía de Contribución](/contributing).
3. **Participar en discusiones.** Proporcionar retroalimentación sobre propuestas y compartir tu experiencia.
4. **Reportar bugs.** Los informes de bugs confiables ayudan a priorizar correcciones y mejorar la estabilidad.

## Cadencia de Versiones

Las versiones se publican cuando hay un conjunto significativo de funcionalidades y correcciones listas:

- **Patch releases** (correcciones de bugs) se publican según sea necesario, frecuentemente cada semana durante el desarrollo activo.
- **Minor releases** (nuevas funcionalidades) se publican aproximadamente cada mes.
- **Major releases** (breaking changes) son poco frecuentes y van acompañadas de guías de migración.

Consulta la página [Changelog & Versiones](/changelog) para más detalles.

## Mantenerse Actualizado

- **Observa el repositorio** en GitHub para recibir notificaciones
- **Marca el repositorio con una estrella** para mostrar apoyo y ayudar a otros a descubrir el proyecto
- **Únete al [Discord](https://discord.gg/ever)** para actualizaciones en tiempo real
- **Sigue a [@everworks](https://twitter.com/everworks)** en Twitter

## Contacto

- **Correo electrónico:** [ever@ever.co](mailto:ever@ever.co)
- **Sitio web:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
