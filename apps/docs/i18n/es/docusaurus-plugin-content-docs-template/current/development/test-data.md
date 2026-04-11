---
id: test-data
title: Datos de Prueba & Fixtures
sidebar_label: Datos de Prueba
sidebar_position: 6
---

# Datos de Prueba & Fixtures

La plantilla Ever Works proporciona varios mecanismos para generar y gestionar datos de prueba en contextos de desarrollo, seeding y pruebas E2E. Esta página cubre datos ficticios, seeds de base de datos, fixtures E2E y estrategias para mantener la consistencia de datos.

## Datos de Prueba E2E (`e2e/helpers/test-data.ts`)

El conjunto de pruebas E2E define sus datos de prueba a través de un módulo helper centralizado:

```typescript
export const TEST_DATA = {
  get ADMIN_EMAIL()    { return requireEnv('SEED_ADMIN_EMAIL'); },
  get ADMIN_PASSWORD() { return requireEnv('SEED_ADMIN_PASSWORD'); },
  CLIENT_PASSWORD: 'TestClient123!',
  generateClientEmail: () =>
    `e2e-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
  generateItemName: () =>
    `E2E Test Item ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  generateItemUrl: () =>
    `https://e2e-test-${Date.now()}.example.com`,
};
```

### Decisiones de Diseño Clave

- **Credenciales de admin desde env** -- El correo y contraseña del admin se leen desde las variables de entorno `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`, asegurando que las pruebas utilicen las mismas credenciales que el usuario admin sembrado.
- **Datos únicos de cliente** -- Los correos de cliente y nombres de elementos incluyen marcas de tiempo y sufijos aleatorios para evitar colisiones en ejecuciones paralelas de pruebas.
- **Evaluación lazy** -- Las credenciales de admin usan funciones getter que lanzan inmediatamente si faltan variables de entorno, detectando errores de configuración tempranamente.

### Registro de Rutas Públicas

El módulo de datos de prueba también define todas las rutas públicas para pruebas de navegación:

```typescript
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/discover/1', name: 'Discover Page 1' },
  { path: '/categories', name: 'Categories' },
  { path: '/tags', name: 'Tags' },
  { path: '/collections', name: 'Collections' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/help', name: 'Help' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms-of-service', name: 'Terms of Service' },
  { path: '/cookies', name: 'Cookies' },
  { path: '/auth/signin', name: 'Sign In' },
  { path: '/auth/register', name: 'Register' },
];
```

## Fixtures de Estado de Autenticación E2E

El estado de autenticación se gestiona a través de archivos de estado de almacenamiento de Playwright:

```
e2e/auth-states/
  admin.json    # Sesión de admin serializada (cookies, localStorage)
  client.json   # Sesión de cliente serializada
```

Estos archivos se generan durante `global-setup.ts` iniciando sesión programáticamente con credenciales de admin y cliente. El fixture de autenticación (`e2e/fixtures/auth.fixture.ts`) proporciona contextos de navegador pre-autenticados:

- `adminContext` / `adminPage` -- Contexto de navegador con sesión de admin cargada
- `clientContext` / `clientPage` -- Contexto de navegador con sesión de cliente cargada

Los archivos de prueba importan el objeto `test` personalizado en lugar del predeterminado de Playwright:

```typescript
import { test, expect } from '@/e2e/fixtures';

test('admin can view dashboard', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading')).toContainText('Dashboard');
});
```

## Seeding de la Base de Datos

### Script de Seed (`lib/db/seed.ts`)

El script de seeding de la base de datos se ejecuta mediante `pnpm db:seed` y rellena la base de datos con los datos iniciales necesarios para el funcionamiento de la aplicación:

- **Usuario admin** -- Creado desde las variables de entorno `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`
- **Usuarios ficticios** -- Generados según `SEED_FAKE_USER_COUNT` (predeterminado: 10)
- **Datos de demostración** -- Cuando `NEXT_PUBLIC_DEMO=true`, se siembran datos de demostración completos para todas las funciones

El script de seed es idempotente -- verifica los datos existentes antes de insertar para evitar duplicados en re-ejecuciones.

### Modo Demo

Cuando `NEXT_PUBLIC_DEMO=true`, el script de seed genera:

- Múltiples usuarios con roles y perfiles variados
- Elementos de ejemplo en diferentes categorías y estados
- Comentarios, votos y datos de participación
- Envíos de anuncios patrocinados en varios estados
- Definiciones de encuestas con respuestas de ejemplo

## Estrategias de Consistencia de Datos

### Aislamiento Entre Ejecuciones de Prueba

Las pruebas E2E utilizan varias estrategias para evitar la interferencia de datos:

1. **Identificadores únicos** -- Todos los datos de prueba generados incluyen marcas de tiempo para prevenir colisiones de nombres
2. **Limpieza por prueba** -- Las pruebas que crean datos deben limpiar tras de sí
3. **Contextos de autenticación separados** -- Las pruebas de admin y cliente se ejecutan en contextos de navegador aislados
4. **Configuración/limpieza global** -- `global-setup.ts` prepara el estado de autenticación, `global-teardown.ts` maneja la limpieza

### Desarrollo vs Pruebas vs Producción

| Preocupación | Desarrollo | Pruebas (E2E) | Producción |
|--------------|-----------|---------------|------------|
| Base de datos | SQLite (`file:./dev.db`) o Postgres | Igual que dev (servidor reutilizado) | Postgres |
| Contenido | Clonado de `DATA_REPOSITORY` | Contenido preexistente del dev | CMS basado en Git |
| Usuarios | Admin sembrado + usuarios ficticios | Igual que dev + usuarios generados por E2E | Usuarios reales |
| Datos demo | Cuando `NEXT_PUBLIC_DEMO=true` | Depende de datos demo sembrados | `NEXT_PUBLIC_DEMO=false` |

### Mejores Prácticas

1. **Siempre siembra antes de probar** -- Ejecuta `pnpm db:seed` antes de las pruebas E2E para garantizar que el usuario admin exista
2. **Usa generadores de datos únicos** -- Nunca codifiques nombres de elementos o correos en las pruebas
3. **Verifica las variables de entorno** -- El helper `requireEnv()` proporciona mensajes de error claros cuando faltan variables obligatorias
4. **Mantén los fixtures mínimos** -- Los archivos de estado de autenticación contienen solo las cookies y entradas de almacenamiento necesarias
5. **Evita dependencias entre pruebas** -- Cada archivo de spec debe ser ejecutable de forma independiente

## Variables de Entorno para Pruebas

```bash
# Obligatorias para pruebas E2E
SEED_ADMIN_EMAIL=admin@changeme.com
SEED_ADMIN_PASSWORD=changeme_password

# Opcionales
BASE_URL=http://localhost:3000
SEED_FAKE_USER_COUNT=10
NEXT_PUBLIC_DEMO=true
```

## Archivos Relacionados

- `e2e/helpers/test-data.ts` -- Generadores de datos de prueba y constantes
- `e2e/fixtures/auth.fixture.ts` -- Fixtures de autenticación para Playwright
- `e2e/global-setup.ts` -- Configuración de autenticación pre-prueba
- `e2e/global-teardown.ts` -- Limpieza post-prueba
- `lib/db/seed.ts` -- Script de seeding de la base de datos
- `.env.example` -- Referencia completa de variables de entorno
