---
id: geocode-endpoints
title: Référence API Géocodage
sidebar_label: Géocodage
sidebar_position: 50
---

# Référence API Géocodage

## Aperçu

L'API de géocodage fournit des fonctionnalités de géocodage direct et inversé en utilisant des fournisseurs configurables (Mapbox ou Google Maps). Elle met en cache les résultats pendant 15 minutes pour réduire les appels API externes et compte les résultats pour améliorer les performances. Ces points de terminaison nécessitent une authentification en tant qu'administrateur.

## Points de terminaison

### POST /api/geocode

Effectue un géocodage direct (adresse vers coordonnées) ou un géocodage inversé (coordonnées vers adresse) selon les paramètres fournis dans le corps de la requête.

**Authentification :** Administrateur requis

**Comportement :**
- Fournir `address` pour le géocodage direct
- Fournir `latitude` et `longitude` pour le géocodage inversé
- Les deux ensembles de paramètres ne peuvent pas être fournis simultanément

**Corps de la requête — Géocodage direct**
```typescript
{
  address: string;   // Adresse en texte lisible à convertir en coordonnées
}
```

**Corps de la requête — Géocodage inversé**
```typescript
{
  latitude: number;   // Coordonnée latitude (-90 à 90)
  longitude: number;  // Coordonnée longitude (-180 à 180)
}
```

**Réponse réussie (200)**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;   // Adresse complète lisible
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;       // Code pays ISO 2 lettres, ex. \"FR\"
    postalCode?: string;
    confidence: number;         // 0.0 à 1.0 indiquant la confiance du résultat
  }
}
```

**Exemple — Géocodage direct**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({ address: '1 Rue de la Paix, Paris, France' })
});
const result = await response.json();
// { success: true, data: { latitude: 48.8698, longitude: 2.3295, formattedAddress: '1 Rue de la Paix, 75001 Paris, France', ... } }
```

**Exemple — Géocodage inversé**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({ latitude: 48.8698, longitude: 2.3295 })
});
const result = await response.json();
// { success: true, data: { formattedAddress: '1 Rue de la Paix, 75001 Paris, France', city: 'Paris', ... } }
```

**Cache :** Les résultats sont mis en cache 15 minutes par clé de requête (adresse ou coordonnées). Le cache est partagé entre les requêtes directes et inversées.

### GET /api/geocode

Retourne le statut du service de géocodage, incluant les informations sur les fournisseurs configurés et l'état du cache.

**Authentification :** Administrateur requis

**Réponse**
```typescript
{
  success: true;
  data: {
    enabled: boolean;           // Si le géocodage est activé
    configured: boolean;        // Si au moins un fournisseur est configuré
    providers: {
      mapbox: boolean;          // Si Mapbox est configuré (MAPBOX_API_KEY défini)
      google: boolean;          // Si Google Maps est configuré (GOOGLE_MAPS_API_KEY défini)
    };
    cache: {
      size: number;             // Nombre d'entrées en cache actuellement
      maxSize: number;          // Capacité maximale du cache
      ttlMs: number;            // Durée de vie en millisecondes (900000 = 15 min)
    };
  }
}
```

**Exemple**
```typescript
const response = await fetch('/api/geocode', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const status = await response.json();
// { success: true, data: { enabled: true, configured: true, providers: { mapbox: true, google: false }, cache: { size: 42, maxSize: 500, ttlMs: 900000 } } }
```

## Authentification

Ces deux points de terminaison nécessitent une **authentification administrateur**. Les requêtes provenant d'utilisateurs non authentifiés ou non-administrateurs reçoivent une réponse `401`.

## Fournisseurs de géocodage

| Fournisseur | Variable d'environnement | Priorité |
| ----------- | ------------------------ | -------- |
| Mapbox | `MAPBOX_API_KEY` | Première si configurée |
| Google Maps | `GOOGLE_MAPS_API_KEY` | Utilisé si Mapbox non disponible |

Si ni Mapbox ni Google Maps n'est configuré, le service retourne `enabled: false` et les requêtes de géocodage échouent avec une erreur `503`.

## Réponses d'erreur

| Statut | Description |
| ------ | ----------- |
| 400 | Corps de la requête invalide — ni `address` ni `latitude`/`longitude` fournis, ou les deux types fournis |
| 401 | Non authentifié ou non-administrateur |
| 503 | Service de géocodage non configuré (aucune clé API fournisseur) |
| 500 | Erreur externe API fournisseur ou erreur d'exécution inattendue |

## Limitation du débit

Aucune limitation de débit au niveau application n'est appliquée. La mise en cache à 15 minutes réduit naturellement les appels API externes. Les fournisseurs externes (Mapbox, Google) ont leurs propres limites de débit.

