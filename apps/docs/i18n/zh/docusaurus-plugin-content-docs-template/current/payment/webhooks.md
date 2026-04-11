---
id: webhooks
title: 支付网络钩子
sidebar_label: 网络钩子
sidebar_position: 7
---

# 支付 Webhooks

Ever Works 模板通过专用 API 路由处理来自所有四个受支持提供商的支付 Webhook。每个 Webhook 端点都处理签名验证、事件路由、订阅生命周期管理和电子邮件通知。

## 源位置

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Webhook 架构

所有提供商 webhook 路由都遵循相同的模式：

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

每个路由将业务逻辑委托给共享的 0，后者在更新数据库之前将特定于提供商的数据标准化为通用格式。

## Webhook 事件类型

该模板定义了所有提供者映射到的一组全面的事件类型：

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Solidgate Webhook 处理程序

### 端点

```
POST /api/solidgate/webhook
```

### 签名验证

Solidgate Webhook 路由从 0 或 1 标头读取签名：

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

提供商使用 HMAC-SHA512 验证签名：

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### 幂等性

该处理程序实现内存中幂等性检查以防止重复的事件处理：

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
在生产无服务器环境中，使用 Redis 或数据库表替换内存中的0，以实现跨实例的可靠幂等性。
:::

### 事件路由

验证后，事件将被路由到特定的处理程序：

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Solidgate 事件映射

提供程序将 Solidgate 特定的事件名称映射到模板的通用类型：

| Solidgate 活动 |模板事件|
|-----------------|----------------|
| 0 / 1 | 2 |
| 3 / 4 | 5 |
| 6 | 7 |
| 8 | 9 |
| 10 / 11 | 12 |
| 13 / 14 | 15 |

## Webhook订阅服务

所有 Webhook 处理程序都委托给共享的 16。该服务是根据提供者实例化的：

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### 数据标准化

该服务将 Webhook 有效负载标准化为通用 0 格式：

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### 处理程序方法

该服务为每个 Webhook 事件类型提供处理程序：

|方法|活动 |描述 |
|--------|--------|-------------|
| 0 |付款完成 |更新付款记录，触发确认电子邮件 |
| 1 |付款失败 |日志失败，可能会通知用户 |
| 2 |新订阅 |在数据库中创建订阅记录 |
| 3 |计划变更|更新订阅详情 |
| 4 |取消 |更新状态，设置取消日期 |
| 5 |定期付款 |延长订阅期限 |
| 6 |屡屡失败 |标记为逾期，通知用户 |
| 7 |审判结束|发送试用结束通知 |

## Webhook 响应格式

所有 Webhook 端点都返回一致的格式：

**成功（200）：**
```json
{ "received": true }
```

**客户端错误（400）：**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

返回 200 状态对于确认收到至关重要。如果返回 400 或 500，支付提供商通常会重试 Webhook 传送。

## 获取端点

每个 Webhook 路由还处理用于诊断目的的 GET 请求：

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## 在提供商仪表板中配置 Webhooks

### 固体门

1. 导航至 Solidgate 仪表板
2. 转到 **设置**，然后转到 **Webhooks**
3. 添加您的 webhook URL：0
4. 选择要订阅的事件：付款、订阅、退款
5. 将 webhook 密钥复制到您的 `SOLIDGATE_WEBHOOK_SECRET` 环境变量中

### Webhook URL 模式

每个提供商都有自己的专用端点：

|供应商|网络钩子 URL |
|----------|-------------|
|条纹| 2 |
|固体门| 3 |
|柠檬挤压 | 4 |
|极地 | 5 |

## 本地测试 Webhook

### 使用 ngrok 或类似的隧道

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

然后将 ngrok URL 配置为提供商仪表板中的 Webhook 端点（例如 0）。

### 使用curl进行手动测试

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## 错误处理

每个处理程序函数都包装在 try/catch 中，以防止单个处理程序失败导致 400/500 响应：

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

这可确保 webhook 始终通过 200 响应进行确认，即使内部处理失败也是如此。记录处理错误以供调查，而不会导致提供程序重试循环。

## 安全考虑

- **始终验证签名** -- 切勿在没有签名验证的情况下处理 Webhook 有效负载
- **使用原始正文** -- 解析原始请求文本以进行签名验证，而不是 JSON 解析的正文
- **幂等性** -- 实现重复数据删除以优雅地处理提供程序重试
- **日志记录** -- 记录 Webhook ID 和事件类型以进行审计跟踪
- **仅限 HTTPS** -- 在生产中必须通过 HTTPS 提供 Webhook 端点
