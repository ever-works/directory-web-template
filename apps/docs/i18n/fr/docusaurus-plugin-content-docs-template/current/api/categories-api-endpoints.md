---
id: categories-api-endpoints
title: "Points de terminaison API Catégories"
sidebar_label: "API Catégories"
sidebar_position: 56
---

# Points de terminaison API Catégories

L'API Catégories fournit un point de terminaison public pour vérifier si des catégories existent dans le système de contenu. Les catégories proviennent du dépôt de contenu CMS basé sur Git et représentent la taxonomie de premier niveau pour organiser les éléments.

**Source :** `template/app/api/categories/exists/route.ts`

---

## Vérifier l'existence des catégories

Vérifie si des catégories sont disponibles dans le système et retourne leur nombre.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/categories/exists` |
| **Auth** | Aucune (public) |

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `locale` | `string` | Non | `"en"` | Code de langue pour récupérer les catégories (ex. : `en`, `fr`, `de`) |

### Réponse

**Statut 200** -- Existence des catégories vérifiée avec succès.

```json
{
  "exists": true,
  "count": 12
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Indique si des catégories existent |
| `count` | `number` | Nombre de catégories trouvées |

### Gestion des erreurs

En cas d'erreur, le point de terminaison retourne une réponse `200` avec des valeurs par défaut sécurisées plutôt qu'un code d'erreur :

```json
{
  "exists": false,
  "count": 0
}
```

Ce comportement de sécurité garantit que l'interface utilisateur peut se dégrader gracieusement lorsque le système de contenu est indisponible.

### Exemple curl

```bash
# Vérifier si des catégories existent (locale par défaut)
curl -s http://localhost:3000/api/categories/exists

# Vérifier les catégories pour la locale française
curl -s http://localhost:3000/api/categories/exists?locale=fr
```

### Utilisation TypeScript

```typescript
interface CategoriesExistResponse {
  exists: boolean;
  count: number;
}

async function checkCategoriesExist(locale: string = 'en'): Promise<CategoriesExistResponse> {
  const res = await fetch(`/api/categories/exists?locale=${locale}`);
  return res.json();
}

// Utilisation
const { exists, count } = await checkCategoriesExist('en');
if (exists) {
  console.log(`Found ${count} categories`);
}
```

### Notes d'implémentation

- Les catégories sont récupérées depuis le CMS basé sur Git via `fetchItems()` de `@/lib/content`.
- Le point de terminaison ne nécessite pas d'authentification -- il est conçu pour être utilisé par l'interface publique afin de rendre conditionnellement les éléments de navigation des catégories.
- Les erreurs sont uniquement journalisées en mode développement (`NODE_ENV === 'development'`).
- Le paramètre `locale` correspond à l'option `lang` dans la couche de récupération du contenu.
