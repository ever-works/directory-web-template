---
id: user-payment-endpoints
title: "User Payment API Reference"
sidebar_label: "User Payment API Reference"
---

# Benutzer-Zahlungs-Endpunkte – technischer Deep Dive

Dieser Deep Dive dokumentiert die vollständigen TypeScript-Antworttypen und Implementierungsdetails der benutzerbezogenen Zahlungsendpunkte.

## Währungsendpunkte

### Währung abrufen

**TypeScript-Antworttypen:**

```typescript
type CurrencyGetResponse = {
  success: true;
  data: {
    currency: string; // ISO-4217-Code, z. B. "EUR"
    source: 'stored' | 'detected' | 'default';
  };
} | { success: false; error: string };
```

### Währung aktualisieren

```typescript
type CurrencyUpdateRequest = {
  currency: string; // ISO-4217-Code
};

type CurrencyUpdateResponse = {
  success: true;
  data: { currency: string };
} | { success: false; error: string };
```

**Fetch-Beispiel:**

```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR' }),
});
const data: CurrencyUpdateResponse = await response.json();
```

## Zahlungsverlauf

**TypeScript-Antworttypen:**

```typescript
type Invoice = {
  id: string;
  amount: number;           // in Cent
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string | null;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;        // ISO-8601
};

type PaymentHistoryResponse = {
  success: true;
  data: {
    invoices: Invoice[];
    hasMore: boolean;
  };
} | { success: false; error: string };
```

**Fetch-Beispiel:**

```typescript
const response = await fetch('/api/user/payment-history');
const data: PaymentHistoryResponse = await response.json();

if (data.success) {
  const total = data.data.invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  console.log(`Gesamt bezahlt: ${total / 100} ${data.data.invoices[0]?.currency.toUpperCase()}`);
}
```

## Plan-Status

**TypeScript-Antworttypen:**

```typescript
type PlanWarning = {
  type: 'expiring_soon' | 'expired';
  message: string;
  severity: 'info' | 'warning' | 'error';
} | null;

type PlanStatusResponse = {
  success: true;
  data: {
    status: 'active' | 'inactive' | 'expired';
    planId: string | null;
    expiresAt: string | null;   // ISO-8601
    daysRemaining: number | null;
    warning: PlanWarning;
  };
} | { success: false; error: string };
```

**Warnlogik:**

```typescript
// Warnungen werden erzeugt, wenn:
// - daysRemaining <= 14 => type: 'expiring_soon', severity: 'warning'
// - daysRemaining <= 3  => type: 'expiring_soon', severity: 'error'
// - status === 'expired' => type: 'expired', severity: 'error'
```

## Abonnementdetails

**TypeScript-Antworttypen:**

```typescript
type SubscriptionProvider = 'stripe' | 'lemon_squeezy' | 'polar' | 'solidgate';

type SubscriptionDetails = {
  provider: SubscriptionProvider;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  currentPeriodEnd: string;  // ISO-8601
  cancelAtPeriodEnd: boolean;
  features: string[];
  trialEnd?: string | null;  // ISO-8601
};

type SubscriptionResponse = {
  success: true;
  data: SubscriptionDetails;
} | { success: false; error: string };
```

**Fetch-Beispiel:**

```typescript
const response = await fetch('/api/user/subscription');
const data: SubscriptionResponse = await response.json();

if (data.success) {
  const { status, provider, currentPeriodEnd } = data.data;
  console.log(`Abonnement aktiv bei ${provider} bis ${new Date(currentPeriodEnd).toLocaleDateString('de-DE')}`);
} else if (response.status === 404) {
  console.log('Kein aktives Abonnement');
}
```

## Profilstandort

**TypeScript-Antworttypen:**

```typescript
type LocationData = {
  city: string | null;
  country: string | null;   // ISO-3166-1 alpha-2
  latitude: number | null;
  longitude: number | null;
};

type LocationGetResponse = {
  success: true;
  data: LocationData;
} | { success: false; error: string };

type LocationUpdateRequest = Partial<LocationData>;

type LocationUpdateResponse = {
  success: true;
  data: LocationData;
} | { success: false; error: string };
```

**Quellen:**
- `template/app/api/user/currency/route.ts`
- `template/app/api/user/payment-history/route.ts`
- `template/app/api/user/plan-status/route.ts`
- `template/app/api/user/subscription/route.ts`
- `template/app/api/user/profile/location/route.ts`
