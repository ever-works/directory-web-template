---
id: solidgate
title: 固门集成
sidebar_label: 固体门
sidebar_position: 5
---

# Solidgate 集成

Solidgate 是 Ever Works 模板中支持的四个支付提供商之一。它通过统一的提供商界面提供结帐会话、Webhook 处理、订阅管理和多货币支持。

## 源位置

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## 环境变量

通过设置以下环境变量来配置 Solidgate：

```bash
# Required
SOLIDGATE_API_KEY=your_api_key
SOLIDGATE_SECRET_KEY=your_secret_key
SOLIDGATE_MERCHANT_ID=your_merchant_id
SOLIDGATE_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=your_publishable_key
SOLIDGATE_API_BASE_URL=https://api.solidgate.com/v1
```

1中的0会在首次访问时验证这些内容。如果缺少任何必需的变量，它会抛出错误并显示一条描述性消息：

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## 提供商架构

0实现了1，使其可与 Stripe、LemonSqueezy 和 Polar 互换：

```ts
export class SolidgateProvider implements PaymentProviderInterface {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private publishableKey: string;
  private apiBaseUrl: string;
  private merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || '';
    this.publishableKey = config.options?.publishableKey || '';
    this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
    this.merchantId = config.options?.merchantId || '';
  }
  // ... interface methods
}
```

### 初始化

通过单例管理器访问 Solidgate 提供程序：

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## 结账流程

### 1. 客户端创建结账

客户端通过发布到 API 端点来发起结账：

```ts
const response = await fetch('/api/solidgate/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    mode: 'one_time',          // or 'subscription'
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      planId: 'pro_plan',
      planName: 'Pro Plan',
    },
  }),
});
```

### 2. 服务器验证并创建支付意图

结帐路径 (0) 执行以下步骤：

1. **通过 1 对用户进行身份验证**（NextAuth 会话）
2. **使用 Zod 验证**请求正文：
   ````ts
   const checkoutSchema = z.object({
     金额：z.number().positive(),
     货币: z.string().default('USD'),
     模式： z.enum(['one_time', '订阅']).default('one_time'),
     successUrl: z.string().url(),
     cancelUrl: z.string().url(),
     元数据：z.record（z.string（），z.any（））.可选（），
   });
   ````
3. **检索或创建** Solidgate 客户 ID
4. **通过 Solidgate API 创建付款意向**
5. **返回** SDK 的支付 ID 和客户端密钥

### 3. 响应结构

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_generated-uuid_secret"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

### 4. 客户提交付款单

使用返回的支付意图 ID 初始化 Solidgate React SDK。

## React SDK 集成

该模板将官方 0 包装在自定义组件中：

```tsx
// lib/payment/ui/solidgate/solidgate-elements.tsx
import Payment from '@solidgate/react-sdk';

export function SolidgatePaymentForm({
  onSuccess,
  onError,
  merchantId,
  paymentIntent,
  signature,
}: SolidgateElementsWrapperProps) {
  const merchantData = {
    merchant: merchantId,
    signature: signature,
    paymentIntent: paymentIntent,
  };

  return (
    <div className="solidgate-payment-form space-y-4">
      <Payment
        merchantData={merchantData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

0方法自动将商户 ID、支付意图和 HMAC 签名注入包装器中：

```ts
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(
      paymentIntent, merchantId
    );

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature,
    });
  };

  return {
    PaymentForm: SolidgatePaymentFormWithConfig,
    logo: '/assets/payment/solidgate/solidgate-logo.svg',
    cardBrands: solidgateCardBrands,
    supportedPaymentMethods: ['card'],
    translations: solidgateTranslations,
  };
}
```

## 签名生成

Solidgate 需要 HMAC-SHA512 签名来进行 API 身份验证和 Webhook 验证：

```ts
// Generic signature
private generateSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(data)
    .digest('hex');
}

// Payment intent signature for the React SDK
private generatePaymentIntentSignature(
  paymentIntent: string,
  merchantId: string
): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto
    .createHmac('sha512', this.secretKey)
    .update(data)
    .digest('hex');
}
```

## 客户管理

提供商遵循客户 ID 的三层查找策略：

1. **用户元数据** -- 检查0
2. **数据库** -- 通过2查询1表
3. **新建** -- 调用Solidgate3API并同步回数据库

```ts
async getCustomerId(user: User | null): Promise<string | null> {
  // 1. Check metadata
  const fromMetadata = this.extractCustomerIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;

  // 2. Check database
  const fromDatabase = await this.retrieveCustomerIdFromDatabase(user.id);
  if (fromDatabase) return fromDatabase;

  // 3. Create new customer
  const newCustomer = await this.createNewSolidgateCustomer(user);
  await this.synchronizePaymentAccount(user.id, newCustomer.id);
  return newCustomer.id;
}
```

## 订阅管理

### 创建订阅

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### 取消订阅

提供商支持期末取消和立即取消：

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

cancel 方法根据标志选择适当的 API 端点：

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### 状态映射

Solidgate 订阅状态映射到模板的 0 枚举：

| Solidgate 状态 |模板状态 |
|------------------|-----------------|
| 1 | 2 |
| 3 / 4 | 5 |
| 6 | 7 |
| 8 / 9 | 10 |
| 11 | 12 |
| 13 | 14 |
| 15 | 16 |

## 支持的卡品牌

提供商声明支持 Visa、Mastercard、Amex 和 Discover，并带有浅色/深色主题图标：

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## 本地化

该提供商包含英语和法语的内置翻译：

```ts
const solidgateTranslations = {
  en: {
    cardNumber: 'Card number',
    cardExpiry: 'Expiry date',
    cardCvc: 'CVV',
    submit: 'Pay securely',
    processingPayment: 'Processing your payment...',
    paymentSuccessful: 'Payment completed successfully',
    paymentFailed: 'Your payment could not be processed',
  },
  fr: {
    cardNumber: 'Numero de carte',
    cardExpiry: "Date d'expiration",
    // ...
  },
};
```

## 退款

通过提供商全额或部分退款：

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

在发送到 Solidgate API 之前，金额会转换为美分。

## 错误处理

所有提供程序方法都使用与结构化记录器一致的错误处理：

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

API错误包括用于调试的HTTP状态代码和响应正文：

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
