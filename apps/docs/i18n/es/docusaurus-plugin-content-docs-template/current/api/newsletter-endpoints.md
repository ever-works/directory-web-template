---
id: newsletter-endpoints
title: "Acciones de Servidor Newsletter"
sidebar_label: "Newsletter"
sidebar_position: 26
---

# Acciones de Servidor Newsletter

El módulo de Newsletter proporciona Acciones de Servidor de Next.js para gestionar suscripciones de newsletter. A diferencia de los puntos finales REST tradicionales, estas se invocan directamente desde componentes de cliente y manejan tanto el almacenamiento en base de datos como la integración con proveedores de email externos.

**Archivos fuente:**
- `template/lib/services/newsletter.service.ts`
- `template/app/api/newsletter/` (si usa rutas API en lugar de acciones de servidor)

## Acciones Disponibles

### `subscribeToNewsletter(email, source?)`

Suscribe una dirección de email al newsletter. Si el email ya está suscrito, el estado de suscripción se renueva y la marca de tiempo de suscripción se actualiza.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `email` | string | **Sí** | Dirección de email a suscribir |
| `source` | string | No | Origen de la suscripción (ej. `"footer"`, `"popup"`) |

**Respuesta Exitosa:**
```typescript
{
  success: true;
  message: string;      // ej. "Successfully subscribed to newsletter"
  alreadySubscribed?: boolean;
}
```

**Respuestas de Error:**
```typescript
{ success: false; error: string }   // validación, error de BD, etc.
```

**Comportamiento:**
1. Valida el formato del email
2. Verifica si el email ya existe en la tabla `newsletterSubscriptions`
3. Si existe y está activo: devuelve `{ alreadySubscribed: true }`
4. Si existe pero fue dado de baja: actualiza `subscribedAt` y establece `isActive = true`
5. Si es nuevo: inserta un nuevo registro y llama al proveedor externo (si está configurado)
6. Registra la fuente de suscripción si se proporciona

**Ejemplo de Uso:**
```typescript
import { subscribeToNewsletter } from '@/lib/services/newsletter.service';

const result = await subscribeToNewsletter('user@example.com', 'footer-form');
if (result.success) {
  console.log(result.message);
}
```

### `unsubscribeFromNewsletter(email)`

Cancela la suscripción de un email del newsletter estableciendo `isActive = false` y registrando la marca de tiempo `unsubscribedAt`.

**Parámetros:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `email` | string | **Sí** | Dirección de email a dar de baja |

**Respuesta Exitosa:**
```typescript
{
  success: true;
  message: string;      // ej. "Successfully unsubscribed from newsletter"
}
```

**Comportamiento:**
1. Valida el formato del email
2. Busca una suscripción activa en la tabla `newsletterSubscriptions`
3. Si se encuentra: establece `isActive = false`, registra `unsubscribedAt`
4. También cancela la suscripción con el proveedor de email externo si está configurado
5. Si no se encuentra: devuelve éxito de todas formas (operación idempotente)

**Ejemplo de Uso:**
```typescript
const result = await unsubscribeFromNewsletter('user@example.com');
```

### `getNewsletterStatistics()`

Devuelve métricas de resumen de suscripción al newsletter para uso en el panel de administración.

**Parámetros:** Ninguno (requiere autenticación como administrador)

**Respuesta Exitosa:**
```typescript
{
  success: true;
  data: {
    totalSubscribers: number;
    activeSubscribers: number;
    unsubscribedCount: number;
    subscribedToday: number;
    subscribedThisWeek: number;
    subscribedThisMonth: number;
    bySource: Record<string, number>;   // Conteos por fuente de suscripción
  };
}
```

**Fuente:** `template/lib/db/queries/newsletter.queries.ts`

## Esquema de Base de Datos

Las suscripciones se almacenan en la tabla `newsletterSubscriptions`:

```typescript
// Campos de la tabla
{
  id: string;             // ID único
  email: string;          // Dirección de email (unique)
  isActive: boolean;      // Si actualmente está suscrito
  source: string | null;  // Origen de suscripción
  subscribedAt: Date;     // Primera o última suscripción
  unsubscribedAt: Date | null; // Cuándo se canceló la suscripción
  createdAt: Date;
  updatedAt: Date;
}
```

## Fuentes de Suscripción

El parámetro `source` rastrea de dónde provino la suscripción. Valores comunes:

| Valor de Source | Descripción |
|---|---|
| `"footer"` | Formulario del pie de página |
| `"popup"` | Modal/popup de suscripción |
| `"checkout"` | Durante el flujo de pago |
| `"profile"` | Configuración del perfil de usuario |
| `"import"` | Importación masiva en el panel de administración |

## Integración con Proveedores de Email

Las suscripciones pueden sincronizarse opcionalmente con proveedores de email externos. El proveedor activo se configura mediante variables de entorno:

| Proveedor | Variable de Entorno |
|-----------|-------------------|
| Mailchimp | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID` |
| Resend | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_LIST_ID` |

Si no se configura ningún proveedor, las suscripciones se almacenan solo en la base de datos.

## Autenticación

| Acción | Requerimiento |
|--------|---------------|
| `subscribeToNewsletter` | Público (no requiere autenticación) |
| `unsubscribeFromNewsletter` | Público (no requiere autenticación) |
| `getNewsletterStatistics` | Requiere autenticación de administrador |
