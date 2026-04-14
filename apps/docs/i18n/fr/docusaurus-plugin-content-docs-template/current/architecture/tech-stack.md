---
id: tech-stack
title: Pile technologique
sidebar_label: Pile technologique
sidebar_position: 2
---

# Pile technologique

Ce document fournit un aperçu complet de toutes les technologies utilisées dans Ever Works.

## Configuration système requise

- **Node.js** : 20.19.0 ou version ultérieure
- **PostgreSQL** : 14.0 ou version ultérieure
- **Gestionnaire de paquets** : npm, pnpm, fil ou chignon

## Technologies frontales {#frontend}

### Cadre de base

- **[Next.js 15.4.7] (https://nextjs.org/)** - Framework React avec App Router
  - Rendu côté serveur (SSR)
  - Génération de sites statiques (SSG)
  - Régénération statique incrémentale (ISR)
  - Actions du serveur pour les mutations
  - Optimisation intégrée
  - Routage basé sur des fichiers avec des segments dynamiques `[locale]`

- **[React 19.1.0] (https://react.dev/)** - Bibliothèque d'interface utilisateur
  - Dernières fonctionnalités et améliorations
  - Rendu simultané
  - Mise en lots automatique
  - Suspense pour la récupération des données
  - Composants du serveur par défaut

### Sécurité des langues et des types

- **[TypeScript 5.x] (https://www.typescriptlang.org/)** - Vérification de type statique
  - Mode strict activé
  - Mappage de chemin configuré (`@/` alias)
  - Définitions de types personnalisés
  - Inférence de type complet

### Style et interface utilisateur

- **[Tailwind CSS 3.4] (https://tailwindcss.com/)** - Framework CSS axé sur les utilitaires
  - Système de conception personnalisé
  - Prise en charge du mode sombre
  - Utilitaires de conception réactifs
  - Compilation JIT
  - Système de couleurs dynamique (50-950 nuances)

- **[HeroUI React 2.6] (https://www.heroui.com/)** - Composants React modernes
  - Composants accessibles
  - Thèmes personnalisables
  - Prise en charge de TypeScript
  - Arbre pouvant être secoué

- **[Radix UI] (https://www.radix-ui.com/)** - Composants accessibles sans style
  - Primitives d'interface utilisateur sans tête
  - Navigation complète au clavier
  - Conforme ARIA
  - Composable

- **[Framer Motion 12.x] (https://www.framer.com/motion/)** - Bibliothèque d'animations
  - Animations déclaratives
  - Prise en charge des gestes
  - Animations de mise en page
  - Animations SVG

### Édition de texte enrichi

- **[TipTap] (https://tiptap.dev/)** - Éditeur de texte enrichi sans tête
  - Architecture extensible
  - Prise en charge des démarques
  - Prêt pour l'édition collaborative
  - Extensions personnalisées

### Gestion de l'État

- **[Zustand 5] (https://zustand-demo.pmnd.rs/)** - Gestion légère de l'état
  - API simple
  - Prise en charge de TypeScript
  - Passe-partout minimal
  - Intégration des DevTools
  - Prise en charge du middleware

- **[TanStack React Query 5] (https://tanstack.com/query/)** - Gestion de l'état du serveur
  - Mise en cache et synchronisation
  - Mises à jour en arrière-plan
  - Mises à jour optimistes
  - Gestion des erreurs
  - Requêtes infinies

### Visualisation des données

- **[TanStack Table] (https://tanstack.com/table/)** - Bibliothèque de tables sans tête
  - Tri, filtrage, pagination
  - Redimensionnement des colonnes
  - Sélection de ligne
  - Prise en charge de TypeScript

- **[TanStack Virtual] (https://tanstack.com/virtual/)** - Bibliothèque de virtualisation
  - Défilement virtuel
  - Optimisation des performances
  - Hauteurs de rangée dynamiques

### Gestion des formulaires

- **[React Hook Form 7] (https://react-hook-form.com/)** - Formulaires performants
  - Rendus minimes
  - Validation intégrée
  - Prise en charge de TypeScript
  - Intégration facile
  - Prise en charge des tableaux de terrain

- **[Zod 4] (https://zod.dev/)** - Validation du schéma
  - TypeScript d'abord
  - Validation d'exécution
  - Inférence de type
  - Gestion des erreurs
  - Validateurs personnalisés

## Technologies back-end

### Base de données et ORM

- **[PostgreSQL 14+] (https://www.postgresql.org/)** - Base de données relationnelle
  - Conformité ACIDE
  - Fonctionnalités avancées (JSONB, recherche en texte intégral)
  - Excellentes performances
  - Prise en charge de JSON
  - Déclencheurs et procédures stockées

- **[Drizzle ORM 0.40.0] (https://orm.drizzle.team/)** - TypeScript ORM
  - Requêtes de type sécurisé
  - Frais généraux minimes
  - Syntaxe de type SQL
  - Système migratoire
  - Requêtes relationnelles
  - Déclarations préparées

- **[Supabase] (https://supabase.com/)** - Backend-as-a-Service (facultatif)
  - PostgreSQL hébergé
  - Abonnements en temps réel
  - Sécurité au niveau des lignes
  - Authentification intégrée
  - Seaux de stockage
  - Fonctions de bord

### Authentification

- **[NextAuth.js 5.0 (bêta)] (https://authjs.dev/)** - Bibliothèque d'authentification
  - Plusieurs fournisseurs OAuth (Google, GitHub, Facebook, Twitter)
  - Sessions JWT et base de données
  - Prise en charge de TypeScript
  - Bonnes pratiques de sécurité
  - Authentification basée sur les informations d'identification
  - Gestion des séances

- **[Supabase Auth] (https://supabase.com/auth)** - Solution d'authentification alternative
  - Gestion des utilisateurs intégrée
  - Prestataires sociaux
  - Vérification des e-mails
  - Réinitialisation du mot de passe
  - Liens magiques
  - Authentification téléphonique

### Architecture à double authentification

Ever Works prend en charge **à la fois NextAuth.js et Supabase Auth** simultanément :

- NextAuth pour les flux OAuth traditionnels
- Supabase Auth pour les fonctionnalités en temps réel
- Gestion de session unifiée
- Changement de fournisseur fluide

## Gestion de contenu

### CMS basé sur Git

- **[isomorphic-git] (https://isomorphic-git.org/)** - Opérations Git en JavaScript
  - Cloner des référentiels
  - Extraire les modifications
  - Valider les fichiers
  - Gestion de succursale

- **[js-yaml] (https://github.com/nodeca/js-yaml)** - Analyseur YAML
  - Analyser les fichiers YAML
  - Générer YAML
  - Validation du schéma
  - Gestion des erreurs

### Traitement des fichiers

- **[gray-matter] (https://github.com/jonschlinkert/gray-matter)** - Analyseur Frontmatter
  - Analyser les fichiers de démarque
  - Extraire les métadonnées
  - Prend en charge plusieurs formats

## Internationalisation

- **[next-intl 3.26] (https://next-intl-docs.vercel.app/)** - i18n pour Next.js
  - Prise en charge du routeur d'application
  - Traductions de type sécurisé
  - Pluralisation
  - Formatage de date/nombre

### Langues prises en charge

Ever Works prend en charge **plus de 13 langues** :

- 🇫🇷 Anglais (fr)
- 🇫🇷 Français (fr)
- 🇪🇸 Espagnol (es)
- 🇨🇳 Chinois (zh)
- 🇩🇪 Allemand (de)
- 🇸🇦 Arabe (ar) - avec support RTL
- 🇮🇹 Italien (it)
- 🇵🇹 Portugais (pt)
- 🇯🇵 Japonais (ja)
- 🇰🇷 coréen (ko)
- 🇷🇺 Russe (ru)
- 🇳🇱 Néerlandais (nl)
- 🇵🇱 Polonais (pl)

[En savoir plus sur l'internationalisation →](/internationalisation)

## Analyse et surveillance

### Analyse

- **[PostHog] (https://posthog.com/)** - Analyse de produits
  - Suivi des événements
  - Identification de l'utilisateur
  - Indicateurs de fonctionnalités
  - Enregistrement de séance

### Suivi des erreurs

- **[Sentry 9.38] (https://sentry.io/)** - Surveillance des erreurs
  - Suivi des erreurs
  - Suivi des performances
  - Suivi des versions
  - Commentaires des utilisateurs

### Performances

- **[Vercel Analytics] (https://vercel.com/analytics)** - Éléments vitaux Web
  - Éléments essentiels du Web
  - Surveillance réelle des utilisateurs
  - Informations sur les performances

## Traitement des paiements

### Fournisseurs de paiement

- **[Stripe] (https://stripe.com/)** - Plateforme de paiement complète
  - Paiements uniques
  - Abonnements récurrents
  - Plusieurs modes de paiement (cartes, Apple Pay, Google Pay)
  - Plusieurs devises
  - Analyses et rapports avancés
  - Portail client
  - Facturation
  - Webhooks

- **[LemonSqueezy] (https://lemonsqueezy.com/)** - Plateforme marchand de référence
  - Conformité fiscale automatique
  - Paiements mondiaux (plus de 135 pays)
  - Abonnements
  - Prévention de la fraude
  - Configuration simplifiée
  - Prise en charge du programme d'affiliation

[En savoir plus sur l'intégration des paiements →](/paiement)

### SDK de paiement

- **[@stripe/stripe-js 7.3.0] (https://github.com/stripe/stripe-js)** - SDK client Stripe
- **[stripe 18.1.0] (https://github.com/stripe/stripe-node)** - SDK du serveur Stripe
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0] (https://github.com/lmsqueezy/lemonsqueezy.js)** - SDK LemonSqueezy

## Intégration CRM

- **[Twenty CRM] (https://twenty.com/)** - CRM open source
  - Gestion de la relation client
  - Synchronisation des contacts
  - Suivi d'activité
  - Champs personnalisés
  - Intégration API
  - Auto-hébergé ou cloud

### Fonctionnalités CRM

- Création automatique de contacts à partir des inscriptions des utilisateurs
- Synchroniser les activités et les interactions des utilisateurs
- Suivre les abonnements et les paiements
- Mappage de champs personnalisé
- Synchronisation basée sur un webhook

## Services de messagerie

- **[Renvoyer 4] (https://resend.com/)** - API de messagerie
  - E-mails transactionnels
  - Prise en charge des modèles
  - Suivi de livraison
  - Adapté aux développeurs

- **[Novu 2.6] (https://novu.co/)** - Infrastructure de notifications
  - Notifications multicanaux
  - Gestion des modèles
  - Automatisation du flux de travail
  - Analyse

## Système d'enquête

- **[SurveyJS] (https://surveyjs.io/)** - Générateur d'enquêtes et de formulaires
  - Plusieurs types de questions (à choix multiples, texte, évaluation, matrice)
  - Logique conditionnelle
  - Aperçu de l'enquête
  - Analyse des réponses
  - Exporter vers CSV/Excel
  - Réponses anonymes ou authentifiées
  - Thèmes personnalisés

[En savoir plus sur les enquêtes →](/guides/survey-system)

## Sécurité

### Sécurité de l'authentification

- **[bcryptjs 3] (https://github.com/dcodeIO/bcrypt.js)** - Hachage de mot de passe
  - Stockage sécurisé des mots de passe
  - Génération de sel
  - Protection contre les attaques chronométrées

- **[jose 6] (https://github.com/panva/jose)** - Opérations JWT
  - Génération de jetons
  - Vérification des jetons
  - Prise en charge du cryptage

### Validation des entrées

- **[Réagissez Google reCAPTCHA 3] (https://github.com/dozoisch/react-google-recaptcha)** - Protection contre les robots
  - Protection des formulaires
  - reCAPTCHA invisible
  - Vérification basée sur le score

## Outils de développement

### Qualité du code

- **[ESLint 9] (https://eslint.org/)** - Linter JavaScript
  - Règles de qualité du code
  - Configurations personnalisées
  - Prise en charge de TypeScript
  - Règles Next.js

- **[Prettier 3.5] (https://prettier.io/)** - Formateur de code
  - Formatage cohérent
  - Intégration de l'éditeur
  - Règles personnalisées

### Outils de construction

- **[PostCSS 8] (https://postcss.org/)** - Processeur CSS
  - Traitement CSS Tailwind
  - Préfixe automatique
  - Optimisation CSS

- **[Webpack 5] (https://webpack.js.org/)** - Bundleur de modules (via Next.js)
  - Fractionnement de code
  - Arbre qui tremble
  - Optimisation des actifs

## Déploiement et infrastructure

### Plateformes d'hébergement

- **[Vercel] (https://vercel.com/)** - Plateforme recommandée
  - Optimisation Next.js
  - Fonctions de bord
  - CDN mondial
  - Déploiements automatiques

- **[Netlify] (https://netlify.com/)** - Plateforme alternative
  - Hébergement de sites statiques
  - Fonctions sans serveur
  - Gestion des formulaires

### Hébergement de base de données

- **[Supabase] (https://supabase.com/)** - PostgreSQL géré
  - Sauvegardes automatiques
  - Regroupement de connexions
  - Fonctionnalités en temps réel

- **[PlanetScale] (https://planetscale.com/)** - MySQL sans serveur
  - Flux de travail de branchement
  - Mise à l'échelle automatique
  - Gestion des schémas

- **[Neon] (https://neon.tech/)** - PostgreSQL sans serveur
  - Branchement instantané
  - Mise à l'échelle automatique
  - Récupération à un moment précis

## Gestion des paquets

- **[pnpm] (https://pnpm.io/)** - Gestionnaire de packages rapide et économe en espace disque
  - Installations plus rapides
  - Dépendances partagées
  - Résolution stricte des dépendances

- **[npm] (https://npmjs.com/)** - Gestionnaire de packages Node.js par défaut
  - Largement pris en charge
  - Grand écosystème
  - Audit de sécurité

## Exigences de version

### Noeud.js

- **Minimum** : Node.js 20.19.0
- **Recommandé** : dernière version LTS
- **Gestionnaire de packages** : npm 10+, fil 1.13+ ou pnpm 8+

### Prise en charge du navigateur

- **Navigateurs modernes** : Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile** : iOS Safari 14+, Chrome Mobile 90+
- **Pas de support IE** : fonctionnalités modernes uniquement

## Considérations relatives aux performances

### Taille du paquet

- **Pack de base** : ~ 200 Ko compressés
- **Répartition du code** : basé sur les routes et basé sur les composants
- **Secousse d'arbre** : élimination du code inutilisé
- **Importations dynamiques** : chargement différé pour les composants non critiques

### Performances d'exécution

- **React 19** : fonctionnalités simultanées pour une meilleure UX
- **Next.js 15** : rendu et mise en cache optimisés
- **Optimisation de l'image** : prise en charge de WebP/AVIF avec chargement différé
- **Optimisation des polices** : polices auto-hébergées avec préchargement

### Performances de la base de données

- **Regroupement de connexions** : connexions de base de données efficaces
- **Optimisation des requêtes** : requêtes indexées et jointures efficaces
- **Mise en cache** : mise en cache au niveau de l'application et de la base de données

## Pile de sécurité

### Sécurité des applications

- **HTTPS** : appliqué en production
- **Protection CSRF** : intégrée à NextAuth.js
- **Protection XSS** : désinfection du contenu
- **Injection SQL** : Requêtes paramétrées via Drizzle

### Sécurité des infrastructures

- **Variables d'environnement** : Gestion sécurisée des secrets
- **Limitation de débit** : protection des points de terminaison de l'API
- **Validation d'entrée** : validation du schéma Zod
- **Sécurité du téléchargement de fichiers** : restrictions de type et de taille

## Pile de surveillance

### Surveillance des applications

- **Suivi des erreurs** : Sentry pour la surveillance des erreurs
- **Performances** : suivi des Core Web Vitals
- **Analytics** : PostHog pour le comportement des utilisateurs
- **Disponibilité** : services de surveillance externes

### Surveillance des infrastructures

- **Base de données** : Surveillance des connexions et des requêtes
- **API** : suivi du temps de réponse et du taux d'erreur
- **CDN** : taux de réussite et performances du cache
- **Déploiement** : surveillance des builds et des déploiements

## Considérations futures

### Mises à niveau prévues

- **React 19** : adoption d'une version stable
- **Next.js 16** : si disponible
- **TypeScript 5.x** : dernières fonctionnalités
- **Node.js 22** : mise à niveau LTS

### Ajouts potentiels

- **GraphQL** : pour les exigences de données complexes
- **WebSockets** : fonctionnalités en temps réel
- **PWA** : fonctionnalités progressives de l'application Web
- **Edge computing** : performances améliorées

## Matrice de décision technologique

|Exigence|Choix technologique|Justification|
|-------------|-------------------|-----------|
|**Cadre**|Suivant.js 15|Framework React de premier ordre avec App Router|
|**Base de données**|PostgreSQL + Bruine|Type-safe, performant, évolutif|
|**Authentification**|NextAuth.js + Supabase|Flexibilité du double fournisseur|
|**Style**|Tailwind CSS + HeroUI|Développement rapide, conception cohérente|
|**État**|Requête Zustand + React|État client simple + état serveur puissant|
|**Formulaires**|Réagir au formulaire de crochet + Zod|Performance + sécurité de type|
|**i18n**|prochain-intl|Meilleure prise en charge du routeur d'application Next.js|
|**Paiement**|Rayure + LemonSqueezy|Flexibilité + conformité globale|
|**Courriel**|Renvoyer + Novu|Adapté aux développeurs + multicanal|
|**Analyses**|PostHog + Sentinelle|Informations sur les produits + suivi des erreurs|

## Prochaines étapes

- [Présentation de l'architecture](./overview) - Comprendre l'architecture du système
- [Fonctionnalités de la plateforme](./features) - Explorez toutes les fonctionnalités de la plateforme
- [Configuration du développement](/development/local-setup) - Configurez votre environnement

## Ressources

### Documentation officielle

- [Documentation Next.js] (https://nextjs.org/docs)
- [Documentation React] (https://react.dev/)
- [Manuel TypeScript] (https://www.typescriptlang.org/docs/)
- [Documents CSS Tailwind] (https://tailwindcss.com/docs)
- [Drizzle ORM Docs] (https://orm.drizzle.team/docs/overview)

### Ressources communautaires

- [Next.js GitHub] (https://github.com/vercel/next.js)
- [Réagissez GitHub] (https://github.com/facebook/react)
- [Tailwind GitHub] (https://github.com/tailwindlabs/tailwindcss)
- [Communauté Ever Works] (https://github.com/ever-co/ever-works)
