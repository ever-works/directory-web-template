---
id: multi-currency
title: Мултивалутна интеграция
sidebar_label: Мулти-валута
sidebar_position: 5
---

# Ръководство за интегриране на няколко валути

Този документ обяснява как мултивалутната система е интегрирана в приложението и как работи с доставчици на плащания (Stripe, LemonSqueezy и Polar).

## Архитектура

Мултивалутната система работи на няколко нива:

1. **Базова конфигурация** ( `lib/types.ts` ): Конфигурация по подразбиране с поддръжка на няколко валути
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): Обогатява конфигурацията с валутата на потребителя
3. **Checkout Hooks**: Използвайте мулти-валутни конфигурации, за да получите правилните ценови идентификатори

## Поток от данни

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

## Модифицирани файлове

### 1. `app/[locale]/config.tsx` - Използва `useCurrencyContext()` за получаване на валутата на потребителя
- Автоматично генерира конфигурация за ценообразуване въз основа на валута, ако не е предоставена конфигурация
- Използва `getDefaultPricingConfigWithCurrency()` за създаване на мулти-валутна конфигурация

### 2. `hooks/use-create-checkout.ts` - Използва `useCurrencyContext()` за получаване на валутата
- Извиква `getStripePriceConfig()` , за да получите правилния ID на цената въз основа на валутата
- Връща се към `plan.stripePriceId` , ако мулти-валутната конфигурация не е налична

### 3. `hooks/use-pricing-section.ts` - Използва `useCurrencyContext()` за получаване на валутата
- Обажда се на `getLemonSqueezyPriceConfig()` за LemonSqueezy
- Използва ценови идентификационни номера, базирани на валута, по време на плащане

## Използване

### За разработчици

Системата работи автоматично. Не са необходими модификации в съществуващите компоненти.

**Пример за използване в компонент:**

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

### За Checkout Hooks

Checkout куките автоматично използват мулти-валутни конфигурации:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Конфигурация на променливи на средата

За да работи системата, трябва да конфигурирате променливи на средата за всяка валута в:

- `lib/config/billing/stripe.config.ts` : `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` променливи
- `lib/config/billing/lemonsqueezy.config.ts` : `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` променливи

**Пример за Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Поддържани валути

Поддържаните валути са определени в `lib/config/billing/types.ts` :

- USD, EUR, GBP, CAD (конфигурирани в конфигурациите за таксуване)
- Други валути по ISO 4217 (резервен към USD)

## Резервен вариант

Ако дадена валута не се поддържа или ако не са налични конфигурации за няколко валути:

1. Системата използва `plan.stripePriceId` / `plan.lemonVariantId` (статична конфигурация)
2. Валутата по подразбиране е USD
3. Символът по подразбиране е $

## Тестване

За да тествате мултивалутната система:

1. Променете валутата на потребителя чрез `/api/user/currency` 2. Проверете дали идентификаторите на цените се променят според валутата
3. Тествайте плащането с различни валути

## Важни бележки

- Идентификаторите на цените се разрешават **по време на плащане**, а не по време на показване
- Ценовата конфигурация в `content/config.yml` има приоритет пред конфигурацията по подразбиране
- Мултивалутните конфигурации се използват само ако са конфигурирани променливи на средата

## Интеграция с доставчици на плащания

Мултивалутната система работи безпроблемно с всички доставчици на плащания:

- **Stripe**: Използва `getStripePriceConfig()` , за да получите идентификационни номера на цената, специфични за валутата
- **LemonSqueezy**: Използва `getLemonSqueezyPriceConfig()` , за да получите идентификатори на варианти, специфични за валутата
- **Polar**: Поддържа мулти-валута чрез конфигурация на продукта

За подробна конфигурация, специфична за доставчика, вижте:
- [Конфигурация на ивици](./ивици)
- [Конфигурация на LemonSqueezy](./lemonsqueezy)
- [Полярна конфигурация](./polar)
