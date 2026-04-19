---
id: admin-navigation-endpoints
title: Points de terminaison Admin Navigation & Index de Localisation
sidebar_label: Admin Navigation
sidebar_position: 29
---

# Points de terminaison Admin Navigation & Index de Localisation

Ces points de terminaison admin gèrent les liens de navigation personnalisés du site et l'index géographique de localisation. Les points de terminaison de navigation permettent de configurer des liens personnalisés dans l'en-tête et le pied de page, stockés dans `config.yml`. Les points de terminaison d'index de localisation gèrent l'index spatial utilisé pour les analyses géographiques et les fonctionnalités cartographiques.

## Aperçu

| Point de terminaison             | Méthode | Auth  | Description                                       |
| -------------------------------- | ------- | ----- | ------------------------------------------------- |
| `/api/admin/navigation`          | GET     | Admin | Obtenir la configuration de navigation personnalisée |
| `/api/admin/navigation`          | PATCH   | Admin | Mettre à jour les éléments de navigation personnalisés |
| `/api/admin/location-index`      | GET     | Admin | Obtenir les statistiques de l'index de localisation |
| `/api/admin/location-index`      | POST    | Admin | Reconstruire ou effacer l'index de localisation   |

## Points de terminaison de navigation

### Obtenir la configuration de navigation

```
GET /api/admin/navigation
```

Récupère les éléments de navigation `custom_header` et `custom_footer` depuis le fichier `config.yml` du site. Retourne des tableaux vides si aucune navigation personnalisée n'est configurée.

**Authentification :** Admin requis (via `getCachedApiSession`)

**Réponse réussie (200) :**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Chaque élément de navigation possède deux champs :

| Champ   | Type   | Description                                                                                |
| ------- | ------ | ------------------------------------------------------------------------------------------ |
| `label` | chaîne | Texte d'affichage (texte brut ou clé de traduction i18n comme `"footer.PRIVACY_POLICY"`) |
| `path`  | chaîne | Chemin URL (route interne commençant par `/` ou URL externe avec `http://`/`https://`)    |

| Statut | Condition                              |
| ------ | -------------------------------------- |
| 401    | Non authentifié en tant qu'admin       |
| 500    | Échec de la lecture de la configuration|

**Source :** `template/app/api/admin/navigation/route.ts`

### Mettre à jour la configuration de navigation

```
PATCH /api/admin/navigation
```

Met à jour les éléments de navigation personnalisés de l'en-tête ou du pied de page dans `config.yml`. Valide le format du chemin de chaque élément pour prévenir les attaques XSS via des schémas d'URL dangereux.

**Authentification :** Admin requis

**Corps de la requête :**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Champ           | Type    | Requis | Description                              |
| --------------- | ------- | ------ | ---------------------------------------- |
| `type`          | chaîne  | Oui    | `"header"` ou `"footer"`                 |
| `items`         | tableau | Oui    | Tableau d'éléments de navigation         |
| `items[].label` | chaîne  | Oui    | Libellé d'affichage non vide             |
| `items[].path`  | chaîne  | Oui    | Chemin URL valide                        |

**Validation du chemin :**

La fonction `isValidNavigationPath()` applique des règles strictes de format de chemin :

| Format de chemin           | Autorisé | Exemple                        |
| -------------------------- | -------- | ------------------------------ |
| Routes internes            | Oui      | `/about`, `/pages/docs`        |
| URL HTTPS                  | Oui      | `https://example.com`          |
| URL HTTP                   | Oui      | `http://example.com`           |
| URL relatives au protocole | Non      | `//evil.com`                   |
| URL JavaScript             | Non      | `javascript:alert(1)`          |
| URL de données             | Non      | `data:text/html,...`           |
| Autres schémas             | Non      | `vbscript:`, `file:`           |

**Réponse réussie (200) :**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Réponses d'erreur :**

| Statut | Condition                                             |
| ------ | ----------------------------------------------------- |
| 400    | `type` n'est pas `"header"` ou `"footer"`             |
| 400    | `items` n'est pas un tableau                          |
| 400    | Élément sans champ `label` ou `path` (chaîne)         |
| 400    | Format de chemin invalide (prévention XSS)            |
| 401    | Non authentifié en tant qu'admin                      |
| 500    | Échec de l'écriture de la configuration               |

Passez un tableau `items` vide pour effacer toute la navigation personnalisée du type spécifié.

**Source :** `template/app/api/admin/navigation/route.ts`

## Points de terminaison de l'index de localisation

### Obtenir les statistiques de l'index de localisation

```
GET /api/admin/location-index
```

Retourne des statistiques sur l'index géographique de localisation, incluant le nombre total d'éléments indexés, le nombre de villes et de pays, et les métadonnées de reconstruction.

**Authentification :** Admin requis (via `checkAdminAuth()`)

**Mise en cache :** Désactivée — utilise `force-dynamic`, `revalidate: 0` et `force-no-store`.

**Réponse réussie (200) :**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Statut | Condition                        |
| ------ | -------------------------------- |
| 401    | Non authentifié en tant qu'admin |
| 500    | Erreur interne du serveur        |

**Source :** `template/app/api/admin/location-index/route.ts`

### Gérer l'index de localisation

```
POST /api/admin/location-index
```

Effectue des actions de gestion sur l'index de localisation. Prend en charge la reconstruction de l'index depuis zéro ou l'effacement de toutes les entrées.

**Authentification :** Admin requis

**Corps de la requête :**

```json
{
  "action": "rebuild"
}
```

| Champ    | Type   | Requis | Description                   |
| -------- | ------ | ------ | ----------------------------- |
| `action` | chaîne | Oui    | `"rebuild"` ou `"clear"`      |

**Actions :**

| Action    | Description                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `rebuild` | Récupère tous les éléments du dépôt et ré-indexe leurs données de localisation. Retourne des statistiques.           |
| `clear`   | Supprime toutes les entrées de l'index de localisation. Retourne le nombre d'entrées effacées.                       |

**Réponse réussie (200) — Reconstruction :**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Réponse réussie (200) — Effacement :**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Réponses d'erreur :**

| Statut | Condition                                          |
| ------ | -------------------------------------------------- |
| 400    | Action invalide (ni `"rebuild"` ni `"clear"`)      |
| 401    | Non authentifié en tant qu'admin                   |
| 500    | Erreur interne du serveur                          |

**Source :** `template/app/api/admin/location-index/route.ts`

## Détails clés d'implémentation

- **Prévention XSS :** La validation du chemin de navigation rejette tous les schémas d'URL à l'exception de `/`, `http://` et `https://`. Cela bloque `javascript:`, `data:`, `vbscript:` et les URL relatives au protocole (`//evil.com`) qui pourraient être utilisées pour du cross-site scripting.
- **Stockage de configuration :** Les éléments de navigation sont stockés dans `config.yml` sous les clés `custom_header` et `custom_footer`, persistés via `configManager.updateNestedKey()`.
- **Libellés i18n :** Les libellés de navigation peuvent être du texte brut ou des clés de traduction (ex. `"footer.PRIVACY_POLICY"`). Le frontend est responsable de la résolution des clés de traduction.
- **Reconstruction de l'index de localisation :** L'opération de reconstruction charge tous les éléments du `ItemRepository` et les transmet au service d'index de localisation. Cette opération peut être intensive en ressources pour de grands ensembles de données.
- **Invalidation du cache :** Les points de terminaison de l'index de localisation désactivent explicitement tout mise en cache pour garantir que le tableau de bord admin affiche toujours les données actuelles.

