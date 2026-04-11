---
id: payment-config
title: Configuration des paiements
sidebar_label: Paiements
sidebar_position: 12
---

# Configuration des paiements

Le template prend en charge plusieurs fournisseurs de paiement et des flux de facturation flexibles. Cette référence couvre chaque constante, enum et option de configuration liée aux paiements.

## Constantes de paiement

Définies dans `lib/constants/payment.ts`.

### PaymentFlow

Détermine quand le paiement est collecté par rapport au processus de soumission.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Valeur | Description |
|--------|-------------|
| `pay_at_start` | L'utilisateur paye avant de soumettre ; l'élément est publié immédiatement |
| `pay_at_end` | L'utilisateur soumet d'abord ; le paiement est collecté après approbation admin |

### PaymentStatus

Suit l'état d'une tentative de paiement.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Options de fréquence de facturation.

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

Niveaux d'abonnement disponibles.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Passerelles de paiement prises en charge.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Variables d'environnement

### Stripe

| Variable | Requis | Description |
|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | Oui (si Stripe) | Clé secrète Stripe (`sk_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Oui (si Stripe) | Clé publique Stripe (`pk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Non | Secret de signature webhook Stripe |

### LemonSqueezy

| Variable | Requis | Description |
|----------|--------|-------------|
| `LEMON_SQUEEZY_API_KEY` | Oui (si LS) | Clé API LemonSqueezy |
| `LEMON_SQUEEZY_STORE_ID` | Oui (si LS) | ID de la boutique LemonSqueezy |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Non | Secret de signature webhook |

### Polar

| Variable | Requis | Description |
|----------|--------|-------------|
| `POLAR_ACCESS_TOKEN` | Oui (si Polar) | Token d'accès Polar |
| `POLAR_WEBHOOK_SECRET` | Non | Secret webhook Polar |

### Tarification produits (valeurs affichées)

| Variable d'env | Champ | Défaut |
|----------------|-------|--------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |
