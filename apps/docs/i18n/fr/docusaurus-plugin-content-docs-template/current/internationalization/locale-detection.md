---
id: locale-detection
title: Détection et routage des locales
sidebar_label: Détection des locales
sidebar_position: 3
---

# Détection et routage des locales

Le template utilise `next-intl` pour la détection des locales avec correspondance automatique de la langue du navigateur, routage des URL basé sur la locale, persistance des cookies et un système de repli des messages.

## Flux de détection

Lorsqu'une requête arrive, la locale est déterminée dans cette séquence :

1. **Préfixe URL** — Si l'URL contient un préfixe de locale (ex. `/fr/about`), cette locale est utilisée directement
2. **Cookie** — Si aucun préfixe URL n'est présent, le système vérifie un cookie de locale défini par le LanguageSwitcher
3. **En-tête Accept-Language** — Si aucun cookie n'existe, la préférence de langue du navigateur est lue
4. **Repli par défaut** — Si aucune correspondance n'est trouvée, la locale par défaut (`en`) est utilisée

## Fichiers sources

| Fichier | Rôle dans la détection |
|---------|----------------------|
| `i18n/routing.ts` | Définit les locales supportées, stratégie de préfixe, bascule de détection |
| `i18n/request.ts` | Valide la locale résolue, charge et fusionne les messages |
| `i18n/navigation.ts` | Fournit Link, router, redirect avec prise en charge des locales |
| `lib/constants.ts` | Source de vérité pour le tableau LOCALES et RTL_LOCALES |
| `components/language-switcher.tsx` | Définit le cookie de locale via router.replace |
| `app/[locale]/layout.tsx` | Valide la locale, rejette les invalides avec notFound() |

## Configuration du routage

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### Options de configuration

| Option | Valeur | Effet |
|--------|--------|-------|
| `locales` | 21 codes de locale | Définit quelles locales sont reconnues |
| `defaultLocale` | `'en'` | Repli quand aucune locale n'est détectée |
| `localeDetection` | `true` | Active la détection cookie et Accept-Language |
| `localePrefix` | `"as-needed"` | La locale par défaut n'a pas de préfixe URL |

### Stratégie de préfixe de locale

La stratégie `"as-needed"` détermine comment les locales apparaissent dans les URL :

| Requête | Locale résolue | URL affichée |
|---------|----------------|-------------|
| `/about` | `en` | `/about` (pas de préfixe pour la locale par défaut) |
| `/fr/about` | `fr` | `/fr/about` (préfixe pour les non-défaut) |
| `/en/about` | `en` | Redirige vers `/about` (supprime le préfixe par défaut) |

Cela garde les URL propres pour la locale par défaut tout en fournissant des préfixes explicites pour toutes les autres.
