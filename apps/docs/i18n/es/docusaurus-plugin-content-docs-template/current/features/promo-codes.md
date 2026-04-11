---
id: promo-codes
title: Sistema de códigos promocionales
sidebar_label: Códigos promocionales
sidebar_position: 14
---

# Sistema de códigos promocionales

La plantilla Ever Works incluye un completo sistema de códigos de promoción para mostrar descuentos promocionales, códigos de cupón y ofertas especiales en las páginas de listado de artículos. El sistema admite múltiples tipos de descuentos, seguimiento de vencimientos, copia del portapapeles, integración de análisis y variantes de interfaz de usuario responsivas.

## Descripción general de la arquitectura

| Componente | Camino | Propósito |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | Componente de interfaz de usuario para mostrar códigos promocionales |
| `usePromoCode` | `hooks/use-promo-code.ts` | Gancho para la gestión de códigos promocionales únicos |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Gancho para gestionar múltiples códigos promocionales |
| `PromoCode` tipo | `lib/content` | Definición de tipo para datos de códigos de promoción |

## Tipos de descuento

El sistema admite tres tipos de descuento:

| Tipo | Mostrar | Ejemplo |
|---|---|---|
| `percentage` | `X% OFF` | "25 % de descuento" |
| `fixed` | `$X OFF` | "$10 DE DESCUENTO" |
| `free_shipping` | `FREE SHIPPING` | "ENVÍO GRATIS" |

## El gancho `usePromoCode` ### Interfaz

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

### Uso

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## Seguimiento de estadísticas

El gancho rastrea las estadísticas de copia y clic, persistidas en `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Las estadísticas se guardan y restauran automáticamente entre sesiones:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Integración de análisis

El gancho activa automáticamente eventos de Google Analytics cuando están disponibles:

| Evento | Categoría | Gatillo |
|---|---|---|
| `promo_code_copied` | `engagement` | Cuando se copia un código al portapapeles |
| `promo_code_used` | `conversion` | Cuando se activa o se hace clic en un código |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Gestión de múltiples códigos promocionales

El gancho `usePromoCodes` extiende `usePromoCode` para colecciones:

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### Mejor algoritmo de descuento

La función `getBestDiscount()` selecciona el mejor descuento disponible:
1. Filtros solo para códigos activos (no vencidos)
2. Compara descuentos porcentuales por valor (cuanto más alto, mejor)
3. Compara descuentos fijos por valor (cuanto más alto, mejor)
4. Los códigos de envío gratuitos siempre se consideran competitivos.

## Componente de código promocional

El `PromoCodeComponent` muestra una tarjeta de código promocional con estilo con tres variantes:

### Variantes

| Variante | Descripción |
|---|---|
| `default` | Tarjeta de tamaño completo con descripción, términos, botón copiar y botón usar |
| `compact` | Insignia en línea con código e icono de copia |
| `featured` | Valor predeterminado mejorado con resaltado de anillo y sombra más grande |

### Uso

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### Accesorios de componentes

| Apoyo | Tipo | Predeterminado | Descripción |
|---|---|---|---|
| `promoCode` | `PromoCode` | requerido | El objeto de datos del código de promoción |
| `className` | `string?` | `undefined` | Clases CSS adicionales |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Variante de visualización |
| `showDescription` | `boolean` | `true` | Mostrar la descripción del código |
| `showTerms` | `boolean` | `true` | Mostrar términos y condiciones |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Devolución de llamada cuando se copia el código |

## Soporte para portapapeles

La función de copia incluye una alternativa para navegadores más antiguos:

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## Internacionalización

El componente utiliza `next-intl` para todas las cadenas orientadas al usuario:

| Clave de traducción | Uso |
|---|---|
| `common.EXPIRES` | Etiqueta de fecha de vencimiento |
| `common.EXPIRED` | Texto de insignia caducado |
| `common.PROMO_CODE` | Etiqueta de campo de código |
| `common.COPIED` | Copiar texto de confirmación |
| `common.COPY` | Copiar texto del botón |
| `common.USE_CODE` | Usar texto del botón de código |
| `common.TERMS` | Etiqueta de términos |

## Archivos clave

| Archivo | Camino |
|---|---|
| Componente de código promocional | `components/promo-code/promo-code.tsx` |
| Ganchos de códigos promocionales | `hooks/use-promo-code.ts` |
| Tipo de código promocional | `lib/content` (tipo exportado) |
