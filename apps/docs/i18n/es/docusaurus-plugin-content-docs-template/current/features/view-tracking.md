---
id: view-tracking
title: Ver seguimiento y participación
sidebar_label: Ver seguimiento
sidebar_position: 35
---

# Ver seguimiento y participación

La plantilla incluye un sistema de seguimiento de vistas consciente de la privacidad que registra vistas diarias únicas por elemento. Impulsa el recuento de visualizaciones en páginas de artículos, análisis de paneles, clasificaciones de artículos de tendencia y puntuación de popularidad.

## Descripción general de la arquitectura

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Canal de procesamiento

Cuando un usuario visita la página de detalles de un artículo, el componente `ItemViewTracker` activa una solicitud POST. El servidor lo procesa a través de una canalización de varias etapas:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Formato de respuesta

```json
{ "success": true, "counted": true }
```

| Respuesta | Significado |
|----------|---------|
| `counted: true` | Se registró una nueva vista |
| `counted: false` | Duplicado de hoy (mismo espectador + elemento + fecha) |
| `counted: false, reason: "bot"` | Bot usuario-agente detectado |
| `counted: false, reason: "owner"` | Usuario autenticado viendo su propio artículo |

## Rastreador del lado del cliente

El `ItemViewTracker` es un componente del cliente que activa una única solicitud POST en el montaje:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

El rastreador utiliza un enfoque de mejor esfuerzo: las fallas se ignoran silenciosamente para que el seguimiento de vistas nunca interrumpa la experiencia del usuario.

## Detección de robots

El módulo `lib/utils/bot-detection.ts` mantiene una lista de patrones conocidos de bot-usuario-agente, incluidos rastreadores de motores de búsqueda, herramientas de monitoreo y clientes automatizados. Cuando se detecta un bot, el punto final devuelve una respuesta exitosa con `counted: false` sin tocar la base de datos.

## Identificación del espectador

Las vistas se atribuyen a un ID de espectador almacenado en una cookie exclusiva de HTTP propia:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Propiedades de privacidad

- **Sin datos personales**: la cookie contiene solo un UUID aleatorio, no la identidad del usuario.
- **Solo HTTP**: JavaScript no puede leer la cookie, lo que evita la filtración de seguimiento basada en XSS.
- **Lax en el mismo sitio**: la cookie no se envía en solicitudes de origen cruzado.
- **Indicador seguro**: aplicado en producción para requerir HTTPS.
- **Sin servicios de terceros**: todos los datos de seguimiento permanecen en su base de datos.

## Deduplicación diaria

La lógica de grabación principal utiliza `ON CONFLICT DO NOTHING` de PostgreSQL:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

La tabla `itemViews` tiene una restricción única en `(itemId, viewerId, viewedDateUtc)` . La primera vista del día para un par espectador-elemento inserta una fila y devuelve `true` . Las vistas posteriores del mismo día se omiten silenciosamente. La fecha se calcula como UTC `YYYY-MM-DD` para una deduplicación consistente independientemente de la zona horaria.

## Exclusión del propietario

Cuando un usuario autenticado ve su propio elemento, la vista no se cuenta:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Esto evita que los propietarios de elementos aumenten artificialmente su recuento de vistas.

## Consultas de agregación

El archivo `item-view.queries.ts` exporta varias funciones para análisis:

| Función | Tipo de devolución | Descripción |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Vistas totales de todos los tiempos de las babosas de artículos |
| `getRecentViewsCount(slugs, days)` | `number` | Vistas dentro de una ventana deslizante (predeterminado 7 días) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Mapa con fecha clave para minigráficos |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Vistas totales por artículo para clasificaciones |

## Integración de análisis

### Puntuación de popularidad

Los recuentos de vistas se incorporan al algoritmo de puntuación de popularidad logarítmica utilizado por el sistema de tarjeta compartida:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Esto garantiza que los elementos con muchas vistas tengan una clasificación más alta en el modo de clasificación "Popular", al tiempo que evita puntuaciones descontroladas de los elementos virales.

### Panel de cliente

El panel del cliente en `/client/dashboard` muestra:
- Vistas totales de todos los artículos enviados
- Vistas en los últimos 7 días con indicadores de tendencia.
- Un gráfico de vistas diarias a través de `getDailyViewsData` ### Panel de administración

El panel de administración utiliza `GET /api/admin/dashboard/stats` para las métricas de visualización de todo el sitio. El punto final de geoanálisis proporciona una distribución geográfica de las vistas.

## Manejo de errores

Los errores de seguimiento de vistas se manejan de forma silenciosa en producción:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

El modo de desarrollo registra errores para la depuración. La producción suprime la salida de la consola para evitar el ruido.

## Configuración

El seguimiento de vistas funciona automáticamente sin necesidad de variables de entorno. El sistema se degrada con gracia:

- **Sin base de datos**: el punto final devuelve 503 y el cliente ignora el error.
- **Modo de simulación de base de datos**: cuando está habilitado, las vistas se rastrean con datos simulados.
- **Marcas de funciones**: los recuentos de vistas se muestran de forma condicional según la configuración de la plantilla.

## Accesibilidad

- El `ItemViewTracker` no representa elementos DOM, lo que garantiza un impacto cero en el diseño de la página y los lectores de pantalla.
- Los recuentos de visualización que se muestran en las tarjetas utilizan atributos `aria-label` para el contexto del lector de pantalla.
- Los gráficos de vista del panel incluyen títulos descriptivos y texto resumido.

## Documentación relacionada

- [Componentes del panel](/docs/template/components/dashboard-components) -- Ver visualización de estadísticas
- [Componentes de tarjeta compartida](/docs/template/components/shared-card-components) -- Puntuación de popularidad
- [Admin Analytics](/docs/template/features/admin-analytics) -- Métricas de visualización de todo el sitio
- [Votación y comentarios](/docs/template/features/voting-comments) -- Otras funciones de participación
