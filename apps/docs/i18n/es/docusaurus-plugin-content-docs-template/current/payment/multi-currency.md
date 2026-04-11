---
id: multi-currency
title: Integración multidivisa
sidebar_label: Multidivisa
sidebar_position: 5
---

# Guía de integración multidivisa

Este documento explica cómo se integra el sistema multidivisa en la aplicación y cómo funciona con los proveedores de pago (Stripe, LemonSqueezy y Polar).

## Arquitectura

El sistema multidivisa funciona en múltiples niveles:

1. **Configuración base** ( `lib/types.ts` ): Configuración predeterminada con soporte para múltiples monedas
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): Enriquece la configuración con la moneda del usuario
3. **Ganchos de pago**: utilice configuraciones multidivisa para obtener los ID de precio correctos

## Flujo de datos

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## Archivos modificados

### 1. `app/[locale]/config.tsx` - Utiliza `useCurrencyContext()` para obtener la moneda del usuario.
- Genera automáticamente una configuración de precios basada en la moneda si no se proporciona ninguna configuración
- Utiliza `getDefaultPricingConfigWithCurrency()` para crear una configuración multidivisa

### 2. `hooks/use-create-checkout.ts` - Utiliza `useCurrencyContext()` para obtener la moneda.
- Llama al `getStripePriceConfig()` para obtener el ID de precio correcto según la moneda
- Vuelve a `plan.stripePriceId` si la configuración multidivisa no está disponible

### 3. `hooks/use-pricing-section.ts` - Utiliza `useCurrencyContext()` para obtener la moneda.
- Llama al `getLemonSqueezyPriceConfig()` para LemonSqueezy
- Utiliza ID de precios basados en moneda al momento de pagar

## Uso

### Para desarrolladores

El sistema funciona automáticamente. No se necesitan modificaciones en los componentes existentes.

**Ejemplo de uso en un componente:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### Para ganchos de pago

Los ganchos de pago utilizan automáticamente configuraciones multidivisa:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Configuración de variables de entorno

Para que el sistema funcione se deben configurar variables de entorno para cada moneda en:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` variables
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` variables

**Ejemplo de raya:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Monedas admitidas

Las monedas admitidas se definen en `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (configurados en las configuraciones de facturación)
- Otras monedas ISO 4217 (retroceso a USD)

## Repliegue

Si una moneda no es compatible o si las configuraciones multidivisa no están disponibles:

1. El sistema utiliza `plan.stripePriceId` / `plan.lemonVariantId` (configuración estática)
2. La moneda predeterminada es USD
3. El símbolo predeterminado es $

## Pruebas

Para probar el sistema multidivisa:

1. Cambie la moneda del usuario a través de `/api/user/currency` 2. Verifique que los ID de precios cambien según la moneda.
3. Pruebe el pago con diferentes monedas

## Notas importantes

- Los ID de precios se resuelven **al momento de pagar**, no al momento de mostrarlos
- La configuración de precios en `content/config.yml` tiene prioridad sobre la configuración predeterminada
- Las configuraciones multidivisa solo se utilizan si se configuran variables de entorno

## Integración con proveedores de pago

El sistema multidivisa funciona a la perfección con todos los proveedores de pagos:

- **Stripe**: utiliza `getStripePriceConfig()` para obtener ID de precios específicos de la moneda
- **LemonSqueezy**: utiliza `getLemonSqueezyPriceConfig()` para obtener ID de variantes específicas de moneda
- **Polar**: admite múltiples monedas a través de la configuración del producto

Para obtener una configuración detallada específica del proveedor, consulte:
- [Configuración de franja] (./stripe)
- [Configuración de LemonSqueezy] (./lemonsqueezy)
- [Configuración polar](./polar)
