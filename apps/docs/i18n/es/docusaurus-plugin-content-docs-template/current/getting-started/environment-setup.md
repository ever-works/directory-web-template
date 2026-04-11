---
id: environment-setup
title: Configuración del entorno
sidebar_label: Configuración del entorno
sidebar_position: 2
---

# Configuración del entorno

Esta guía cubre la configuración completa del entorno para Ever Works, incluyendo todos los servicios e integraciones opcionales.

## Estructura del archivo de entorno

Crea un archivo `.env.local` en el directorio `apps/web/` con la siguiente estructura:

```bash
# ============================================
# CONFIGURACIÓN BÁSICA
# ============================================
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# AUTENTICACIÓN Y SEGURIDAD
# ============================================
AUTH_SECRET="tu-secreto-generado"
NEXTAUTH_SECRET="igual-que-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Seguridad de cookies
COOKIE_SECRET="tu-secreto-seguro-de-cookie"
COOKIE_DOMAIN="localhost"
COOKIE_SECURE=false
COOKIE_SAME_SITE="lax"

# ============================================
# BASE DE DATOS
# ============================================
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/everworks"

# ============================================
# INTEGRACIÓN CON GITHUB
# ============================================
GH_TOKEN="github_pat_tu_token_aqui"
DATA_REPOSITORY="https://github.com/tu-usuario/awesome-data"

# ============================================
# PROVEEDORES OAUTH
# ============================================
# Google
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# GitHub
GITHUB_CLIENT_ID="tu-github-client-id"
GITHUB_CLIENT_SECRET="tu-github-client-secret"

# Facebook
FACEBOOK_CLIENT_ID="tu-facebook-app-id"
FACEBOOK_CLIENT_SECRET="tu-facebook-app-secret"

# Twitter/X
TWITTER_CLIENT_ID="tu-twitter-client-id"
TWITTER_CLIENT_SECRET="tu-twitter-client-secret"

# Microsoft
MICROSOFT_CLIENT_ID="tu-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="tu-microsoft-client-secret"

# ============================================
# PROCESAMIENTO DE PAGOS
# ============================================
# Stripe
STRIPE_SECRET_KEY="sk_test_tu_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_tu_stripe_publishable_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_tu_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_tu_webhook_secret"

# IDs de precios de Stripe
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID="price_tu_pro_price_id"
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID="price_tu_sponsor_price_id"

# LemonSqueezy
LEMONSQUEEZY_API_KEY="tu-lemonsqueezy-api-key"
LEMONSQUEEZY_STORE_ID="tu-store-id"
LEMONSQUEEZY_WEBHOOK_SECRET="tu-webhook-secret"
```

## Variables requeridas

Las siguientes variables **deben** estar configuradas para que la aplicación funcione:

| Variable | Descripción |
| -------- | ----------- |
| `AUTH_SECRET` | Secreto para tokens de sesión. Generar con `openssl rand -base64 32` |
| `COOKIE_SECRET` | Secreto para cifrado de cookies. Generar con `openssl rand -base64 32` |
| `DATABASE_URL` | Cadena de conexión a la base de datos |
| `DATA_REPOSITORY` | URL del repositorio Git con el contenido del directorio |

## Generar secretos

Genera valores seguros para tus secretos:

```bash
# Generar AUTH_SECRET
openssl rand -base64 32

# Generar COOKIE_SECRET
openssl rand -base64 32
```

## Configuración de la base de datos

### SQLite (desarrollo local)

Para desarrollo local rápido sin PostgreSQL:

```bash
DATABASE_URL="file:./dev.db"
```

### PostgreSQL (producción)

Para producción, usa PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:contraseña@host:5432/nombre_db"
```

## Token de GitHub

Se requiere un token de GitHub para sincronizar contenido desde tu repositorio de datos:

1. Ve a **GitHub Settings → Developer settings → Personal access tokens**
2. Genera un nuevo token con permisos de `repo`
3. Añádelo a tu `.env.local`:

```bash
GH_TOKEN="ghp_tuTokenAqui"
DATA_REPOSITORY="https://github.com/tu-usuario/tu-repo-datos"
```

## Validación del entorno

La plantilla incluye un script de validación que comprueba tus variables de entorno:

```bash
cd apps/web
node scripts/check-env.js
```

Si alguna variable requerida falta, el script te lo indicará antes de iniciar.
