---
id: payment-endpoints
title: Points de terminaison API de paiement
sidebar_label: Endpoints de paiement
sidebar_position: 3
---

# Points de terminaison API de paiement

Le modèle prend en charge quatre fournisseurs de paiement : **Stripe**, **Lemon Squeezy**, **Polar** et **Solidgate**. Chaque fournisseur possède son propre ensemble de routes API pour le paiement, la gestion des abonnements et la gestion des webhooks. Un groupe générique `/api/payment` fournit des requêtes d'abonnement indépendantes du fournisseur.

## Stripe (`/api/stripe`)

Stripe est l'intégration la plus complète avec 17 gestionnaires de routes couvrant le paiement, les abonnements, les méthodes de paiement, les intentions de configuration et les produits.

### Paiement

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/stripe/checkout` | Créer une session Stripe Checkout |

### Abonnements

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/stripe/subscription` | Obtenir l'abonnement actif de l'utilisateur actuel |
| `POST` | `/api/stripe/subscription` | Créer un nouvel abonnement |
| `GET` | `/api/stripe/subscriptions` | Lister tous les abonnements de l'utilisateur |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Annuler un abonnement |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Réactiver un abonnement annulé |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Mettre à jour un abonnement (changer de plan) |
| `POST` | `/api/stripe/subscription/portal` | Créer une session du portail client Stripe |

### Méthodes de paiement

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Lister les méthodes de paiement enregistrées |
| `POST` | `/api/stripe/payment-methods/create` | Ajouter une nouvelle méthode de paiement |
| `PUT` | `/api/stripe/payment-methods/update` | Mettre à jour la méthode de paiement par défaut |
| `DELETE` | `/api/stripe/payment-methods/delete` | Supprimer une méthode de paiement |
| `GET` | `/api/stripe/payment-methods/[id]` | Obtenir les détails d'une méthode de paiement |

### Intentions de configuration

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/stripe/setup-intent` | Créer une intention de configuration pour enregistrer une méthode de paiement |
| `GET` | `/api/stripe/setup-intent/[id]` | Obtenir le statut d'une intention de configuration |

### Intentions de paiement

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/stripe/payment-intent` | Créer une intention de paiement unique |

### Produits

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/stripe/products` | Lister les produits/prix Stripe disponibles |

### Webhook

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/stripe/webhook` | Gestionnaire d'événements webhook Stripe |

Le gestionnaire de webhook Stripe traite les événements tels que :
- `checkout.session.completed` — Finalisation du paiement
- `customer.subscription.created` — Nouvel abonnement
- `customer.subscription.updated` — Modifications de l'abonnement
- `customer.subscription.deleted` — Annulation de l'abonnement
- `invoice.payment_succeeded` — Paiement réussi
- `invoice.payment_failed` — Paiement échoué

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy fournit un modèle d'abonnement plus simple avec 7 endpoints.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Créer un paiement Lemon Squeezy |
| `GET` | `/api/lemonsqueezy/list` | Lister les abonnements de l'utilisateur |
| `POST` | `/api/lemonsqueezy/cancel` | Annuler un abonnement |
| `POST` | `/api/lemonsqueezy/reactivate` | Réactiver un abonnement annulé |
| `POST` | `/api/lemonsqueezy/update` | Mettre à jour les détails de l'abonnement |
| `POST` | `/api/lemonsqueezy/update-plan` | Changer de plan d'abonnement |
| `POST` | `/api/lemonsqueezy/webhook` | Gestionnaire de webhook Lemon Squeezy |

### Événements webhook

Le webhook Lemon Squeezy traite :
- `subscription_created` — Nouvel abonnement
- `subscription_updated` — Modifications du plan
- `subscription_cancelled` — Annulation
- `subscription_payment_success` — Confirmation de paiement
- `subscription_payment_failed` — Échec de paiement

## Polar (`/api/polar`)

Polar fournit 5 endpoints pour le paiement et la gestion des abonnements.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/polar/checkout` | Créer une session de paiement Polar |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Annuler un abonnement |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Réactiver un abonnement |
| `POST` | `/api/polar/subscription/portal` | Accéder au portail d'abonnement |
| `POST` | `/api/polar/webhook` | Gestionnaire de webhook Polar |

## Solidgate (`/api/solidgate`)

Solidgate est l'intégration la plus minimale avec 2 endpoints.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/solidgate/checkout` | Créer un paiement Solidgate |
| `POST` | `/api/solidgate/webhook` | Gestionnaire de webhook Solidgate |

## Paiement générique (`/api/payment`)

Points de terminaison de paiement indépendants du fournisseur pour gérer les abonnements quel que soit le prestataire de paiement sous-jacent.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/payment/[subscriptionId]` | Obtenir les détails d'un abonnement par ID |
| `GET` | `/api/payment/account` | Obtenir le compte de paiement de l'utilisateur actuel |
| `GET` | `/api/payment/account/[userId]` | Obtenir le compte de paiement d'un utilisateur spécifique (admin) |

## Sécurité des webhooks

Tous les endpoints webhook implémentent une vérification de signature spécifique au fournisseur :

### Stripe

Les webhooks Stripe vérifient l'en-tête `stripe-signature` en utilisant la variable d'environnement `STRIPE_WEBHOOK_SECRET` et la méthode `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

Les webhooks Lemon Squeezy vérifient l'en-tête `x-signature` en utilisant HMAC-SHA256 avec le `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

Les webhooks Polar vérifient les signatures des requêtes en utilisant le `POLAR_WEBHOOK_SECRET`.

### Solidgate

Les webhooks Solidgate utilisent la vérification de signature intégrée de leur SDK avec le `SOLIDGATE_SECRET_KEY`.

## Variables d'environnement

### Stripe

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clé secrète API Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe (côté client) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook |

### Lemon Squeezy

| Variable | Description |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Clé API Lemon Squeezy |
| `LEMONSQUEEZY_STORE_ID` | Identifiant de la boutique |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Secret de signature du webhook |

### Polar

| Variable | Description |
|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Jeton d'accès API Polar |
| `POLAR_WEBHOOK_SECRET` | Secret de signature du webhook |
| `POLAR_ORGANIZATION_ID` | Identifiant de l'organisation |
