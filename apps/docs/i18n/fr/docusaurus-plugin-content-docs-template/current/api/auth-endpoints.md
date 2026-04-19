---
id: auth-endpoints
title: Points de terminaison API d'authentification
sidebar_label: Endpoints d'authentification
sidebar_position: 4
---

# Points de terminaison API d'authentification

Les points de terminaison d'authentification gèrent le traitement des routes NextAuth.js, la gestion des mots de passe et la récupération de la session utilisateur actuelle. La route principale NextAuth gère automatiquement tous les callbacks OAuth, la gestion des sessions et la protection CSRF.

## Gestionnaire NextAuth (`/api/auth/[...nextauth]`)

La route fourre-tout exporte les gestionnaires de NextAuth depuis `lib/auth/index.ts` :

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Cette route unique gère toutes les opérations NextAuth :

### Points de terminaison GET (via NextAuth)

| Chemin | Description |
|--------|-------------|
| `/api/auth/signin` | Afficher la page de connexion ou rediriger vers le fournisseur |
| `/api/auth/signout` | Gérer la déconnexion |
| `/api/auth/session` | Obtenir la session actuelle en JSON |
| `/api/auth/csrf` | Obtenir le jeton CSRF |
| `/api/auth/providers` | Lister les fournisseurs d'authentification disponibles |
| `/api/auth/callback/[provider]` | Gestionnaire de callback OAuth |

### Points de terminaison POST (via NextAuth)

| Chemin | Description |
|--------|-------------|
| `/api/auth/signin/[provider]` | Initier la connexion avec un fournisseur |
| `/api/auth/signout` | Traiter la déconnexion |
| `/api/auth/callback/credentials` | Traiter la connexion par identifiants |
| `/api/auth/_log` | Journalisation interne Auth.js |

### Flux de callback OAuth

Lorsqu'un utilisateur s'authentifie avec un fournisseur OAuth :

```
1. L'utilisateur clique sur "Se connecter avec Google"
2. Redirection vers l'écran de consentement Google
3. Google redirige vers /api/auth/callback/google
4. NextAuth vérifie le code OAuth
5. Le callback signIn s'exécute (lib/auth/index.ts)
   -> Valide l'e-mail de l'utilisateur
   -> Autorise la liaison de compte pour OAuth
6. Le callback jwt enrichit le jeton
   -> Définit userId, provider, isAdmin
   -> Crée un profil client pour les nouveaux utilisateurs OAuth
7. Session créée, utilisateur redirigé vers l'URL de callback
```

## Gestion des mots de passe (`/api/auth/password`)

Ces routes gèrent la réinitialisation du mot de passe et la récupération par e-mail :

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/auth/password/forgot` | Envoyer l'e-mail de réinitialisation du mot de passe |
| `POST` | `/api/auth/password/reset` | Réinitialiser le mot de passe avec un jeton valide |

### Flux de réinitialisation du mot de passe

```
1. L'utilisateur soumet son adresse e-mail → POST /api/auth/password/forgot
2. Le serveur génère un jeton de réinitialisation unique
3. L'e-mail est envoyé avec le lien de réinitialisation
4. L'utilisateur clique sur le lien → page de réinitialisation du mot de passe
5. L'utilisateur soumet le nouveau mot de passe → POST /api/auth/password/reset
6. Le jeton est validé (non expiré, non utilisé)
7. Le mot de passe haché est mis à jour dans la base de données
8. Le jeton est invalidé pour éviter la réutilisation
```

### Validation du jeton de réinitialisation

Les jetons de réinitialisation du mot de passe :
- Expirent après 1 heure
- Sont à usage unique (invalidés après utilisation)
- Sont hachés dans la base de données pour la sécurité

## Utilisateur actuel (`/api/current-user`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/current-user` | Obtenir les informations de l'utilisateur authentifié actuel |

Retourne les données de session de l'utilisateur actuel enrichies de la base de données :

```typescript
{
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  clientProfileId: string | null;
  provider: string;
}
```

**Authentification :** Requise. Retourne `401` si non authentifié.

## Notes de sécurité

- Toutes les réponses de session suivent les meilleures pratiques de sécurité Auth.js
- Les jetons CSRF sont vérifiés automatiquement pour les opérations POST
- Les callbacks OAuth valident les domaines d'e-mail dans `lib/auth/index.ts`
- La protection par force brute doit être ajoutée au niveau de l'infrastructure (par exemple, limiteur de taux)
