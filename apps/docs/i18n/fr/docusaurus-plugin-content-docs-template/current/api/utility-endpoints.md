---
id: utility-endpoints
title: Points de terminaison API utilitaires
sidebar_label: Endpoints utilitaires
sidebar_position: 5
---

# Points de terminaison API utilitaires

Les points de terminaison utilitaires fournissent des services d'infrastructure incluant les vérifications de santé, les informations de version, la configuration des fonctionnalités, le géocodage, la vérification reCAPTCHA, l'extraction d'URL, les données de localisation et les opérations internes.

## Vérification de santé (`/api/health`)

### Santé de la base de données

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/health/database` | Vérifier la connectivité de la base de données |

Retourne le statut de connexion à la base de données. Utilisé par les systèmes de surveillance et les vérifications de santé des déploiements.

**Réponse (sain) :**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Réponse (défaillant) :**

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Authentification :** Public (aucune authentification requise). Ce point de terminaison doit être accessible par les équilibreurs de charge et les services de surveillance.

## Version (`/api/version`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/version` | Obtenir les informations de version de l'application |
| `GET` | `/api/version/sync` | Obtenir la version et le statut de synchronisation |

### Réponse de version

Retourne la version de l'application, les informations de build et l'environnement runtime :

```json
{
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Version + Statut de synchronisation

L'endpoint `/api/version/sync` étend les informations de version avec le statut de synchronisation du dépôt de contenu, utile pour déboguer la fraîcheur du contenu.

**Authentification :** Public.

## Configuration des fonctionnalités (`/api/config`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/config/features` | Obtenir les drapeaux de fonctionnalités activés |

Retourne la configuration actuelle des drapeaux de fonctionnalités pour l'application côté client. Cela permet au frontend d'afficher conditionnellement des fonctionnalités selon la configuration côté serveur.

**Réponse :**

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

**Authentification :** Public. Les drapeaux de fonctionnalités ne sont pas des données sensibles.

## Extraction d'URL (`/api/extract`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/extract` | Extraire les métadonnées d'une URL |

Récupère une URL et extrait les métadonnées incluant le titre, la description, l'image et le favicon. Utilisé par le formulaire de soumission d'éléments pour auto-remplir les champs à partir d'une URL.

**Requête :**

```json
{
  "url": "https://example.com/product"
}
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "title": "Nom du produit",
    "description": "Description du produit depuis les balises meta",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example.com"
  }
}
```

**Authentification :** Requise. Prévient l'abus des requêtes URL côté serveur.

## Géocodage (`/api/geocode`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/geocode` | Géocoder une adresse en coordonnées |

Convertit une adresse textuelle en coordonnées géographiques (latitude/longitude) en utilisant un service de géocodage externe.

**Requête :**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "lat": 37.4224764,
    "lng": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

**Authentification :** Requise.

## Données de localisation (`/api/location`)

Points de terminaison pour la recherche de localisation et les données de référence.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/location/countries` | Lister tous les pays |
| `GET` | `/api/location/cities` | Lister les villes (avec filtre par pays) |
| `GET` | `/api/location/coordinates` | Obtenir les coordonnées d'un lieu |
| `GET` | `/api/location/search` | Rechercher des localisations par chaîne de requête |

### Pays

Retourne une liste de pays avec les codes ISO, les noms et les métadonnées optionnelles.

### Villes

Prend en charge le filtrage par code pays :

```
GET /api/location/cities?country=US
```

### Recherche de localisation

Recherche en texte intégral de localisations :

```
GET /api/location/search?q=San Francisco
```

**Authentification :** Public.

## Vérification reCAPTCHA (`/api/verify-recaptcha`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/verify-recaptcha` | Vérifier un jeton reCAPTCHA |

Vérification côté serveur des jetons Google reCAPTCHA. Utilisé par les formulaires nécessitant une protection anti-bot.

**Requête :**

```json
{
  "token": "recaptcha-response-token"
}
```

**Réponse :**

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit"
}
```

**Authentification :** Public (reCAPTCHA est généralement sur des formulaires publics).

## Données de référence (`/api/reference`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/reference` | Obtenir les données de référence pour les menus déroulants |

Retourne les données de référence utilisées pour remplir les menus déroulants et les champs de sélection dans l'application, tels que les modèles de tarification, les types de licences et les catégories de plateforme.

**Authentification :** Public.

## Opérations internes (`/api/internal`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/internal/db-init` | Initialiser le schéma de la base de données et les données de départ |

### Initialisation de la base de données

L'endpoint `/api/internal/db-init` déclenche la migration de la base de données et l'insertion optionnelle de données de départ. Il est généralement appelé une seule fois lors du déploiement initial ou lors de la réinitialisation d'un environnement de développement.

**Authentification :** Cet endpoint doit être sécurisé via des contrôles d'accès spécifiques à l'environnement ou un secret partagé. Il n'est pas destiné à une utilisation régulière.

## Considérations de sécurité

### Points de terminaison publics

Les endpoints utilitaires suivants sont intentionnellement publics :
- Vérifications de santé (nécessaires pour la surveillance/les équilibreurs de charge)
- Informations de version (non sensibles)
- Drapeaux de fonctionnalités (configuration non sensible)
- Données de localisation (données de référence)
- Vérification reCAPTCHA (protection des formulaires publics)
- Données de référence (valeurs des menus déroulants)

### Points de terminaison protégés

Ces endpoints requièrent une authentification pour éviter les abus :
- Extraction d'URL (prévient les abus de requêtes côté serveur)
- Géocodage (appels API externes limités en débit)
- Initialisation de la base de données (opération destructrice)
