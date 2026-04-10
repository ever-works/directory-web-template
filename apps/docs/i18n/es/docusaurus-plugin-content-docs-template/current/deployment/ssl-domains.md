---
id: ssl-domains
title: "SSL & Dominios Personalizados"
sidebar_label: "SSL & Dominios"
sidebar_position: 2
---

# SSL & Dominios Personalizados

Esta guía cubre la configuración de dominios personalizados, gestión de certificados SSL, configuración de DNS y soporte multi-dominio para Ever Works Template. La plantilla viene con cabeceras de seguridad de nivel producción y está optimizada para implementación en Vercel con HTTPS automático, pero también admite entornos self-hosted con configuración SSL manual.

## Cabeceras de Seguridad Integradas

La plantilla configura un conjunto completo de cabeceras de seguridad en `next.config.ts` que se aplican automáticamente a cada ruta. Estas cabeceras aplican HTTPS, previenen ataques web comunes y controlan la carga de recursos.

### Configuración Completa de Cabeceras

El bloque completo de cabeceras del `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.lemonsqueezy.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';",
        },
      ],
    },
  ];
}
```

### Descripción de las Cabeceras

| Cabecera | Valor | Propósito |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Previene ataques de detección de tipo MIME |
| `X-Frame-Options` | `DENY` | Bloquea clickjacking impidiendo incrustación en iframe |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla cuánta información del referente se comparte |
| `X-DNS-Prefetch-Control` | `on` | Habilita prefetching DNS para cargas más rápidas |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS por 2 años en todos los subdominios |
| `Content-Security-Policy` | Ver arriba | Restringe qué recursos puede cargar el navegador |

### Detalles del HSTS

La cabecera Strict-Transport-Security usa la configuración máxima recomendada:

- **max-age=63072000** – los navegadores recuerdan usar HTTPS por 2 años
- **includeSubDomains** – todos los subdominios también deben usar HTTPS
- **preload** – elegible para inclusión en las listas de precarga HSTS de los navegadores

:::caution
Una vez que HSTS con precarga está activo y su dominio se envía a la lista de precarga, es muy difícil deshacerlo. Asegúrese de que su certificado SSL esté correctamente configurado y con auto-renovación antes de habilitar la precarga.
:::

### Descripción de la Content Security Policy

| Directiva | Valor | Efecto |
|-----------|-------|--------|
| `default-src` | `'self'` | Cargar solo recursos del mismo origen por defecto |
| `script-src` | `'self' 'unsafe-inline' https://assets.lemonsqueezy.com` | Scripts del mismo origen, scripts inline y SDK de pago LemonSqueezy |
| `style-src` | `'self' 'unsafe-inline'` | Estilos del mismo origen más estilos inline (necesario para CSS-in-JS) |
| `img-src` | `'self' data: https:` | Imágenes del mismo origen, data URIs y cualquier fuente HTTPS |
| `font-src` | `'self'` | Fuentes solo del mismo origen |
| `connect-src` | `'self' https:` | Llamadas de API al mismo origen y cualquier endpoint HTTPS |
| `frame-ancestors` | `'none'` | Impide que la página sea incrustada en frames |

## Configuración de Dominio Personalizado

### Variables de Entorno para Configuración de Dominio

Al configurar un dominio personalizado, actualice estas variables en su entorno de implementación:

```bash
# URL de la aplicación – usado para callbacks OAuth, URLs canónicas, hreflang, sitemaps
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Dominio de cookie – debe coincidir con su dominio para que las cookies de sesión funcionen
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true

# URL de autenticación – usado por NextAuth para callbacks
NEXTAUTH_URL=https://yourdomain.com
```

La variable `NEXT_PUBLIC_APP_URL` se declara como crítica en `scripts/check-env.js`:

```javascript
const CRITICAL_PATTERNS = [
  /^DATA_REPOSITORY$/,
  /^AUTH_SECRET$/,
  /^NEXT_PUBLIC_APP_URL$/
];
```

### Vercel: SSL Automático

Al implementar en Vercel, los certificados SSL se aprovisionan y renuevan automáticamente usando Let's Encrypt. El proceso no requiere configuración manual:

1. **Agregue su dominio** en el panel del proyecto Vercel en Configuración → Dominios
2. **Configure el DNS** para que apunte a Vercel (vea Configuración de DNS abajo)
3. **Verifique** – Vercel aprovisiona automáticamente el certificado una vez que el DNS se resuelve

Vercel admite:

- Aprovisionamiento automático de certificados Let's Encrypt
- Certificados wildcard para subdominios
- Renovación automática de certificados antes del vencimiento
- Redireccionamiento HTTP a HTTPS (automático)

### Configuración de DNS

**Para un dominio raíz** (ej.: `example.com`):

```
Tipo:  A
Nombre:  @
Valor: 76.76.21.21
```

**Para un subdominio www** (ej.: `www.example.com`):

```
Tipo:  CNAME
Nombre:  www
Valor: cname.vercel-dns.com
```

**Verificación de DNS** después de establecer los registros:

```bash
# Verificar registro A
dig yourdomain.com A +short

# Verificar registro CNAME
dig www.yourdomain.com CNAME +short

# Verificación de propagación en múltiples ubicaciones
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

La propagación de DNS puede tardar hasta 48 horas, aunque la mayoría de los cambios entran en vigor en minutos.

### Self-Hosted: Nginx con Let's Encrypt

Para implementaciones self-hosted detrás de Nginx, configure la terminación SSL en el nivel del proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Instale y configure Certbot para la gestión automática de certificados:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener e instalar certificado
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

## URLs de Callback OAuth

Al cambiar a un dominio personalizado, actualice las URLs de callback en la consola de cada proveedor OAuth:

| Proveedor | URL de Callback |
|----------|-------------|
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Twitter | `https://yourdomain.com/api/auth/callback/twitter` |

La plantilla valida automáticamente la configuración OAuth al inicio. De `auth.config.ts`:

```typescript
const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === 'google')
        ? { enabled: true, clientId: authConfig.google.clientId || '', ... }
        : { enabled: false },
      // ... otros proveedores
    });
  } catch (error) {
    // Fallback a solo credenciales
    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      // ...
    });
  }
};
```

Si un proveedor está mal configurado, la plantilla recurre a la autenticación solo con credenciales.

## Soporte Multi-Dominio

La plantilla admite múltiples dominios a través de la configuración de optimización de imágenes de Next.js:

```typescript
images: {
  remotePatterns: generateImageRemotePatterns(),
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

La utilidad `generateImageRemotePatterns()` genera dinámicamente patrones de imágenes remotas, permitiendo que Next.js optimice imágenes de dominios externos configurados.

## Configuración de Cookies

La configuración de cookies debe estar alineada con su configuración de dominio:

```bash
# Desarrollo (localhost)
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

# Producción (dominio personalizado)
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

Establecer `COOKIE_SECURE=true` garantiza que las cookies solo se transmitan a través de conexiones HTTPS. Esto es esencial para prevenir el secuestro de sesión. El script de verificación de entorno valida la configuración de cookies como parte de la categoría de seguridad.

## Solución de Problemas

### Certificado SSL No Aprovisionado

1. Verifique que los registros DNS apunten al destino correcto
2. Deshabilite cualquier proxy DNS (ej.: modo proxy de Cloudflare) que pueda interceptar el desafío ACME
3. Espere la propagación completa del DNS (verifique con los comandos `dig` anteriores)
4. Revise el panel de la plataforma para errores específicos del certificado

### Advertencias de Contenido Mixto

Si el navegador reporta contenido mixto después de habilitar HTTPS:

1. Asegúrese de que `NEXT_PUBLIC_APP_URL` comience con `https://`
2. Verifique que todas las URLs de recursos externos usen HTTPS
3. Las directivas CSP `img-src` y `connect-src` incluyen `https:` por defecto

### Incompatibilidad de Redirección OAuth

Si el inicio de sesión OAuth falla con un error de incompatibilidad de URI de redirección:

1. Actualice la URL de callback en la consola de desarrollador de cada proveedor OAuth
2. Asegúrese de que `NEXTAUTH_URL` coincida con el dominio exacto incluyendo el protocolo
3. Limpie las cookies del navegador y el almacenamiento de sesión antes de intentar nuevamente

## Archivos Relacionados

| Archivo | Propósito |
|------|---------|
| `next.config.ts` | Cabeceras de seguridad, CSP, patrones de imágenes remotas |
| `auth.config.ts` | Configuración de proveedor OAuth y configuración de callback |
| `scripts/check-env.js` | Validación de variables de entorno para configuraciones de dominio |
| `lib/seo/hreflang.ts` | Generación de enlaces alternativos hreflang para i18n |
| `lib/utils/url-cleaner.ts` | Utilidad de URL base usando `NEXT_PUBLIC_APP_URL` |
