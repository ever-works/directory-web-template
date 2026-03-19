---
id: how-to-add-a-payment-provider
title: "How to Add a Payment Provider"
sidebar_label: "Add a Payment Provider"
sidebar_position: 2
---

# How to Add a Payment Provider

This guide explains how to integrate a new payment provider into the template. The payment system uses a **provider pattern** with a factory, allowing you to add new providers without modifying existing code.

We will use a fictional provider called **PayFast** as the running example.

## Prerequisites

- Understanding of the existing payment architecture in `lib/payment/`
- API credentials for the payment provider you are integrating
- Familiarity with the `PaymentProviderInterface` type definitions
- Development environment with `pnpm dev` running

---

## Architecture Overview

The payment system follows this structure:

```
lib/payment/
  types/
    payment-types.ts         # Shared interfaces and types
  lib/
    providers/
      stripe-provider.ts     # Stripe implementation
      polar-provider.ts      # Polar implementation
      lemonsqueezy-provider.ts
      solidgate-provider.ts
    payment-provider-factory.ts  # Factory that creates providers
    payment-service.ts           # High-level payment operations
  config/
    payment-provider-manager.ts  # Provider configuration manager
  ui/
    stripe/                      # Provider-specific UI components
```

---

## Step 1: Understand the Provider Interface

Every payment provider must implement `PaymentProviderInterface` from `lib/payment/types/payment-types.ts`:

```ts
export interface PaymentProviderInterface {
  // Payment lifecycle
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(
    payload: any,
    signature: string,
    rawBody?: string,
    timestamp?: string,
    webhookId?: string,
  ): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration
  getClientConfig(): ClientConfig;
}
```

---

## Step 2: Create the Provider Implementation

Create a new file in `lib/payment/lib/providers/`:

```ts
// lib/payment/lib/providers/payfast-provider.ts

import { User } from '@supabase/supabase-js';
import {
  PaymentProviderInterface,
  PaymentIntent,
  PaymentVerificationResult,
  WebhookResult,
  CreatePaymentParams,
  ClientConfig,
  PaymentProviderConfig,
  CreateCustomerParams,
  CustomerResult,
  CreateSubscriptionParams,
  SubscriptionInfo,
  UpdateSubscriptionParams,
  SetupIntent,
} from '../../types/payment-types';
import { paymentAccountClient } from '../client/payment-account-client';

// Provider-specific configuration
export interface PayFastConfig extends PaymentProviderConfig {
  merchantId: string;
  merchantSecret: string;
  passphrase?: string;
  sandbox?: boolean;
}

export class PayFastProvider implements PaymentProviderInterface {
  private merchantId: string;
  private merchantSecret: string;
  private passphrase: string;
  private sandbox: boolean;

  constructor(config: PayFastConfig) {
    this.merchantId = config.merchantId;
    this.merchantSecret = config.merchantSecret;
    this.passphrase = config.passphrase || '';
    this.sandbox = config.sandbox ?? false;
  }

  // --- Payment Intent ---
  async createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntent> {
    // Call PayFast API to create a payment
    const response = await fetch(this.getBaseUrl() + '/payments', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        description: params.description,
      }),
    });

    const data = await response.json();

    return {
      id: data.payment_id,
      clientSecret: data.client_token,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
    };
  }

  async confirmPayment(
    paymentId: string,
    _paymentMethodId: string,
  ): Promise<PaymentIntent> {
    // Implementation specific to PayFast confirmation flow
    const response = await fetch(
      this.getBaseUrl() + `/payments/${paymentId}/confirm`,
      { method: 'POST', headers: this.getHeaders() },
    );
    const data = await response.json();

    return {
      id: data.payment_id,
      clientSecret: '',
      amount: data.amount,
      currency: data.currency,
      status: data.status === 'completed' ? 'succeeded' : 'pending',
    };
  }

  async verifyPayment(
    paymentId: string,
  ): Promise<PaymentVerificationResult> {
    const response = await fetch(
      this.getBaseUrl() + `/payments/${paymentId}`,
      { headers: this.getHeaders() },
    );
    const data = await response.json();

    return {
      verified: data.status === 'completed',
      status: data.status,
      paymentId: data.payment_id,
    };
  }

  async createSetupIntent(_user: User | null): Promise<SetupIntent> {
    // Implement if provider supports saved payment methods
    return { clientSecret: '', id: '' };
  }

  // --- Customer Management ---
  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<CustomerResult> {
    const response = await fetch(this.getBaseUrl() + '/customers', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        email: params.email,
        name: params.name,
      }),
    });
    const data = await response.json();

    return {
      customerId: data.customer_id,
      email: params.email,
    };
  }

  hasCustomerId(user: User | null): boolean {
    return !!user?.user_metadata?.payfast_customer_id;
  }

  async getCustomerId(user: User | null): Promise<string | null> {
    if (!user?.id) return null;

    // Check database for existing customer
    const account = await paymentAccountClient.getPaymentAccount(
      user.id,
      'payfast',
    );
    if (account?.customerId) return account.customerId;

    // Create new customer if none exists
    const result = await this.createCustomer({
      email: user.email || '',
      name: user.user_metadata?.name || '',
      userId: user.id,
    });

    await paymentAccountClient.upsertPaymentAccount(
      user.id,
      'payfast',
      result.customerId,
    );

    return result.customerId;
  }

  // --- Subscriptions ---
  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<SubscriptionInfo> {
    // Implement subscription creation
    throw new Error('PayFast subscriptions not yet implemented');
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<SubscriptionInfo> {
    throw new Error('PayFast subscription cancellation not yet implemented');
  }

  async updateSubscription(
    params: UpdateSubscriptionParams,
  ): Promise<SubscriptionInfo> {
    throw new Error('PayFast subscription update not yet implemented');
  }

  // --- Webhooks ---
  async handleWebhook(
    payload: any,
    signature: string,
  ): Promise<WebhookResult> {
    // Verify the webhook signature
    const isValid = this.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    // Process the event
    switch (payload.event_type) {
      case 'payment.completed':
        return { success: true, message: 'Payment processed' };
      case 'subscription.created':
        return { success: true, message: 'Subscription created' };
      default:
        return { success: true, message: `Unhandled event: ${payload.event_type}` };
    }
  }

  // --- Refunds ---
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    const response = await fetch(
      this.getBaseUrl() + `/payments/${paymentId}/refund`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ amount }),
      },
    );
    return response.json();
  }

  // --- Client Config ---
  getClientConfig(): ClientConfig {
    return {
      publishableKey: this.merchantId,
      provider: 'payfast',
    };
  }

  async createCustomCheckout(): Promise<string> {
    return '';
  }

  // --- Private Helpers ---
  private getBaseUrl(): string {
    return this.sandbox
      ? 'https://sandbox.payfast.example.com/api/v1'
      : 'https://api.payfast.example.com/v1';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.merchantSecret}`,
    };
  }

  private verifyWebhookSignature(
    payload: any,
    signature: string,
  ): boolean {
    // Implement signature verification per provider docs
    return signature.length > 0;
  }
}
```

---

## Step 3: Register in the Factory

Update `lib/payment/lib/payment-provider-factory.ts` to include your new provider:

```ts
// lib/payment/lib/payment-provider-factory.ts

import { PaymentProviderInterface, PaymentProviderConfig } from '../types/payment-types';
import { StripeProvider } from './providers/stripe-provider';
import { LemonSqueezyProvider, LemonSqueezyConfig } from './providers/lemonsqueezy-provider';
import { PolarProvider, PolarConfig } from './providers/polar-provider';
import { SolidgateProvider } from './providers/solidgate-provider';
import { PayFastProvider, PayFastConfig } from './providers/payfast-provider'; // Add import

export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar' | 'payfast'; // Add type

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig,
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      case 'payfast':                                          // Add case
        return new PayFastProvider(config as unknown as PayFastConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

---

## Step 4: Add Configuration

Add environment variables for your provider and update the config schema.

### Environment Variables

```bash
# .env.local
PAYFAST_MERCHANT_ID=your-merchant-id
PAYFAST_MERCHANT_SECRET=your-merchant-secret
PAYFAST_WEBHOOK_SECRET=your-webhook-secret
PAYFAST_SANDBOX=true
```

### Config Schema

If the project uses a config schema (e.g., in `lib/config/schemas/`), add validation for the new provider:

```ts
// lib/config/schemas/payment.schema.ts (extend existing)

payfast: {
  merchantId: z.string().optional(),
  merchantSecret: z.string().optional(),
  webhookSecret: z.string().optional(),
  sandbox: z.boolean().default(true),
},
```

---

## Step 5: Add the Webhook Route

Create an API route to receive webhooks from the provider:

```ts
// app/api/payfast/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PaymentProviderFactory } from '@/lib/payment/lib/payment-provider-factory';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-payfast-signature') || '';
    const payload = JSON.parse(rawBody);

    const provider = PaymentProviderFactory.createProvider('payfast', {
      apiKey: process.env.PAYFAST_MERCHANT_SECRET!,
      webhookSecret: process.env.PAYFAST_WEBHOOK_SECRET,
      options: {
        merchantId: process.env.PAYFAST_MERCHANT_ID,
        sandbox: process.env.PAYFAST_SANDBOX === 'true',
      },
    });

    const result = await provider.handleWebhook(payload, signature, rawBody);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayFast webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
```

---

## Step 6: Add UI Components (Optional)

If the provider needs custom checkout UI elements, create them in `lib/payment/ui/`:

```tsx
// lib/payment/ui/payfast/payfast-checkout.tsx

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface PayFastCheckoutProps {
  clientToken: string;
  amount: number;
  currency: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function PayFastCheckout({
  clientToken,
  amount,
  currency,
  onSuccess,
  onError,
}: PayFastCheckoutProps) {
  const handlePayment = async () => {
    try {
      // Initialize PayFast SDK and process payment
      // This varies per provider -- refer to their SDK docs
      onSuccess('payment-id');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pay {currency} {(amount / 100).toFixed(2)} via PayFast
      </p>
      <Button onClick={handlePayment} className="w-full">
        Pay with PayFast
      </Button>
    </div>
  );
}
```

---

## Step 7: Update the Payment Constants

Add your provider to the shared payment constants:

```ts
// lib/constants/payment.ts (extend existing enum)

export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
  PAYFAST = 'payfast', // Add new provider
}
```

---

## File Structure Summary

```
lib/payment/
  lib/
    providers/
      payfast-provider.ts          # New -- provider implementation
    payment-provider-factory.ts    # Modified -- added PayFast case
  ui/
    payfast/
      payfast-checkout.tsx         # New -- checkout UI (optional)
  types/
    payment-types.ts               # Unchanged -- interface reference
app/api/
  payfast/
    webhook/
      route.ts                     # New -- webhook handler
lib/constants/
  payment.ts                       # Modified -- added enum value
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Factory throws "unsupported provider" | Ensure you added the case to the `switch` statement and updated the `SupportedProvider` type. |
| Webhook signature verification fails | Check that you are reading the raw body (`request.text()`) before parsing JSON. Many providers sign the raw string. |
| Customer ID not persisted | Call `paymentAccountClient.upsertPaymentAccount()` after creating a customer. |
| Provider not available in checkout UI | Check that the provider is included in the `PaymentProvider` enum and enabled in the config. |
| Sandbox vs. production mismatch | Use environment variables to toggle sandbox mode; never hardcode URLs. |

---

## Testing Your Provider

1. **Unit test the provider class** -- mock HTTP calls and verify each method returns correct types.
2. **Test webhooks locally** using a tool like ngrok to forward provider callbacks to `localhost`.
3. **Verify the factory** creates your provider correctly with `PaymentProviderFactory.createProvider('payfast', config)`.
4. **End-to-end test** by going through the full checkout flow in sandbox mode.

---

## Checklist

- [ ] Provider class implements all methods of `PaymentProviderInterface`
- [ ] Provider registered in `PaymentProviderFactory`
- [ ] `SupportedProvider` type updated
- [ ] Environment variables documented and added to `.env.example`
- [ ] Config schema updated with provider-specific options
- [ ] Webhook API route created and signature verification implemented
- [ ] Provider added to `PaymentProvider` enum in constants
- [ ] UI checkout component created (if applicable)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] Tested in sandbox/test mode end-to-end

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
