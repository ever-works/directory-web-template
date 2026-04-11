---
id: production-checklist
title: Liste de contrôle pour la production
sidebar_label: Checklist production
sidebar_position: 7
---

# Liste de contrôle pour la production

Une liste de contrôle complète pour s'assurer que votre déploiement Ever Works est prêt pour la production.

## Checklist pré-déploiement

### 1. Configuration de l'environnement

- [ ] **Base de données**
  - `DATABASE_URL` configuré avec PostgreSQL de production
  - Connection pooling activé
  - Mode SSL activé pour la production

- [ ] **Authentification**
  - `AUTH_SECRET` généré (min 32 caractères)
  - `COOKIE_SECRET` généré
  - Fournisseurs OAuth configurés (Google, GitHub, etc.)
  - URL de callback OAuth mises à jour vers le domaine de production

- [ ] **Fournisseurs de paiement**
  - Clés de production Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Secrets de webhook configurés
  - Mode test désactivé

- [ ] **Services email**
  - Clé API Resend configurée
  - Domaine d'envoi vérifié
  - Templates email testés

- [ ] **Analytics et monitoring**
  - Clé de production PostHog
  - DSN Sentry configuré
  - Fournisseur de suivi des exceptions défini

- [ ] **Sécurité**
  - `NODE_ENV=production`
  - Rate limiting configuré
  - En-têtes CORS vérifiés
  - En-têtes CSP configurés

### 2. Base de données

- [ ] Toutes les migrations appliquées
- [ ] Données de peuplement exécutées (admin, rôles, permissions)
- [ ] Sauvegardes automatiques configurées
- [ ] Chaîne de connexion testée

### 3. CMS basé sur Git

- [ ] `DATA_REPOSITORY` pointant vers le dépôt de contenu de production
- [ ] Token GitHub configuré (si dépôt privé)
- [ ] Clone initial vérifié

### 4. Tests de fumée

- [ ] Page d'accueil se charge correctement
- [ ] Connexion admin fonctionne
- [ ] Changement de langue fonctionnel
- [ ] Paiement de test réussi (mode test Stripe)
- [ ] Emails fonctionnent (envoi de test)

### 5. Performance

- [ ] Score Lighthouse ≥ 90 (Performance)
- [ ] Images optimisées (WebP, AVIF)
- [ ] Politique de cache configurée
- [ ] CDN activé (Vercel Edge Network ou équivalent)
