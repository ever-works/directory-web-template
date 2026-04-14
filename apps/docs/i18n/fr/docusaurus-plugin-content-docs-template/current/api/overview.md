---
id: overview
title: Vue d'ensemble des routes API
sidebar_label: Vue d'ensemble
sidebar_position: 0
---

# Vue d'ensemble des routes API

Le modèle expose environ 151 gestionnaires de routes API organisés en 29 groupes de routes sous le répertoire `app/api/`. Toutes les routes utilisent la convention App Router de Next.js avec des fichiers `route.ts` exportant des gestionnaires de méthodes HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Groupes de routes

| Groupe | Chemin | Description | Routes approx. |
|--------|--------|-------------|----------------|
| **admin** | `/api/admin/*` | Opérations CRUD du panneau d'administration | ~60 |
| **auth** | `/api/auth/*` | Gestionnaires NextAuth + gestion des mots de passe | 2 |
| **categories** | `/api/categories/*` | Requêtes publiques de catégories | 1 |
| **client** | `/api/client/*` | Tableau de bord client et gestion des éléments | ~7 |
| **collections** | `/api/collections/*` | Requêtes publiques de collections | 1 |
| **config** | `/api/config/*` | Configuration des drapeaux de fonctionnalités | 1 |
| **cron** | `/api/cron/*` | Tâches planifiées en arrière-plan | 3 |
| **current-user** | `/api/current-user` | Informations sur l'utilisateur authentifié actuel | 1 |
| **extract** | `/api/extract` | Extraction des métadonnées d'URL | 1 |
| **favorites** | `/api/favorites/*` | Éléments favoris de l'utilisateur | 2 |
| **featured-items** | `/api/featured-items` | Listes d'éléments en vedette | 1 |
| **geocode** | `/api/geocode` | Géocodage d'adresses | 1 |
| **health** | `/api/health/*` | Vérifications de santé du système | 1 |
| **internal** | `/api/internal/*` | Opérations internes (initialisation de la base de données) | 1 |
| **items** | `/api/items/*` | Points de terminaison publics des éléments (commentaires, votes, vues) | ~12 |
| **lemonsqueezy** | `/api/lemonsqueezy/*` | Intégration de paiement Lemon Squeezy | 7 |
| **location** | `/api/location/*` | Recherche et données de localisation | 4 |
| **payment** | `/api/payment/*` | Gestion générique des paiements/abonnements | 3 |
| **polar** | `/api/polar/*` | Intégration de paiement Polar | 5 |
| **reference** | `/api/reference` | Point de terminaison de données de référence | 1 |
| **reports** | `/api/reports` | Soumission publique de signalements | 1 |
| **solidgate** | `/api/solidgate/*` | Intégration de paiement Solidgate | 2 |
| **sponsor-ads** | `/api/sponsor-ads/*` | Gestion des publicités sponsors | 7 |
| **stripe** | `/api/stripe/*` | Intégration de paiement Stripe | ~17 |
| **surveys** | `/api/surveys/*` | CRUD des sondages et réponses | 4 |
| **user** | `/api/user/*` | Profil utilisateur et abonnement | 5 |
| **verify-recaptcha** | `/api/verify-recaptcha` | Vérification reCAPTCHA | 1 |
| **version** | `/api/version/*` | Informations sur la version de l'application | 2 |

## Modèles d'architecture

### Structure des gestionnaires de routes

Les gestionnaires de routes suivent un modèle de gestionnaire léger cohérent :

```typescript
// app/api/admin/items/route.ts
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request: NextRequest) => {
  // 1. Analyser et valider l'entrée (paramètres de requête, corps)
  // 2. Appeler le service ou le dépôt
  // 3. Retourner la réponse JSON
  return NextResponse.json({ success: true, data: result });
});
```

### Middleware d'authentification

| Middleware | Utilisation | Vérifie |
|------------|-------------|---------|
| `withAdminAuth` | Routes admin | Session JWT + rôle admin dans la base de données |
| `withClientAuth` | Routes client | Session JWT + profil client existant |
| `withAuth` | Routes utilisateur générales | Session JWT valide uniquement |
| Public | Routes publiques | Aucune authentification requise |

### Réponses d'erreur

Toutes les routes utilisent `safeErrorResponse` pour les erreurs non gérées :

```typescript
return safeErrorResponse(error, 'Contexte de l\'opération');
```

Cela retourne :
- En développement : message d'erreur complet avec la trace de pile
- En production : message générique (`'Internal server error'`)

## Organisation des fichiers

```
app/api/
├── admin/
│   ├── categories/
│   ├── clients/
│   ├── collections/
│   ├── comments/
│   ├── companies/
│   ├── dashboard/
│   ├── featured-items/
│   ├── items/
│   │   └── [id]/
│   ├── navigation/
│   ├── notifications/
│   ├── roles/
│   ├── settings/
│   ├── sponsor-ads/
│   ├── surveys/
│   ├── tags/
│   └── users/
├── auth/
│   └── [...nextauth]/
├── categories/
├── client/
│   ├── dashboard/
│   └── items/
│       └── [id]/
├── cron/
│   ├── subscription-expiration/
│   ├── subscription-reminders/
│   └── sync/
├── favorites/
├── internal/
├── items/
│   └── [slug]/
│       ├── comments/
│       ├── engagement/
│       ├── views/
│       └── votes/
├── lemonsqueezy/
├── location/
├── payment/
├── polar/
├── solidgate/
├── sponsor-ads/
├── stripe/
├── user/
└── verify-recaptcha/
```

## Codes de statut HTTP

| Code | Signification | Utilisation |
|------|---------------|-------------|
| `200` | OK | Récupération réussie, mise à jour |
| `201` | Créé | Ressource créée avec succès |
| `400` | Mauvaise requête | Échec de validation, paramètres manquants |
| `401` | Non autorisé | Authentification requise |
| `403` | Interdit | Permissions insuffisantes (non-admin) |
| `404` | Non trouvé | Ressource introuvable |
| `409` | Conflit | Ressource existante déjà présente |
| `413` | Entité trop grande | Corps de la requête dépasse la limite |
| `500` | Erreur interne du serveur | Erreur non gérée |
