---
id: category-endpoints
title: "Points de terminaison API Catégories"
sidebar_label: "Catégories"
sidebar_position: 10
---

# Points de terminaison API Catégories

L'API Catégories fournit un point de terminaison public léger pour vérifier si des catégories existent dans le système. Les catégories sont dérivées de la couche de contenu (CMS basé sur Git) plutôt que d'une base de données, ce qui rend ce point de terminaison disponible même sans connexion à la base de données.

**Fichier source :** `template/app/api/categories/exists/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/categories/exists` | Aucune | Vérifier si des catégories existent |

---

## GET `/api/categories/exists`

Vérifie si des catégories sont disponibles dans le dépôt de contenu. Retourne un indicateur booléen `exists` ainsi que le nombre total. Ce point de terminaison est utile pour le rendu conditionnel de l'interface utilisateur -- par exemple, masquer un filtre de catégories lorsqu'aucune catégorie n'est définie.

### Paramètres de requête

| Paramètre | Type | Requis | Défaut | Description |
|-----------|------|--------|--------|-------------|
| `locale` | string | Non | `"en"` | Code de langue pour récupérer les catégories localisées |

### Fonctionnement

Le gestionnaire appelle `fetchItems` depuis la couche de contenu avec la locale demandée, puis inspecte le tableau `categories` retourné :

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

### Format de réponse

#### 200 -- Catégories trouvées

```json
{
  "exists": true,
  "count": 12
}
```

#### 200 -- Aucune catégorie

```json
{
  "exists": false,
  "count": 0
}
```

#### Gestion des erreurs

En cas d'erreur, le point de terminaison retourne un résultat de repli sécurisé plutôt qu'une erreur 500. Cela garantit que les consommateurs peuvent toujours compter sur la forme de la réponse :

```json
{
  "exists": false,
  "count": 0
}
```

Les erreurs sont uniquement journalisées en mode développement (`NODE_ENV === 'development'`).

### Authentification

Il s'agit d'un **point de terminaison public** -- aucune authentification n'est requise.

### Exemple d'utilisation

```ts
// Vérifier si des catégories existent avant de rendre l'interface de filtrage
const res = await fetch('/api/categories/exists?locale=fr');
const { exists, count } = await res.json();

if (exists) {
  console.log(`Found ${count} categories`);
  // Afficher le filtre de catégories
}
```

### Notes

- Les catégories proviennent de la couche de contenu CMS basé sur Git, pas de la base de données.
- Le point de terminaison est sensible à la locale ; des locales différentes peuvent avoir des nombres de catégories différents.
- Les erreurs sont gérées silencieusement pour éviter de casser l'interface -- le point de terminaison retourne toujours du JSON valide.
- Aucun en-tête de mise en cache n'est défini par le gestionnaire ; la mise en cache est gérée au niveau de l'infrastructure.

### Fichiers sources associés

| Fichier | Rôle |
|---------|------|
| `template/app/api/categories/exists/route.ts` | Gestionnaire de route |
| `template/lib/content.ts` | Fonction `fetchItems` qui résout les catégories |
