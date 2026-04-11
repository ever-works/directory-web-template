---
id: checkout-utilities
title: "Utilidades de Checkout"
sidebar_label: "Utilidades de Checkout"
sidebar_position: 7
---

# Utilidades de Checkout

El módulo `checkout-utils` (`lib/utils/checkout-utils.ts`) proporciona funciones auxiliares para abrir flujos de pago en el navegador. Maneja el bloqueo de ventanas emergentes, redirecciones de reserva, manejo de errores y crea manejadores de clic reutilizables para los botones de checkout.

## Conceptos Fundamentales

Las utilidades de checkout resuelven los desafíos comunes del navegador al abrir páginas de checkout de proveedores de pago:

- **Bloqueo de ventanas emergentes** -- Los navegadores pueden bloquear las llamadas a `window.open()`. Las utilidades detectan esto y recurren a la navegación directa.
- **Manejo de errores** -- Los fallos de red y los errores inesperados se capturan y se reportan a través de callbacks.
- **Manejadores reutilizables** -- Una función de fábrica crea manejadores de clic que pueden adjuntarse a cualquier componente de botón.

## Tipos

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Por defecto: '_blank'
  windowFeatures?: string;   // Por defecto: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Por defecto: true
}
```

## Funciones

### openCheckoutInNewTab

Abre una URL de checkout en una nueva pestaña del navegador con detección de ventanas emergentes y reserva:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Tanto la ventana emergente como la redirección fallaron
  console.error('No se pudo abrir el checkout');
}
```

#### Implementación

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### Flujo de Comportamiento

1. **Guardia SSR** -- Retorna `false` inmediatamente si se ejecuta en el servidor
2. **Abrir ventana emergente** -- Intenta `window.open()` con las características especificadas
3. **Ventana emergente bloqueada** -- Si `window.open()` devuelve `null`, la ventana emergente fue bloqueada
4. **Redirección de reserva** -- Si `fallbackToRedirect` es `true` (por defecto), navega la página actual a la URL de checkout
5. **Intento de foco** -- Intenta enfocar la nueva ventana (puede fallar en algunos navegadores sin causar un error)
6. **Captura de errores** -- Cualquier excepción recurre a la redirección si está habilitada

#### Opciones

| Opción | Por defecto | Descripción |
|--------|---------|-------------|
| `url` | Obligatorio | La URL de checkout a abrir |
| `windowName` | `'_blank'` | Nombre de la ventana de destino |
| `windowFeatures` | `'noopener,noreferrer'` | Características de seguridad para la nueva ventana |
| `fallbackToRedirect` | `true` | Navegar la página actual si la ventana emergente está bloqueada |

### openCheckoutWithErrorHandling

Un envoltorio alrededor de `openCheckoutInNewTab` que agrega un callback de error:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Mostrar error al usuario
  }
);
```

#### Implementación

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

Una función de fábrica que crea un manejador de clic de checkout con callbacks de éxito, error y toast. Está diseñada para pasarse directamente a las propiedades `onClick` de los botones:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // Mostrar notificación toast en caso de fallo
  });

  return (
    <button onClick={handleCheckout}>
      Suscribirse ahora
    </button>
  );
}
```

#### Implementación

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### Opciones

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `onSuccess` | `() => void` | Se llama cuando el checkout se abre con éxito |
| `onError` | `(error: string) => void` | Se llama con mensaje de error en caso de fallo |
| `showAlert` | `boolean` | Mostrar una notificación toast usando `sonner` en caso de fallo |

## Patrones de Uso

### Botón de Checkout Básico

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Ir al Checkout
    </button>
  );
}
```

### Checkout con Analytics

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      Elegir {plan.name}
    </button>
  );
}
```

### Deshabilitar el Fallback de Ventana Emergente

Si desea evitar que la página actual navegue (por ejemplo, en un modal), deshabilite el fallback de redirección:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Mostrar mensaje en línea en lugar de navegar
  setShowPopupBlockedMessage(true);
}
```

## Consideraciones de Seguridad

- Las características de ventana `noopener,noreferrer` evitan que la página abierta acceda a `window.opener`, protegiéndose contra ataques de tabnapping
- El `fallbackToRedirect` usa la asignación `window.location.href` (no `window.open`) que no está sujeta a bloqueadores de ventanas emergentes
- La guardia SSR previene el acceso a `window` durante el renderizado del lado del servidor

## Archivos Fuente

| Archivo | Propósito |
|------|---------|
| `lib/utils/checkout-utils.ts` | Gestión de ventanas de checkout y manejadores de clic |
