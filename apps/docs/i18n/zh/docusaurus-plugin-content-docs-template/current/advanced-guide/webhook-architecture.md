---
id: webhook-architecture
title: Webhook架构
sidebar_label: 网络钩子
sidebar_position: 3
---

# Webhook 架构

本指南涵盖了用于处理来自 Stripe、LemonSqueezy 和其他支付提供商等外部服务的事件的 Webhook 处理系统，包括签名验证、事件路由、幂等性和重试处理。

## 架构概述

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## 支付提供商 Webhooks

该模板使用0模式来支持多个支付提供商：

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### Webhook 路由处理程序模式

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## 签名验证

### Stripe Webhook

Stripe 使用带有时间戳的 HMAC-SHA256 签名来防止重放攻击：

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy Webhooks

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## 事件路由

### 事件类型到处理程序的映射

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## 幂等性

### 防止重复处理

Webhook 提供商可能会重新发送事件。使用事件 ID 来防止重复处理：

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## 重试处理

### 提供者重试行为

|供应商|重试时间表 |最大重试次数 |超时 |
|----------|----------------|-------------|---------|
|条纹| 3 天指数退避 | ~16 次尝试 | 20 秒 |
|柠檬挤压 |指数退避| 5 次尝试 | 15 秒 |

### 重试安全处理程序的最佳实践

1. **快速回200**：5秒内确认回执。减轻繁重的处理工作。
2. **幂等处理程序**：确保重新处理同一事件产生相同的结果。
3. **永久失败返回4xx**：无效签名返回400。提供商不会重试。
4. **对于暂时性故障返回 5xx**：如果您的数据库暂时不可用，则返回 500。提供商将重试。

## 死信队列模式

对于重复处理失败的事件，实现死信模式：

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## 安全考虑

1. **在处理任何 Webhook 负载之前始终验证签名**。
2. **使用时序安全比较** (0) 来防止时序攻击。
3. **在 JSON 解析之前读取原始正文**——签名验证需要接收到的确切字节。
4. **将 Webhook 端点**限制为仅 POST。
5. **不要在客户端代码或日志中暴露 Webhook 机密**。
6. **在执行操作之前验证事件数据** - 不要盲目信任 Webhook 有效负载。

## 性能考虑因素

1. **快速确认**：在提供者的超时窗口内返回200。将繁重的工作转移到后台作业。
2. **数据库写入**：最大限度地减少 webhook 处理程序中的数据库操作。尽可能批量更新。
3. **日志记录**：记录事件 ID 和类型以进行调试，但避免记录完整的有效负载（可能包含 PII）。

## 故障排除

### 签名验证失败

1. 确保您正在阅读 **原始请求正文**（未解析的 JSON）。
2. 检查 Webhook 密钥是否与提供商仪表板中的密钥匹配。
3. 验证在请求正文到达处理程序之前没有中间件修改请求正文。

### 已处理重复事件

1. 如上所述使用事件 ID 实现幂等性。
2. 检查 `webhookEvents` 表中是否有重复条目。
3. 对事件 ID 列使用数据库级唯一约束。

### 事件超时

1. 使用2 将繁重的处理移至后台作业。
2. 立即确认webhook并异步处理。
3. 如果需要，增加外部 API 调用的超时时间。

## 相关文档

- [错误恢复模式](./error-recovery-patterns.md)
- [速率限制架构](./rate-limiting-architecture.md)
- [API客户端架构](./api-client-architecture.md)
