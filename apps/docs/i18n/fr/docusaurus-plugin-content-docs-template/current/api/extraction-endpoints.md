---
id: extraction-endpoints
title: "Points de terminaison Extraction et Vérification"
sidebar_label: "Extraction & Vérification"
sidebar_position: 19
---

# Points de terminaison Extraction et Vérification

Ces points de terminaison fournissent l'extraction de métadonnées d'URL (via l'API de la plateforme Ever Works) et la vérification de token reCAPTCHA Google. Les deux agissent comme des proxies sécurisés côté serveur pour maintenir les clés API et les secrets hors du code client.

**Fichiers source :**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Résumé des routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | `/api/extract` | Aucune | Extraire les métadonnées d'un élément depuis une URL |
| POST | `/api/verify-recaptcha` | Aucune | Vérifier un token reCAPTCHA |

---

## POST `/api/extract`

Un proxy sécurisé qui extrait les métadonnées d'un élément (nom, description, suggestions de catégories) depuis une URL donnée en utilisant l'API de la plateforme Ever Works. Le point de terminaison maintient les identifiants `PLATFORM_API_URL` et `PLATFORM_API_SECRET_TOKEN` côté serveur.

### Disponibilité de la fonctionnalité

Ce point de terminaison nécessite que `PLATFORM_API_URL` soit configuré. Lorsqu'il n'est pas configuré, il retourne une réponse gracieuse indiquant que la fonctionnalité est désactivée plutôt qu'une erreur stricte :

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `url` | string (URL) | **Oui** | L'URL dont extraire les métadonnées |
| `existingCategories` | string[] | Non | Noms de catégories existantes pour aider à la catégorisation |

Validé avec un schéma Zod :

```ts
const extractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  existingCategories: z.array(z.string()).optional()
});
```

### Exemple de requête

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Fonctionnement

Le gestionnaire proxifie la requête vers le point de terminaison `/extract-item-details` de l'API de plateforme :

```ts
const extractionEndpoint =
  `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

const response = await fetch(extractionEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(platformApiToken
      ? { Authorization: `Bearer ${platformApiToken}` }
      : {})
  },
  body: JSON.stringify({
    source_url: url,
    existing_data: existingCategories?.length > 0
      ? existingCategories
      : undefined
  })
});
```

### Réponse : 200 (Succès)

La réponse est transmise directement depuis l'API de plateforme :

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Réponse : 200 (Fonctionnalité désactivée)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Réponses d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Format d'URL invalide (validation Zod) |
| Variable | Erreur de l'API en amont (code de statut transmis depuis l'API de plateforme) |
| 500 | Erreur serveur interne lors de l'extraction |

### Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `PLATFORM_API_URL` | Oui (pour la fonctionnalité) | URL de base de l'API de la plateforme Ever Works |
| `PLATFORM_API_SECRET_TOKEN` | Non | Token Bearer pour les appels authentifiés à l'API de plateforme |

---

## POST `/api/verify-recaptcha`

Vérifie un token reCAPTCHA Google en communiquant avec l'API `siteverify` de Google. Prend en charge les tokens reCAPTCHA v2 et v3. En mode développement, le point de terminaison peut contourner la vérification lorsque la clé secrète n'est pas configurée.

### Corps de la requête

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `token` | string | **Oui** | Token reCAPTCHA issu de la vérification côté client |

### Exemple de requête

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Fonctionnement

Le gestionnaire envoie le token au point de terminaison de vérification de Google en utilisant des données de formulaire encodées en URL :

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Réponse : 200 (Vérifié)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Réponse : 200 (Vérification échouée)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Contournement en mode développement

Lorsque `RECAPTCHA_SECRET_KEY` n'est pas configuré et que `NODE_ENV` est `"development"`, le point de terminaison contourne la vérification et retourne un succès :

```ts
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({
      success: true,
      score: 1.0,
      action: "bypass",
    });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

### Réponses d'erreur

| Statut | Description |
|--------|-------------|
| 400 | Champ `token` manquant ou vide |
| 500 | Clé secrète non configurée (production uniquement) |
| 500 | Échec de la requête vers l'API Google |
| 500 | Erreur inattendue lors de la vérification |

### Champs de réponse

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indique si la vérification a réussi |
| `score` | number (0.0-1.0) | Score reCAPTCHA v3 (1.0 = probablement humain, 0.0 = probablement bot) |
| `action` | string | Nom de l'action reCAPTCHA |
| `hostname` | string | Nom d'hôte où la vérification a eu lieu |
| `challenge_ts` | string | Horodatage du défi |
| `error_codes` | string[] | Codes d'erreur de l'API Google |

### Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `RECAPTCHA_SECRET_KEY` | Oui (production) | Clé secrète Google reCAPTCHA |

---

## Exemples d'utilisation

### Extraction d'URL

```ts
// Extraire les métadonnées depuis une URL pour le formulaire de soumission d'élément
const res = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/product',
    existingCategories: ['Productivity', 'Developer Tools']
  })
});

const data = await res.json();

if (data.featureDisabled) {
  // Fonctionnalité non disponible, ignorer le remplissage automatique
  console.log('Extraction not available');
} else if (data.success) {
  // Remplir automatiquement les champs du formulaire
  setName(data.data.name);
  setDescription(data.data.description);
}
```

### Vérification reCAPTCHA

```ts
// Vérifier le token reCAPTCHA avant la soumission du formulaire
const recaptchaToken = await grecaptcha.execute(siteKey, {
  action: 'submit'
});

const res = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: recaptchaToken })
});

const { success, score } = await res.json();

if (success && score >= 0.5) {
  // Procéder à la soumission du formulaire
  submitForm();
} else {
  // Afficher le défi de vérification humaine
  showCaptchaChallenge();
}
```

---

## Fichiers source associés

| Fichier | Utilisation |
|---------|-------------|
| `template/app/api/extract/route.ts` | Proxy d'extraction d'URL |
| `template/app/api/verify-recaptcha/route.ts` | Proxy de vérification reCAPTCHA |
| `template/lib/api/server-api-client.ts` | Client API externe avec support `postForm` |
| `template/lib/config/config-service.ts` | Service de configuration pour les variables d'environnement |
