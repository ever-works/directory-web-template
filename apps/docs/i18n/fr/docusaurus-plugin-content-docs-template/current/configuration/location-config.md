---
id: location-config
title: Référence de configuration des localisations
sidebar_label: Localisation
sidebar_position: 13
---

# Référence de configuration des localisations

Cette page documente tous les paramètres de localisation et de carte disponibles dans le template.

## Source de configuration

Les paramètres de localisation sont définis dans la section `settings.location` du `config.yml` de votre dépôt de contenu :

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' ou 'google'
    map_style: streets        # 'streets' ou 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [48.8566, 2.3522]  # [latitude, longitude]
```

## Paramètres disponibles

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `enabled` | `boolean` | `false` | Commutateur principal pour toutes les fonctionnalités de localisation |
| `provider` | `MapProvider` | `'mapbox'` | Fournisseur de tuiles de carte et de géocodage |
| `mapStyle` | `MapStyle` | `'streets'` | Style de rendu de la carte |
| `distanceFilterEnabled` | `boolean` | `true` | Afficher le filtre de rayon de distance dans la recherche |
| `distanceSortEnabled` | `boolean` | `true` | Autoriser le tri des résultats par distance |
| `defaultRadiusKm` | `number` | `50` | Rayon de recherche par défaut en kilomètres |
| `showExactAddress` | `boolean` | `false` | Afficher les adresses complètes publiquement |
| `requireLocationOnSubmit` | `boolean` | `false` | Rendre la localisation obligatoire à la soumission |
| `defaultCenter` | `[number, number]` | `[0, 0]` | Centre de carte par défaut [latitude, longitude] |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Clé API Google Maps (active le fournisseur Google) |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Token d'accès Mapbox (active le fournisseur Mapbox) |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | ID de carte Google Maps (optionnel, pour les cartes stylisées) |
