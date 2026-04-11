---
id: feature-config
title: Configuration des fonctionnalités
sidebar_label: Feature Config
sidebar_position: 3
---

# Configuration des fonctionnalités

Le template utilise un système de feature flags pour activer ou désactiver gracieusement des fonctionnalités selon la configuration système. Cela permet à l'application de fonctionner sans base de données (en servant uniquement du contenu statique) tout en activant progressivement des fonctionnalités à mesure que l'infrastructure devient disponible.

## Module Feature Flags

Les feature flags sont définis dans `lib/config/feature-flags.ts`.

### Interface FeatureFlags

```ts
interface FeatureFlags {
  /** Fonctionnalité de notes et avis utilisateurs */
  ratings: boolean;
  /** Commentaires utilisateurs sur les éléments */
  comments: boolean;
  /** Collection des éléments favoris des utilisateurs */
  favorites: boolean;
  /** Affichage des éléments mis en avant géré par l'admin */
  featuredItems: boolean;
  /** Sondages et collecte de feedback utilisateurs */
  surveys: boolean;
}
```

### Comment les drapeaux sont déterminés

Toutes les fonctionnalités actuelles dépendent de la disponibilité de la base de données. Une fonctionnalité est activée quand `DATABASE_URL` est configuré :

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Ce design permet au template de servir du contenu depuis le CMS basé sur Git sans aucune base de données, tandis que les fonctionnalités interactives dépendant de la base de données (notes, commentaires, favoris) sont désactivées automatiquement.

### Fonctions utilitaires

```ts
// Vérifier une fonctionnalité individuelle
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Afficher le composant commentaires
}

// Obtenir toutes les fonctionnalités activées
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();

// Obtenir toutes les fonctionnalités désactivées (utile pour le debug)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Vérifier que tout est prêt
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('La plateforme complète est opérationnelle');
}
```

### Référence complète de l'API

| Fonction | Retourne | Description |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | Tous les drapeaux sous forme d'objet booléen |
| `isFeatureEnabled(name)` | `boolean` | Vérifier une fonctionnalité par nom |
| `getEnabledFeatures()` | `string[]` | Tableau des noms de fonctionnalités activées |
| `getDisabledFeatures()` | `string[]` | Tableau des noms de fonctionnalités désactivées |
| `areAllFeaturesEnabled()` | `boolean` | Vrai si toutes les fonctionnalités sont activées |

## Rendu conditionnel

### Dans les Composants Serveur

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      {showRatings && <RatingsComponent item={item} />}
      {showComments && <CommentsSection item={item} />}
    </div>
  );
}
```
