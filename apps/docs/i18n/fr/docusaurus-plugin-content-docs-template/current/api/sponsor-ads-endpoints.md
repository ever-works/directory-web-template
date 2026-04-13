---
id: sponsor-ads-endpoints
title: "Points de terminaison API Publicités Sponsors"
sidebar_label: "Publicités Sponsors"
sidebar_position: 16
---

# Points de terminaison API Publicités Sponsors

L'API Publicités Sponsors gère le cycle de vie complet des annonces sponsorisées : création, paiement, renouvellement, annulation et statistiques. Elle s'intègre avec plusieurs fournisseurs de paiement (Stripe, LemonSqueezy, Polar) pour la facturation.

**Fichiers sources :**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Résumé des points de terminaison

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/sponsor-ads` | Aucune | Obtenir les publicités sponsors actives (public) |
| POST | `/api/sponsor-ads/checkout` | Session | Créer une session de paiement |
| GET | `/api/sponsor-ads/user` | Session | Lister les publicités sponsors de l'utilisateur |
| POST | `/api/sponsor-ads/user` | Session | Soumettre une nouvelle publicité sponsor |
| GET | `/api/sponsor-ads/user/{id}` | Session | Obtenir une publicité sponsor spécifique |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Session | Annuler une publicité sponsor |
| POST | `/api/sponsor-ads/user/{id}/renew` | Session | Renouveler une publicité sponsor |
| GET | `/api/sponsor-ads/user/stats` | Session | Obtenir les statistiques publicitaires de l'utilisateur |

---

## GET `/api/sponsor-ads`

Retourne les publicités sponsors actives avec les données de l'élément associé pour l'affichage public. **Aucune authentification requise.**

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `limit` | entier | Non | 10 | Nombre max d'annonces à retourner (1-50) |

### Réponse : 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## POST `/api/sponsor-ads/checkout`

Crée une session de paiement pour une publicité sponsor approuvée. Compatible avec les fournisseurs Stripe, LemonSqueezy et Polar.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `sponsorAdId` | string | **Oui** | Identifiant de la publicité sponsor approuvée |
| `successUrl` | string | Non | URL de redirection après un paiement réussi |
| `cancelUrl` | string | Non | URL de redirection après un paiement annulé |

### Sécurité : Prévention des redirections ouvertes

Les URL de redirection sont validées par rapport à l'origine de l'application afin de prévenir les attaques par redirection ouverte :

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Les URL invalides sont silencieusement remplacées par des valeurs par défaut sécurisées.

### Réponse : 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Réponses d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Identifiant de publicité manquant, annonce hors statut `pending_payment`, ou configuration de prix manquante |
| 401 | Non authentifié |
| 403 | L'utilisateur n'est pas propriétaire de cette publicité sponsor |
| 404 | Publicité sponsor introuvable |

---

## GET `/api/sponsor-ads/user`

Retourne une liste paginée des publicités sponsors appartenant à l'utilisateur authentifié.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `page` | entier | Non | 1 | Numéro de page |
| `limit` | entier | Non | 10 | Éléments par page |
| `status` | string | Non | -- | Filtre : `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | Non | -- | Filtrer par intervalle de facturation |
| `search` | string | Non | -- | Filtre de recherche textuelle |

Les paramètres de requête sont validés à l'aide du schéma Zod `querySponsorAdsSchema`.

### Réponse : 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## POST `/api/sponsor-ads/user`

Crée une nouvelle soumission de publicité sponsor. L'annonce démarre dans un état en attente d'approbation par l'administrateur.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `itemSlug` | string | **Oui** | Slug de l'élément à sponsoriser |
| `itemName` | string | **Oui** | Nom d'affichage de l'élément |
| `itemIconUrl` | string | Non | URL de l'icône |
| `itemCategory` | string | Non | Catégorie de l'élément |
| `itemDescription` | string | Non | Description (500 caractères max) |
| `interval` | `"weekly"` ou `"monthly"` | **Oui** | Intervalle d'abonnement |

### Réponse : 201 Created

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Soumission en doublon

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Récupère une publicité sponsor spécifique appartenant à l'utilisateur authentifié. Retourne 404 si l'annonce n'existe pas ou appartient à un autre utilisateur (afin d'éviter toute fuite d'information).

---

## POST `/api/sponsor-ads/user/{id}/cancel`

Annule une publicité sponsor. Seules les annonces avec le statut `pending_payment`, `pending` ou `active` peuvent être annulées.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `cancelReason` | string | Non | Motif d'annulation (500 caractères max) |

### Réponse : 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Réponses d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Impossible d'annuler une annonce avec le statut actuel |
| 403 | L'utilisateur n'est pas propriétaire de cette publicité sponsor |
| 404 | Publicité sponsor introuvable |

---

## POST `/api/sponsor-ads/user/{id}/renew`

Crée une session de paiement pour renouveler une publicité sponsor active ou expirée. Seules les annonces avec le statut `active` ou `expired` peuvent être renouvelées.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `successUrl` | string | Non | URL de redirection après le paiement |
| `cancelUrl` | string | Non | URL de redirection en cas d'annulation |

### Réponse : 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## GET `/api/sponsor-ads/user/stats`

Retourne les statistiques des publicités sponsors de l'utilisateur authentifié, incluant la répartition par statut, la distribution par intervalle et les métriques de revenus.

### Réponse : 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Les valeurs de revenus sont exprimées en **unités monétaires mineures** (par exemple, centimes pour l'USD).

---

## Configuration du fournisseur de paiement

Le fournisseur de paiement actif est déterminé par `NEXT_PUBLIC_PAYMENT_PROVIDER` (valeur par défaut : `"stripe"`). Chaque fournisseur nécessite ses propres variables d'environnement pour les identifiants de prix ou de variante :

| Fournisseur | Variable hebdomadaire | Variable mensuelle |
|------------|----------------------|-------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Fichiers sources associés

| Fichier | Rôle |
|---------|------|
| `template/app/api/sponsor-ads/route.ts` | Point de terminaison public des annonces actives |
| `template/app/api/sponsor-ads/checkout/route.ts` | Création de session de paiement |
| `template/app/api/sponsor-ads/user/route.ts` | Liste et création des annonces utilisateur |
| `template/app/api/sponsor-ads/user/[id]/route.ts` | Récupération d'une annonce spécifique |
| `template/app/api/sponsor-ads/user/[id]/cancel/route.ts` | Annulation d'une annonce |
| `template/app/api/sponsor-ads/user/[id]/renew/route.ts` | Renouvellement d'une annonce |
| `template/app/api/sponsor-ads/user/stats/route.ts` | Statistiques utilisateur |
| `template/lib/services/sponsor-ad.service.ts` | Couche de logique métier |
| `template/lib/validations/sponsor-ad.ts` | Schémas de validation Zod |
| `template/lib/payment/config/payment-provider-manager.ts` | Fabrique de fournisseur de paiement |
