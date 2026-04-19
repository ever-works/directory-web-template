---
id: admin-settings-endpoints
title: Points de terminaison Admin – Paramètres
sidebar_label: Admin Paramètres
sidebar_position: 23
---

# Points de terminaison Admin – Paramètres

L'API des paramètres admin fournit des points de terminaison pour lire et modifier la configuration du site stockée dans `config.yml`. Cela inclut les paramètres généraux et l'état du fournisseur de carte. Tous les points de terminaison requièrent une authentification administrateur.

## Aperçu

| Point de terminaison                     | Méthode | Auth  | Description                                     |
| ---------------------------------------- | ------- | ----- | ----------------------------------------------- |
| `/api/admin/settings`                    | GET     | Admin | Obtenir tous les paramètres                     |
| `/api/admin/settings`                    | PATCH   | Admin | Mettre à jour un paramètre spécifique           |
| `/api/admin/settings/map-status`         | GET     | Admin | Obtenir l'état de configuration du fournisseur de carte |

## Obtenir les paramètres

```
GET /api/admin/settings
```

Récupère la section complète `settings` du fichier `config.yml` du site.

**Authentification :** Admin requis (via `getCachedApiSession`)

**Réponse réussie (200) :**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

La forme exacte de l'objet `settings` dépend de la configuration `config.yml` du site. Le point de terminaison retourne ce qui est stocké sous la clé `settings`.

| Statut | Condition                               |
| ------ | --------------------------------------- |
| 401    | Non authentifié en tant qu'admin        |
| 500    | Échec de la lecture de la configuration |

**Source :** `template/app/api/admin/settings/route.ts`

## Mettre à jour un paramètre

```
PATCH /api/admin/settings
```

Met à jour une seule valeur de paramètre dans la section `settings` de `config.yml`. La clé est automatiquement ciblée dans l'espace de noms `settings` (ex. fournir la clé `"theme"` met à jour `settings.theme` dans le fichier de configuration).

**Authentification :** Admin requis

**Corps de la requête :**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

| Champ   | Type   | Requis | Description                                              |
| ------- | ------ | ------ | -------------------------------------------------------- |
| `key`   | chaîne | Oui    | La clé de paramètre à mettre à jour (relative à `settings.`) |
| `value` | tous   | Oui    | La nouvelle valeur pour le paramètre                     |

**Réponse réussie (200) :**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

La mise à jour est persistée via `configManager.updateNestedKey()`, qui modifie le fichier `config.yml` sous-jacent. La clé est automatiquement préfixée avec `settings.` avant d'être transmise au gestionnaire de configuration.

**Réponses d'erreur :**

| Statut | Condition                               |
| ------ | --------------------------------------- |
| 400    | Champ `key` manquant dans le corps      |
| 401    | Non authentifié en tant qu'admin        |
| 500    | Échec de l'écriture de la configuration |

**Source :** `template/app/api/admin/settings/route.ts`

## État du fournisseur de carte

### Obtenir l'état de la carte

```
GET /api/admin/settings/map-status
```

Retourne l'état de configuration des fournisseurs de carte pris en charge sans exposer les clés API réelles. Cela permet au tableau de bord admin de montrer quels fournisseurs de carte sont disponibles.

**Authentification :** Admin requis

**Réponse réussie (200) :**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

| Champ                       | Type    | Description                                           |
| --------------------------- | ------- | ----------------------------------------------------- |
| `mapbox.isConfigured`       | booléen | Si `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` est défini        |
| `mapbox.isPreviewAvailable` | booléen | Identique à `isConfigured` — l'aperçu nécessite le token |
| `google.isConfigured`       | booléen | Si `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est défini        |
| `google.isPreviewAvailable` | booléen | Identique à `isConfigured`                            |

Le point de terminaison vérifie la présence des variables d'environnement :

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` pour Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` pour Google Maps

Aucune valeur de clé réelle n'est exposée dans la réponse.

| Statut | Condition                        |
| ------ | -------------------------------- |
| 401    | Non authentifié en tant qu'admin |
| 500    | Erreur interne du serveur        |

**Source :** `template/app/api/admin/settings/map-status/route.ts`

## Architecture de configuration

Le système de paramètres est construit sur le singleton `configManager` de `lib/config-manager` :

- **Stockage :** Les paramètres sont stockés dans un fichier de configuration YAML (`config.yml`)
- **Accès :** La méthode `configManager.getConfig()` lit la configuration complète
- **Mises à jour :** La méthode `configManager.updateNestedKey()` modifie des clés imbriquées spécifiques
- **Mise en cache :** Les sessions sont mises en cache via `getCachedApiSession()` pour les performances

Toutes les mises à jour de paramètres sont ciblées dans l'espace de noms `settings` du fichier de configuration. Cela empêche la modification accidentelle des clés de configuration de niveau supérieur via l'API des paramètres.

