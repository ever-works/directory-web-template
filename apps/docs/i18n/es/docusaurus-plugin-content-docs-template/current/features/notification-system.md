---
id: notification-system
title: Análisis profundo del sistema de notificación
sidebar_label: Sistema de notificación
sidebar_position: 34
---

# Análisis profundo del sistema de notificación

La plantilla proporciona un sistema de notificación en la aplicación respaldado por PostgreSQL. Las notificaciones las crean los servicios del lado del servidor y se consumen a través de una API REST, principalmente en el panel de administración. El sistema admite múltiples tipos de notificaciones, operaciones por lotes y definiciones de tipos extensibles.

## Descripción general de la arquitectura

```
lib/db/schema.ts                    # notifications table definition
lib/services/notification.service.ts # NotificationService with convenience methods

app/api/admin/notifications/
  route.ts                           # GET (list) and POST (create) endpoints
  mark-all-read/route.ts             # POST mark all as read
  [id]/read/route.ts                 # PATCH mark single as read

components/admin/
  admin-notifications.tsx            # Notification dropdown UI
  admin-notification-stats.tsx       # Notification count badges
```

## Esquema de base de datos

Las notificaciones se almacenan en la tabla `notifications` :

```ts
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'),              // JSON string for extra payload
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIndex: index('notifications_user_idx').on(table.userId),
  typeIndex: index('notifications_type_idx').on(table.type),
  isReadIndex: index('notifications_is_read_idx').on(table.isRead),
  createdAtIndex: index('notifications_created_at_idx').on(table.createdAt),
}));
```

### Diseño de esquema

- ** `type` columna**: cadena de formato libre que categoriza la notificación. No lo aplica una enumeración, lo que permite nuevos tipos sin migraciones.
- ** `data` columna**: almacena contexto adicional como una cadena JSON. Analizado en lectura para acceder a ID de elementos, contenido de comentarios o información específica de eventos.
- ** `isRead` / `readAt` ** -- indicador booleano para conteos rápidos de no leídos más una marca de tiempo para auditoría.
- **Cuatro índices**: cubren la búsqueda de usuarios, el filtrado de tipos, el filtrado de no leídos y el listado cronológico.

## Tipos de notificación

El sistema utiliza identificadores de tipo basados en cadenas. Los tipos integrados incluyen:

| Tipo | Gatillo | Destinatario típico |
|------|---------|-------------------|
| `item_approved` | El administrador aprueba un elemento enviado | Remitente del artículo |
| `item_rejected` | El administrador rechaza un elemento enviado | Remitente del artículo |
| `comment_received` | Alguien comenta sobre el artículo de un usuario | Propietario del artículo |
| `comment_reported` | Un comentario está marcado para revisión | Administrador |
| `item_reported` | Un elemento está marcado para revisión | Administrador |
| `user_registered` | Se registra un nuevo usuario | Administrador |
| `payment_failed` | Un intento de pago falla | Usuario afectado |
| `system_alert` | Advertencia o aviso a nivel del sistema | Administrador |

### Agregar tipos personalizados

1. Elija una cadena de tipo descriptivo (por ejemplo, `survey_response_received` ).
2. Agregue un método conveniente a `NotificationService` que genere la carga útil correcta.
3. Llame al método desde la ruta o servicio API relevante.
4. Opcionalmente, actualice el menú desplegable de notificaciones del administrador para representar un ícono personalizado.

No se requiere migración de la base de datos ya que `type` es una columna de texto de formato libre.

## Servicio de notificación

Ubicado en `lib/services/notification.service.ts` , el servicio proporciona métodos convenientes para crear notificaciones a partir de código del lado del servidor:

```ts
class NotificationService {
  static async create(data: CreateNotificationData);
  static async createItemSubmissionNotification(adminUserId, itemId, itemName, submittedBy);
  static async createCommentReportedNotification(adminUserId, commentId, content, reportedBy);
  static async createItemReportedNotification(adminUserId, itemId, itemName, reportedBy);
  static async createUserRegisteredNotification(adminUserId, userName, userEmail);
  static async createPaymentFailedNotification(userId, subscriptionId, errorMessage);
  static async createSystemAlertNotification(adminUserId, title, message);
}
```

Cada método de conveniencia construye la carga útil correcta `type` , `title` , `message` y `data` antes de delegar al método genérico `create` .

### Uso

```ts
import { NotificationService } from '@/lib/services/notification.service';

// After approving an item
await NotificationService.createItemSubmissionNotification(
  adminUserId, item.id, item.name, item.submittedBy
);

// System-level alert
await NotificationService.createSystemAlertNotification(
  adminUserId, 'Database Warning', 'Connection pool reaching capacity'
);
```

## Puntos finales API

Todos los puntos finales de notificación requieren autenticación de administrador.

### OBTENER /api/admin/notificaciones

Recupera las 50 notificaciones más recientes para el administrador autenticado, ordenadas por las más recientes. Devuelve notificaciones y recuento de no leídos en una sola respuesta.

```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 3
  }
}
```

El recuento de no leídos utiliza un `SELECT count(*)` separado con `isRead = false` para mayor eficiencia.

### PUBLICAR /api/admin/notificaciones

Crea una nueva notificación para un usuario específico.

| Campo | Requerido | Descripción |
|-------|----------|-------------|
| `type` | Sí | Identificador de categoría de notificación |
| `title` | Sí | Texto de encabezado breve |
| `message` | Sí | Texto del cuerpo |
| `userId` | Sí | ID de usuario del destinatario |
| `data` | No | Carga útil adicional (autostringificada) |

### POST /api/admin/notificaciones/marcar-todo-leído

Marca todas las notificaciones no leídas del administrador actual como leídas. Establece `isRead = true` y `readAt` en la marca de tiempo actual en una única actualización por lotes.

### PARCHE /api/admin/notificaciones/[id]/read

Marca una única notificación como leída por ID.

## Integración del panel de administración

El encabezado del administrador muestra un ícono de campana con una insignia de recuento de no leídos. El componente desplegable:

1. Obtiene notificaciones del punto final GET.
2. Representa cada notificación con íconos de tipo específico y codificación de colores.
3. Marca las notificaciones individuales como leídas al hacer clic.
4. Proporciona una acción masiva "Marcar todo como leído".
5. Encuestas con un temporizador o actualizaciones en la navegación del administrador.

## Consideraciones en tiempo real

La implementación actual utiliza una actualización basada en sondeos. Para actualizaciones en tiempo real, la arquitectura admite puntos de extensión:

- **Eventos enviados por el servidor**: agregue un punto final SSE que transmita nuevas notificaciones.
- **WebSocket**: integración con un proveedor de WebSocket para comunicación bidireccional.
- **Intervalo de sondeo**: ajustable mediante el temporizador de actualización del componente de notificación del administrador.

## Integración de correo electrónico

El sistema de notificaciones se centra en las notificaciones dentro de la aplicación. Las notificaciones de correo electrónico salientes se manejan por separado a través del servicio de correo electrónico (Reenviar/Novu), pero comparten los mismos puntos de activación. Cuando se crea una notificación a través de `NotificationService` , el código de llamada puede opcionalmente activar un correo electrónico en la misma operación.

## Estructura de carga útil de datos

La columna `data` almacena cadenas JSON con contexto específico del evento:

```ts
// Item-related notification
{ "itemId": "item_789", "itemName": "Awesome Tool", "itemSlug": "awesome-tool" }

// Comment-related notification
{ "commentId": "comment_123", "content": "Great tool!", "itemId": "item_789" }

// Payment-related notification
{ "subscriptionId": "sub_456", "errorMessage": "Card declined" }
```

Este esquema flexible permite a los renderizadores de notificaciones establecer vínculos profundos a páginas relevantes y mostrar información contextual.

## Accesibilidad

- El ícono de campana usa `aria-label` para anunciar el recuento de no leídos a los lectores de pantalla.
- Los elementos de notificación en el menú desplegable se pueden enfocar y navegar con el teclado.
- Los iconos de tipos específicos son decorativos ( `aria-hidden="true"` ) y las etiquetas de texto proporcionan contexto.
- El botón "Marcar todo como leído" proporciona comentarios claros mediante una notificación del sistema.
- Las marcas de tiempo utilizan formato relativo ("hace 2 horas") con la fecha completa en `title` atributos.

## Documentación relacionada

- [Componentes de administración](/docs/template/components/admin-components) -- UI de notificación de administración
- [Componentes del panel](/docs/template/components/dashboard-components) -- Estadísticas de notificaciones
- [Informes y moderación](/docs/template/features/reports-moderation) -- Notificaciones activadas por informes
- [Votación y comentarios](/docs/template/features/voting-comments) -- Notificaciones activadas por comentarios
