---
id: admin-analytics-endpoints
title: "Points de terminaison Admin Analytics"
sidebar_label: "Admin Analytics"
sidebar_position: 22
---

# Points de terminaison Admin Analytics

L'API d'analytique admin fournit des données d'analyse géographique pour le tableau de bord d'administration, incluant des statistiques de couverture, des ventilations de distribution et des données de visualisation cartographique. Tous les points de terminaison requièrent une authentification administrateur.

## Vue d'ensemble

| Point de terminaison | Méthode | Auth | Description |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Admin | Obtenir les données d'analytique géographique |

## Obtenir les analytics géographiques

```
GET /api/admin/geo-analytics
```

Retourne des analyses complètes de distribution géographique incluant les statistiques de couverture, les distributions par pays/ville/zone de service, les coordonnées de localisation pour les marqueurs de carte et les données de carte thermique. Ce point de terminaison agrège les données à la fois de l'index de localisation et du dépôt d'éléments.

**Authentification :** Admin requis (via `checkAdminAuth()`)

**Mise en cache :** Désactivée -- utilise `force-dynamic`, `revalidate: 0` et `force-no-store` pour garantir des données fraîches pour le tableau de bord d'administration.

**Réponse de succès (200) :**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Champs de réponse

#### Objet Stats

| Champ | Type | Description |
|---|---|---|
| `totalIndexed` | entier | Total des entrées dans l'index de localisation |
| `totalItems` | entier | Total des éléments dans le dépôt |
| `itemsWithLocation` | entier | Éléments ayant des données de localisation ou marqués comme distants |
| `itemsRemote` | entier | Éléments marqués comme distants/distribués |
| `coveragePercent` | nombre | Pourcentage d'éléments avec données de localisation (arrondi à 1 décimale) |
| `indexHealth.synced` | booléen | Indique si le nombre d'index correspond au nombre attendu |
| `indexHealth.indexCount` | entier | Entrées non distantes dans l'index |
| `indexHealth.expectedCount` | entier | Entrées non distantes attendues d'après les données sources |
| `citiesCount` | entier | Nombre de villes distinctes dans l'index |
| `countriesCount` | entier | Nombre de pays distincts dans l'index |
| `remoteCount` | entier | Nombre d'entrées distantes dans l'index |
| `lastIndexedAt` | chaîne ou null | Horodatage ISO de la dernière mise à jour de l'index |
| `lastRebuildAt` | chaîne ou null | Horodatage ISO de la dernière reconstruction complète |

#### Objet Distributions

| Champ | Description |
|---|---|
| `byCountry` | Tableau de noms de pays avec comptages, trié par comptage décroissant |
| `byCity` | Top 20 des villes avec comptages, trié par comptage décroissant |
| `byServiceArea` | Zones de service avec comptages, trié par comptage décroissant |

#### Tableau Locations

Chaque objet de localisation fournit des données pour les marqueurs de carte. Les éléments distants aux coordonnées `(0, 0)` sont filtrés pour éviter des affichages cartographiques trompeurs.

#### Données de carte thermique

Tableau de paires latitude/longitude pour les entrées non distantes uniquement, adapté au rendu de cartes de densité.

### Sources de données

Le point de terminaison agrège les données à partir de trois requêtes parallèles :

1. **Service d'index de localisation** (`getLocationIndexService().getIndexStats()`) -- fournit les statistiques d'index
2. **Entrées d'index de localisation** (`getAllLocationEntries()`) -- fournit toutes les localisations indexées pour les calculs de distribution
3. **Dépôt d'éléments** (`itemRepository.findAll()`) -- fournit les données sources des éléments pour les calculs de couverture

### Calcul de couverture

Le pourcentage de couverture est calculé comme suit :

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Un élément est comptabilisé comme "ayant une localisation" s'il possède une coordonnée de latitude ou est marqué comme distant (`is_remote: true`).

### Santé de l'index

La santé de l'index compare le nombre d'entrées non distantes dans l'index de localisation au nombre attendu dérivé des données sources :

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Quand `synced` est false, les administrateurs devraient envisager de reconstruire l'index de localisation via le point de terminaison `/api/admin/location-index`.

| Statut | Condition |
|---|---|
| 401 | Non authentifié en tant qu'admin |
| 500 | Erreur interne du serveur |

**Source :** `template/app/api/admin/geo-analytics/route.ts`
