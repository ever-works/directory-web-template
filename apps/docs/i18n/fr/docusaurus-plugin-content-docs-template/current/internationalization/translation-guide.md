---
id: translation-guide
title: Guide de traduction
sidebar_label: Guide de traduction
sidebar_position: 2
---

# Guide de traduction

Ce guide explique comment utiliser et étendre le système de traduction multilingue d'Ever Works alimenté par next-intl.

## Langues prises en charge

Ever Works prend en charge 13+ langues dès le départ :

| Langue | Code | Note |
|--------|------|------|
| 🇬🇧 Anglais | `en` | Par défaut |
| 🇫🇷 Français | `fr` | |
| 🇪🇸 Espagnol | `es` | |
| 🇩🇪 Allemand | `de` | |
| 🇨🇳 Chinois | `zh` | |
| 🇸🇦 Arabe | `ar` | Support RTL |
| 🇮🇱 Hébreu | `he` | Support RTL |
| 🇮🇹 Italien | `it` | |
| 🇵🇹 Portugais | `pt` | |
| 🇷🇺 Russe | `ru` | |
| 🇳🇱 Néerlandais | `nl` | |
| 🇵🇱 Polonais | `pl` | |
| 🇧🇬 Bulgare | `bg` | |

## Utilisation

### Dans les composants React

```typescript
import { useTranslations } from 'next-intl';

export function MonComposant() {
  const t = useTranslations('help'); // 'help' est l'espace de noms

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

### Structure des fichiers de traduction

Les fichiers de traduction se trouvent dans le dossier `apps/web/messages/` :

```
messages/
├── en.json    # Anglais (par défaut)
├── fr.json    # Français
├── es.json    # Espagnol
├── de.json    # Allemand
├── zh.json    # Chinois
├── ar.json    # Arabe
└── ...        # Autres langues
```

### Format JSON

```json
{
  "help": {
    "PAGE_TITLE": "Centre d'aide",
    "PAGE_SUBTITLE": "Guide complet pour utiliser Ever Works",
    "SECTION": {
      "NESTED_KEY": "Traduction imbriquée"
    }
  }
}
```

## Ajouter de nouvelles traductions

### Étape 1 : Créer le fichier de langue

Créez un nouveau fichier JSON dans `apps/web/messages/` :

```bash
cp apps/web/messages/en.json apps/web/messages/ja.json
```

### Étape 2 : Traduire les valeurs

Traduisez chaque valeur clé dans le nouveau fichier de langue tout en conservant toutes les clés.

### Étape 3 : Enregistrer la locale

Ajoutez la nouvelle locale dans la configuration `apps/web/i18n/routing.ts` :

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'ja'],  // Ajouter 'ja'
  defaultLocale: 'en',
});
```

### Étape 4 : Ajouter au sélecteur de langue

Mettez à jour `components/language-switcher.tsx` pour inclure la nouvelle langue.

## Interpolation de variables

```typescript
// messages/fr.json
{
  "welcome": "Bonjour, {name}!"
}

// Composant
const t = useTranslations();
t('welcome', { name: 'Marie' })  // → "Bonjour, Marie!"
```

## Pluralisation

```typescript
// messages/fr.json
{
  "items": "{count, plural, =0 {Aucun élément} =1 {Un élément} other {{count} éléments}}"
}
```
