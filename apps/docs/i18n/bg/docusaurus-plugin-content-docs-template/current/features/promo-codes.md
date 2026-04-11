---
id: promo-codes
title: Система за промоционални кодове
sidebar_label: Промо кодове
sidebar_position: 14
---

# Система за промоционални кодове

Шаблонът Ever Works включва цялостна система с промоционални кодове за показване на промоционални отстъпки, кодове на купони и специални оферти на страниците със списъци с артикули. Системата поддържа множество типове отстъпки, проследяване на изтичане, копиране на клипборда, интегриране на анализи и отзивчиви варианти на потребителския интерфейс.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | UI компонент за показване на промо кодове |
| `usePromoCode` | `hooks/use-promo-code.ts` | Кука за управление на единичен промо код |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Кука за управление на множество промо кодове |
| `PromoCode` тип | `lib/content` | Дефиниция на типа за данни за промоционален код |

## Видове отстъпки

Системата поддържа три вида отстъпки:

| Тип | Дисплей | Пример |
|---|---|---|
| `percentage` | `X% OFF` | „25% НАМАЛЕНИЕ“ |
| `fixed` | `$X OFF` | „$10 НАМАЛЕНИЕ“ |
| `free_shipping` | `FREE SHIPPING` | „БЕЗПЛАТНА ДОСТАВКА“ |

## Куката `usePromoCode` ### Интерфейс

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

### Използване

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

## Проследяване на статистика

Куката проследява статистики за копиране и щракване, запазени в `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Статистическите данни се запазват и възстановяват автоматично в сесиите:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Интеграция на Анализ

Куката автоматично задейства събития от Google Анализ, когато са налични:

| Събитие | Категория | Тригер |
|---|---|---|
| `promo_code_copied` | `engagement` | Когато код се копира в клипборда |
| `promo_code_used` | `conversion` | Когато кодът е активиран/щракнат |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Управление на множество промоционални кодове

Куката `usePromoCodes` продължава `usePromoCode` за колекции:

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

### Най-добър алгоритъм за отстъпка

Функцията `getBestDiscount()` избира най-добрата налична отстъпка:
1. Филтрира само към активни (неизтекли) кодове
2. Сравнява процентните отстъпки по стойност (колкото по-високо е по-добре)
3. Сравнява фиксираните отстъпки по стойност (колкото по-високо е по-добре)
4. Кодовете за безплатна доставка винаги се считат за конкурентни

## Компонент за промоционален код `PromoCodeComponent` изобразява стилизирана карта с промоционален код с три варианта:

### Варианти

| Вариант | Описание |
|---|---|
| `default` | Карта в пълен размер с описание, условия, бутон за копиране и бутон за използване |
| `compact` | Вградена значка с код и икона за копиране |
| `featured` | Подобрена подразбираща се светлина с пръстен и по-голяма сянка |

### Използване

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

### Реквизити на компоненти

| опора | Тип | По подразбиране | Описание |
|---|---|---|---|
| `promoCode` | `PromoCode` | задължително | Обектът с данни за промоционалния код |
| `className` | `string?` | `undefined` | Допълнителни CSS класове |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Вариант на показване |
| `showDescription` | `boolean` | `true` | Покажете описанието на кода |
| `showTerms` | `boolean` | `true` | Показване на правила и условия |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Обратно извикване, когато кодът е копиран |

## Поддръжка на клипборда

Функцията за копиране включва резервен вариант за по-стари браузъри:

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

## Интернационализация

Компонентът използва `next-intl` за всички обърнати към потребителя низове:

| Ключ за превод | Използване |
|---|---|
| `common.EXPIRES` | Етикет за срок на годност |
| `common.EXPIRED` | Текст на значката с изтекъл срок |
| `common.PROMO_CODE` | Етикет на кодово поле |
| `common.COPIED` | Копиране на текст за потвърждение |
| `common.COPY` | Копиране на текст на бутона |
| `common.USE_CODE` | Използвайте текст на бутона за код |
| `common.TERMS` | Етикет с условия |

## Ключови файлове

| Файл | Път |
|---|---|
| Компонент на промо код | `components/promo-code/promo-code.tsx` |
| Куки за промоционални кодове | `hooks/use-promo-code.ts` |
| Тип промоционален код | `lib/content` (експортиран тип) |
