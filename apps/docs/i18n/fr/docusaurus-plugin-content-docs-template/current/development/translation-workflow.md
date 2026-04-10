---
id: translation-workflow
title: Flux de travail de traduction
sidebar_label: Flux de traduction
sidebar_position: 11
---

# Flux de travail de traduction

Le template utilise `next-intl` pour l'internationalisation (i18n) avec des fichiers de messages JSON. Le flux de travail de traduction garantit que tous les locales pris en charge restent synchronisés avec le fichier de référence anglais via un script de synchronisation automatisé.

## Locales pris en charge

Le template est livré avec 20 langues supportées :

| Code | Langue | Code | Langue |
|---|---|---|---|
| `en` | Anglais (référence) | `ko` | Coréen |
| `ar` | Arabe | `nl` | Néerlandais |
| `bg` | Bulgare | `pl` | Polonais |
| `de` | Allemand | `pt` | Portugais |
| `es` | Espagnol | `ru` | Russe |
| `fr` | Français | `th` | Thaï |
| `he` | Hébreu | `tr` | Turc |
| `hi` | Hindi | `uk` | Ukrainien |
| `id` | Indonésien | `vi` | Vietnamien |
| `it` | Italien | `ja` | Japonais |

## Structure des fichiers

```
messages/
├── en.json          # Anglais (référence — source de vérité)
├── ar.json          # Arabe
├── fr.json          # Français
├── de.json          # Allemand
├── es.json          # Espagnol
└── ...              # Toutes les autres langues
```

## Script de synchronisation des traductions

Le script `scripts/sync-translations.js` garantit que tous les fichiers de locale ont chaque clé définie dans `en.json`.

### Exécuter la synchronisation

```bash
# Depuis la racine du monorepo ou apps/web
pnpm sync-translations

# Ou directement
node scripts/sync-translations.js
```

### Ce que fait le script

1. Lit `messages/en.json` comme source de vérité
2. Pour chaque fichier de locale (`fr.json`, `de.json`, etc.) :
   - Ajoute les clés manquantes avec la valeur anglaise comme placeholder
   - Préserve les traductions existantes
   - Supprime les clés obsolètes non présentes dans `en.json`
3. Écrit les fichiers mis à jour sur le disque

## Ajouter des traductions

Pour ajouter un nouveau message traduit :

1. Ajoutez la clé à `messages/en.json` (référence anglaise)
2. Exécutez `pnpm sync-translations` pour ajouter la clé comme placeholder aux autres locales
3. Remplissez les traductions dans chaque fichier de locale

```json
// messages/en.json
{
  "HomePage": {
    "title": "Directory Web Template",
    "description": "Find the best tools and resources"
  }
}

// messages/fr.json
{
  "HomePage": {
    "title": "Directoire Web Template",
    "description": "Trouvez les meilleurs outils et ressources"
  }
}
```

## Utiliser les traductions dans les composants

```tsx
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('HomePage');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```
