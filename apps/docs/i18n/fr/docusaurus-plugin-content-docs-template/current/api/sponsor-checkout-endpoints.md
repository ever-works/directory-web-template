---
id: sponsor-checkout-endpoints
title: "Référence API Pubs Sponsors et Paiement"
sidebar_label: "Pubs Sponsors & Paiement"
sidebar_position: 59
---

# Référence API Pubs Sponsors et Paiement

## Vue d'ensemble

Les points de terminaison Publicités Sponsors gèrent le cycle de vie complet des emplacements publicitaires sponsorisés sur les éléments du répertoire. Cela comprend la consultation des annonces actives, la soumission de nouvelles demandes de sponsoring, la gestion des annonces appartenant à l'utilisateur, le traitement des paiements via plusieurs fournisseurs (Stripe, LemonSqueezy, Polar), ainsi que la gestion des annulations et des renouvellements. Le flux de paiement prend en charge les intervalles de facturation hebdomadaires et mensuels.

## Points de terminaison

### GET /api/sponsor-ads

Retourne la liste des publicités sponsors actuellement actives avec leurs données d'élément associées pour l'affichage public.

**Requête**

| Paramètre | Type    | Dans  | Description                                                         |
| --------- | ------- | ----- | ------------------------------------------------------------------- |
| limit     | entier  | query | Nombre max de publicités sponsors à retourner (défaut : 10, max : 50) |

**Réponse**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/sponsor-ads/user

Retourne une liste paginée des publicités sponsors soumises par l'utilisateur authentifié.

**Requête**

| Paramètre | Type    | Dans  | Description                                                                                       |
| --------- | ------- | ----- | ------------------------------------------------------------------------------------------------- |
| page      | entier  | query | Numéro de page (défaut : 1)                                                                        |
| limit     | entier  | query | Éléments par page (défaut : 10)                                                                    |
| status    | string  | query | Filtre : `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| interval  | string  | query | Filtre : `"weekly"`, `"monthly"`                                                                   |
| search    | string  | query | Terme de recherche                                                                                |

**Réponse**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Crée une nouvelle soumission de publicité sponsor pour l'utilisateur authentifié. La soumission démarre dans un état en attente d'approbation par l'administrateur.

**Requête**

```typescript
{
  itemSlug: string;          // Slug de l'élément à sponsoriser (requis)
  itemName: string;          // Nom de l'élément (requis)
  itemIconUrl?: string;      // URL de l'icône
  itemCategory?: string;     // Catégorie de l'élément
  itemDescription?: string;  // Description (500 caractères max)
  interval: "weekly" | "monthly"; // Intervalle de facturation (requis)
}
```

**Réponse**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### GET /api/sponsor-ads/user/stats

Retourne les statistiques des publicités sponsors de l'utilisateur authentifié, incluant le nombre par statut, la distribution par intervalle et les métriques de revenus.

**Requête**

Aucun paramètre requis. Authentification via cookie de session.

**Réponse**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // En unités monétaires mineures (centimes)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### GET `/api/sponsor-ads/user/{id}`

Retourne une publicité sponsor spécifique appartenant à l'utilisateur authentifié.

**Requête**

| Paramètre | Type   | Dans | Description                               |
| --------- | ------ | ---- | ----------------------------------------- |
| id        | string | path | Identifiant de la publicité sponsor (requis) |

**Réponse**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

Crée une session de paiement pour une publicité sponsor approuvée. La publicité sponsor doit être dans le statut `pending_payment` et appartenir à l'utilisateur authentifié.

**Requête**

```typescript
{
  sponsorAdId: string;      // Identifiant de la publicité sponsor approuvée (requis)
  successUrl?: string;      // URL de redirection après un paiement réussi
  cancelUrl?: string;       // URL de redirection après un paiement annulé
}
```

**Réponse**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Identifiant de session de paiement du fournisseur
    checkoutUrl: string; // URL vers laquelle rediriger l'utilisateur pour le paiement
    provider: string; // "stripe", "lemonsqueezy" ou "polar"
  }
  message: "Checkout session created successfully";
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### POST `/api/sponsor-ads/user/{id}/cancel`

Annule une publicité sponsor appartenant à l'utilisateur authentifié. Il est uniquement possible d'annuler les annonces avec le statut `pending_payment`, `pending` ou `active`.

**Requête**

```typescript
{
  cancelReason?: string;   // Motif d'annulation facultatif (500 caractères max)
}
```

**Réponse**

```typescript
{
  success: true;
  data: SponsorAd; // La publicité sponsor annulée
  message: "Sponsor ad cancelled successfully";
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### POST `/api/sponsor-ads/user/{id}/renew`

Crée une session de paiement pour renouveler une publicité sponsor active ou expirée. Seules les annonces avec le statut `active` ou `expired` peuvent être renouvelées.

**Requête**

```typescript
{
  successUrl?: string;     // URL de redirection après un paiement réussi
  cancelUrl?: string;      // URL de redirection après un paiement annulé
}
```

**Réponse**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Exemple**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Authentification

| Point de terminaison                              | Authentification requise                            |
| ------------------------------------------------- | --------------------------------------------------- |
| GET /api/sponsor-ads                              | Public                                              |
| GET /api/sponsor-ads/user                         | Session requise                                     |
| POST /api/sponsor-ads/user                        | Session requise                                     |
| GET /api/sponsor-ads/user/stats                   | Session requise                                     |
| `GET /api/sponsor-ads/user/{id}`                  | Session requise (vérification de propriété)         |
| POST /api/sponsor-ads/checkout                    | Session requise (vérification de propriété)         |
| `POST /api/sponsor-ads/user/{id}/cancel`          | Session requise (vérification de propriété)         |
| `POST /api/sponsor-ads/user/{id}/renew`           | Session requise (vérification de propriété)         |

Tous les points de terminaison spécifiques à l'utilisateur vérifient la propriété -- toute tentative d'accès à la publicité sponsor d'un autre utilisateur retourne `404` (pour les GET) ou `403` (pour les actions).

## Réponses d'erreur

| Statut | Description                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Entrée invalide, soumission en doublon, statut non annulable/non renouvelable, configuration de prix manquante ou JSON mal formé |
| 401    | Non autorisé -- aucune session authentifiée                                                                                      |
| 403    | Interdit -- l'utilisateur n'est pas propriétaire de la publicité sponsor                                                        |
| 404    | Publicité sponsor introuvable                                                                                                    |
| 500    | Erreur interne du serveur -- échec du fournisseur de paiement ou erreur de base de données                                      |

## Limitation du débit

Aucune limitation de débit explicite. Les URL de redirection dans les points de terminaison de paiement et de renouvellement sont validées par rapport au domaine de l'application afin de prévenir les vulnérabilités de redirection ouverte. Le fournisseur de paiement actif est déterminé par la variable d'environnement `NEXT_PUBLIC_PAYMENT_PROVIDER` (valeur par défaut : Stripe).

## Points de terminaison associés

- [Points de terminaison de paiement utilisateur](./user-payment-endpoints) -- Historique des paiements et gestion des abonnements utilisateur
