# Aperçu du déploiement

Ce guide couvre le déploiement d'Ever Works dans des environnements de production, y compris les instructions spécifiques aux plateformes et les meilleures pratiques.

## Plateformes de déploiement

### Plateformes recommandées

1. **[Vercel](https://vercel.com/)** — Meilleur pour Next.js (recommandé)
2. **[Netlify](https://netlify.com/)** — Idéal pour les sites statiques
3. **[Railway](https://railway.app/)** — Déploiement full-stack simple
4. **[DigitalOcean App Platform](https://digitalocean.com/products/app-platform/)** — Conteneurs gérés

### Options auto-hébergées

1. **Docker** — Déploiement conteneurisé
2. **PM2** — Gestion des processus pour Node.js
3. **Nginx** — Configuration de proxy inverse
4. **Kubernetes** — Orchestration de conteneurs

## Liste de contrôle pré-déploiement

### Préparation du code
- [ ] Tous les tests passent
- [ ] Compilation TypeScript réussie
- [ ] Vérifications ESLint passées
- [ ] Le processus de construction se termine sans erreurs
- [ ] Variables d'environnement configurées

### Configuration de la base de données
- [ ] Base de données de production créée
- [ ] Migrations appliquées
- [ ] Chaîne de connexion configurée
- [ ] Stratégie de sauvegarde implémentée

### Services externes
- [ ] Applications OAuth configurées
- [ ] Fournisseurs de paiement configurés
- [ ] Service d'e-mail configuré
- [ ] Outils d'analytique intégrés
- [ ] Suivi des erreurs activé

### Sécurité
- [ ] Secrets correctement configurés
- [ ] HTTPS activé
- [ ] Paramètres CORS configurés
- [ ] Limitation du débit activée
- [ ] Validation des entrées implémentée

## Configuration de l'environnement

### Variables d'environnement de production

```bash
# Configuration de base
NODE_ENV=production
NEXT_PUBLIC_APP_URL="https://votredomaine.com"
NEXT_PUBLIC_API_BASE_URL="https://votredomaine.com/api"

# Sécurité
AUTH_SECRET="un-secret-long-et-aléatoire-de-production"
COOKIE_SECRET="un-autre-secret-long-de-production"
COOKIE_SECURE=true
COOKIE_DOMAIN=".votredomaine.com"

# Base de données
DATABASE_URL="postgresql://utilisateur:mdp@hôte:5432/everworks_prod"
```

## Prochaines étapes

- [Déploiement Vercel](/deployment/vercel) — Guide de déploiement Vercel
- [Docker](/deployment/docker) — Déploiement avec Docker
- [CI/CD](/deployment/ci-cd) — Pipelines d'intégration et déploiement continus
- [Liste de contrôle de production](/deployment/production-checklist) — Vérifications finales avant mise en production
