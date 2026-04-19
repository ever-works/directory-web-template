---
id: recaptcha-endpoints
title: Référence API ReCAPTCHA
sidebar_label: ReCAPTCHA
sidebar_position: 57
---

# Référence API ReCAPTCHA

## Aperçu

Le point de terminaison ReCAPTCHA fournit une vérification côté serveur des jetons Google ReCAPTCHA v3. Il agit comme un proxy sécurisé entre le client et l'API de vérification de Google, en gardant la clé secrète côté serveur. En mode développement, la vérification peut être contournée lorsque la clé secrète n'est pas configurée.

## Points de terminaison

### POST /api/verify-recaptcha

Vérifie un jeton Google ReCAPTCHA v3 en communiquant avec l'API `siteverify` de Google. Retourne le résultat de la vérification, incluant le score bot/humain.

**Requête**
```typescript
{
  token: string;   // Jeton ReCAPTCHA depuis grecaptcha.execute() côté client
}
```

**Réponse**
```typescript
{
  success: boolean;           // Si la vérification a réussi
  score?: number;             // 0.0 (bot) à 1.0 (humain)
  action?: string;            // Nom de l'action du défi ReCAPTCHA
  hostname?: string;          // Nom d'hôte où la vérification a eu lieu
  challenge_ts?: string;      // Horodatage ISO 8601 du défi
  error_codes?: string[];     // Codes d'erreur de l'API Google (le cas échéant)
}
```

**Exemple**
```typescript
// Côté client : obtenir le jeton
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Vérification serveur
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Procéder à la soumission du formulaire
} else {
  // Bloquer l'activité suspecte de bot
}
```

### Comportement en mode développement

Lorsque `RECAPTCHA_SECRET_KEY` n'est pas configuré et que `NODE_ENV` est `"development"`, le point de terminaison contourne la vérification Google et retourne :

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

Un avertissement est enregistré dans la console indiquant que la vérification est contournée.

## Authentification

Ce point de terminaison est **public** — aucune authentification n'est requise. Il est conçu pour être appelé depuis les flux de soumission de formulaires côté client avant ou pendant le traitement du formulaire.

## Réponses d'erreur

| Statut | Description |
| ------ | ----------- |
| 400 | `token` manquant ou vide dans le corps de la requête |
| 500 | `RECAPTCHA_SECRET_KEY` non configuré (production uniquement), échec de la requête API Google, ou erreur d'exécution inattendue |

## Limitation du débit

Aucune limitation de débit au niveau application n'est appliquée. L'API ReCAPTCHA de Google a ses propres limites. Le point de terminaison utilise le format `application/x-www-form-urlencoded` lors de la communication avec l'API Google.

## Points de terminaison associés

Il s'agit d'un point de terminaison de sécurité autonome. Il est généralement invoqué avant les soumissions de formulaires ou les actions sensibles dans l'application.

