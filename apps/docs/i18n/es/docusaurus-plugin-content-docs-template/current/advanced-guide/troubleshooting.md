---
id: troubleshooting
title: Guía de solución de problemas
sidebar_label: Solución de problemas
sidebar_position: 7
---

# Guía de solución de problemas

Esta guía cubre errores comunes, técnicas de depuración, interpretación de registros y problemas ambientales para la plantilla Ever Works. Los problemas están organizados por categorías con síntomas, causas y soluciones.

## Problemas de compilación

### Módulo no encontrado durante la compilación

**Síntomas**: La compilación falla con `Module not found: Can't resolve 'postgres'` o errores similares del módulo nativo de Node.js.

**Causa**: Webpack intenta agrupar módulos solo de servidor para el paquete de cliente.

**Solución**: Verifique que el módulo aparezca en `serverExternalPackages` en `next.config.ts` :

```typescript
const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']
};
```

Si agregó una nueva dependencia de solo servidor, agréguela a esta matriz.

### Tiempo de espera de generación de página estática

**Síntomas**: La compilación falla con `Error: Timeout of 180000ms exceeded` durante la generación estática.

**Causa**: Las páginas que obtienen datos externos durante el tiempo de compilación exceden el tiempo de espera.

**Solución**: La plantilla establece un tiempo de espera de 3 minutos:

```typescript
staticPageGenerationTimeout: 180,
```

Para páginas que necesitan más tiempo, aumente este valor. Alternativamente, cambie las páginas lentas a renderizado dinámico:

```typescript
export const dynamic = 'force-dynamic';
```

### Falta el directorio de contenido durante la compilación

**Síntomas**: La compilación falla porque `.content/data` no existe.

**Causa**: El contenido del CMS basado en Git no ha sido clonado. El script `scripts/clone.cjs` se ejecuta durante los ganchos `predev` y `prebuild` .

**Solución**:

```bash
# Ensure DATA_REPOSITORY is set in .env.local
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Run the clone script manually
node scripts/clone.cjs

# Or create the directory for CI builds without content
mkdir -p .content/data
```

### Advertencias de paquete web de Supabase, bcryptjs, postgres, stripe

**Síntomas**: la compilación genera advertencias sobre estos paquetes pero se completa correctamente.

**Causa**: Las advertencias conocidas de paquetes que hacen referencia a las API de Node.js no están disponibles en el navegador.

**Solución**: Estos ya están suprimidos en `next.config.ts` :

```typescript
config.ignoreWarnings = [
	{ module: /@supabase\/realtime-js/ },
	{ module: /@supabase\/supabase-js/ },
	{ module: /bcryptjs/ },
	{ message: /bcryptjs/ },
	{ module: /postgres/ },
	{ module: /stripe/ }
];
```

No es necesario realizar ninguna acción: las advertencias no afectan el resultado de la compilación.

### Montón de JavaScript sin memoria

**Síntomas**: La compilación falla con `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory` .

**Solución**: Los scripts de compilación ya asignan 8 GB:

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

Si la compilación aún se queda sin memoria, verifique:

- Generación excesiva de páginas estáticas (reduce las páginas creadas en el momento de la compilación)
- Las dependencias grandes no están debidamente sacudidas.
- Pérdidas de memoria en los scripts en tiempo de compilación.

## Problemas con la base de datos

### Conexión rechazada a PostgreSQL

**Síntomas**: La aplicación falla con `connection refused` , `ECONNREFUSED` o `connect ETIMEDOUT` .

**Pasos de diagnóstico**:

1. Verifique `DATABASE_URL` en `.env.local` :
    ```golpecito
    nodo -e "require('dotenv').config({ruta:'.env.local'}); console.log(process.env.DATABASE_URL ? 'Establecer': 'Falta')"
    ```
2. Pruebe la conexión directamente: `psql $DATABASE_URL -c "SELECT 1"` 3. Verifique que PostgreSQL se esté ejecutando: `pg_isready` **Causas comunes y soluciones**:

| Causa | Arreglar |
| ---------------------- | ----------------------------------------- |
| PostgreSQL no se ejecuta | Iniciar el servicio |
| Puerto equivocado | Verifique el puerto en su cadena de conexión |
| Base de datos faltante | `createdb your_database_name` |
| Error de autenticación | Verifique nombre de usuario/contraseña en `DATABASE_URL` |
| Se requiere SSL | Agregue `?sslmode=require` a la cadena de conexión |

### La migración falló

**Síntomas**: `pnpm db:migrate` falla con errores de esquema o SQL.

**Solución**: utilice la herramienta de migración CLI detallada para depurar:

```bash
pnpm db:migrate:cli
```

Esto muestra:

1. Estado migratorio actual (lista de migraciones aplicadas)
2. Resultado detallado de la ejecución de la migración
3. Verificación del esquema después de la migración

Si las migraciones están dañadas, consulte la tabla de seguimiento de Drizzle:

```sql
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### La inicialización de la base de datos falló en la instrumentación

**Síntomas**: La consola muestra `[Instrumentation] Database initialization failed` al iniciarse.

**Causa**: El gancho `instrumentation.ts` ejecuta la migración y la inicialización al inicio. El error indica un problema de conectividad o esquema de la base de datos.

**Comportamiento por entorno**:

| Medio ambiente | Sobre el fracaso |
| ----------- | -------------------------------------- |
| Producción | Arroja error, la implementación sirve 503 |
| Desarrollo | Advertencia de registros, la aplicación se inicia para depurar |
| Vista previa | Advertencia de registros, la aplicación se inicia para depurar |

Desde `instrumentation.ts` :

```typescript
if (isProduction) {
	throw error; // Fail fast in production
}
// In development/preview, allow app to start for debugging
console.warn('[Instrumentation] Non-production: Allowing app to start despite DB init failure');
```

### Semilla atascada en estado de "siembra"

**Síntomas**: La aplicación registra `[DB Init] Another instance is seeding` repetidamente.

**Causa**: Una operación inicial anterior falló sin actualizar el estado.

**Solución**: El código de inicialización maneja automáticamente las semillas obsoletas después de 5 minutos:

```typescript
const STALE_SEEDING_THRESHOLD = 300000; // 5 minutes
```

Para resolverlo inmediatamente, actualice manualmente el estado de la semilla:

```sql
DELETE FROM seed_status WHERE id = 'singleton';
```

Luego reinicie la aplicación.

## Problemas de autenticación

### AUTH_SECRET no establecido

**Síntomas**: La aplicación falla con `AUTH_SECRET is not set` o errores de sesión.

**Solución**:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=your_generated_secret_here
```

### La URL de devolución de llamada de OAuth no coincide

**Síntomas**: el inicio de sesión de OAuth redirige a una página de error con `redirect_uri_mismatch` .

**Solución**: La URL de devolución de llamada en la consola de tu proveedor de OAuth debe coincidir exactamente:

| Proveedor | URL de devolución de llamada |
| -------- | --------------------------------------------------- |
| Google | `https://yourdomain.com/api/auth/callback/google` |
| GitHub | `https://yourdomain.com/api/auth/callback/github` |
| Facebook | `https://yourdomain.com/api/auth/callback/facebook` |
| Gorjeo | `https://yourdomain.com/api/auth/callback/twitter` |

Para desarrollo local, utilice `http://localhost:3000/api/auth/callback/<provider>` .

### Los proveedores de OAuth no aparecen

**Síntomas**: solo se muestran las credenciales de inicio de sesión, faltan los botones de OAuth.

**Causa**: Los proveedores de OAuth vuelven a estar deshabilitados si falla la configuración. Desde `auth.config.ts` :

```typescript
} catch (error) {
  // Fallback to credentials only
  return createNextAuthProviders({
    credentials: { enabled: true },
    google: { enabled: false },
    github: { enabled: false },
    facebook: { enabled: false },
    twitter: { enabled: false },
  });
}
```

**Solución**: Verifique que tanto `CLIENT_ID` como `CLIENT_SECRET` estén configurados para cada proveedor. El script de verificación del entorno valida los pares OAuth:

```
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
FB_CLIENT_ID + FB_CLIENT_SECRET
```

### Las sesiones expiran inesperadamente

**Causas comunes**:

| Causa | Solución |
| ---------------------- | ---------------------------------------------------- |
| `AUTH_SECRET` cambiado | Cambiar el secreto invalida todas las sesiones |
| El dominio de las cookies no coincide | Configure `COOKIE_DOMAIN` para que coincida con su dominio de implementación |
| HTTPS no coincide | Establezca `COOKIE_SECURE=false` para desarrollo HTTP local |

## Problemas de implementación

### La compilación de Vercel falla pero la compilación local tiene éxito

**Lista de verificación**:

1. Todas las variables de entorno requeridas configuradas en el panel de Vercel
2. `DATABASE_URL` accesible desde la red de Vercel
3. Compatible con la versión de Node.js (requiere 20.19.0 o superior)
4. El directorio de contenido existe (CI crea `.content/data` automáticamente)
5. Asignación de memoria suficiente

### Los trabajos cron de Vercel no se ejecutan

**Síntomas**: Los puntos finales programados en `vercel.json` no se ejecutan.

**Pasos de diagnóstico**:

1. Verifique que `vercel.json` esté en la raíz del proyecto con las rutas correctas:
    ```json
    { "ruta": "/api/cron/sync", "programación": "0 3 * * *" }
    ```
2. Confirme que el plan Vercel admite cron (Pro o Enterprise)
3. Consulte el Panel de control de Vercel en la pestaña Trabajos cron para ver los registros de ejecución.
4. Pruebe el punto final manualmente: `curl https://yourdomain.com/api/cron/sync` ### La migración en tiempo de compilación falla en Vercel

**Síntomas**: El registro de compilación muestra `[Build Migration] Migration error` .

**Comportamiento**: El script `scripts/build-migrate.ts` maneja diferentes escenarios:

- **Producción**: todos los errores provocan errores de compilación.
- **Vista previa con error de conexión**: la compilación continúa con una advertencia
- **Vista previa con error de autenticación**: la compilación falla (configuración incorrecta)

```typescript
if (isProduction) {
	process.exit(1); // Fail production builds
}
if (isConnectionError && !isAuthError) {
	process.exit(0); // Allow preview deployments to continue
}
```

Para omitir por completo las migraciones en tiempo de compilación:

```bash
SKIP_BUILD_MIGRATIONS=true
```

## Problemas de internacionalización

### Se muestran claves de traducción en lugar de texto

**Síntomas**: Las páginas muestran `common.WELCOME` en lugar de "Bienvenido".

**Solución**:

1. Verifique que el archivo de traducción exista: `messages/<locale>.json` 2. Compruebe que la ruta clave coincida con el espacio de nombres utilizado en `useTranslations` 3. El sistema alternativo utiliza `deepmerge` para fusionar mensajes locales con los valores predeterminados en inglés:

```typescript
const userMessages = (await import(`../messages/${locale}.json`)).default;
const defaultMessages = (await import(`../messages/en.json`)).default;
const messages = deepmerge(defaultMessages, userMessages);
```

Si falta una clave en el archivo de configuración regional, el respaldo en inglés debería proporcionarla.

### El enrutamiento local devuelve 404

**Síntomas**: URL como `/fr/discover` devuelven una página 404.

**Solución**: Verifique que la configuración regional esté en la matriz `LOCALES` en `lib/constants.ts` :

```typescript
export const LOCALES = [
	'en',
	'fr',
	'es',
	'de',
	'zh',
	'ar',
	'he',
	'ru',
	'uk',
	'pt',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'tr',
	'vi',
	'th',
	'hi',
	'id',
	'bg'
] as const;
```

Y verifique la configuración de enrutamiento en `i18n/routing.ts` :

```typescript
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localeDetection: true,
	localePrefix: 'as-needed'
});
```

## Interpretación de registros

### Prefijos de registro

| Prefijo | Fuente | Ubicación |
| ------------------- | ----------------------------------- | -------------------------- |
| `[Instrumentation]` | Inicio de la aplicación (inicio de base de datos, Sentry) | `instrumentation.ts` |
| `[Migration]` | Ejecución de migración de base de datos | `lib/db/migrate.ts` |
| `[DB Init]` | Inicialización y siembra de bases de datos | `lib/db/initialize.ts` |
| `[Build Migration]` | Script de migración en tiempo de compilación | `scripts/build-migrate.ts` |
| `[Layout]` | Errores al obtener datos de diseño raíz | `app/[locale]/layout.tsx` |

### Etiquetas de error de centinela

Los errores centinela de la instrumentación incluyen estas etiquetas para filtrar:

| Etiqueta | Valores |
| ------------- | ----------------------------------------- |
| `component` | `instrumentation` |
| `phase` | `database_init` |
| `environment` | `production` , `preview` o `development` |

## Comandos de diagnóstico

| Tarea | Comando |
| ------------------------ | ----------------------------------- |
| Comprobar errores de TypeScript | `pnpm tsc --noEmit` |
| Ejecutar linter | `pnpm lint` |
| Validar entorno | `node scripts/check-env.js` |
| Comprobación rápida del entorno | `node scripts/check-env.js --quick` |
| Conexión de base de datos de prueba | `pnpm db:studio` |
| Ver estado migratorio | `pnpm db:migrate:cli` |
| Generar nuevas migraciones | `pnpm db:generate` |
| Aplicar migraciones pendientes | `pnpm db:migrate` |
| Base de datos de semillas | `pnpm db:seed` |
| Limpiar caché de compilación | `rm -rf .next` |
| Reconstrucción completa | `rm -rf .next && pnpm build` |
| Restablecer base de datos | `node scripts/clean-database.js` |

## Obtener ayuda

1. Busque [Problemas de GitHub] (https://github.com/ever-works/directory-web-template/issues)
2. Revise el archivo `CLAUDE.md` para conocer las pautas de desarrollo asistido por IA.
3. Verifique el panel de Sentry para obtener detalles del error (si está configurado)
4. Por cuestiones de seguridad, envíe un correo electrónico a security@ever.co de forma privada.
