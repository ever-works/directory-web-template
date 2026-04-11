---
id: promo-codes
title: Система промокодов
sidebar_label: Промокоды
sidebar_position: 14
---

# Система промокодов

Шаблон Ever Works включает в себя комплексную систему промо-кодов для отображения рекламных скидок, кодов купонов и специальных предложений на страницах со списком товаров. Система поддерживает несколько типов скидок, отслеживание срока действия, копирование в буфер обмена, интеграцию аналитики и варианты адаптивного пользовательского интерфейса.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | Компонент пользовательского интерфейса для отображения промокодов |
| `usePromoCode` | `hooks/use-promo-code.ts` | Крючок для управления одним промокодом |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Хук для управления несколькими промокодами |
| `PromoCode` тип | `lib/content` | Определение типа данных промокода |

## Типы скидок

Система поддерживает три типа скидок:

| Тип | Дисплей | Пример |
|---|---|---|
| `percentage` | `X% OFF` | «СКИДКА 25%» |
| `fixed` | `$X OFF` | «СКИДКА 10 $» |
| `free_shipping` | `FREE SHIPPING` | «БЕСПЛАТНАЯ ДОСТАВКА» |

## Крючок `usePromoCode` ### Интерфейс

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

### Использование

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

## Отслеживание статистики

Хук отслеживает статистику копирования и кликов, сохраняемую в `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Статистика автоматически сохраняется и восстанавливается между сеансами:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Интеграция аналитики

Хук автоматически запускает события Google Analytics, если они доступны:

| Событие | Категория | Триггер |
|---|---|---|
| `promo_code_copied` | `engagement` | Когда код копируется в буфер обмена |
| `promo_code_used` | `conversion` | При активации/нажатии кода |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Управление несколькими промокодами

Хук `usePromoCodes` расширяет `usePromoCode` для коллекций:

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

### Лучший алгоритм скидок

Функция `getBestDiscount()` выбирает лучшую доступную скидку:
1. Фильтруется только по активным (с неистёкшим сроком действия) кодам.
2. Сравнивает процентные скидки по стоимости (чем выше, тем лучше).
3. Сравнивает фиксированные скидки по стоимости (чем выше, тем лучше).
4. Коды бесплатной доставки всегда считаются конкурентоспособными.

## Компонент промокода `PromoCodeComponent` отображает стилизованную карту с промокодом в трех вариантах:

### Варианты

| Вариант | Описание |
|---|---|
| `default` | Полноразмерная карточка с описанием, условиями, кнопкой копирования и кнопкой использования |
| `compact` | Встроенный значок с кодом и значком копирования |
| `featured` | Улучшенное значение по умолчанию: кольцевая подсветка и увеличенная тень |

### Использование

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

### Реквизит компонента

| Опора | Тип | По умолчанию | Описание |
|---|---|---|---|
| `promoCode` | `PromoCode` | требуется | Объект данных промокода |
| `className` | `string?` | `undefined` | Дополнительные классы CSS |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Вариант отображения |
| `showDescription` | `boolean` | `true` | Показать описание кода |
| `showTerms` | `boolean` | `true` | Показать условия |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Обратный вызов при копировании кода |

## Поддержка буфера обмена

Функция копирования включает запасной вариант для старых браузеров:

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

Компонент использует `next-intl` для всех строк, обращенных к пользователю:

| Ключ перевода | Использование |
|---|---|
| `common.EXPIRES` | Этикетка со сроком годности |
| `common.EXPIRED` | Текст значка с истекшим сроком действия |
| `common.PROMO_CODE` | Метка поля кода |
| `common.COPIED` | Копировать текст подтверждения |
| `common.COPY` | Копировать текст кнопки |
| `common.USE_CODE` | Использовать текст кнопки кода |
| `common.TERMS` | Метка терминов |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Компонент промокода | `components/promo-code/promo-code.tsx` |
| Крючки для промокодов | `hooks/use-promo-code.ts` |
| Тип промокода | `lib/content` (экспортный тип) |
