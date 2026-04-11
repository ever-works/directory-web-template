---
id: pricing-pages
title: Страници за цени и плащане
sidebar_label: Страници с цени
sidebar_position: 19
---

# Страници за цени и плащане

Шаблонът Ever Works включва пълнофункционална система за страници за ценообразуване с поддръжка на плащане с множество доставчици (Stripe, LemonSqueezy, Polar), превключване на интервали на фактуриране, динамично ценообразуване от продукти на Stripe, форматиране на валута, карти за сравнение на планове, рекламни секции на спонсори и вградени или базирани на пренасочване потоци на плащане.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Конфигурации на планове, списъци с функции и средства за получаване на текстови действия |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Оркестрира цялото състояние на ценообразуване, плащане и логика на плащане |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Пълен потребителски интерфейс на страницата за ценообразуване с планови карти и поток на плащане |
| `PlanCard` | `components/pricing/plan-card.tsx` | Карта за показване на индивидуален план |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Вграден модален формуляр за плащане |
| `PaymentFlowSelectorModal` | `components/payment/` | Модал за избор на поток (плащане сега срещу плащане в края) |

## Конфигурация на план

Системата поддържа три нива на план, конфигурирани чрез `usePricingFeatures` :

| План | Текст за действие (влезли) | Текст за действие (не сте влезли) |
|---|---|---|
| `free` | „Започнете безплатно“ | „Изпратете безплатно“ |
| `standard` | „Надстройка до стандарт“ | „Абонирайте се сега“ |
| `premium` | „Go Premium“ | „Абонирайте се сега“ |

### Интерфейс за конфигуриране на план

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Списъци с функции

Всеки план има въведен списък с функции:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| План | Брой функции | Забележителни включвания |
|---|---|---|
| Безплатно | 9 функции | Изпратете продукт, основно описание, едно изображение, връзка към уебсайт |
| Стандартен | 9 функции | Всички безплатни функции, потвърдена значка, приоритетен преглед, месечна статистика |
| Премиум | 11 функции | Всички стандартни функции, спонсорирана позиция, представена начална страница, неограничена галерия |

## Куката `usePricingSection` Тази изчерпателна кука организира цялата логика на ценова страница:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### Държава

| Имот | Тип | Описание |
|---|---|---|
| `showSelector` | `boolean` | Дали селекторът на потока на плащане е видим |
| `billingInterval` | `PaymentInterval` | Текущ интервал на фактуриране (месечно/годишно) |
| `processingPlan` | `string \| null` | ID на плана, който се обработва в момента |
| `selectedPlan` | `PaymentPlan \| null` | Текущо избран план |
| `selectedFlow` | `PaymentFlow` | Тип поток на плащане (плащане сега срещу плащане в края) |
| `isButton` | `boolean` | Дали избраният поток използва режим на бутон |

### Действия

| Метод | Описание |
|---|---|
| `setBillingInterval(interval)` | Превключване между месечно и годишно таксуване |
| `handleSelectPlan(plan)` | Изберете план и уведомете родителя чрез обратно повикване |
| `handleCheckout(plan)` | Иницииране на плащане за дадена конфигурация на план |
| `calculatePrice(plan)` | Изчислете цената въз основа на интервала на фактуриране и годишната отстъпка |
| `getSavingsText(plan)` | Получавайте текст за годишни спестявания (напр. „Спестете $24/година“) |
| `cancelCurrentProcess()` | Отмяна на текущо плащане и нулиране на състоянието |
| `formatPrice(amount)` | Форматиране на сумата със символ на валута |

### Изчисляване на цената

Куката изчислява цените въз основа на интервала на фактуриране:

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

## Доставчици на плащания

Системата поддържа три доставчика на плащания, избрани за конфигурация или предпочитание за всеки потребител:

| Доставчик | Checkout Hook | Вградена поддръжка |
|---|---|---|
| Ивица | `useCreateCheckoutSession` | Да (SetupIntent) |
| LemonSqueezy | `useCheckoutButton` | Да (наслагване) |
| Полярен | `usePolarCheckout` | Да (вграден URL) |

### Избор на доставчик

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Поток на плащане

Когато потребител щракне върху бутона за действие на план:

1. Проверете дали потребителят е влязъл (отворете режима за влизане, ако не е)
2. Отменете всеки съществуващ процес на плащане
3. Определете доставчика на плащане
4. Вземете идентификационния номер на цената или идентификационния номер на варианта за валута
5. Отворете вградения формуляр за плащане или пренасочете към касата на доставчика

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

## Динамично ценообразуване (Stripe)

Когато Stripe е активният доставчик и динамичното ценообразуване е активирано, куката извлича данни за продукта на живо:

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

## Поддръжка на валута

Системата за ценообразуване поддържа показване на няколко валути:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Идентификаторите на варианти, които са съобразени с валутата, се разрешават чрез специфични за доставчика конфигурационни функции:

| Доставчик | Функция за конфигурация |
|---|---|
| LemonSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Полярен | `getPolarPriceConfig(planName, currency, interval)` |

## Модален формуляр за плащане

Вграденият формуляр за плащане поддържа и трите доставчика:

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

## Компонент на секцията за ценообразуване

Компонентът `PricingSection` изобразява пълната страница с цените:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Визуални функции

| Характеристика | Описание |
|---|---|
| Превключване на интервала на фактуриране | Анимиран плъзгач между месечен и годишен |
| Решетка с план карти | Адаптивно оформление от 1 колона (мобилен) до 3 колони (десктоп) |
| Популярна значка | Стандартният план е маркиран като „популярен“ със светещи ефекти |
| Спестовни значки | Зелени хапчета, показващи годишни спестявания, когато е приложимо |
| Индикатори за доверие | Икони за „Без скрити такси“, „Незабавно активиране“, „Премиум поддръжка“ |
| Секция за реклами на спонсори | Анимирани радарни кръгове с цени за спонсорирано разположение |
| Продължете раздел | Показва се след избор на план с призив за действие |

### Условно изобразяване

Компонентът условно показва платени планове въз основа на наличността на плащане:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Интернационализация

Всички обърнати към потребителя низове използват `next-intl` с две пространства за имена на превод:

| Пространство от имена | Използване |
|---|---|
| `pricing` | Имена на планове, функции, съдържание на страницата, раздел за спонсор |
| `billing` | Месечни/годишни етикети, състояния на обработка, съобщения за грешки |

## Ключови файлове

| Файл | Път |
|---|---|
| Ценообразуване Характеристики Кука | `hooks/use-pricing-features.ts` |
| Ценова секция Кука | `hooks/use-pricing-section.ts` |
| Компонент на секцията за ценообразуване | `components/pricing/pricing-section.tsx` |
| Компонент на планова карта | `components/pricing/plan-card.tsx` |
| Формуляр за плащане Модален | `components/payment/stripe-payment-modal.tsx` |
| Плащателни константи | `lib/constants.ts` |
| Тип конфигурация за ценообразуване | `lib/content.ts` |
