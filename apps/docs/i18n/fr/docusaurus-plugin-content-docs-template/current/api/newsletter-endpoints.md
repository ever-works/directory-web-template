---
id: newsletter-endpoints
title: "Actions Serveur Newsletter"
sidebar_label: "Newsletter"
sidebar_position: 26
---

# Actions Serveur Newsletter

Le système de newsletter utilise les Server Actions de Next.js plutôt que des gestionnaires de routes API traditionnels. Ces actions gèrent les abonnements par e-mail, notamment l'abonnement, le désabonnement et la récupération des statistiques. Des notifications par e-mail sont envoyées pour les événements d'abonnement et de désabonnement en utilisant des fournisseurs d'e-mail configurables.

## Aperçu

| Action | Auth | Description |
|---|---|---|
| `subscribeToNewsletter` | Public | Abonner un e-mail à la newsletter |
| `unsubscribeFromNewsletter` | Public | Désabonner un e-mail de la newsletter |
| `getNewsletterStatistics` | Aucune | Obtenir les statistiques d'abonnement |

Ces actions sont des Server Actions définies avec `'use server'` et invoquées depuis des composants React via des soumissions de formulaires ou des appels directs, et non via des points de terminaison HTTP.

## Actions serveur

### S'abonner à la newsletter

```typescript
subscribeToNewsletter(data: { email: string })
```

Abonne une adresse e-mail à la newsletter. Valide l'e-mail avec Zod, vérifie les abonnements actifs en double, crée l'enregistrement en base de données et envoie un e-mail de bienvenue. L'e-mail est automatiquement normalisé en minuscules et rogné.

**Validation des entrées (Zod) :**

| Champ | Type | Requis | Contraintes |
|---|---|---|---|
| `email` | chaîne | Oui | Doit être un format d'e-mail valide |

**Réponse en cas de succès :**

```json
{
  "success": true
}
```

**Réponses d'erreur :**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

| Erreur | Condition |
|---|---|
| `"Please enter a valid email address"` | Format d'e-mail invalide (validation Zod) |
| `"Email is already subscribed to the newsletter"` | Un abonnement actif existe déjà |
| `"Failed to create subscription. Please try again."` | Échec de l'insertion en base de données |
| `"Failed to subscribe to newsletter. Please try again."` | Erreur inattendue |

**Étapes de traitement :**

1. Valider et normaliser l'e-mail (minuscules, rogner)
2. Vérifier l'existence d'un abonnement actif via `getNewsletterSubscriptionByEmail`
3. Créer l'enregistrement d'abonnement avec la source `"footer"` via `createNewsletterSubscription`
4. Envoyer l'e-mail de bienvenue en utilisant le fournisseur d'e-mail configuré (Resend ou Novu)

Les échecs d'envoi d'e-mail sont interceptés silencieusement et n'empêchent pas l'abonnement de réussir.

**Source :** `template/app/[locale]/newsletter/actions.ts`

### Se désabonner de la newsletter

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

Désabonne un e-mail de la newsletter en définissant `isActive` à `false`. Envoie un e-mail de confirmation de désabonnement.

**Réponse en cas de succès :**

```json
{
  "success": true
}
```

**Réponses d'erreur :**

| Erreur | Condition |
|---|---|
| `"Email is not subscribed to the newsletter"` | Aucun abonnement actif trouvé |
| `"Failed to unsubscribe. Please try again."` | Échec de la mise à jour en base de données |

**Source :** `template/app/[locale]/newsletter/actions.ts`

### Obtenir les statistiques de la newsletter

```typescript
getNewsletterStatistics()
```

Retourne les statistiques agrégées de la newsletter. Aucun paramètre d'entrée requis.

**Réponse en cas de succès :**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

| Champ | Type | Description |
|---|---|---|
| `totalActive` | entier | Nombre d'abonnements actuellement actifs |
| `recentSubscriptions` | entier | Abonnements créés au cours des 30 derniers jours |

Retourne zéro pour les deux champs en cas d'échec de la requête, assurant une dégradation gracieuse.

**Source :** `template/app/[locale]/newsletter/actions.ts`

## Requêtes de base de données

Les données d'abonnement à la newsletter sont gérées via des fonctions de requête dédiées dans `lib/db/queries/newsletter.queries.ts`.

### Opérations d'abonnement

| Fonction | Description |
|---|---|
| `createNewsletterSubscription(email, source)` | Crée un nouvel enregistrement d'abonnement |
| `getNewsletterSubscriptionByEmail(email)` | Recherche un abonnement par e-mail |
| `updateNewsletterSubscription(email, updates)` | Met à jour les champs d'abonnement |
| `unsubscribeFromNewsletter(email)` | Définit `isActive: false` et enregistre `unsubscribedAt` |
| `resubscribeToNewsletter(email)` | Définit `isActive: true` et efface `unsubscribedAt` |
| `getNewsletterStats()` | Retourne le nombre actif et le nombre d'abonnements sur 30 jours |

Toutes les recherches par e-mail normalisent l'entrée en minuscules et rognent les espaces avant d'effectuer la requête.

**Source :** `template/lib/db/queries/newsletter.queries.ts`

## Configuration

Les constantes de configuration de la newsletter sont définies dans `lib/newsletter/config.ts` :

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### Sources d'abonnement

| Source | Description |
|---|---|
| `footer` | Abonnement depuis le formulaire du pied de page du site |
| `popup` | Abonnement depuis une boîte de dialogue contextuelle |
| `signup` | Abonnement lors de l'inscription de l'utilisateur |

### Schémas de validation

Deux schémas Zod sont exportés pour la validation :

- **`emailSchema`** -- valide et normalise un seul champ e-mail
- **`newsletterSubscriptionSchema`** -- valide l'e-mail et la source (défaut : `"footer"`)

### Fournisseurs d'e-mail

Le système prend en charge deux fournisseurs d'e-mail configurés via `config.yml` et les variables d'environnement :

| Fournisseur | Variable d'environnement | Description |
|---|---|---|
| Resend | `RESEND_API_KEY` | Fournisseur d'e-mail par défaut |
| Novu | `NOVU_API_KEY` | Fournisseur alternatif avec prise en charge des modèles |

Le fournisseur est sélectionné en fonction du champ `mail.provider` dans `config.yml`. La configuration des e-mails est construite dynamiquement à partir de la configuration de l'application en utilisant `createEmailConfig()`.

**Source :** `template/lib/newsletter/config.ts`

## Détails clés d'implémentation

- **Server Actions :** Ce ne sont pas des points de terminaison API REST. Ils utilisent le wrapper `validatedAction` de `lib/auth/middleware` qui fournit la validation du schéma Zod avant l'exécution de l'action.
- **Normalisation des e-mails :** Tous les e-mails sont normalisés en minuscules et rognés à la fois au niveau de l'action et au niveau de la requête de base de données pour des recherches cohérentes.
- **Échecs d'e-mail gracieux :** Les e-mails de bienvenue et de confirmation de désabonnement sont envoyés via `sendEmailSafely()`, qui intercepte les erreurs silencieusement. Un échec d'e-mail n'empêche pas l'opération d'abonnement de se terminer.
- **Prévention des doublons :** Avant de créer un abonnement, le système vérifie l'existence d'un abonnement actif en utilisant `validateExistingSubscription()`.
- **Désabonnement doux :** Le désabonnement définit `isActive: false` plutôt que de supprimer l'enregistrement, préservant ainsi l'historique des abonnements.
