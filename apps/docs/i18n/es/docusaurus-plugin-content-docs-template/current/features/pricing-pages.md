---
id: pricing-pages
title: Páginas de precios y pago
sidebar_label: Páginas de precios
sidebar_position: 19
---

# Páginas de precios y pago

La plantilla Ever Works incluye un sistema de página de precios con todas las funciones con soporte de pago de múltiples proveedores (Stripe, LemonSqueezy, Polar), alternancia de intervalos de facturación, precios dinámicos de los productos Stripe, formato de moneda, tarjetas de comparación de planes, secciones de anuncios de patrocinadores y flujos de pago integrados o basados en redirecciones.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Configuraciones de planes, listas de funciones y captadores de texto de acción |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orquesta toda la lógica de estado de precios, pago y pago |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Interfaz de usuario completa de la página de precios con tarjetas de planes y flujo de pago |
| `PlanCard` | `components/pricing/plan-card.tsx` | Tarjeta gráfica de plan individual |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Formulario de pago integrado modal |
| `PaymentFlowSelectorModal` | `components/payment/` | Modalidad de selección de flujo (pagar ahora versus pagar al final) |

## Configuración del plan

El sistema admite tres niveles de planes configurados a través de `usePricingFeatures` :

| Plano | Texto de acción (iniciar sesión) | Texto de acción (sin iniciar sesión) |
|---|---|---|
| `free` | "Empiece gratis" | "Envíe gratis" |
| `standard` | "Actualizar al estándar" | "Suscríbete ahora" |
| `premium` | "Vuélvete Premium" | "Suscríbete ahora" |

### Interfaz de configuración del plan

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Listas de funciones

Cada plan tiene una lista de funciones escrita:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Plano | Recuento de funciones | Inclusiones notables |
|---|---|---|
| Gratis | 9 características | Enviar producto, descripción básica, una imagen, enlace al sitio web |
| Estándar | 9 características | Todas las funciones gratuitas, insignia verificada, revisión prioritaria, estadísticas mensuales |
| Prémium | 11 características | Todas las funciones estándar, posición patrocinada, página de inicio destacada, galería ilimitada |

## El gancho `usePricingSection` Este completo enlace organiza toda la lógica de la página de precios:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Estado

| Propiedad | Tipo | Descripción |
|---|---|---|
| `showSelector` | `boolean` | Si el selector de flujo de pago es visible |
| `billingInterval` | `PaymentInterval` | Intervalo de facturación actual (mensual/anual) |
| `processingPlan` | `string \| null` | ID del plan que se está procesando actualmente |
| `selectedPlan` | `PaymentPlan \| null` | Plan seleccionado actualmente |
| `selectedFlow` | `PaymentFlow` | Tipo de flujo de pago (pagar ahora versus pagar al final) |
| `isButton` | `boolean` | Si el flujo seleccionado utiliza el modo de botón |

### Acciones

| Método | Descripción |
|---|---|
| `setBillingInterval(interval)` | Cambiar entre facturación mensual y anual |
| `handleSelectPlan(plan)` | Seleccione un plan y notifique a los padres mediante devolución de llamada |
| `handleCheckout(plan)` | Iniciar el pago de una configuración de plan determinada |
| `calculatePrice(plan)` | Calcular el precio según el intervalo de facturación y el descuento anual |
| `getSavingsText(plan)` | Obtener texto de ahorro anual (por ejemplo, "Ahorre $24/año") |
| `cancelCurrentProcess()` | Cancelar pago en curso y restablecer estado |
| `formatPrice(amount)` | Formatear importe con símbolo de moneda |

### Cálculo de precio

El gancho calcula los precios en función del intervalo de facturación:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Proveedores de pago

El sistema admite tres proveedores de pago, seleccionados por configuración o preferencia de usuario:

| Proveedor | Gancho de pago | Soporte integrado |
|---|---|---|
| Raya | `useCreateCheckoutSession` | Sí (ConfiguraciónIntent) |
| Limón exprimidor | `useCheckoutButton` | Sí (superposición) |
| polares | `usePolarCheckout` | Sí (URL incrustada) |

### Selección de proveedor

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Flujo de pago

Cuando un usuario hace clic en el botón de acción de un plan:

1. Verifique que el usuario haya iniciado sesión (abra el modo de inicio de sesión si no)
2. Cancele cualquier proceso de pago existente
3. Determinar el proveedor de pagos
4. Obtenga el ID de precio o el ID de variante que tenga en cuenta la moneda
5. Abra el formulario de pago integrado o redirija al proceso de pago del proveedor

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Precios dinámicos (Stripe)

Cuando Stripe es el proveedor activo y los precios dinámicos están habilitados, el enlace obtiene datos del producto en vivo:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Soporte de divisas

El sistema de precios admite la visualización en varias monedas:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Los ID de variantes que tienen en cuenta la moneda se resuelven mediante funciones de configuración específicas del proveedor:

| Proveedor | Función de configuración |
|---|---|
| Limón exprimidor | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| polares | `getPolarPriceConfig(planName, currency, interval)` |

## Modalidad de formulario de pago

El formulario de pago integrado es compatible con los tres proveedores:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Componente de la sección de precios

El componente `PricingSection` muestra la página de precios completa:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Funciones visuales

| Característica | Descripción |
|---|---|
| Alternar intervalo de facturación | Control deslizante animado entre Mensual y Anual |
| Plan de cuadrícula de tarjetas | Diseño responsivo de 1 columna (móvil) a 3 columnas (escritorio) |
| Insignia popular | El plan estándar está marcado como "popular" con efectos de brillo |
| Insignias de ahorro | Pastillas verdes que muestran ahorros anuales cuando corresponda |
| Indicadores de confianza | Iconos para "Sin tarifas ocultas", "Activación instantánea", "Soporte premium" |
| Sección de anuncios de patrocinadores | Círculos de radar animados con precios para ubicaciones patrocinadas |
| Continuar sección | Se muestra después de la selección del plan con llamado a la acción |

### Representación condicional

El componente muestra condicionalmente planes pagos según la disponibilidad de pago:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internacionalización

Todas las cadenas orientadas al usuario utilizan `next-intl` con dos espacios de nombres de traducción:

| Espacio de nombres | Uso |
|---|---|
| `pricing` | Nombres de los planes, características, contenido de la página, sección de patrocinadores |
| `billing` | Etiquetas mensuales/anuales, estados de procesamiento, mensajes de error |

## Archivos clave

| Archivo | Camino |
|---|---|
| Precios Características Gancho | `hooks/use-pricing-features.ts` |
| Gancho de la sección de precios | `hooks/use-pricing-section.ts` |
| Componente de la sección de precios | `components/pricing/pricing-section.tsx` |
| Componente de tarjeta de plan | `components/pricing/plan-card.tsx` |
| Modalidad de formulario de pago | `components/payment/stripe-payment-modal.tsx` |
| Constantes de pago | `lib/constants.ts` |
| Tipo de configuración de precios | `lib/content.ts` |
