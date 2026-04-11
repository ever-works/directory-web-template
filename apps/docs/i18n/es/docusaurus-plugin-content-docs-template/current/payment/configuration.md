---
id: configuration
title: Configuración de Pago
sidebar_label: Guía de Configuración
sidebar_position: 6
description: Guía completa para configurar los proveedores de pago (Stripe, LemonSqueezy, Polar, Solidgate) con soporte multi-moneda
keywords: [pago, configuración, stripe, lemonsqueezy, polar, solidgate, multi-moneda]
---

# Configuración de Pago

Esta guía explica cómo configurar los diferentes proveedores de pago soportados por la aplicación.

## Tabla de contenidos

- [Descripción general](#overview)
- [Proveedores soportados](#supported-providers)
- [Configuración común](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-moneda](#multi-currency)
- [Períodos de prueba y tarifas de configuración](#trials-and-setup-fees)
- [Selección de proveedor](#provider-selection)
- [Solución de problemas](#troubleshooting)

---

## Descripción general

La aplicación soporta múltiples proveedores de pago para suscripciones:

| Proveedor    | Tipo          | Multi-moneda   | Pruebas |
|--------------|---------------|----------------|---------|
| Stripe       | Suscripción   | ✅ Sí          | ✅ Sí   |
| LemonSqueezy | Suscripción   | ✅ Sí          | ✅ Sí   |
| Polar        | Suscripción   | ❌ No          | ❌ No   |
| Solidgate    | Suscripción   | ⚠️ Parcial    | ❌ No   |

### Planes disponibles

- **Gratuito** - Sin costo, funcionalidades básicas
- **Estándar** - Plan intermedio con mayor visibilidad
- **Premium** - Plan completo con todas las funcionalidades

---

## Proveedores soportados

### Arquitectura

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Exportaciones
│       ├── types.ts              # Tipos comunes
│       ├── stripe.config.ts      # Configuración multi-moneda Stripe
│       ├── lemonsqueezy.config.ts # Configuración multi-moneda LemonSqueezy
│       └── solidgate.config.ts   # Configuración Solidgate (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Selección de proveedor
```

---

## Configuración común

### Precios mostrados (para la UI)

Estas variables definen los precios mostrados en la interfaz de usuario:

```bash
# Precios en dólares (o moneda principal) - solo para visualización
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Períodos de prueba (trial)

```bash
# IDs de montos de prueba (cargos iniciales durante el período de prueba)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Habilitar/deshabilitar períodos de prueba con monto autorizado
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Requisitos previos

1. Crear una cuenta en [Stripe Dashboard](https://dashboard.stripe.com)
2. Obtener las claves de API (Configuración → Claves de API)
3. Configurar el webhook

### Variables de entorno básicas

```bash
# ============================================
# STRIPE - Configuración básica
# ============================================

# Claves de API (obligatorio)
STRIPE_SECRET_KEY=sk_live_xxx           # Clave secreta (servidor)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Clave publicable
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Clave publicable (cliente)

# Webhook (obligatorio para eventos)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Configuración de producto (Legacy - solo USD)

```bash
# Precios simples (para compatibilidad con versiones anteriores, solo USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Configuración multi-moneda (Recomendada)

#### Plan Estándar

```bash
# ============================================
# STRIPE PLAN ESTÁNDAR
# ============================================

# ID de Producto
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Precios mensuales por moneda
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Precios anuales por moneda
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Tarifas de configuración / montos de prueba por moneda
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Plan Premium

```bash
# ============================================
# STRIPE PLAN PREMIUM
# ============================================

# ID de Producto
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Precios mensuales por moneda
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Precios anuales por moneda
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Tarifas de configuración / montos de prueba por moneda
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Creación de precios en Stripe

1. Ve a **Productos** → Crea un producto
2. Agrega precios para cada moneda:
   - Haz clic en "Agregar otro precio"
   - Selecciona la moneda (EUR, GBP, CAD)
   - Establece el monto equivalente
3. Copia cada `price_xxx` a las variables correspondientes

### Webhook de Stripe

Configura el webhook en el Stripe Dashboard:

- **URL**: `https://tu-dominio.com/api/stripe/webhook`
- **Eventos a escuchar**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Requisitos previos

1. Crear una cuenta en [LemonSqueezy](https://lemonsqueezy.com)
2. Crear una tienda
3. Crear productos y variantes

### Variables de entorno

```bash
# ============================================
# LEMONSQUEEZY - Configuración básica
# ============================================

# API (obligatorio)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://tu-dominio.com/api/lemonsqueezy/webhook

# Modo de prueba
LEMONSQUEEZY_TEST_MODE=false
```

### Configuración de variantes (Legacy)

```bash
# Variantes simples
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Variantes con tarifa de configuración (para períodos de prueba)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Configuración multi-moneda

#### Plan Estándar

```bash
# ============================================
# LEMONSQUEEZY PLAN ESTÁNDAR
# ============================================

# ID de Producto
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Precios mensuales por moneda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Precios anuales por moneda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Tarifas de configuración por moneda
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Plan Premium

```bash
# ============================================
# LEMONSQUEEZY PLAN PREMIUM
# ============================================

# ID de Producto
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Precios mensuales por moneda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Precios anuales por moneda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Tarifas de configuración por moneda
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Requisitos previos

1. Crear una cuenta en [Polar](https://polar.sh)
2. Crear una organización
3. Crear planes de suscripción

### Variables de entorno

```bash
# ============================================
# POLAR - Configuración
# ============================================

# API (obligatorio)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Modo sandbox (true para pruebas, false para producción)
POLAR_SANDBOX=true

# URL de API (opcional, predeterminado: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# IDs de planes
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Montos de prueba (opcional)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning En desarrollo
La integración de Solidgate está actualmente en desarrollo. Algunas funciones pueden no estar completamente operativas todavía.
:::

### Requisitos previos

1. Crear una cuenta en [Solidgate](https://solidgate.com)
2. Obtener las credenciales de API del portal del comerciante
3. Configurar el endpoint del webhook

### Variables de entorno

```bash
# ============================================
# SOLIDGATE - Configuración (WIP)
# ============================================

# Credenciales de API (obligatorio)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Entorno (test o live)
SOLIDGATE_ENVIRONMENT=test
```

### Configuración de producto

```bash
# ============================================
# PLANES SOLIDGATE (WIP)
# ============================================

# IDs de producto
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# IDs de precio (actualmente solo USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Limitaciones actuales

| Función           | Estado         | Notas                              |
|-------------------|----------------|------------------------------------|
| Pagos básicos     | ✅ Implementado | Pagos únicos y suscripción        |
| Multi-moneda      | ⚠️ Parcial    | Actualmente solo USD              |
| Períodos de prueba | ❌ Aún no    | Planificado para versión futura   |
| Webhooks          | ⚠️ Parcial    | Solo eventos básicos              |
| Reembolsos        | ❌ Aún no     | Planificado para versión futura   |

---

## Multi-moneda

### Monedas soportadas

| Código | Moneda              | Símbolo |
|------|---------------------|---------|
| USD  | Dólar estadounidense | $      |
| EUR  | Euro                | €       |
| GBP  | Libra esterlina     | £       |
| CAD  | Dólar canadiense    | CA$     |

### Cómo funciona

1. La moneda del usuario se detecta automáticamente (geolocalización, preferencias)
2. El sistema selecciona el `price_id` correspondiente a la moneda
3. Si la moneda no está configurada, vuelve a USD

### Ejemplo de uso

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Obtiene automáticamente el ID de precio correcto para la moneda
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Suscribirse por {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Períodos de prueba y tarifas de configuración

### Concepto

- **Período de prueba**: Período de prueba gratuito o con descuento
- **Tarifa de configuración**: Cargos iniciales al comienzo del período de prueba

### Configuración

```bash
# Habilitar períodos de prueba con monto autorizado
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Importante: Consistencia de moneda

:::caution
Todos los precios en una sesión de checkout deben estar en la misma moneda.
:::

Si usas períodos de prueba con tarifas de configuración, debes crear una tarifa de configuración para cada moneda:

```bash
# ❌ ERROR: Tarifa de configuración en USD + Precio principal en GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ CORRECTO: Ambos en GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Selección de proveedor

### Prioridad

1. **Proveedor seleccionado por el usuario** (Configuración)
2. **Proveedor predeterminado** (configuración)
3. **Fallback**: Stripe

### Configuración del proveedor predeterminado

En el archivo de configuración del sitio:

```typescript
// En la configuración del sitio
pricing: {
  provider: PaymentProvider.STRIPE  // o LEMONSQUEEZY, POLAR
}
```

### Ejemplo de uso

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Solución de problemas

### Error: Conflicto de moneda

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Causa**: El precio principal y la tarifa de configuración están en monedas diferentes.

**Solución**: Crea tarifas de configuración para cada moneda soportada.

### Error: ID de precio inválido

```
Error: Invalid price ID
```

**Causa**: El `price_id` no existe o no está configurado.

**Solución**: Verifica que la variable de entorno contenga un ID válido.

### El webhook no recibe eventos

1. Comprueba la URL del webhook en el panel del proveedor
2. Confirma que `WEBHOOK_SECRET` es correcto
3. Prueba con las herramientas de depuración del proveedor

### Los precios no se muestran correctamente

1. Comprueba `NEXT_PUBLIC_PRODUCT_PRICE_*` para valores mostrados
2. Verifica que los valores `price_id` correspondan a las monedas correctas
3. Reinicia el servidor de desarrollo después de modificar archivos `.env`
