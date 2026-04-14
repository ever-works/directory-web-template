---
id: collection-endpoints
title: "Points de terminaison API Collections"
sidebar_label: "Collections"
sidebar_position: 11
---

# Points de terminaison API Collections

L'API Collections fournit un point de terminaison public pour vérifier si des collections actives existent dans le système. Les collections sont stockées dans la base de données et gérées via la couche de dépôt de collections.

**Fichier source :** `template/app/api/collections/exists/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/api/collections/exists` | Aucune | Vérifier si des collections actives existent |

---

## GET `/api/collections/exists`

Vérifie si des collections actives sont disponibles. Retourne un indicateur booléen `exists` ainsi que le nombre de collections actives. Il s'agit d'un point de terminaison public principalement utilisé par le frontend pour décider de rendre ou non les éléments d'interface liés aux collections.

### Paramètres de requête

Aucun.

### Fonctionnement

Le gestionnaire utilise le `collectionRepository` pour récupérer toutes les collections actives, puis vérifie si le résultat est un tableau non vide :

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

### Format de réponse

#### 200 -- Collections trouvées

```json
{
  "exists": true,
  "count": 5
}
```

#### 200 -- Aucune collection

```json
{
  "exists": false,
  "count": 0
}
```

#### 500 -- Erreur serveur

En cas d'échec, le point de terminaison retourne un statut 500 avec un message d'erreur générique. Les informations d'erreur détaillées sont journalisées côté serveur uniquement :

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

### Authentification

Il s'agit d'un **point de terminaison public** -- aucune authentification n'est requise.

### Exemple d'utilisation

```ts
// Vérifier si des collections existent avant de rendre la section collections
const res = await fetch('/api/collections/exists');
const data = await res.json();

if (data.exists) {
  console.log(`${data.count} active collections available`);
  // Afficher la navigation des collections
}
```

### Différences avec le point de terminaison Catégories

| Aspect | Catégories | Collections |
|--------|------------|-------------|
| Source des données | CMS basé sur Git | Base de données via la couche de dépôt |
| Comportement en cas d'erreur | Retourne 200 avec `exists: false` | Retourne 500 avec un message d'erreur |
| Support des filtres | Paramètre de locale | Filtre actives uniquement (codé en dur) |
| Nécessite une base de données | Non | Oui |

### Notes

- Seules les collections **actives** sont comptées. Les collections inactives sont exclues par le filtre `includeInactive: false`.
- Les erreurs détaillées sont journalisées côté serveur et jamais exposées au client (pour éviter la divulgation d'informations).
- Le point de terminaison nécessite une connexion à la base de données fonctionnelle car les collections sont stockées en base de données.

### Fichiers sources associés

| Fichier | Rôle |
|---------|------|
| `template/app/api/collections/exists/route.ts` | Gestionnaire de route |
| `template/lib/repositories/collection.repository.ts` | Couche d'accès aux données de collections |
