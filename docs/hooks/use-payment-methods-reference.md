---
id: use-payment-methods-reference
title: usePaymentMethods Hook Reference
sidebar_label: usePaymentMethods
sidebar_position: 60
---

# usePaymentMethods

## Overview

`usePaymentMethods` is a comprehensive React hook for managing Stripe payment methods. It provides full CRUD operations (create, read, update, delete) for payment methods, along with the ability to set a default payment method. The hook leverages TanStack React Query for caching, optimistic updates, and automatic cache invalidation on mutations.

**Source:** `template/hooks/use-payment-methods.ts`

## Signature

```typescript
function usePaymentMethods(): UsePaymentMethodsReturn
```

### Parameters

This hook takes no parameters. It operates on the authenticated user's payment methods automatically.

## Return Values

The hook returns an object with the following properties:

### Data

| Property | Type | Description |
|---|---|---|
| `paymentMethods` | `PaymentMethodData[]` | Array of the user's payment methods. Defaults to `[]` if no data is loaded. |
| `hasPaymentMethods` | `boolean` | Whether the user has at least one payment method on file. |

### Status

| Property | Type | Description |
|---|---|---|
| `isLoading` | `boolean` | `true` while the initial payment methods fetch is in progress. |
| `isError` | `boolean` | `true` if the fetch failed. |
| `isSuccess` | `boolean` | `true` if the fetch completed successfully. |
| `error` | `PaymentMethodError \| null` | The error object if the fetch failed. |

### Actions

| Property | Type | Description |
|---|---|---|
| `refetch` | `() => void` | Manually refetch payment methods from the API. |
| `deletePaymentMethod` | `(paymentMethodId: string) => void` | Delete a payment method. Prompts the user with a confirmation dialog before proceeding. |
| `isDeleting` | `boolean` | `true` while a delete mutation is in progress. |
| `createPaymentMethod` | `(vars: { setupIntentId: string; setAsDefault?: boolean }) => void` | Create (attach) a new payment method using a SetupIntent ID. Fire-and-forget. |
| `createPaymentMethodAsync` | `(vars: { setupIntentId: string; setAsDefault?: boolean }) => Promise<PaymentMethodData>` | Async version of `createPaymentMethod` that returns a Promise. |
| `isCreating` | `boolean` | `true` while a create mutation is in progress. |
| `createError` | `PaymentMethodError \| null` | Error from the most recent create attempt. |
| `updatePaymentMethod` | `(vars: { paymentMethodId: string; updateData: any }) => void` | Update an existing payment method's details. |
| `updatePaymentMethodAsync` | `(vars: { paymentMethodId: string; updateData: any }) => Promise<PaymentMethodData>` | Async version of `updatePaymentMethod`. |
| `isUpdating` | `boolean` | `true` while an update mutation is in progress. |
| `updateError` | `PaymentMethodError \| null` | Error from the most recent update attempt. |
| `setDefaultPaymentMethod` | `(paymentMethodId: string) => void` | Set a payment method as the customer's default. |
| `setDefaultPaymentMethodAsync` | `(paymentMethodId: string) => Promise<{ success: boolean }>` | Async version of `setDefaultPaymentMethod`. |
| `isSettingDefault` | `boolean` | `true` while the set-default mutation is in progress. |
| `setDefaultError` | `PaymentMethodError \| null` | Error from the most recent set-default attempt. |

### Cache Management

| Property | Type | Description |
|---|---|---|
| `invalidateCache` | `() => void` | Mark the payment methods cache as stale and trigger a refetch. |
| `clearCache` | `() => void` | Completely remove the payment methods cache. |

## Type Definitions

### PaymentMethodData

```typescript
interface PaymentMethodData {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
    country?: string;
    fingerprint?: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  created: number;
  metadata?: Record<string, string>;
  is_default?: boolean;
}
```

### PaymentMethodsResponse

```typescript
interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethodData[];
  message?: string;
}
```

## Implementation Details

- **Query Key:** `['payment-methods']` (exported as `PAYMENT_METHODS_QUERY_KEY`)
- **Stale Time:** 2 minutes
- **Garbage Collection Time:** 10 minutes
- **Retry Logic:** Up to 3 retries. Authentication errors (401, 403) are not retried.
- **Optimistic Updates:** Delete, create, and update mutations apply optimistic cache updates before the server responds. On error, the cache is refetched to restore consistency.
- **Toast Notifications:** Success and error toasts are displayed automatically via `sonner`.
- **API Endpoints:**
  - `GET /api/stripe/payment-methods/list` -- Fetch all payment methods
  - `DELETE /api/stripe/payment-methods/delete` -- Delete a payment method
  - `POST /api/stripe/payment-methods/create` -- Create/attach a payment method
  - `PUT /api/stripe/payment-methods/update` -- Update a payment method
  - `PATCH /api/stripe/payment-methods/update` -- Set default payment method

## Exported Utility Functions

### getCardBrandInfo

Returns display metadata for a card brand.

```typescript
function getCardBrandInfo(brand: string): {
  color: string;   // Tailwind gradient classes
  text: string;     // Short brand label (e.g., 'VISA', 'MC', 'AMEX')
  bgColor: string;  // Tailwind background class
}
```

Supported brands: `visa`, `mastercard`, `amex` / `american_express`, `discover`. Unknown brands fall back to gray styling.

### isCardExpired

```typescript
function isCardExpired(month: number, year: number): boolean
```

Returns `true` if the card's expiration date is in the past.

### isCardExpiringSoon

```typescript
function isCardExpiringSoon(month: number, year: number): boolean
```

Returns `true` if the card expires within the next 2 months but is not yet expired.

## Usage Examples

### Listing Payment Methods

```tsx
import { usePaymentMethods, getCardBrandInfo } from '@/hooks/use-payment-methods';

function PaymentMethodsList() {
  const { paymentMethods, isLoading, hasPaymentMethods } = usePaymentMethods();

  if (isLoading) return <Spinner />;
  if (!hasPaymentMethods) return <p>No payment methods on file.</p>;

  return (
    <ul>
      {paymentMethods.map((method) => {
        const brand = getCardBrandInfo(method.card.brand);
        return (
          <li key={method.id}>
            <span className={brand.bgColor}>{brand.text}</span>
            **** {method.card.last4}
            {method.is_default && <Badge>Default</Badge>}
          </li>
        );
      })}
    </ul>
  );
}
```

### Deleting a Payment Method

```tsx
function DeleteButton({ methodId }: { methodId: string }) {
  const { deletePaymentMethod, isDeleting } = usePaymentMethods();

  return (
    <button onClick={() => deletePaymentMethod(methodId)} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Remove'}
    </button>
  );
}
```

### Setting a Default Payment Method

```tsx
function SetDefaultButton({ methodId }: { methodId: string }) {
  const { setDefaultPaymentMethod, isSettingDefault } = usePaymentMethods();

  return (
    <button onClick={() => setDefaultPaymentMethod(methodId)} disabled={isSettingDefault}>
      Set as Default
    </button>
  );
}
```

## Related Hooks

- [`useSetupIntent`](./use-setup-intent-reference.md) -- Create Stripe SetupIntents required before attaching new payment methods.
- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Create Stripe Checkout sessions for subscriptions.
- [`useBillingData`](./use-billing-data-reference.md) -- Fetch subscription and payment history data.
- [`useAutoRenewal`](./use-auto-renewal-reference.md) -- Manage subscription auto-renewal status.
