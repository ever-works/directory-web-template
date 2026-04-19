---
id: admin-clients-endpoints
title: "Points de terminaison Admin Clients"
sidebar_label: "Admin Clients"
sidebar_position: 38
---

# Points de terminaison Admin Clients

L'API Clients fournit des points de terminaison pour la gestion des profils clients, incluant la création, les mises à jour, la recherche avancée, les opérations en lot, les analyses de tableau de bord et les statistiques complètes. Les clients représentent des profils d'utilisateurs finaux liés à des comptes d'authentification. Tous les points de terminaison nécessitent une authentification administrateur.

## Chemin de base

```
/api/admin/clients
```

## Résumé des routes

| Méthode   | Chemin                                  | Auth  | Description                                      |
| --------- | --------------------------------------- | ----- | ------------------------------------------------ |
| `GET`     | `/api/admin/clients`                    | Admin | Obtenir la liste paginée des clients             |
| `POST`    | `/api/admin/clients`                    | Admin | Créer un nouveau profil client                   |
| `GET`     | `/api/admin/clients/stats`              | Admin | Obtenir les statistiques complètes des clients   |
| `GET`     | `/api/admin/clients/dashboard`          | Admin | Obtenir les données combinées du tableau de bord |
| `GET`     | `/api/admin/clients/advanced-search`    | Admin | Recherche avancée multi-filtres                  |
| `PUT`     | `/api/admin/clients/bulk`               | Admin | Mettre à jour les profils clients en lot         |
| `DELETE`  | `/api/admin/clients/bulk`               | Admin | Supprimer les profils clients en lot             |
| `GET`     | `/api/admin/clients/{clientId}`         | Admin | Obtenir un client par ID                         |
| `PUT`     | `/api/admin/clients/{clientId}`         | Admin | Mettre à jour un profil client                   |
| `DELETE`  | `/api/admin/clients/{clientId}`         | Admin | Supprimer un profil client                       |

---

## Lister les clients

```
GET /api/admin/clients
```

Retourne une liste paginée de profils clients avec filtrage de base.

**Paramètres de requête :**

| Paramètre     | Type    | Défaut | Description                                               |
| ------------- | ------- | ------ | --------------------------------------------------------- |
| `page`        | entier  | `1`    | Numéro de page (minimum : 1)                              |
| `limit`       | entier  | `10`   | Résultats par page (1--100)                               |
| `search`      | chaîne  | --     | Recherche par nom ou e-mail                               |
| `status`      | chaîne  | --     | Filtre : `active`, `inactive`, `suspended`, `trial`       |
| `plan`        | chaîne  | --     | Filtre : `free`, `standard`, `premium`                    |
| `accountType` | chaîne  | --     | Filtre : `individual`, `business`, `enterprise`           |
| `provider`    | chaîne  | --     | Filtrer par fournisseur d'authentification                |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Créer un client

```
POST /api/admin/clients
```

Crée un nouveau profil client. Si aucun compte utilisateur n'existe pour l'e-mail fourni, un nouvel utilisateur est automatiquement créé avec un mot de passe temporaire. Déclenche la synchronisation CRM lorsqu'elle est activée.

**Corps de la requête :**

| Champ            | Type   | Requis | Description                                         |
| ---------------- | ------ | ------ | --------------------------------------------------- |
| `email`          | chaîne | Oui    | Adresse e-mail du client                            |
| `displayName`    | chaîne | Non    | Nom d'affichage (par défaut : préfixe de l'e-mail)  |
| `username`       | chaîne | Non    | Nom d'utilisateur unique                            |
| `bio`            | chaîne | Non    | Biographie du client                                |
| `jobTitle`       | chaîne | Non    | Titre de poste                                      |
| `company`        | chaîne | Non    | Nom de l'entreprise                                 |
| `industry`       | chaîne | Non    | Secteur d'activité                                  |
| `phone`          | chaîne | Non    | Numéro de téléphone                                 |
| `website`        | chaîne | Non    | URL du site web                                     |
| `location`       | chaîne | Non    | Localisation                                        |
| `accountType`    | chaîne | Non    | `individual` (défaut), `business`, `enterprise`     |
| `status`         | chaîne | Non    | `active` (défaut), `inactive`, `suspended`, `trial` |
| `plan`           | chaîne | Non    | `free` (défaut), `standard`, `premium`              |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Obtenir les statistiques des clients

```
GET /api/admin/clients/stats
```

Retourne des analyses complètes sur tous les clients, regroupées par aperçu, croissance, plans, types de compte, engagement, données démographiques et fournisseurs d'authentification.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Tableau de bord

```
GET /api/admin/clients/dashboard
```

Retourne une réponse combinée avec une liste paginée de clients, des statistiques agrégées et des métadonnées de pagination. Prend en charge tous les filtres de base ainsi que des paramètres de plage de dates.

**Paramètres de requête supplémentaires (en plus des paramètres de liste) :**

| Paramètre       | Type   | Description                                |
| --------------- | ------ | ------------------------------------------ |
| `createdAfter`  | chaîne | Date ISO ou `YYYY-MM-DD` -- créé après     |
| `createdBefore` | chaîne | Date ISO ou `YYYY-MM-DD` -- créé avant     |

---

## Recherche avancée

```
GET /api/admin/clients/advanced-search
```

Effectue une recherche multidimensionnelle sur les profils clients. En plus des filtres de liste de base, prend en charge les recherches par champ spécifique, les plages numériques, les indicateurs booléens et les plages de dates. Retourne des métadonnées de recherche incluant les filtres appliqués et le temps d'exécution.

**Paramètres de requête supplémentaires :**

| Paramètre          | Type    | Description                                                              |
| ------------------ | ------- | ------------------------------------------------------------------------ |
| `sortBy`           | chaîne  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | chaîne  | `asc` ou `desc`                                                          |
| `createdAfter`     | chaîne  | Filtre date-heure ISO                                                    |
| `createdBefore`    | chaîne  | Filtre date-heure ISO                                                    |
| `emailDomain`      | chaîne  | Filtrer par domaine e-mail (ex. : `example.com`)                         |
| `companySearch`    | chaîne  | Recherche dans les noms d'entreprise                                     |
| `locationSearch`   | chaîne  | Recherche dans les localisations                                         |
| `industrySearch`   | chaîne  | Recherche dans les secteurs d'activité                                   |
| `minSubmissions`   | entier  | Nombre minimum de soumissions                                            |
| `maxSubmissions`   | entier  | Nombre maximum de soumissions                                            |
| `emailVerified`    | booléen | Filtrer par statut de vérification d'e-mail                              |
| `twoFactorEnabled` | booléen | Filtrer par statut 2FA                                                   |
| `hasAvatar`        | booléen | Filtrer les clients avec/sans avatar                                     |
| `hasWebsite`       | booléen | Filtrer les clients avec/sans site web                                   |
| `hasPhone`         | booléen | Filtrer les clients avec/sans téléphone                                  |

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Opérations en lot

### Mise à jour en lot

```
PUT /api/admin/clients/bulk
```

Met à jour plusieurs profils clients en une seule requête. Chaque objet client doit inclure un champ `id` ainsi que les champs à mettre à jour. Les échecs individuels n'interrompent pas l'ensemble du lot.

**Corps de la requête :**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Suppression en lot

```
DELETE /api/admin/clients/bulk
```

Supprime définitivement plusieurs profils clients. Chaque objet du tableau doit inclure un champ `id`.

**Corps de la requête :**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Réponse (200) -- les deux points de terminaison en lot :**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obtenir / Mettre à jour / Supprimer un client

### Obtenir un client

```
GET /api/admin/clients/{clientId}
```

Retourne le profil client complet incluant le nom d'affichage, l'entreprise, le plan, le type de compte et les horodatages d'activité.

### Mettre à jour un client

```
PUT /api/admin/clients/{clientId}
```

Mise à jour partielle -- seuls les champs fournis sont modifiés. Déclenche la synchronisation CRM lorsque les données de l'entreprise ou du profil changent.

**Corps de la requête (tous les champs sont facultatifs) :**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Supprimer un client

```
DELETE /api/admin/clients/{clientId}
```

Supprime définitivement un profil client. Cette action est irréversible.

**Réponse (200) :**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Règles de validation

| Champ         | Règle                                                          |
| ------------- | -------------------------------------------------------------- |
| `email`       | Requis pour la création ; format d'e-mail valide               |
| `status`      | Doit être `active`, `inactive`, `suspended` ou `trial`         |
| `plan`        | Doit être `free`, `standard` ou `premium`                      |
| `accountType` | Doit être `individual`, `business` ou `enterprise`             |
| `clients`     | En lot : tableau non vide avec `id` requis sur chaque objet    |

## Codes d'erreur

| Statut | Signification                                                           |
| ------ | ----------------------------------------------------------------------- |
| `400`  | Erreur de validation, e-mail manquant, échec de création d'utilisateur  |
| `401`  | Authentification requise                                                |
| `403`  | Privilèges administrateur requis                                        |
| `404`  | Client introuvable                                                      |
| `500`  | Erreur interne du serveur                                               |

## Documentation associée

- [API Admin Utilisateurs](./admin-users-endpoints.md) -- gestion des comptes utilisateurs
- [API Admin Rôles](./admin-roles-endpoints.md) -- gestion des rôles et permissions
- [Authentification](../architecture/nextauth-configuration.md) -- gestion des sessions et gardes
