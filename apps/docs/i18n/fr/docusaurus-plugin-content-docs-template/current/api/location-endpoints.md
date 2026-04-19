---
id: location-endpoints
title: "Référence API Localisation"
sidebar_label: "Localisation"
sidebar_position: 51
---

# Référence API Localisation

## Aperçu

Les points de terminaison de localisation donnent accès à l'index de localisation spatiale des éléments du répertoire. Ils permettent d'interroger les éléments par ville, pays, recherche par proximité radiale et de récupérer les données de coordonnées pour le rendu cartographique. Tous les points de terminaison de localisation nécessitent que la fonctionnalité de localisation soit activée dans les paramètres système.

## Points de terminaison

### GET /api/location/cities

Retourne une liste de noms de villes distincts de l'index de localisation.

**Requête**

Aucun paramètre requis.

**Réponse**
```typescript
{
  success: true;
  data: string[];   // Tableau de noms de villes, ex. ["San Francisco", "London", "Tokyo"]
}
```

**Exemple**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Retourne une liste de noms de pays distincts de l'index de localisation.

**Requête**

Aucun paramètre requis.

**Réponse**
```typescript
{
  success: true;
  data: string[];   // Tableau de noms de pays, ex. ["United States", "United Kingdom"]
}
```

**Exemple**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Retourne les coordonnées de tous les éléments indexés, avec un filtrage optionnel par ville ou pays. Utilisé pour le rendu des marqueurs de carte. Les éléments distants sont automatiquement exclus.

**Requête**

| Paramètre | Type   | Dans    | Description |
|-----------|--------|-------|-------------|
| city      | string | query | Filtrer par nom de ville (insensible à la casse) |
| country   | string | query | Filtrer par nom de pays (insensible à la casse) |

**Réponse**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Identifiant slug de l'élément
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Exemple**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Recherche des éléments par localisation géographique en utilisant la proximité radiale, le nom de ville ou le nom de pays. Retourne les slugs des éléments correspondants et des informations optionnelles sur la distance.

**Requête**

| Paramètre | Type   | Dans    | Description |
|-----------|--------|-------|-------------|
| near_lat  | number | query | Latitude pour la recherche radiale |
| near_lng  | number | query | Longitude pour la recherche radiale |
| radius    | number | query | Rayon en km (défaut : 50) |
| city      | string | query | Filtrer par nom de ville |
| country   | string | query | Filtrer par nom de pays |

Au moins un paramètre de recherche est requis : `near_lat` + `near_lng`, `city` ou `country`.

**Réponse**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Tableau de slugs d'éléments correspondants
    distances: Record<string, number>;  // Carte slug-vers-distance-km (recherche radiale uniquement)
  };
}
```

**Exemple**
```typescript
// Recherche radiale : éléments dans un rayon de 25 km de San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Recherche par ville
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Authentification

Tous les points de terminaison de localisation sont **publics** — aucune authentification n'est requise. Cependant, la fonctionnalité de localisation doit être activée dans les paramètres système. Si les fonctionnalités de localisation sont désactivées, tous les points de terminaison retournent une erreur `404` avec le message `"Location features are disabled"`.

## Codes d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Coordonnées invalides, rayon invalide, ou paramètres de recherche requis manquants |
| 404 | Les fonctionnalités de localisation sont désactivées dans les paramètres système |
| 500 | Erreur interne du serveur — échec de la requête à la base de données |

## Limitation du débit

Aucune limitation de débit explicite n'est appliquée à ces points de terminaison. Les éléments distants/virtuels sont automatiquement exclus des résultats de coordonnées.

## Points de terminaison associés

- [Points de terminaison de géocodage](./geocode-endpoints) — Géocodage direct et inverse (administrateurs uniquement)
