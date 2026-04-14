---
id: sponsor-ad-types
title: Définitions des types d'annonces sponsorisées
sidebar_label: Types d'annonces de sponsoring
sidebar_position: 8
---

# Définitions des types d'annonces sponsorisées

**Source :** `lib/types/sponsor-ad.ts`

Le module d'annonce de sponsor définit les types pour le système de parrainage et de publicité. Les sponsors peuvent promouvoir des articles via des emplacements publicitaires hebdomadaires ou mensuels avec un cycle de vie complet depuis le paiement jusqu'à l'approbation, l'activation et l'expiration.

## Tapez les alias

### `SponsorAdStatus`

États du cycle de vie d'une publicité de sponsor :

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Statut|Descriptif|
|--------|-------------|
|`pending_payment`|Annonce créée, en attente de paiement|
|`pending`|Paiement reçu, en attente de l'approbation de l'administrateur|
|`rejected`|L'administrateur a rejeté la demande de parrainage|
|`active`|Approuvé et actuellement affiché|
|`expired`|La période active est terminée|
|`cancelled`|Annulé par le sponsor ou l'administrateur|

### `SponsorAdIntervalType`

Options d'intervalle de facturation :

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Types d'affichage

### `SponsorWithItem`

Une annonce de sponsor avec ses données d'article associées pour l'affichage de l'interface utilisateur. Le champ `item` peut être `null` si l'élément lié n'existe plus.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Types de demande

### `CreateSponsorAdRequest`

Charge utile pour la création d'une nouvelle annonce de sponsor.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Charge utile pour la mise à jour d'une annonce de sponsor existante. Utilisé principalement par les opérations d'administration.

```typescript
interface UpdateSponsorAdRequest {
  id: string;
  status?: SponsorAdStatus;
  startDate?: Date;
  endDate?: Date;
  subscriptionId?: string;
  customerId?: string;
}
```

### `ApproveSponsorAdRequest`

Charge utile pour l’approbation d’une annonce de sponsor en attente.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Charge utile pour rejeter une annonce de sponsor avec une raison.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Charge utile pour annuler une annonce de sponsor active ou en attente.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Types de réponses

### `SponsorAdResponse`

Réponse syndicale discriminée pour les opérations publicitaires à sponsor unique :

```typescript
type SponsorAdResponse =
  | {
      success: true;
      data: SponsorAd;
      message?: string;
    }
  | { success: false; error: string };
```

### `SponsorAdListResponse`

Réponse syndicale discriminée concernant les listes d'annonces paginées de sponsors :

```typescript
type SponsorAdListResponse =
  | {
      success: true;
      data: { sponsorAds: SponsorAd[] };
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };
```

## Options de requête

### `SponsorAdListOptions`

Paramètres de requête pour filtrer et paginer les listes d'annonces de sponsors.

```typescript
interface SponsorAdListOptions {
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

## Types de statistiques

### `SponsorAdStats`

Statistiques agrégées pour le tableau de bord des publicités des sponsors.

```typescript
interface SponsorAdStats {
  overview: {
    total: number;
    pendingPayment: number;
    pending: number;
    active: number;
    rejected: number;
    expired: number;
    cancelled: number;
  };
  byInterval: {
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  };
}
```

## Types de tableaux de bord

### `SponsorAdDashboardResponse`

Réponse combinée pour le tableau de bord du sponsor administrateur, comprenant la liste, la pagination et les statistiques.

```typescript
interface SponsorAdDashboardResponse {
  success: boolean;
  data: {
    sponsorAds: SponsorAd[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
    };
    stats: SponsorAdStats;
  };
  error?: string;
}
```

## Types étendus

### `SponsorAdWithUser`

Annonce de sponsor enrichie avec les données des utilisateurs et des évaluateurs, utilisée dans les vues détaillées de l'administrateur.

```typescript
interface SponsorAdWithUser extends SponsorAd {
  user?: {
    id: string;
    email: string | null;
    image: string | null;
  };
  reviewer?: {
    id: string;
    email: string | null;
  } | null;
}
```

## Exemples d'utilisation

### Créer une annonce de sponsor

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtrage des annonces sponsors

```typescript
import type { SponsorAdListOptions } from '@/lib/types/sponsor-ad';

const options: SponsorAdListOptions = {
  status: 'active',
  interval: 'monthly',
  sortBy: 'startDate',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};
```

### Gérer les réponses syndicales discriminées

```typescript
import type { SponsorAdResponse } from '@/lib/types/sponsor-ad';

async function approveSponsor(id: string): Promise<void> {
  const res = await fetch(`/api/admin/sponsor-ads/${id}/approve`, {
    method: 'POST',
  });
  const data: SponsorAdResponse = await res.json();

  if (data.success) {
    console.log('Approved:', data.data.id);
    if (data.message) {
      console.log('Message:', data.message);
    }
  } else {
    console.error('Failed:', data.error);
  }
}
```

### Affichage des statistiques du tableau de bord

```typescript
import type { SponsorAdStats } from '@/lib/types/sponsor-ad';

function renderStats(stats: SponsorAdStats) {
  const activeRate = stats.overview.total > 0
    ? (stats.overview.active / stats.overview.total * 100).toFixed(1)
    : '0';

  return {
    totalAds: stats.overview.total,
    activePercentage: `${activeRate}%`,
    weeklyRevenue: `$${stats.revenue.weeklyRevenue.toFixed(2)}`,
    monthlyRevenue: `$${stats.revenue.monthlyRevenue.toFixed(2)}`,
  };
}
```

## Notes de conception

### Cycle de vie des publicités des sponsors

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Le sponsor crée une annonce et initie le paiement (`pending_payment`)
2. Une fois le paiement terminé, l'annonce est déplacée vers `pending` pour examen par l'administrateur.
3. L'administrateur approuve (`active`) ou rejette (`rejected`)
4. Les annonces actives expirent automatiquement lorsque `endDate` passe
5. Les sponsors ou les administrateurs peuvent annuler à tout moment

### Réponses syndicales discriminées

Les types `SponsorAdResponse` et `SponsorAdListResponse` utilisent des unions discriminées basées sur le champ `success`. Cela permet une gestion des erreurs de type sécurisé dans TypeScript :

```typescript
// TypeScript narrows the type based on success check
if (response.success) {
  // TypeScript knows response.data exists here
  console.log(response.data);
} else {
  // TypeScript knows response.error exists here
  console.error(response.error);
}
```

## Types associés

- [`ItemData`](./item-types.md) - L'élément sponsorisé (référencé par `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Type de schéma de base de données de `lib/db/schema`
