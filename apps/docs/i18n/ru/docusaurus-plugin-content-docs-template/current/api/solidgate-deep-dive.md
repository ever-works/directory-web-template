---
id: solidgate-deep-dive
title: Solidgate 深入探讨
sidebar_label: 固体门
sidebar_position: 7
---

# Solidgate 深入探讨

此页面涵盖完整的 Solidgate 集成，包括结帐创建、Webhook 处理、付款验证和嵌入式付款表单。

## 概述

Solidgate 是一家支付基础设施提供商，支持托管结帐流程和用于内联支付表单的嵌入式 React SDK。该集成通过 Solidgate API 创建支付意图，并支持具有幂等性保护的 Webhook 驱动的事件处理。 Solidgate 使用 HMAC-SHA512 进行 Webhook 签名验证。

## 路由表

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`POST`|`/api/solidgate/checkout`|需要会话|创建结帐会话/付款意图|
|`POST`|`/api/solidgate/webhook`|需要签名|处理传入的 Webhook 事件|
|`GET`|`/api/solidgate/webhook`|无|返回端点文档|

## 结帐创建 (POST)

### 请求正文

结帐端点使用 Zod 验证进行严格的输入检查：

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Payment amount
  currency: z.string().default('USD'),         // Currency code
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // Redirect URL
  cancelUrl: z.string().url(),                 // Cancel URL
  metadata: z.record(z.string(), z.any()).optional()
});
```

### 请求示例

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### 它是如何运作的

1. 通过`auth()` 对用户进行身份验证
2. 使用 Zod 架构验证请求正文
3. 解决或创建 Solidgate 客户
4. 通过 Solidgate API 创建付款意图
5. 返回嵌入式 SDK 的支付 ID 和客户端密钥

### 提供商实施

`createPaymentIntent`方法构造API请求：

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Amount in cents
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### 成功响应 (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

`url` 字段包含用于初始化 Solidgate React SDK 的支付意图 ID。

## 嵌入付款表格

Solidgate 为内联支付表单提供了 React SDK。提供者生成SDK初始化的签名：

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

`getUIComponents()` 方法返回配置的付款表单包装器：

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Webhook 处理

### 签名验证

Solidgate 使用 HMAC-SHA512 进行 Webhook 签名。签名头可以是`x-signature`或`solidgate-signature`：

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

提供者根据原始主体验证签名：

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### 幂等性保护

Webhook 端点包括内存中幂等性保护，以防止重复处理：

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acknowledge without processing
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::注意
在生产 Serverless 环境中，内存中的 Set 应替换为 Redis 或数据库表以实现跨实例幂等性。
:::

### 事件映射

|固体门事件|内部型|
|----------------|---------------|
|`payment.succeeded` / `payment.completed`|`payment_succeeded`|
|`payment.failed` / `payment.declined`|`payment_failed`|
|`subscription.created`|`subscription_created`|
|`subscription.updated`|`subscription_updated`|
|`subscription.cancelled` / `subscription.canceled`|`subscription_cancelled`|
|`refund.processed` / `refund.completed`|`refund_succeeded`|

### 处理程序结构

每个处理程序委托给 `WebhookSubscriptionService`：

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

`WebhookSubscriptionService` 使用 `SOLIDGATE` 提供程序常量进行初始化：

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## 付款验证

提供商支持通过 Solidgate API 进行付款验证：

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## 订阅管理

### 创建订阅

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Returns SubscriptionInfo with mapped status
}
```

### 取消订阅

支持立即取消和期末取消：

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### 更新订阅

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## API通讯

所有 Solidgate API 调用都使用集中式 `makeApiRequest` 方法：

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Error handling and JSON parsing
}
```

## 错误处理

|状态|错误|原因|
|--------|-------|-------|
| 400 |`Invalid request body`|Zod 验证失败|
| 400 |`Invalid JSON`|请求正文格式错误|
| 400 |`Failed to create customer`|客户解决失败|
| 400 |`No signature provided`|Webhook 缺少签名|
| 400 |`Webhook not processed`|签名验证失败|
| 401 |`Unauthorized`|没有经过身份验证的会话|
| 500 |`Failed to create checkout session`|Solidgate API 错误|

Zod 验证错误返回详细的字段级消息：

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## 配置要求

|变量|必填|描述|
|----------|----------|-------------|
|`SOLIDGATE_API_KEY`|是的|Solidgate API 密钥|
|`SOLIDGATE_SECRET_KEY`|是的|签名生成的密钥|
|`SOLIDGATE_WEBHOOK_SECRET`|是的|Webhook 签名秘密|
|`SOLIDGATE_PUBLISHABLE_KEY`|是的|React SDK 的可发布密钥|
|`SOLIDGATE_MERCHANT_ID`|是的|商户标识符|
|`SOLIDGATE_API_BASE_URL`|否|API 基本 URL（默认：`https://api.solidgate.com/v1`）|

## 安全考虑

- HMAC-SHA512 用于 webhook 和支付意图签名验证
- 密钥和 Webhook 秘密永远不会暴露给客户端
- 幂等性保护可防止重复的 Webhook 处理
- Zod 验证确保对结帐端点进行严格的输入检查
- 错误堆栈跟踪仅包含在开发模式中
- `safeErrorMessage` 实用程序清理生产中的错误消息

## 相关页面

- [Stripe Checkout 深入探究](./stripe-checkout-deep-dive.md)
- [LemonSqueezy 深度潜水](./lemonsqueezy-deep-dive.md)
- [极地深潜](./polar-deep-dive.md)
- [支付提供商架构](./ payment-provider-architecture.md)
