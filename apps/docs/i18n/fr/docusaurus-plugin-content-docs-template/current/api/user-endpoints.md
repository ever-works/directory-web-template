---
id: user-endpoints
title: "Points de terminaison Utilisateur"
sidebar_label: "Utilisateur"
sidebar_position: 21
---

# Points de terminaison Utilisateur

L'API utilisateur fournit des points de terminaison pour gérer les préférences des utilisateurs authentifiés, les détails d'abonnement, l'historique des paiements et les paramètres de localisation du profil. Tous les points de terminaison nécessitent une authentification par session.

## Aperçu

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/user/currency` | GET | Public | Détecter la devise utilisateur depuis les en-têtes |
| `/api/user/currency` | PUT | Utilisateur | Mettre à jour la préférence de devise |
| `/api/user/payments` | GET | Utilisateur | Obtenir l'historique des paiements depuis Stripe |
| `/api/user/plan-status` | GET | Utilisateur | Obtenir le statut du plan avec les informations d'expiration |
| `/api/user/subscription` | GET | Utilisateur | Obtenir les détails d'abonnement |
| `/api/user/profile/location` | GET | Utilisateur | Obtenir les paramètres de localisation enregistrés |
| `/api/user/profile/location` | PATCH | Utilisateur | Mettre à jour les paramètres de localisation |

## Détection et préférences de devise

### Détecter la devise

```
GET /api/user/currency
```

Détecte la devise de l'utilisateur à partir des en-têtes HTTP des fournisseurs CDN/proxy. Ce point de terminaison utilise une dégradation progressive — il retourne toujours 200 OK avec un code de devise valide, en retombant sur USD si la détection échoue. Aucune authentification n'est requise.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `provider` | string | `"smart"` | Fournisseur de détection : `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` |

**Réponse succès (200) :**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

| Champ | Type | Description |
|---|---|---|
| `currency` | string | Code de devise ISO 4217 (3 caractères), défaut `"USD"` |
| `country` | string ou null | Code pays ISO 3166-1 alpha-2, null si la détection a échoué |
| `detected` | boolean | Indique si la détection a réussi ou si la valeur est une valeur de repli |

En cas d'échec de la détection, la réponse retourne quand même 200 avec `"USD"` et `detected: false`.

**Source :** `template/app/api/user/currency/route.ts`

### Mettre à jour la préférence de devise

```
PUT /api/user/currency
```

Met à jour la devise et le pays préférés de l'utilisateur authentifié. Validé avec Zod en utilisant la liste `SUPPORTED_CURRENCIES` de `lib/config/billing`.

**Authentification :** Requise

**Corps de la requête :**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `currency` | string | Oui | Code de devise ISO 4217 (exactement 3 caractères, majuscules) |
| `country` | string ou null | Non | Code pays ISO 3166-1 alpha-2 (exactement 2 caractères) |

**Réponse succès (200) :**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Statut | Condition |
|---|---|
| 400 | JSON invalide, code de devise non pris en charge, ou format de pays invalide |
| 401 | Utilisateur non authentifié |
| 500 | Échec de la mise à jour |

**Source :** `template/app/api/user/currency/route.ts`

## Historique des paiements

### Obtenir l'historique des paiements

```
GET /api/user/payments
```

Récupère l'historique complet des paiements de l'utilisateur authentifié depuis Stripe. Récupère les factures et abonnements, les enrichit avec les métadonnées du plan, et retourne une liste triée des enregistrements de paiement.

**Authentification :** Requise

**Réponse succès (200) :**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

Détails de traitement importants :

- Filtre uniquement les factures `"paid"` et `"open"`
- Convertit les montants de centimes en unités monétaires principales (divise par 100)
- Trie par date, la plus récente en premier
- Mappe les statuts en valeurs lisibles : `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- Retourne un tableau vide `[]` si aucun client Stripe n'existe

**Source :** `template/app/api/user/payments/route.ts`

## Statut du plan

### Obtenir le statut du plan

```
GET /api/user/plan-status
```

Retourne des informations complètes sur le statut du plan, y compris les détails d'expiration. Utilisé par le frontend pour afficher les avertissements de plan et restreindre les fonctionnalités selon le plan.

**Authentification :** Requise

**Réponse succès (200) :**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `planId` | string | Le plan souscrit par l'utilisateur : `"free"`, `"standard"`, `"premium"` |
| `effectivePlan` | string | Le plan auquel l'utilisateur peut effectivement accéder (peut différer si expiré) |
| `isExpired` | boolean | Indique si l'abonnement a expiré |
| `expiresAt` | string ou null | Date d'expiration au format ISO |
| `daysUntilExpiration` | integer ou null | Jours jusqu'à l'expiration (négatif si déjà expiré) |
| `isInWarningPeriod` | boolean | Vrai si l'abonnement expire dans les 7 jours |
| `canAccessPlanFeatures` | boolean | Indique si l'utilisateur peut accéder aux fonctionnalités de son plan |
| `warningMessage` | string ou null | Message d'avertissement destiné à l'utilisateur le cas échéant |
| `status` | string ou null | Statut brut de l'abonnement |

Utilise `subscriptionService.getUserPlanWithExpiration()` de `lib/services/subscription.service`.

**Source :** `template/app/api/user/plan-status/route.ts`

## Détails d'abonnement

### Obtenir le statut d'abonnement

```
GET /api/user/subscription
```

Récupère des informations détaillées sur l'abonnement depuis Stripe, y compris l'abonnement actif actuel et l'historique complet des abonnements.

**Authentification :** Requise

**Réponse succès (200) — Abonnement actif :**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

Les abonnements actifs sont identifiés par `status === "active"` ou `status === "trialing"`. Les entrées d'historique peuvent inclure `cancelledAt` et `cancelReason` pour les abonnements annulés.

**Source :** `template/app/api/user/subscription/route.ts`

## Localisation du profil

### Obtenir les paramètres de localisation

```
GET /api/user/profile/location
```

Retourne la localisation par défaut enregistrée et la préférence de confidentialité de l'utilisateur authentifié.

**Authentification :** Requise (profil client)

**Réponse succès (200) :**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**Source :** `template/app/api/user/profile/location/route.ts`

### Mettre à jour les paramètres de localisation

```
PATCH /api/user/profile/location
```

Met à jour la localisation par défaut et la préférence de confidentialité de l'utilisateur authentifié. Validé avec le schéma `updateLocationSchema` de `lib/validations/user-location`.

**Corps de la requête :**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `defaultLatitude` | number ou null | Non | Coordonnée de latitude |
| `defaultLongitude` | number ou null | Non | Coordonnée de longitude |
| `defaultCity` | string ou null | Non | Nom de la ville |
| `defaultCountry` | string ou null | Non | Code pays |
| `locationPrivacy` | string | Non | Niveau de confidentialité : `"private"`, `"city"`, `"exact"` |

La latitude et la longitude doivent être fournies ensemble.

**Source :** `template/app/api/user/profile/location/route.ts`
