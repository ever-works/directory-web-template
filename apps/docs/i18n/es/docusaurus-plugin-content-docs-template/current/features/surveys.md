---
id: surveys
title: Sistema de Encuestas
sidebar_label: Encuestas
sidebar_position: 11
---

# Sistema de Encuestas

La plantilla Ever Works incluye un sistema de encuestas integrado que admite tanto encuestas globales (comentarios de todo el sitio) como encuestas específicas de elementos (adjuntas a elementos individuales del directorio). Las encuestas se gestionan a través del panel de administración y las respuestas se recopilan de usuarios autenticados.

## Arquitectura

```
Surveys System
  |
  +-- SurveyService (lib/services/survey.service.ts)
  |     Server-side business logic singleton
  |
  +-- Database Queries (lib/db/queries/)
  |     Survey and response CRUD operations
  |
  +-- Admin Pages (app/[locale]/admin/surveys/)
  |     Create, edit, preview, publish, view responses
  |
  +-- API Client (lib/api/survey-api.client.ts)
  |     Client-side API wrapper
  |
  +-- Database Schema (lib/db/schema.ts)
        surveys + survey_responses tables
```

## Tipos de encuestas

| Tipo | Descripción | Caso de uso |
|------|-------------|----------|
| **Global** | Encuesta en todo el sitio, no vinculada a ningún artículo | Comentarios generales, encuestas NPS, satisfacción del usuario |
| **Específico del artículo** | Vinculado a un elemento específico a través de `itemId` | Comentarios sobre productos, revisiones de servicios, solicitudes de funciones |

## Servicio de encuestas

La clase `SurveyService` ( `lib/services/survey.service.ts` ) maneja toda la lógica empresarial. Es un servicio únicamente del lado del servidor (no se importa en componentes del cliente).

### Operaciones CRUD

| Método | Descripción |
|--------|-------------|
| `create(data)` | Crea una nueva encuesta con slug generado automáticamente |
| `getOne(id)` | Obtener encuesta por ID |
| `getBySlug(slug)` | Obtenga una encuesta mediante un slug compatible con URL |
| `getMany(filters?, userId?)` | Listar encuestas con paginación, filtrado y estado de finalización |
| `update(id, data)` | Actualizar campos de encuesta y gestionar transiciones de estado |
| `delete(id)` | Eliminar encuesta (bloqueada si existen respuestas) |

### Operaciones de respuesta

| Método | Descripción |
|--------|-------------|
| `submitResponse(data)` | Enviar una respuesta a la encuesta (valida la publicación de la encuesta) |
| `getResponses(surveyId, filters?)` | Obtenga respuestas paginadas para una encuesta |
| `getResponseById(id)` | Obtenga una única respuesta |

### Generación de babosas

Los slugs de encuesta se generan automáticamente a partir del título con soporte Unicode:

```typescript
// Examples:
"Customer Satisfaction"  -> "customer-satisfaction"
"Cafe Survey"            -> "cafe-survey"
"Nino's Test"            -> "ninos-test"
```

El servicio garantiza la unicidad del slug añadiendo un contador si se detecta una colisión.

## Ciclo de vida de la encuesta

```
DRAFT  -->  PUBLISHED  -->  CLOSED
```

| Estado | Descripción |
|--------|-------------|
| `draft` | La encuesta se está editando, no es visible para los usuarios |
| `published` | La encuesta está activa y acepta respuestas |
| `closed` | La encuesta ya no acepta respuestas |

Las transiciones de estado actualizan las marcas de tiempo de los metadatos:

- Establecer el estado en `published` establece `publishedAt` - Establecer el estado en `closed` establece `closedAt` ## Estructura de datos de la encuesta

Las encuestas utilizan una definición de pregunta basada en JSON almacenada en la columna `surveyJson` . Esto permite estructuras de encuestas flexibles sin cambios de esquema.

```typescript
interface CreateSurveyData {
  title: string;
  description?: string;
  type: 'global' | 'item';
  itemId?: string;          // Required when type is 'item'
  status?: 'draft' | 'published' | 'closed';
  surveyJson: object;       // Question definitions
}
```

### Estructura de respuesta de la encuesta

```typescript
interface SubmitResponseData {
  surveyId: string;
  userId?: string;          // Authenticated user ID
  itemId?: string;          // Item ID for item-specific surveys
  data: object;             // Response data matching surveyJson
  ipAddress?: string;       // For rate limiting
  userAgent?: string;       // For analytics
}
```

## Gestión administrativa

Las páginas de encuestas para administradores proporcionan una interfaz de gestión del ciclo de vida completo:

### Rutas de administración

| Ruta | Descripción |
|-------|-------------|
| `/admin/surveys` | Listado de encuestas con pestañas de estado |
| `/admin/surveys/create` | Nuevo formulario de creación de encuestas |
| `/admin/surveys/[slug]/edit` | Editar encuesta existente |
| `/admin/surveys/[slug]/preview` | Vista previa de la encuesta antes de publicar |
| `/admin/surveys/[slug]/responses` | Ver y analizar respuestas |

### Capacidades de administración

- **Crear encuestas** con título, descripción, tipo y pregunta JSON
- **Editar encuestas** en estado borrador o publicado
- **Vista previa** antes de publicar para verificar la apariencia
- **Publicar/cerrar** encuestas para controlar la recopilación de respuestas.
- **Ver respuestas** con filtrado y paginación
- **Eliminar encuestas** (solo si no se han recopilado respuestas)

El método `getMany` admite consultas eficientes con:

- **Recuento de respuestas** mediante SQL JOIN (consulta única, sin N+1)
- **Estado de finalización** por usuario (muestra si el usuario actual ya respondió)
- **Paginación** con parámetros de página/límite
- **Filtrado** por estado y tipo

## Manejo de errores

El servicio incluye un sólido manejo de errores para problemas comunes de bases de datos:

| Condición de error | Comportamiento |
|----------------|----------|
| Tabla no encontrada | Mensaje claro: "Ejecutar migraciones de bases de datos" |
| Conexión rechazada | "Error en la conexión a la base de datos" |
| Falta DATABASE_URL | "Base de datos no configurada" |
| Encuesta no encontrada | Error estilo 404 |
| Encuesta no publicada | "La encuesta es [estado] y no acepta respuestas" |
| Eliminar con respuestas | "No se puede eliminar la encuesta con N respuestas" |

## Banderas de funciones

Las encuestas están controladas por el sistema de indicadores de funciones. El indicador `surveys` se habilita automáticamente cuando se configura `DATABASE_URL` :

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('surveys')) {
  // Render survey components
}
```

## Uso del lado del cliente

Los componentes del cliente utilizan el contenedor del cliente API en lugar del servicio directamente:

```typescript
// Use in client components
import { surveyApiClient } from '@/lib/api/survey-api.client';

// Fetch surveys
const surveys = await surveyApiClient.getMany({ status: 'published' });

// Submit response
await surveyApiClient.submitResponse({
  surveyId: 'survey-uuid',
  data: { rating: 5, feedback: 'Great!' },
});
```

## Pruebas E2E

Las encuestas están cubiertas por múltiples archivos de prueba E2E:

- `e2e/tests/admin/surveys.spec.ts` -- Flujos de trabajo de gestión de administración
- `e2e/tests/public/surveys.spec.ts` -- Visualización y envío de encuestas públicas
- `e2e/page-objects/admin/surveys.page.ts` -- Objeto de página de encuesta de administrador

## Archivos relacionados

- `lib/services/survey.service.ts` -- Servicio de lógica de negocios
- Definiciones de tablas `lib/db/schema.ts` -- `surveys` y `survey_responses` - `lib/db/queries/` -- Consultas a la base de datos de encuestas
- `lib/types/survey.ts` -- Definiciones de tipos de TypeScript
- `lib/api/survey-api.client.ts` -- Contenedor de API del lado del cliente
- `app/[locale]/admin/surveys/` -- Páginas de administración
- `components/admin/` -- Componentes de la interfaz de usuario de administración
- `e2e/tests/admin/surveys.spec.ts` -- Pruebas de administrador E2E
- `e2e/tests/public/surveys.spec.ts` -- Pruebas públicas E2E
