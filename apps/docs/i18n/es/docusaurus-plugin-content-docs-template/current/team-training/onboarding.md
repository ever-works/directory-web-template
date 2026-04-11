---
id: onboarding
title: Guía de Incorporación
sidebar_label: Incorporación
sidebar_position: 2
---

# Guía de Incorporación

¡Bienvenido a Ever Works! Esta guía te ayudará a configurar tu entorno de desarrollo y hacer tu primera contribución.

## 🎯 Objetivos

Al finalizar este módulo:

- ✅ Tendrás un entorno de desarrollo completamente configurado
- ✅ Comprenderás la estructura del proyecto
- ✅ Podrás ejecutar la aplicación localmente
- ✅ Habrás realizado tu primer cambio de código
- ✅ Comprenderás el flujo de desarrollo

**Tiempo estimado**: 1–2 días

---

## Paso 1: Configuración del Entorno

### 1.1 Instalar herramientas necesarias

Sigue la [Guía de Instalación](/getting-started/installation) detallada para instalar:

- Node.js 20.19.0+
- pnpm ([instalación](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (recomendado)

### 1.2 Clonar el Repositorio

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 Configurar Variables de Entorno

**Lista de verificación rápida**:

- [ ] Conexión a base de datos configurada
- [ ] Secretos de autenticación establecidos
- [ ] Claves del proveedor de pago añadidas (opcional para desarrollo)

---

## Paso 2: Configuración de la Base de Datos

### 2.1 Iniciar PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 Ejecutar Migraciones

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## Paso 3: Iniciar el Servidor de Desarrollo

```bash
pnpm run dev
```

Verifica en el navegador:

- [ ] La página principal carga en `http://localhost:3000`
- [ ] Puedes crear una cuenta
- [ ] Puedes iniciar/cerrar sesión
- [ ] La documentación API es accesible en `http://localhost:3000/api/reference`

---

## Paso 4: Comprender la Estructura del Proyecto

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## Paso 5: Flujo de Trabajo de Desarrollo

### 5.1 Crear una rama de funcionalidad

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-de-funcionalidad
```

### 5.2 Confirmar y enviar

```bash
git add .
git commit -m "feat: agregar sistema de notificaciones de usuario"
git push origin feature/nombre-de-funcionalidad
```

---

## ✅ Lista de Verificación de Incorporación

- [ ] Entorno de desarrollo completamente configurado
- [ ] Aplicación ejecutándose localmente
- [ ] Base de datos conectada y poblada
- [ ] Estructura del proyecto comprendida
- [ ] Primera rama creada
- [ ] Primer commit realizado

---

## Próximos Pasos

1. [Documentación API](/team-training/api-documentation) – Aprende el sistema de documentación
2. [Mejores Prácticas](/team-training/best-practices) – Aprende los estándares de codificación
3. [Ejercicios](/team-training/exercises) – Practica con tareas reales

¿Necesitas ayuda? ¡Pregunta a tu mentor o revisa el canal de Slack del equipo! 🚀
