---
id: multi-currency
title: 多币种整合
sidebar_label: 多币种
sidebar_position: 5
---

# 多币种集成指南

本文档解释了多货币系统如何集成到应用程序中以及它如何与支付提供商（Stripe、LemonSqueezy 和 Polar）配合使用。

## 架构

多货币系统在多个层面上运作：

1. **基本配置** (0)：支持多币种的默认配置
2. **ConfigProvider** (1´)：用用户的货币丰富配置
3. **Checkout Hooks**：使用多货币配置来获取正确的价格 ID

## 数据流

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

## 修改文件

### 1. 0
- 使用1获取用户的货币
- 如果未提供配置，则自动生成基于货币的定价配置
- 使用2 创建多货币配置

### 2. 3
- 使用4获取货币
- 调用 5 获取基于货币的正确价格 ID
- 如果多货币配置不可用，则回落至6

### 3.77
- 使用8获取货币
- 为 LemonSqueezy 致电 9
- 结帐时使用基于货币的价格 ID

## 用法

### 对于开发者

系统自动工作。现有组件无需修改。

**组件中的使用示例：**

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

### 对于结账挂钩

结帐挂钩自动使用多货币配置：

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## 环境变量配置

为了使系统正常工作，您必须为每种货币配置环境变量：

- 0：1变量
-223变量

**条纹示例：**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## 支持的货币

支持的货币定义为 0：

- 美元、欧元、英镑、加元（在计费配置中配置）
- 其他 ISO 4217 货币（回退到美元）

## 后备

如果不支持某种货币或多货币配置不可用：

1. 系统使用1/2（静态配置）
2.默认货币为美元
3.默认符号为$

## 测试

测试多币种系统：

1. 通过3更改用户的货币
2. 验证价格 ID 是否根据货币变化
3. 测试不同币种结帐

## 重要提示

- 价格 ID 在**结账时**解析，而不是在显示时解析
- 4中的定价配置优先于默认配置
- 仅当配置了环境变量时才使用多货币配置

## 与支付提供商集成

多币种系统与所有支付提供商无缝协作：

- **Stripe**：使用 5 获取特定于货币的价格 ID
- **LemonSqueezy**：使用 6 获取特定于货币的变体 ID
- **Polar**：通过产品配置支持多币种

有关特定于提供商的详细配置，请参阅：
- [条纹配置](./stripe)
- [LemonSqueezy 配置](./lemonsqueezy)
- [极性配置](./极性)
