---
id: payment-config
title: "支付配置"
sidebar_label: "支付"
sidebar_position: 12
---

# 支付配置

该模板支持多个支付服务商和灵活的计费工作流程。本参考文档涵盖所有与支付相关的常量、枚举和配置选项。

## 支付常量

所有核心支付枚举和类型均定义在 `lib/constants/payment.ts` 中。该文件有意与主配置模块分离，以便可以在 Next.js 运行时外部运行的脚本中导入（迁移、种子数据、CLI 工具）。

### PaymentFlow

确定支付相对于提交流程何时收取。

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| 值 | 描述 |
|----|------|
| `pay_at_start` | 用户在提交前付款；条目立即发布 |
| `pay_at_end` | 用户先提交；支付在管理员批准后收取 |

### PaymentStatus

跟踪支付尝试的状态。

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

计费频率选项。

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

可用的订阅等级。

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

支持的支付网关。

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## 支付配置架构

定义在 `lib/config/schemas/payment.schema.ts` 中，并在启动时使用 Zod 进行验证。

### 产品定价（显示值）

```typescript
pricing: {
  free: number;       // 默认值：0
  standard: number;   // 默认值：10
  premium: number;    // 默认值：20
}
```

| 环境变量 | 字段 | 默认值 |
|---------|------|--------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### 试用配置

| 环境变量 | 字段 | 描述 |
|---------|------|------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | 标准试用期价格 ID |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | 高级试用期价格 ID |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | 启用试用金额（`true`/`false`） |

## 服务商设置

### Stripe

当同时存在 `secretKey` 和 `publishableKey` 时自动启用。

| 环境变量 | 必填 | 描述 |
|---------|------|------|
| `STRIPE_SECRET_KEY` | 是 | 服务器端 API 密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 是 | 客户端可发布密钥 |
| `STRIPE_WEBHOOK_SECRET` | 推荐 | Webhook 签名验证 |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | 否 | 免费计划价格 ID |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | 否 | 标准计划价格 ID |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | 否 | 高级计划价格 ID |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | 否 | 设置 `true` 以从 Stripe API 获取价格 |

### LemonSqueezy

当同时存在 `apiKey` 和 `storeId` 时自动启用。

| 环境变量 | 必填 | 描述 |
|---------|------|------|
| `LEMONSQUEEZY_API_KEY` | 是 | 来自 LemonSqueezy 控制台的 API 密钥 |
| `LEMONSQUEEZY_STORE_ID` | 是 | 您的商店标识符 |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | 推荐 | Webhook 签名验证 |
| `LEMONSQUEEZY_WEBHOOK_URL` | 否 | 覆盖 Webhook 端点 URL |
| `LEMONSQUEEZY_TEST_MODE` | 否 | 设置 `true` 以启用测试模式 |
| `LEMONSQUEEZY_VARIANT_ID` | 否 | 默认变体 ID |

### Polar

当同时存在 `accessToken` 和 `organizationId` 时自动启用。

| 环境变量 | 必填 | 描述 |
|---------|------|------|
| `POLAR_ACCESS_TOKEN` | 是 | API 访问令牌 |
| `POLAR_ORGANIZATION_ID` | 是 | 组织标识符 |
| `POLAR_WEBHOOK_SECRET` | 推荐 | Webhook 签名验证 |
| `POLAR_SANDBOX` | 否 | 生产环境设置为 `false`（默认：`true`） |
| `POLAR_API_URL` | 否 | 覆盖 API 基础 URL |

### Solidgate

需要手动配置环境变量。

| 环境变量 | 必填 | 描述 |
|---------|------|------|
| `SOLIDGATE_API_KEY` | 是 | API 密钥 |
| `SOLIDGATE_SECRET_KEY` | 是 | 用于签名的密钥 |
| `SOLIDGATE_WEBHOOK_SECRET` | 是 | Webhook 验证 |
| `SOLIDGATE_MERCHANT_ID` | 是 | 商户标识符 |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | 否 | 客户端密钥 |

## 多币种计费

每个服务商通过 `lib/config/billing/` 中的计费配置模块支持按币种定价。

### 计费配置类型

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // 月度计费的价格/变体 ID
  yearly?: string;    // 年度计费的价格/变体 ID
  setupFee?: string;  // 可选的安装费价格 ID
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // ISO 4217 代码（如 'USD'）
  symbol?: string;    // 显示符号（如 '$'）
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### 支持的币种

`lib/config/billing/types.ts` 中的 `SUPPORTED_CURRENCIES` 数组列出了系统接受的所有 32 个 ISO 4217 代码（USD、EUR、GBP、JPY、CNY、CAD、AUD、CHF 等）。

### 价格解析函数

每个服务商导出一个价格配置函数：

| 服务商 | 函数 | 来源 |
|-------|------|------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

如果请求的币种未配置，所有函数都会回退到 USD。

## 支付流程配置

定义在 `lib/config/payment-flows.ts` 中，`PAYMENT_FLOWS` 数组配置两个支付流程选项及其 UI 属性：

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Lucide 图标名称
  color: string;           // Tailwind 渐变类
  features: string[];      // 功能要点
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // 可选徽章标签
  isDefault?: boolean;     // 是否为默认流程
}
```

辅助函数：
- `getDefaultPaymentFlow()` -- 返回默认的 `PaymentFlow` 值
- `getPaymentFlowConfig(flowId)` -- 返回给定流程的 `PaymentFlowConfig`

## 支付服务商管理器

`lib/payment/config/payment-provider-manager.ts` 中的 `PaymentProviderManager` 类提供对服务商实例的单例访问：

```typescript
// 获取特定服务商
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// 或使用通用函数
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## 相关页面

- [支付类型](../types/payment-types.md) -- 支付操作的类型定义
- [订阅类型](../types/subscription-types.md) -- 订阅生命周期类型
- [环境参考](./environment-reference.md) -- 完整的环境变量列表
