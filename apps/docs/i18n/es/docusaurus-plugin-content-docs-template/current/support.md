---
id: support
title: Soporte y ayuda
sidebar_label: Soporte
---

# Soporte y ayuda

Bienvenido al centro de soporte del Directorio Web Template.

## Obtener ayuda

### Soporte comunitario

- **[GitHub Issues](https://github.com/ever-works/directory-web-template/issues)** — Reportar errores, solicitar funcionalidades o hacer preguntas técnicas
- **[Comunidad Discord](https://discord.gg/ever)** — Únete a nuestro activo servidor Discord para soporte en tiempo real
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/directory-web-template)** — Haz preguntas técnicas con la etiqueta `directory-web-template`

### Soporte profesional

- **[Soporte por correo electrónico](mailto:ever@ever.co)** — Soporte directo para consultas empresariales
- **[Problemas de seguridad](mailto:security@ever.co)** — Reportar vulnerabilidades de seguridad de forma privada
- **[Soporte empresarial](https://ever.co/contacts)** — Soporte dedicado para clientes enterprise

## Recursos de documentación

- **[Guía de instalación](/getting-started/installation)** — Instrucciones completas de configuración
- **[Guía de inicio rápido](/getting-started/quick-start)** — Pon todo en marcha rápidamente
- **[Descripción de la arquitectura](/architecture/overview)** — Comprende el diseño del sistema
- **[Guía de despliegue](/deployment/deployment-introduction)** — Despliega en producción

Para la documentación de la Plataforma Ever Works, visita [docs.ever.works](https://docs.ever.works).

## Demo y ejemplos

- **[Sitio de demostración](https://demo.ever.works)** — Ver la plantilla en acción
- **[Repositorio GitHub](https://github.com/ever-works/directory-web-template)** — Código fuente y ejemplos

## Resolución de problemas

### Problemas comunes

#### Problemas de instalación

- **Versión de Node.js**: Asegúrate de usar Node.js 20+
- **Gestor de paquetes**: Usa pnpm (estrictamente requerido). Ejecuta `corepack enable` para activarlo.
- **Dependencias**: Ejecuta `pnpm install` en la raíz del repositorio
- **Conflictos de puerto**: El servidor de desarrollo usa por defecto el puerto 3000. Usa el indicador `--port` para especificar uno diferente.

#### Problemas de compilación

- **Errores de TypeScript**: Ejecuta `pnpm tsc --noEmit` para verificar errores de tipo
- **Dependencias faltantes**: Asegúrate de que todos los paquetes estén correctamente instalados con `pnpm install`
- **Variables de entorno**: Verifica que tu archivo `.env.local` esté configurado (copia desde `.env.example`)

#### Problemas de ejecución

- **Autenticación**: Verifica tus credenciales del proveedor OAuth en `.env.local`
- **Base de datos**: Asegúrate de que tu cadena de conexión PostgreSQL sea correcta
- **Migraciones**: Ejecuta `pnpm db:migrate` para aplicar las migraciones de base de datos pendientes

### Modo de depuración

Habilita el registro de depuración configurando variables de entorno:

```bash
DEBUG=directory-web-template:*
NODE_ENV=development
```

## Soporte empresarial

Para clientes enterprise, ofrecemos:

- **Soporte prioritario** — Canales de soporte dedicados
- **Integraciones personalizadas** — Soluciones adaptadas a tus necesidades
- **Formación e incorporación** — Pon a tu equipo al día rápidamente
- **Garantías de SLA** — Acuerdos de nivel de servicio para despliegues críticos

Contáctanos en [ever@ever.co](mailto:ever@ever.co) para opciones de soporte empresarial.
