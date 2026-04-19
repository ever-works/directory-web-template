---
id: error-boundaries
title: "Límites de error y manejo de errores"
sidebar_label: "Límites de error"
sidebar_position: 25
---

# Límites de error y manejo de errores

La plantilla implementa una estrategia de manejo de errores de múltiples capas utilizando límites de error de React, proveedores de errores globales y convenciones de error de Next.js. Esta arquitectura garantiza que los errores en tiempo de ejecución se detecten correctamente, se informen a los análisis y se presenten a los usuarios con opciones de recuperación.

## Descripción general de la arquitectura

El sistema de manejo de errores está organizado en cuatro capas:

|capa|Archivo|Alcance|
|-------|------|-------|
|Página de error global|`app/global-error.tsx`|Detecta errores en el diseño raíz.|
|Proveedor de errores|`components/error-provider.tsx`|Envuelve el árbol de aplicaciones con detectores de errores JS globales|
|Límite de error|`components/error-boundary.tsx`|Límite de componente de clase React reutilizable|
|Límite de error de administrador|`components/admin/admin-error-boundary.tsx`|Límite de alcance para las secciones del panel de administración|

## Página de error global

El archivo `app/global-error.tsx` es una convención especial de Next.js que detecta errores que ocurren en el diseño raíz. Debido a que el diseño raíz en sí puede haber fallado, este componente genera sus propias etiquetas `<html>` y `<body>`.

```tsx
// app/global-error.tsx
'use client';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="text-3xl font-bold mb-4">Something went wrong!</h1>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left">
              <p className="font-semibold text-red-600">{error.message}</p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <Button onPress={() => reset()} variant="solid">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link href="/" passHref>
              <Button variant="solid">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
```

Comportamientos clave:
- Registra el error en la consola en el montaje a través de `useEffect`
- Muestra un seguimiento de la pila y un resumen de errores solo en modo de desarrollo
- Proporciona un botón **Actualizar** (llama a `reset()` para volver a renderizar el segmento) y un enlace **Ir a inicio**
- `error.digest` es un hash generado por el servidor útil para correlacionar con registros del lado del servidor.

## Página no encontrada

El archivo `app/not-found.tsx` maneja 404 respuestas. Es un componente del cliente que utiliza el enrutador Next.js para la navegación.

```tsx
// app/not-found.tsx
'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center ...">
      <h1 className="text-8xl font-bold ...">404</h1>
      <h2 className="text-2xl font-semibold ...">Page Not Found</h2>
      <div className="flex gap-4 justify-center">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Button>
        <Button onClick={() => router.push('/')}>
          <Home className="w-4 h-4" /> Back to Home
        </Button>
      </div>
    </div>
  );
}
```

La página incluye una sección de sugerencias de búsqueda y un enlace a la página de ayuda/soporte.

## Componente de límite de error de reacción

El límite central reutilizable se encuentra en `components/error-boundary.tsx`. Es un componente de clase React (requerido para `componentDidCatch`) que se integra con el sistema de análisis.

```tsx
// components/error-boundary.tsx
import { analytics } from '@/lib/analytics';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  isRetrying: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      analytics.captureException(error, {
        ...errorInfo,
        componentStack: errorInfo.componentStack,
        type: 'react-error-boundary',
      });
    }
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        isRetrying: false,
      });
    }, 500);
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (/* default error UI */);
    }
    return this.props.children;
  }
}
```

Decisiones de diseño notables:
- **Integración de análisis**: los errores se informan automáticamente a través de `analytics.captureException`
- **Reserva personalizada**: pase un accesorio `fallback` para representar una interfaz de usuario personalizada o deje que aparezca la pantalla de error de página completa predeterminada
- **Reintentar con retraso**: el retraso de 500 ms en el reintento proporciona información visual y evita bucles instantáneos de repetición de fallos.
- **Detalles plegables**: en la interfaz de usuario predeterminada, los detalles del error están dentro de un elemento `<details>` para que los usuarios puedan inspeccionar la pila.
- **Pie de página técnico**: muestra el nombre del error, la marca de tiempo y la URL actual para la depuración.

## Proveedor de errores

El `ErrorProvider` en `components/error-provider.tsx` envuelve todo el árbol de la aplicación. Agrega detectores de errores globales de JavaScript que detectan errores fuera del ciclo de renderizado de React.

```tsx
// components/error-provider.tsx
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

Este componente maneja dos categorías de errores que los límites de error de React no pueden detectar:
- **Errores globales** (`window.error`): errores de script, excepciones de tiempo de ejecución fuera de React
- **Rechazos de promesas no controladas** (`unhandledrejection`): controladores `.catch()` olvidados o fallas `await` no detectadas

## Límite de error de administrador

El panel de administración envuelve cada sección en su propio `AdminErrorBoundary` para que una falla en un widget (por ejemplo, un gráfico) no destruya todo el panel.

```tsx
// components/admin/admin-dashboard.tsx (usage pattern)
<AdminLandmark as="section" label="Dashboard Statistics">
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} isLoading={false} />
  </AdminErrorBoundary>
</AdminLandmark>

<AdminLandmark as="section" label="Analytics Overview">
  <AdminResponsiveGrid cols={2} gap="lg">
    <AdminErrorBoundary>
      <AdminActivityChart data={stats?.activityTrendData || []} />
    </AdminErrorBoundary>
    <AdminErrorBoundary>
      <AdminTopItems data={stats?.topItemsData || []} />
    </AdminErrorBoundary>
  </AdminResponsiveGrid>
</AdminLandmark>
```

Cada `AdminErrorBoundary` aísla las fallas en su propia sección, lo que permite que el resto del tablero continúe funcionando.

## Manejo de errores de API

Las rutas API del lado del servidor utilizan un controlador de errores estandarizado definido en `lib/api/error-handler.ts`:

```tsx
// lib/api/error-handler.ts
export function handleApiError(
  error: unknown,
  context = 'API'
): NextResponse<ApiErrorResponse> {
  // Log with context
  if (error instanceof Error) {
    logError(error, context);
  }

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    message = error.message;
    // Auto-detect error type from message content
    if (message.includes('unauthorized')) status = HttpStatus.UNAUTHORIZED;
    if (message.includes('validation'))   status = HttpStatus.UNPROCESSABLE_ENTITY;
    if (message.includes('not found'))    status = HttpStatus.NOT_FOUND;
  }

  // Sanitize in production
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An unexpected error occurred';
  }

  return createApiErrorResponse(message, status, code);
}
```

También está disponible un envoltorio práctico:

```tsx
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
): Promise<T | NextResponse<ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error, context));
}
```

## Mejores prácticas de manejo de errores

1. **Ajuste las secciones de funciones** en componentes `ErrorBoundary` para que un solo fallo no destruya toda la página
2. **Utilice opciones personalizadas** para secciones críticas en las que desee una interfaz de usuario de recuperación más contextual
3. **Aproveche `withErrorHandling`** en rutas API para garantizar formas de respuesta de error consistentes
4. **Nunca exponga los rastros de la pila** en producción: `global-error.tsx` y `error-handler.ts` ambos puerta de salida de depuración detrás de `NODE_ENV`
5. **Informe a análisis**: `ErrorBoundary` informa automáticamente al servicio de análisis a través de `analytics.captureException`

## Referencia de archivo

|Archivo|Propósito|
|------|---------|
|`app/global-error.tsx`|Página de error de nivel raíz con shell HTML completo|
|`app/not-found.tsx`|Página 404 no encontrada con opciones de navegación|
|`components/error-boundary.tsx`|Límite de error de React reutilizable con análisis|
|`components/error-provider.tsx`|Oyente de error global de JS al envolver la aplicación|
|`components/admin/admin-error-boundary.tsx`|Límite de alcance para los widgets del panel de administración|
|`lib/api/error-handler.ts`|Manejo de errores de ruta API estandarizado|
