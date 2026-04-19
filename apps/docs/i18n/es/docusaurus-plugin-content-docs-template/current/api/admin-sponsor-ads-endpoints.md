---
id: admin-sponsor-ads-endpoints
title: "Endpoints Admin Anuncios Patrocinados"
sidebar_label: "Admin An. Patrocinados"
sidebar_position: 39
---

# Endpoints Admin Anuncios Patrocinados

La API de Anuncios Patrocinados proporciona puntos finales para gestionar anuncios publicitarios patrocinados, incluyendo listado, visualización, aprobación, rechazo y cancelación de anuncios. Los anuncios patrocinados avanzan por un ciclo de vida con los estados `pending_payment`, `pending`, `active`, `rejected`, `expired` y `cancelled`. Todos los puntos finales requieren autenticación de administrador.

## Ruta Base

```
/api/admin/sponsor-ads
```

## Resumen de Rutas

| Método   | Ruta                                        | Auth  | Descripción                                   |
| -------- | ------------------------------------------- | ----- | --------------------------------------------- |
| `GET`    | `/api/admin/sponsor-ads`                    | Admin | Obtener lista paginada de anuncios patrocinados |
| `GET`    | `/api/admin/sponsor-ads/{id}`               | Admin | Obtener anuncio patrocinado por ID             |
| `DELETE` | `/api/admin/sponsor-ads/{id}`               | Admin | Eliminar anuncio patrocinado permanentemente   |
| `POST`   | `/api/admin/sponsor-ads/{id}/approve`       | Admin | Aprobar y activar un anuncio patrocinado       |
| `POST`   | `/api/admin/sponsor-ads/{id}/reject`        | Admin | Rechazar un anuncio patrocinado                |
| `POST`   | `/api/admin/sponsor-ads/{id}/cancel`        | Admin | Cancelar un anuncio patrocinado                |

---

## Listar Anuncios Patrocinados

```
GET /api/admin/sponsor-ads
```

Devuelve una lista paginada de anuncios patrocinados con filtrado opcional por estado e intervalo de facturación. También devuelve estadísticas agregadas para el panel de administración. Los parámetros de consulta se validan con Zod.

**Parámetros de Consulta:**

| Parámetro   | Tipo    | Predeterminado | Descripción                                                              |
| ----------- | ------- | -------------- | ------------------------------------------------------------------------ |
| `page`      | entero  | `1`            | Número de página (mínimo: 1)                                              |
| `limit`     | entero  | `10`           | Resultados por página (1--100)                                            |
| `status`    | string  | --             | Filtrar: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval`  | string  | --             | Filtrar: `weekly` o `monthly`                                             |
| `search`    | string  | --             | Buscar anuncios patrocinados por texto                                    |
| `sortBy`    | string  | `createdAt`    | Campo de ordenación: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status` |
| `sortOrder` | string  | `desc`         | Dirección de ordenación: `asc` o `desc`                                   |

**Respuesta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Obtener Anuncio Patrocinado

```
GET /api/admin/sponsor-ads/{id}
```

Devuelve un anuncio patrocinado específico con todos los detalles, incluyendo la información del usuario asociado.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Eliminar Anuncio Patrocinado

```
DELETE /api/admin/sponsor-ads/{id}
```

Elimina permanentemente un anuncio patrocinado. Esta acción no se puede deshacer.

**Respuesta (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Aprobar Anuncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/approve
```

Aprueba y activa un anuncio patrocinado. Los anuncios en estado `pending` pueden aprobarse directamente. Para los anuncios en estado `pending_payment`, establece `forceApprove` en `true` para aprobar sin confirmación de pago.

**Cuerpo de la Solicitud (opcional):**

| Campo          | Tipo    | Requerido | Descripción                                                          |
| -------------- | ------- | --------- | -------------------------------------------------------------------- |
| `forceApprove` | boolean | No        | Establecer en `true` para aprobar sin pago (para estado `pending_payment`) |

**Ejemplo:**

```json
{
  "forceApprove": true
}
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Respuestas de Error:**

| Estado | Error                    | Descripción                                               |
| ------ | ------------------------ | --------------------------------------------------------- |
| `400`  | `PAYMENT_NOT_RECEIVED`   | El anuncio tiene estado `pending_payment`; use `forceApprove` |
| `400`  | `Cannot approve...`      | El estado del anuncio no permite aprobación               |
| `404`  | `Sponsor ad not found`   | No existe anuncio con el ID dado                          |

---

## Rechazar Anuncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rechaza un anuncio patrocinado pendiente con un motivo obligatorio. Solo los anuncios en estado `pending` o `pending_payment` pueden rechazarse. El motivo de rechazo se valida con Zod (`rejectSponsorAdSchema`).

**Cuerpo de la Solicitud:**

| Campo             | Tipo   | Requerido | Descripción                                   |
| ----------------- | ------ | --------- | --------------------------------------------- |
| `rejectionReason` | string | Sí        | Motivo del rechazo (10--500 caracteres)        |

**Ejemplo:**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Cancelar Anuncio Patrocinado

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Cancela un anuncio patrocinado que se encuentra en estado `pending`, `pending_payment` o `active`. Se puede proporcionar un motivo de cancelación opcional. Validado con Zod (`cancelSponsorAdSchema`).

**Cuerpo de la Solicitud (opcional):**

| Campo          | Tipo   | Requerido | Descripción                                  |
| -------------- | ------ | --------- | -------------------------------------------- |
| `cancelReason` | string | No        | Motivo de la cancelación (máx. 500 caracteres) |

**Ejemplo:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Ciclo de Vida del Estado

Los anuncios patrocinados siguen este ciclo de vida de estados:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Creado por el usuario, esperando confirmación de pago.
- **`pending`** -- Pago recibido, esperando revisión del administrador.
- **`active`** -- Aprobado y actualmente en ejecución.
- **`rejected`** -- Rechazado por el administrador con un motivo.
- **`expired`** -- Alcanzó la fecha de fin automáticamente.
- **`cancelled`** -- Cancelado por el administrador o el usuario.

---

## Reglas de Validación

| Campo             | Regla                                                          |
| ----------------- | -------------------------------------------------------------- |
| `status`          | Debe ser un estado de anuncio patrocinado válido               |
| `interval`        | Debe ser `weekly` o `monthly`                                  |
| `rejectionReason` | Requerido para rechazar; 10--500 caracteres                    |
| `cancelReason`    | Opcional para cancelar; máx. 500 caracteres                    |
| `forceApprove`    | Boolean; solo relevante para el estado `pending_payment`       |
| `sortBy`          | Debe ser `createdAt`, `updatedAt`, `startDate`, `endDate` o `status` |
| `sortOrder`       | Debe ser `asc` o `desc`                                        |

## Códigos de Error

| Estado | Significado                                                          |
| ------ | -------------------------------------------------------------------- |
| `400`  | Error de validación, transición de estado inválida, pago no recibido |
| `401`  | Autenticación requerida                                              |
| `403`  | Se requieren privilegios de administrador                            |
| `404`  | Anuncio patrocinado no encontrado                                    |
| `500`  | Error interno del servidor                                           |

## Documentación Relacionada

- [API de Usuarios Admin](./admin-users-endpoints.md) -- gestión de cuentas de usuario
- [API de Clientes Admin](./admin-clients-endpoints.md) -- gestión de perfiles de clientes
- [Autenticación](../architecture/nextauth-configuration.md) -- gestión de sesiones y guardas
