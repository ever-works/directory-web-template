---
id: session-management
title: Gestion des sessions et sécurité
sidebar_label: Sessions
sidebar_position: 4
---

# Gestion des sessions et sécurité

Le modèle implémente une stratégie de session basée sur JWT avec une couche de cache en mémoire qui réduit la surcharge d'authentification jusqu'à 20 fois. Les sessions sont gérées via NextAuth.js avec des callbacks personnalisés pour la détection des rôles admin/client, le provisionnement automatique de profil client et l'invalidation du cache lors des changements d'état des utilisateurs.

## Stratégie de session

Les sessions utilisent la stratégie JWT configurée dans `lib/auth/index.ts` :

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60,    // 30 jours
  updateAge: 24 * 60 * 60,       // 24 heures
},
jwt: {
  maxAge: 30 * 24 * 60 * 60,    // 30 jours
},
```

- **Basé sur JWT** : Les sessions sont stockées comme JWTs chiffrés dans les cookies, non dans la base de données
- **Expiration à 30 jours** : Les tokens restent valides pendant 30 jours à partir de la création
- **Rafraîchissement à 24 heures** : Les données de session sont rafraîchies toutes les 24 heures

## Cache de session en mémoire

Pour améliorer les performances, le système met en cache les données de session :

```typescript
// Le cache réduit les requêtes de base de données répétées
const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

Ce cache est automatiquement invalidé lorsque :
- Les données utilisateur changent
- Le mot de passe est réinitialisé
- La session est explicitement révoquée

## Sécurité des cookies

Les cookies de session sont configurés avec :

```typescript
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,      // Inaccessible depuis JavaScript
      sameSite: 'lax',     // Protection CSRF
      secure: true,        // HTTPS uniquement en production
      domain: COOKIE_DOMAIN,
    }
  }
}
```

## Révocation de session

Pour révoquer les sessions d'un utilisateur :

```typescript
// Révoquer toutes les sessions actives
await revokeUserSessions(userId);

// Invalider le cache
sessionCache.delete(userId);
```

## Gestion des rôles dans la session

Les données de session incluent les rôles et permissions de l'utilisateur :

```typescript
// Données disponibles dans la session
session.user.id        // ID utilisateur
session.user.isAdmin   // Si l'utilisateur est administrateur
session.user.roles     // Tableau des rôles assignés
session.user.clientProfileId  // ID du profil client
```
