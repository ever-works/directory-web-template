---
id: webhook-api-endpoints
title: "Points de terminaison API Webhooks"
sidebar_label: "Webhooks"
sidebar_position: 27
---

# Points de terminaison API Webhooks

Le template prend en charge les gestionnaires de webhooks de paiement pour quatre fournisseurs : Stripe, LemonSqueezy, Polar et Solidgate. Chaque point de terminaison webhook traite les événements entrants de son fournisseur de paiement respectif, gérant la gestion du cycle de vie des abonnements, les notifications de paiement et la livraison des e-mails. Tous les points de terminaison vérifient les signatures des requêtes pour des raisons de sécurité.

## Aperçu

| Point de terminaison | Fournisseur | En-tête de signature | Description |
|---|---|---|---|
| `/api/stripe/webhook` | Stripe | `stripe-signature` | Traiter les événements de paiement et d'abonnement Stripe |
| `/api/lemonsqueezy/webhook` | LemonSqueezy | `x-signature` | Traiter les événements de paiement LemonSqueezy |
| `/api/polar/webhook` | Polar | `webhook-signature` | Traiter les événements de paiement Polar |
| `/api/solidgate/webhook` | Solidgate | `x-signature` | Traiter les événements de paiement Solidgate |

Tous les points de terminaison webhook acceptent uniquement les requêtes POST et retournent `{"received": true}` en cas de succès.

## Architecture partagée

Les quatre gestionnaires de webhooks suivent le même schéma général :

1. Lire le corps de la requête brut en texte (nécessaire pour la vérification de la signature)
2. Extraire la signature depuis les en-têtes spécifiques au fournisseur
3. Transmettre le corps et la signature à la méthode `handleWebhook()` du fournisseur pour la vérification et l'analyse
4. Router l'événement analysé vers le gestionnaire approprié selon le `WebhookEventType`
5. Exécuter la logique métier (mises à jour de la base de données, notifications e-mail)
6. Retourner `{"received": true}` pour accuser réception du webhook

### Types d'événements communs

L'énumération `WebhookEventType` de `lib/payment/types/payment-types` standardise les événements entre les fournisseurs :

| Type d'événement | Description |
|---|---|
| `SUBSCRIPTION_CREATED` | Nouvel abonnement activé |
| `SUBSCRIPTION_UPDATED` | Plan ou détails d'abonnement modifiés |
| `SUBSCRIPTION_CANCELLED` | Abonnement annulé |
| `PAYMENT_SUCCEEDED` | Paiement unique effectué |
| `PAYMENT_FAILED` | Tentative de paiement échouée |
| `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Paiement d'abonnement récurrent effectué |
| `SUBSCRIPTION_PAYMENT_FAILED` | Paiement d'abonnement récurrent échoué |
| `SUBSCRIPTION_TRIAL_ENDING` | Période d'essai sur le point d'expirer |
| `REFUND_SUCCEEDED` | Remboursement traité |
| `BILLING_PORTAL_SESSION_UPDATED` | Session du portail de facturation modifiée (Stripe uniquement) |

## Webhook Stripe

```
POST /api/stripe/webhook
```

Traite les événements webhook Stripe avec vérification de signature via l'en-tête `stripe-signature`. Il s'agit du gestionnaire webhook le plus complet, incluant des notifications e-mail pour tous les types d'événements et la gestion des abonnements aux publicités sponsors.

**En-tête requis :**

| En-tête | Description |
|---|---|
| `stripe-signature` | Signature webhook Stripe (format `t=...,v1=...`) |

**Événements pris en charge :**

| Événement Stripe | Type mappé | Actions |
|---|---|---|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | Mise à jour base de données, e-mail de bienvenue |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | Mise à jour base de données, e-mail de mise à jour |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | Mise à jour base de données, e-mail d'annulation |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Mise à jour base de données, e-mail de reçu |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | Mise à jour base de données, e-mail de relance |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | E-mail de confirmation |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | E-mail de notification d'échec |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | E-mail de fin d'essai |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Journalisation uniquement |

**Gestion des publicités sponsors :**

Les webhooks Stripe détectent les abonnements aux publicités sponsors via `metadata.type === "sponsor_ad"` dans les données d'abonnement. Lorsque détecté, des gestionnaires dédiés activent, annulent ou renouvellent les publicités sponsors au lieu de traiter les abonnements réguliers.

**Codes d'erreur :**

| Statut | Condition |
|---|---|
| 400 | En-tête `stripe-signature` manquant |
| 400 | Webhook non traité (signature invalide) |
| 400 | Échec du traitement du webhook |

**Source :** `template/app/api/stripe/webhook/route.ts`

## Webhook LemonSqueezy

```
POST /api/lemonsqueezy/webhook
```

Traite les événements webhook LemonSqueezy avec vérification de signature via l'en-tête `x-signature`. Utilise une fonction de mappage d'événements pour traduire les noms d'événements spécifiques à LemonSqueezy vers le `WebhookEventType` générique.

**En-tête requis :**

| En-tête | Description |
|---|---|
| `x-signature` | Signature webhook LemonSqueezy |

**Mappage des événements :**

| Événement LemonSqueezy | Type mappé |
|---|---|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

**Gestion des publicités sponsors :**

LemonSqueezy utilise `custom_data.type === "sponsor_ad"` ou `meta.custom_data.type === "sponsor_ad"` pour identifier les abonnements aux publicités sponsors.

**Source :** `template/app/api/lemonsqueezy/webhook/route.ts`

## Webhook Polar

```
POST /api/polar/webhook
```

Traite les événements webhook Polar avec vérification de signature multi-en-têtes. Polar utilise trois en-têtes pour la vérification de sécurité et délègue le routage des événements à un module routeur séparé.

**En-têtes requis :**

| En-tête | Description |
|---|---|
| `webhook-signature` | Signature HMAC SHA256 (format `v1,<hex_signature>`) |
| `webhook-timestamp` | Horodatage Unix de l'événement webhook |
| `webhook-id` | Identifiant unique pour la livraison du webhook |

**Événements pris en charge :**

| Événement Polar | Description |
|---|---|
| `checkout.succeeded` | Paiement finalisé |
| `checkout.failed` | Paiement échoué |
| `subscription.created` | Abonnement créé |
| `subscription.updated` | Abonnement mis à jour |
| `subscription.canceled` | Abonnement annulé |
| `invoice.paid` | Paiement de facture effectué |
| `invoice.payment_failed` | Paiement de facture échoué |

**Traitement :**

Contrairement aux autres fournisseurs, le gestionnaire webhook de Polar utilise une fonction `routeWebhookEvent()` distincte depuis un module `router` et un utilitaire `validateWebhookPayload()` pour la validation de la structure du payload avant la vérification de la signature.

**Source :** `template/app/api/polar/webhook/route.ts`

## Webhook Solidgate

```
POST /api/solidgate/webhook
```

Traite les événements webhook Solidgate avec vérification de signature. Inclut une protection d'idempotence en mémoire pour éviter le double traitement du même événement webhook.

**En-tête requis :**

| En-tête | Description |
|---|---|
| `x-signature` ou `solidgate-signature` | Signature webhook Solidgate |

**Idempotence :**

Le gestionnaire maintient un `Set` en mémoire des identifiants de webhooks traités. Les webhooks en double retournent `{"received": true}` sans retraitement. Les identifiants de webhooks expirent du cache après 24 heures.

**Note :** Le cache d'idempotence en mémoire ne persiste pas entre les invocations de fonctions serverless. Dans les environnements serverless en production, il convient de le remplacer par Redis ou une solution basée sur la base de données.

**Événements pris en charge :**

Le gestionnaire accepte à la fois les constantes `WebhookEventType` génériques et les noms d'événements basés sur des chaînes (ex. `WebhookEventType.PAYMENT_SUCCEEDED` et `"payment_succeeded"`).

| Événement | Actions |
|---|---|
| `payment_succeeded` | Enregistrer le paiement |
| `payment_failed` | Enregistrer l'échec |
| `subscription_created` | Créer l'abonnement |
| `subscription_updated` | Mettre à jour l'abonnement |
| `subscription_cancelled` | Annuler l'abonnement |
| `subscription_payment_succeeded` | Enregistrer le paiement d'abonnement |
| `subscription_payment_failed` | Enregistrer l'échec du paiement d'abonnement |
| `subscription_trial_ending` | Gérer la fin d'essai |
| `refund_processed` | Journaliser le remboursement |

**Point de terminaison GET :**

Solidgate expose également un gestionnaire GET qui retourne un message d'information sur le point de terminaison webhook :

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**Source :** `template/app/api/solidgate/webhook/route.ts`

## Notifications e-mail

Le gestionnaire webhook Stripe envoie les notifications e-mail les plus complètes. Tous les fournisseurs délèguent à `WebhookSubscriptionService` pour les opérations de base de données, mais les modèles d'e-mail varient selon le fournisseur.

| Type d'e-mail | Déclencheur |
|---|---|
| Bienvenue / Nouvel abonnement | Abonnement créé |
| Mise à jour de l'abonnement | Plan d'abonnement modifié |
| Confirmation d'annulation | Abonnement annulé |
| Reçu de paiement | Paiement d'abonnement ou unique réussi |
| Paiement échoué / Relance | Tentative de paiement échouée |
| Fin d'essai | Période d'essai sur le point d'expirer |

La configuration des e-mails est chargée depuis `lib/config/server-config` via `getEmailConfig()` et inclut le nom de l'entreprise, l'URL de l'entreprise et l'adresse e-mail de support.

## Détails d'implémentation clés

- **Vérification de signature :** Tous les fournisseurs vérifient les signatures webhook avant de traiter les événements. Les signatures invalides entraînent une réponse 400.
- **Analyse du corps brut :** Les webhooks lisent le corps de la requête en texte via `request.text()` plutôt que `request.json()` car la vérification de signature nécessite le payload brut non modifié.
- **WebhookSubscriptionService :** La classe partagée `WebhookSubscriptionService` gère les opérations de base de données pour les événements du cycle de vie des abonnements entre tous les fournisseurs.
- **Détection des publicités sponsors :** Les webhooks Stripe et LemonSqueezy détectent les abonnements aux publicités sponsors via les métadonnées et les routent vers des gestionnaires séparés pour l'activation, l'annulation et le renouvellement des publicités.
- **Gestion gracieuse des erreurs :** Les échecs d'envoi d'e-mail sont capturés et journalisés mais ne font pas retourner d'erreur au webhook. Le webhook accuse toujours réception pour éviter les tentatives de relance du fournisseur.
