---
id: collections-api-endpoints
title: "Points de terminaison API Collections"
sidebar_label: "API Collections"
sidebar_position: 57
---

# Points de terminaison API Collections

L'API Collections fournit un point de terminaison public pour vérifier si des collections actives existent dans la base de données. Les collections sont des regroupements organisés d'éléments gérés via le panneau d'administration et stockés dans la base de données via le dépôt de collections.

**Source :** `template/app/api/collections/exists/route.ts`

---

## Vérifier l'existence des collections

Vérifie s'il existe des collections actives dans le système.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/collections/exists` |
| **Auth** | Aucune (public) |

### Paramètres de requête

Aucun.

### Réponse

**Statut 200** -- Existence des collections vérifiée avec succès.

```json
{
  "exists": true,
  "count": 5
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Indique si des collections actives existent |
| `count` | `number` | Nombre de collections actives |

### Réponse d'erreur

**Statut 500** -- Erreur interne du serveur.

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Toujours `false` en cas d'erreur |
| `count` | `number` | Toujours `0` en cas d'erreur |
| `error` | `string` | Message d'erreur générique (les erreurs détaillées sont journalisées côté serveur uniquement) |

### Exemple curl

```bash
# Vérifier si des collections actives existent
curl -s http://localhost:3000/api/collections/exists
```

### Utilisation TypeScript

```typescript
interface CollectionsExistResponse {
  exists: boolean;
  count: number;
  error?: string;
}

async function checkCollectionsExist(): Promise<CollectionsExistResponse> {
  const res = await fetch('/api/collections/exists');
  return res.json();
}

// Utilisation
const { exists, count } = await checkCollectionsExist();
if (exists) {
  console.log(`Found ${count} active collections`);
} else {
  console.log('No collections available');
}
```

### Notes d'implémentation

- Les collections sont récupérées depuis la base de données via `collectionRepository.findAll()` avec `includeInactive: false`, ce qui signifie que seules les collections actives sont comptées.
- Contrairement au point de terminaison des catégories, ce point de terminaison retourne un statut `500` approprié en cas d'erreur plutôt que de retourner silencieusement des valeurs par défaut sécurisées.
- La réponse d'erreur inclut un champ `error` générique -- les informations d'erreur détaillées sont journalisées côté serveur pour éviter la divulgation d'informations.
- Ce point de terminaison est utilisé par le frontend pour rendre conditionnellement la section de navigation des collections.
