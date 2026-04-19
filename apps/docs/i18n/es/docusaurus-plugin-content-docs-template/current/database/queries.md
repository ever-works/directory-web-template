---
id: queries
title: Referencia de consultas de bases de datos
sidebar_label: Consultas
sidebar_position: 2
---

# Referencia de consultas de bases de datos

El directorio `lib/db/queries/` contiene más de 23 módulos de consulta organizados por dominio. Cada módulo encapsula consultas ORM de Drizzle para un área de características específica, siguiendo el principio de responsabilidad única.

## Descripción general del módulo

Todos los módulos de consulta se exportan mediante barriles desde `lib/db/queries/index.ts` para una importación conveniente:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Módulos de consulta

### actividad.consultas.ts

Registro y recuperación de actividades para el sistema de seguimiento de auditoría.

**Funciones clave:**
- Registrar las actividades del usuario (iniciar sesión, registrarse, cambios de cuenta)
- Consultar historial de actividad por usuario o rango de fechas

### consultas.de.autenticación.ts

Operaciones de bases de datos relacionadas con la autenticación.

**Funciones clave:**
- Buscar usuario por correo electrónico para autenticación de credenciales
- Crear y verificar tokens de restablecimiento de contraseña
- Administrar tokens de verificación

### consultas.cliente.ts

El módulo de consulta más grande (37 KB), que maneja todas las operaciones orientadas al cliente.

**Funciones clave:**
- Perfil del cliente operaciones CRUD
- Envíos y gestión de artículos de clientes.
- Agregación de datos del panel del cliente
- Buscar y filtrar datos de clientes
- Consultas de listados paginados

### comentario.consultas.ts

Operaciones del sistema de comentarios.

**Funciones clave:**
- Crear, actualizar y eliminar temporalmente comentarios
- Obtener comentarios por elemento con paginación
- Consultas de moderación de comentarios (admin)
- Agregación de calificaciones

### empresa.consultas.ts

Consultas de gestión de la empresa.

**Funciones clave:**
- Operaciones CRUD de la empresa
- Búsqueda y filtrado de empresas
- Gestión de asociaciones artículo-empresa.
- Estadísticas y análisis de la empresa.

### panel.consultas.ts

Agregación de datos de paneles para paneles de administración y de cliente.

**Funciones clave:**
- Estadísticas del panel de administración (usuarios totales, artículos, ingresos)
- Estadísticas del panel del cliente (envíos, vistas, participación)
- Datos de series temporales para gráficos
- Resúmenes de actividades

### compromiso.consultas.ts

Métricas de participación agregadas en vistas, votos, favoritos y comentarios.

**Funciones clave:**
- Obtenga puntuaciones de participación para artículos
- Recuentos de vistas agregadas
- Calcular métricas de popularidad
- Clasificaciones de participación

### integración-mapping.queries.ts

Operaciones de mapeo de integración CRM.

**Funciones clave:**
- Crear y actualizar asignaciones de integración
- Busque ID de CRM desde Ever ID y viceversa
- Seguimiento de marcas de tiempo de sincronización y hashes de versión
- Operaciones de mapeo masivo

### item.consultas.ts

Consultas de elementos principales (los elementos se almacenan en Git, pero los metadatos se rastrean en la base de datos).

**Funciones clave:**
- Operaciones de metadatos de elementos
- Seguimiento de vista de artículo
- Datos de participación del artículo

### item-audit.queries.ts

Operaciones de registro de auditoría de artículos.

**Funciones clave:**
- Registrar acciones de creación, actualización, eliminación y revisión de elementos.
- Consultar el historial de auditoría para elementos específicos
- Filtrar registros de auditoría por tipo de acción, ejecutante o rango de fechas

### item-view.queries.ts

Seguimiento y análisis de vistas de artículos.

**Funciones clave:**
- Registre visualizaciones diarias únicas (desduplicadas por ID de espectador y fecha)
- Consulta de recuentos de vistas por artículo y rango de fechas
- Ver agregación de análisis

### ubicación-index.queries.ts

Búsqueda e indexación basada en la ubicación.

**Funciones clave:**
- Consultas geoespaciales de elementos cercanos.
- Gestión del índice de ubicación
- Cálculos de distancia
- Búsqueda basada en ubicación con filtros

### moderación.consultas.ts

Sistema de moderación de contenidos.

**Funciones clave:**
- Crear y administrar informes de contenido
- Actualizar el estado y la resolución del informe
- Registrar acciones de moderación
- Estadísticas de moderación y gestión de colas.

### newsletter.consultas.ts

Gestión de suscripciones a newsletters.

**Funciones clave:**
- Operaciones de suscripción y baja de suscripción.
- Verificar estado de suscripción
- Listar suscriptores activos
- Seguimiento del historial de envío de correo electrónico

### consultas.de.pago.ts

Operaciones de bases de datos relacionadas con pagos.

**Funciones clave:**
- Gestión de proveedores de pagos
- Vinculación de cuenta de pago
- Grabación de transacciones
- Consultas del historial de pagos

### informe.consultas.ts

Consultas del sistema de informes de contenidos.

**Funciones clave:**
- Crear informes (elemento o comentario)
- Listar informes con filtros y paginación.
- Actualizar estado del informe
- Análisis de informes

### suscripción.consultas.ts

Gestión del ciclo de vida de la suscripción (17KB).

**Funciones clave:**
- Crear y actualizar suscripciones
- Transiciones de estado de suscripción
- Grabación del historial de suscripciones
- Buscar suscripciones por ID de usuario o proveedor
- Operaciones de renovación y cancelación
- Análisis de suscripciones

### encuesta.consultas.ts

Operaciones del sistema de encuestas.

**Funciones clave:**
- Encuesta operaciones CRUD
- Grabación de respuestas a la encuesta
- Agregación de respuestas y análisis
- Gestión del estado de la encuesta (borrador, publicada, cerrada)

### consultas.usuario.ts

Consultas de gestión de usuarios.

**Funciones clave:**
- Operaciones CRUD de usuario
- Búsqueda y filtrado de usuarios.
- Gestión de roles de usuario
- Eliminación de cuenta (eliminación temporal)

### votar.consultas.ts

Funcionamiento del sistema de votación.

**Funciones clave:**
- Crear, actualizar y eliminar votos
- Verifique los votos existentes para un par de usuario-elemento
- Recuento total de votos por artículo
- Alternancia del tipo de voto (voto a favor/voto en contra)

## Utilidades compartidas

### tipos.ts

Tipos de TypeScript compartidos utilizados en todos los módulos de consulta:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Funciones de utilidad compartidas para la creación de consultas:

- Ayudantes de paginación (cálculo de compensación, formato de resultados)
- Constructores de filtros comunes
- Ayudantes de fragmentos de SQL

## Patrones de consulta

### Patrón de consulta estándar

Todos los módulos de consulta siguen un patrón consistente:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Consultas paginadas

Muchos módulos implementan consultas paginadas:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Consultas de agregación

Los módulos de participación y panel utilizan agregación SQL:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Convenio de importación

Funciones de consulta de importación a través de la exportación de barril:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
