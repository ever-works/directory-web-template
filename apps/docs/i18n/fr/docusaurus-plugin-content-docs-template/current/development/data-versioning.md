---
id: data-versioning
title: Système d'affichage de version des données
sidebar_label: Versionnage des données
sidebar_position: 6
---

# Système d'affichage de version des données

Ever Works inclut un système de versionnage des données qui montre aux utilisateurs la version actuelle des données qu'ils consultent, offrant une transparence sur la fraîcheur du contenu.

## Vue d'ensemble

Le système fournit :
- **Affichage de version en temps réel** — Montre la version actuelle du dépôt de données
- **Rafraîchissement automatique** — Met à jour périodiquement les informations de version
- **Plusieurs variantes** — Vues badge, en ligne et détaillée
- **Détails en infobulle** — Survol pour des informations complètes
- **Support ISR** — Fonctionne avec la Régénération Statique Incrémentale
- **Gestion d'erreur** — Repli gracieux lorsque non disponible

## Composants

### VersionDisplay

Composant principal pour afficher les informations de version :

```tsx
import { VersionDisplay } from "@/components/version";

// Affichage en ligne basique
<VersionDisplay variant="inline" />

// Variante badge
<VersionDisplay variant="badge" />

// Vue détaillée avec informations supplémentaires
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props :**
- `variant` : `"inline" | "badge" | "detailed"` — Style d'affichage
- `showDetails` : `boolean` — Afficher les informations étendues (variante détaillée uniquement)
- `className` : `string` — Classes CSS supplémentaires
- `refreshInterval` : `number` — Intervalle de rafraîchissement automatique en ms (défaut : 5 minutes)

## Architecture

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Dépôt Git]
    Git --> Cache[Couche de cache]
    Cache --> Response[Informations de version]
```

## Endpoint API

`GET /api/version` retourne les informations de version actuelles :

```json
{
  "version": "abc1234",
  "timestamp": "2024-01-15T10:30:00Z",
  "branch": "main",
  "message": "Update item listing"
}
```
