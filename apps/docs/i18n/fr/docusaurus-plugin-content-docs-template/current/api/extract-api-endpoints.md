---
id: extract-api-endpoints
title: "Points de terminaison API Extraction"
sidebar_label: "API Extraction"
sidebar_position: 61
---

# Points de terminaison API Extraction

L'API Extract fournit un point de terminaison proxy sécurisé pour extraire les métadonnées d'un élément (nom, description, catégories, etc.) depuis une URL donnée. Elle transfère les requêtes vers l'API de la plateforme Ever Works pour une extraction de contenu assistée par IA.

**Source :** `template/app/api/extract/route.ts`

---

## Extraire les métadonnées depuis une URL

Extrait les métadonnées d'un élément depuis une URL donnée en proxifiant la requête vers l'API de la plateforme.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `POST` |
| **Chemin** | `/api/extract` |
| **Auth** | Aucune (publique, mais nécessite que `PLATFORM_API_URL` soit configuré) |

### Corps de la requête

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `url` | `string` (URI) | Oui | L'URL dont extraire les métadonnées |
| `existingCategories` | `string[]` | Non | Noms de catégories existantes pour aider à la catégorisation par IA |

### Réponses

**Statut 200** -- Extraction réussie.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

La structure de `data` dépend de la réponse de l'API de plateforme -- elle inclut généralement les champs `name`, `description` et des suggestions de catégorisation.

**Statut 200** -- Fonctionnalité désactivée (`PLATFORM_API_URL` non configuré).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Lorsque `PLATFORM_API_URL` n'est pas défini, le point de terminaison retourne un statut `200` avec `featureDisabled: true` plutôt qu'une erreur. Cela permet au frontend de masquer gracieusement la fonctionnalité d'extraction.
:::

**Statut 400** -- Requête invalide.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Statut 500** -- Erreur serveur lors de l'extraction.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validation

Le corps de la requête est validé avec Zod :

- `url` doit être une chaîne d'URL valide.
- `existingCategories` est un tableau de chaînes optionnel.

### Exemples curl

```bash
# Extraire les métadonnées depuis une URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Requête minimale (URL uniquement)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### Utilisation TypeScript

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}

interface ExtractSuccessResponse {
  success: true;
  data: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface ExtractDisabledResponse {
  success: false;
  featureDisabled: true;
  message: string;
}

interface ExtractErrorResponse {
  success: false;
  error: string;
}

type ExtractResponse = ExtractSuccessResponse | ExtractDisabledResponse | ExtractErrorResponse;

async function extractMetadata(
  url: string,
  existingCategories?: string[]
): Promise<ExtractResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, existingCategories }),
  });
  return res.json();
}

// Utilisation
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('Extraction feature is not available');
} else if (result.success) {
  console.log('Extracted:', result.data.name, result.data.description);
} else {
  console.error('Extraction failed:', result.error);
}
```

### Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `PLATFORM_API_URL` | Non | URL de base de l'API de la plateforme Ever Works. Si non définie, la fonctionnalité est désactivée gracieusement. |
| `PLATFORM_API_SECRET_TOKEN` | Non | Token Bearer optionnel pour l'authentification auprès de l'API de plateforme. |

### Notes d'implémentation

- Ce point de terminaison agit comme un **proxy sécurisé** -- l'URL de l'API de plateforme et le token ne sont jamais exposés au client.
- Le point de terminaison supprime les barres obliques en fin de chaîne de `PLATFORM_API_URL` avant de construire l'URL d'extraction.
