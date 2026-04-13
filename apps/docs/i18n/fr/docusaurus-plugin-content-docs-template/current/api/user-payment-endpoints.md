---
id: user-payment-endpoints
title: "Référence API Paiements Utilisateur"
sidebar_label: "Paiements Utilisateur"
sidebar_position: 55
---

# Référence API Paiements Utilisateur

## Aperçu

Les points de terminaison de paiement utilisateur gèrent les préférences de devise, l'historique des paiements, le statut du plan et les détails d'abonnement pour les utilisateurs authentifiés. La détection de devise utilise les en-têtes CDN/proxy (Cloudflare, Vercel, CloudFront, Fastly) pour déterminer automatiquement la devise de l'utilisateur. Les données de paiement et d'abonnement proviennent de Stripe.

## Points de terminaison

### GET /api/user/currency

Détecte et retourne la préférence de devise de l'utilisateur à partir des en-têtes HTTP des fournisseurs CDN/proxy. Retourne toujours `200 OK` avec une dégradation progressive — retombe sur USD si la détection échoue.

**Requête**

| Paramètre | Type   | Dans    | Description |
|-----------|--------|-------|-------------|
| provider  | string | query | Fournisseur de détection : `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (défaut : `"smart"`) |

**Réponse**
```typescript
{
  currency: string;     // Code ISO 4217, ex. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, ex. "US", "FR", ou null si la détection a échoué
  detected: boolean;    // true si détecté depuis les en-têtes, false si valeur de repli
}
```

**Exemple**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/user/currency

Met à jour la préférence de devise et de pays de l'utilisateur authentifié. Nécessite une session valide.

**Requête**
```typescript
{
  currency: string;       // Code ISO 4217, exactement 3 caractères, requis
  country?: string | null; // ISO 3166-1 alpha-2, exactement 2 caractères, optionnel
}
```

**Réponse**
```typescript
{
  currency: string;       // Code de devise mis à jour
  country: string | null; // Code pays mis à jour ou null
}
```

**Exemple**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### GET /api/user/payments

Récupère l'historique complet des paiements de l'utilisateur authentifié depuis Stripe. Retourne les factures avec les détails du plan, les intervalles de facturation et les liens de facture, triées par date (la plus récente en premier).

**Requête**

Aucun paramètre requis. Authentification via cookie de session.

**Réponse**
```typescript
Array<{
  id: string;                // Identifiant de facture Stripe
  date: string;              // Date ISO 8601
  amount: number;            // En unités monétaires principales (ex. 29.99)
  currency: string;          // Code de devise en majuscules
  plan: string;              // Nom d'affichage du plan
  planId: string;            // Identifiant du plan
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // Identifiant d'abonnement associé
  description: string;       // ex. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // URL de la facture hébergée
  invoicePdf: string | null; // URL de téléchargement du PDF de la facture
  invoiceNumber: string | null;
  period_end: string | null;   // Fin de la période de facturation (ISO 8601)
  period_start: string | null; // Début de la période de facturation (ISO 8601)
}>
```

**Exemple**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### GET /api/user/plan-status

Retourne le plan actuel de l'utilisateur avec les détails complets d'expiration, y compris le plan effectif (ce à quoi l'utilisateur peut réellement accéder), les périodes d'avertissement et le statut d'accès aux fonctionnalités.

**Requête**

Aucun paramètre requis. Authentification via cookie de session.

**Réponse**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // Peut différer si expiré
    isExpired: boolean;
    expiresAt: string | null;          // Date ISO 8601
    daysUntilExpiration: number | null; // Négatif si déjà expiré
    isInWarningPeriod: boolean;        // true si expire dans les 7 jours
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // Texte d'avertissement destiné à l'utilisateur
    status: string | null;             // Statut brut de l'abonnement
  };
}
```

**Exemple**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### GET /api/user/subscription

Récupère des informations complètes sur l'abonnement, y compris les détails de l'abonnement actif actuel et l'historique complet des abonnements depuis Stripe.

**Requête**

Aucun paramètre requis. Authentification via cookie de session.

**Réponse**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Uniquement quand aucun client Stripe n'est trouvé
  currentSubscription?: {
    id: string;                        // Identifiant d'abonnement Stripe
    planId: string;                    // Identifiant de prix Stripe
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Unités monétaires principales
    currency: string;                  // En majuscules
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**Exemple**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```

## Authentification

- **GET /api/user/currency** : Public (aucune auth requise) — détecte la devise depuis les en-têtes.
- **PUT /api/user/currency** : Nécessite une session authentifiée.
- **GET /api/user/payments** : Nécessite une session authentifiée.
- **GET /api/user/plan-status** : Nécessite une session authentifiée.
- **GET /api/user/subscription** : Nécessite une session authentifiée.

## Codes d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Code de devise invalide, format de code pays invalide, ou payload JSON malformé |
| 401 | Non autorisé — aucune session authentifiée |
| 500 | Erreur interne du serveur — échec de l'API Stripe ou erreur de base de données |

## Limitation du débit

Aucune limitation de débit explicite. Le point de terminaison de détection de devise retourne toujours `200 OK` pour une dégradation progressive. Les données de paiement et d'abonnement sont récupérées directement depuis Stripe avec une limite de 100 enregistrements par requête.

## Points de terminaison associés

- [Points de terminaison de fonctionnalités de configuration](./config-feature-endpoints) — Vérifier la disponibilité des fonctionnalités selon le plan
