---
id: admin-companies-endpoints
title: "Points de terminaison Admin Entreprises"
sidebar_label: "Admin Entreprises"
sidebar_position: 32
---

# Points de terminaison Admin Entreprises

L'API Admin Entreprises fournit des points de terminaison de gestion pour les enregistrements d'entreprises. Les entreprises représentent les organisations associées aux éléments listés. L'API supporte les opérations CRUD complètes avec validation Zod, enforcement d'unicité de domaine/slug, et synchronisation CRM optionnelle lors des mises à jour.

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Admin | Lister les entreprises (paginé, recherchable) |
| `POST` | `/api/admin/companies` | Admin | Créer une nouvelle entreprise |
| `GET` | `/api/admin/companies/{id}` | Admin | Obtenir une entreprise par UUID |
| `PUT` | `/api/admin/companies/{id}` | Admin | Mettre à jour une entreprise |
| `DELETE` | `/api/admin/companies/{id}` | Admin | Supprimer définitivement une entreprise |

## Authentification

Tous les points de terminaison d'entreprises vérifient que la session dispose de privilèges admin :

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Points de terminaison

### GET `/api/admin/companies`

Retourne une liste paginée d'entreprises avec recherche et filtrage par statut. Retourne également les comptages globaux d'entreprises actives et inactives indépendamment des filtres appliqués.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `page` | entier | `1` | Numéro de page (doit être >= 1) |
| `limit` | entier | `10` | Éléments par page (1--100) |
| `q` | chaîne | -- | Recherche par nom ou domaine (insensible à la casse) |
| `status` | chaîne | -- | Filtre : `"active"` ou `"inactive"` |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

Les valeurs `meta.activeCount` et `meta.inactiveCount` reflètent les totaux globaux et ne sont pas affectées par les filtres `q` ou `status`. Cela permet à l'interface d'afficher les comptages par onglet en parallèle des résultats filtrés.

### POST `/api/admin/companies`

Crée un nouvel enregistrement d'entreprise. Les données de la requête sont validées avec le schéma Zod (`createCompanySchema`). Les valeurs de domaine et de slug sont normalisées en minuscules. L'unicité est vérifiée pour le `domain` et le `slug` avant l'insertion.

**Corps de la requête :**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Champ | Type | Requis | Description |
|-------|------|----------|-------------|
| `name` | chaîne | Oui | Nom de l'entreprise (1--255 caractères) |
| `website` | chaîne (URI) | Non | URL complète du site web |
| `domain` | chaîne | Non | Domaine normalisé (max 255 caractères) |
| `slug` | chaîne | Non | Identifiant URL (`^[a-z0-9-]+$`, max 255) |
| `status` | chaîne | Non | `"active"` ou `"inactive"` (défaut : `"active"`) |

**Validation :** Utilise la validation du schéma Zod. En cas d'échec, retourne des erreurs détaillées par champ :

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Réponse (201) :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Récupère une entreprise unique par son UUID.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne (UUID) | Identifiant unique de l'entreprise |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Met à jour une entreprise existante. Supporte les mises à jour partielles -- seuls les champs fournis sont modifiés. Validé avec `updateCompanySchema`. L'unicité du domaine et du slug est re-vérifiée lorsque ces champs changent. Après une mise à jour réussie, les données de l'entreprise sont optionnellement synchronisées vers un système CRM.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne (UUID) | Identifiant unique de l'entreprise |

**Corps de la requête :**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.

**Synchronisation CRM :**

Quand `TWENTY_CRM_ENABLED` n'est pas défini à `"false"`, l'entreprise mise à jour est automatiquement synchronisée vers le système CRM Twenty. Cette synchronisation est non-bloquante -- si elle échoue, l'API retourne quand même un succès pour la mise à jour en base de données :

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Supprime définitivement une entreprise. Il s'agit d'une suppression définitive -- l'enregistrement est retiré de la base de données. Les liens élément-entreprise associés sont supprimés via les contraintes CASCADE.

**Paramètres de chemin :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | chaîne (UUID) | Identifiant unique de l'entreprise |

**Réponse (200) :**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
La suppression d'une entreprise est permanente et ne peut pas être annulée. Toutes les associations d'éléments pour l'entreprise supprimée seront retirées via les règles CASCADE de la base de données.
:::

## Règles de validation

Les données d'entreprise sont validées avec les schémas Zod définis dans `lib/validations/company.ts` :

| Champ | Règle |
|-------|------|
| `name` | Requis, 1--255 caractères |
| `website` | Optionnel, doit être en format URI valide |
| `domain` | Optionnel, max 255 caractères, normalisé en minuscules |
| `slug` | Optionnel, max 255 caractères, alphanumérique minuscule et tirets uniquement |
| `status` | Optionnel, doit être `"active"` ou `"inactive"` |

## Codes d'erreur

| Statut | Erreur | Cause |
|--------|-------|-------|
| `400` | Erreur de validation | Échec de validation du schéma Zod (inclut les détails des champs) |
| `400` | Paramètre de page invalide | La page n'est pas un entier positif |
| `400` | Paramètre de limite invalide | Limite en dehors de la plage 1--100 |
| `401` | Non autorisé | Session manquante ou non-admin |
| `404` | Entreprise non trouvée | Aucune entreprise avec l'UUID donné |
| `409` | Une entreprise avec ce domaine existe déjà | Violation d'unicité du domaine |
| `409` | Une entreprise avec ce slug existe déjà | Violation d'unicité du slug |
| `500` | Échec de création/mise à jour/suppression de l'entreprise | Erreur serveur ou base de données |

## Documentation associée

- [Vue d'ensemble des points de terminaison Admin](./admin-endpoints.md)
- [Patterns de réponse](./response-patterns.md)
- [Validation des requêtes](./request-validation.md)
