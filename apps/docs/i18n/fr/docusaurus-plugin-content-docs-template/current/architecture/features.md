---
id: features
title: Fonctionnalités de la plateforme
sidebar_label: Caractéristiques
sidebar_position: 3
---

# Fonctionnalités de la plateforme

Ce document fournit un aperçu complet de toutes les fonctionnalités disponibles dans la plateforme Ever Works, organisées par domaine fonctionnel.

## Authentification des utilisateurs et gestion des comptes

### Inscription des utilisateurs

**Description** : Permet aux nouveaux utilisateurs de créer des comptes sur la plateforme.

**Comment ça marche** :

- Les utilisateurs peuvent s'inscrire via e-mail/mot de passe ou via des fournisseurs OAuth (Google, GitHub, Facebook, Twitter)
- La vérification par e-mail est envoyée lors de l'inscription
- Le mot de passe est haché à l'aide de bcrypt avant le stockage
- Une fois l'inscription réussie, un profil client est automatiquement créé

**Flux utilisateur** :

1. L'utilisateur clique sur "S'inscrire" sur la page d'accueil
2. Choisit la méthode d'inscription (e-mail ou OAuth)
3. Remplit les informations requises (nom, email, mot de passe)
4. Reçoit un e-mail de vérification
5. Clique sur le lien de vérification pour activer le compte
6. Redirigé vers le tableau de bord client

**Fichiers clés** : `/lib/auth/index.ts`, `/app/[locale]/auth/`

[En savoir plus sur la configuration de l'authentification →](/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Gestion des mots de passe

**Description** : permet aux utilisateurs de modifier ou de réinitialiser leurs mots de passe.

**Caractéristiques** :

- **Modifier le mot de passe** : les utilisateurs authentifiés peuvent mettre à jour leur mot de passe à partir des paramètres
- **Mot de passe oublié** : les utilisateurs reçoivent un e-mail contenant un lien de réinitialisation
- **Jeton de réinitialisation** : jeton à durée limitée pour une réinitialisation sécurisée du mot de passe

**Comment ça marche** :

1. L'utilisateur demande la réinitialisation du mot de passe
2. Le système génère un jeton sécurisé stocké dans la table `passwordResetTokens`
3. E-mail envoyé avec un lien de réinitialisation contenant un jeton
4. L'utilisateur clique sur le lien et saisit un nouveau mot de passe
5. Le jeton est invalidé après utilisation

**Fichiers clés** : `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Recherche et filtrage

**Description** : permet aux utilisateurs de rechercher des éléments spécifiques en utilisant divers critères.

**Types de filtres** :

- **Recherche de texte** : recherche en texte intégral parmi les noms et descriptions d'éléments
- **Filtre de catégorie** : filtrer par catégorie unique ou multiple
- **Filtre de balises** : filtrer par balises attribuées aux éléments
- **Filtres combinés** : appliquez plusieurs filtres simultanément

**Comment ça marche** :

1. Les filtres sont stockés dans les paramètres d'URL pour faciliter le partage
2. `FilterProvider` le contexte gère l'état du filtre
3. `FilterURLParser` synchronise l'URL avec l'état du filtre
4. Les éléments sont filtrés côté serveur et renvoyés au client

**Expérience utilisateur** :

- Les filtres persistent dans l'URL (possibilité de mettre en signet/partageable)
- Mise à jour des résultats en temps réel
- Option Effacer tous les filtres

**Fichiers clés** : `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### Système de balises

**Description** : taxonomie plate pour l'organisation des articles entre catégories.

**Caractéristiques** :

- Plusieurs balises par article
- Affichage du nuage de tags
- Filtrage basé sur des balises
- Peut être activé/désactivé via les paramètres d'administration

**Comment ça marche** :

- Balises stockées dans `.content/tags/` sous forme de fichiers markdown
- Relation plusieurs-à-plusieurs avec les éléments
- Les balises cliquables filtrent la liste des éléments

**Fichiers clés** : `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### Système de notation

**Description** : les utilisateurs peuvent évaluer les articles sur une échelle de 1 à 5 étoiles.

**Comment ça marche** :

- La notation fait partie du système de commentaires
- Chaque commentaire peut inclure une note
- Note moyenne calculée et affichée
- Répartition des notes affichée (combien de 5 étoiles, 4 étoiles, etc.)

**Affichage** :

- Icônes étoiles affichant la note moyenne
- Nombre de notes à côté des étoiles
- Répartition des notes sur la page de détails de l'article

**Fichiers clés** : `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (tableau des commentaires)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### Système de favoris

**Description** : les utilisateurs peuvent enregistrer des éléments dans leur liste de favoris pour un accès rapide.

**Comment ça marche** :

1. L'utilisateur clique sur l'icône cœur/favori sur l'élément
2. Élément ajouté à la table `favorites`
3. Favoris accessibles depuis le profil de l'utilisateur
4. Action bascule (cliquez à nouveau pour supprimer)

**Caractéristiques** :

- Liste des favoris dans le portail client
- Action rapide et indésirable
- Les favoris comptent sur les éléments (facultatif)
- Exporter la liste des favoris

**Fichiers clés** : `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Soumission d'articles

**Description** : Permet aux utilisateurs de soumettre de nouveaux éléments à la plateforme.

**Comment ça marche** :

1. L'utilisateur accède à la page de soumission
2. Remplit les détails de l'article (nom, description, URL, logo)
3. Sélectionne la catégorie et les balises
4. Soumet pour examen
5. L'administrateur reçoit une notification de nouvelle soumission
6. L'administrateur examine et approuve/rejette
7. Les éléments approuvés apparaissent sur la plateforme

**Champs du formulaire** :

- Nom de l'article (obligatoire)
- Description (obligatoire)
- URL du site Web
- Téléchargement de logo/image
- Sélection de catégorie
- Sélection de balises
- Métadonnées supplémentaires

**États du flux de travail** :

- Brouillon → En attente de révision → Approuvé/Rejeté

**Fichiers clés** : `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/guides/survey-system)

---

## Système d'abonnement et de paiement

**Description** : Monétisation via un accès par abonnement ou des fonctionnalités premium.

**Fournisseurs pris en charge** :

- **Stripe** : Gestion complète des abonnements, facturation, portail client
- **LemonSqueezy** : processeur de paiement alternatif avec conformité fiscale

**Comment ça marche** :

1. Plans définis dans le fournisseur de paiement (Stripe/LemonSqueezy)
2. Les utilisateurs sélectionnent le forfait sur la page de tarification
3. Redirigé vers la caisse du fournisseur de paiement
4. Webhook gère le paiement réussi
5. Enregistrement d'abonnement créé dans la base de données
6. L'utilisateur a accès aux fonctionnalités premium

**Fichiers clés** : `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[En savoir plus sur l'intégration des paiements →](/paiement)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## Système de notifications

**Description** : notifications générées par le système pour les événements importants.

**Types de notifications** :

- Nouveaux commentaires sur les éléments de l'utilisateur
- Mises à jour de l'abonnement
- Annonces de l'administrateur
- Approbation/rejet de l'article

**Canaux de livraison** :

- Notifications dans l'application
- Notifications par e-mail (via Renvoyer/Novu)
- Notifications push (facultatif)

**Fichiers clés** : `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## Intégration CRM (Twenty CRM)

**Description** : Synchronisez les données de la plateforme avec Twenty CRM pour la gestion de la relation client.

**Caractéristiques** :

- Création automatique de contacts à partir des inscriptions des utilisateurs
- Synchroniser les activités et les interactions des utilisateurs
- Suivre les abonnements et les paiements
- Mappage de champs personnalisé
- Synchronisation basée sur un webhook

**Fichiers clés** : `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Internationalisation (i18n)

**Description** : Prise en charge multilingue de la plateforme.

**Langues prises en charge** : plus de 13 langues, dont l'anglais, le français, l'espagnol, le chinois, l'allemand, l'arabe (RTL) et plus encore.

**Caractéristiques** :

- Détection automatique des paramètres régionaux
- Changement de paramètres régionaux basé sur l'URL
- Prise en charge RTL pour l'arabe
- Formatage de date/nombre par paramètres régionaux
- Règles de pluralisation

**Fichiers clés** : `/messages/`, `/lib/i18n/`, `/middleware.ts`

[En savoir plus sur l'internationalisation →](/internationalisation)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Tableau de bord d'administration

**Description** : Hub central permettant aux administrateurs de surveiller et de gérer la plateforme.

**Widgets du tableau de bord** :

- Nombre total d'utilisateurs, d'éléments et d'abonnements
- Flux d'activité récente
- Soumissions en attente
- État de santé du système
- Présentation de l'analyse

**Principales fonctionnalités** :

- Statistiques en temps réel
- Actions rapides
- Notifications système
- Mesures de performances

**Fichiers clés** : `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Gestion des clients

**Description** : Gestion administrative des profils clients.

**Caractéristiques** :

- Voir tous les profils clients
- Modifier les informations du client
- Relier les clients aux entreprises
- Afficher les soumissions des clients
- Gérer les abonnements clients

**Fichiers clés** : `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Gestion des paramètres

**Description** : options de configuration à l'échelle de la plate-forme.

**Catégories de paramètres** :

- **Général** : Nom du site, description, logo
- **Fonctionnalités** : Activer/désactiver les fonctionnalités (catégories, tags, vote, etc.)
- **E-mail** : configuration SMTP, modèles d'e-mails
- **Paiement** : clés API Stripe/LemonSqueezy
- **Analyses** : configuration PostHog et Sentry
- **Sécurité** : ReCAPTCHA, limitation de débit

**Fichiers clés** : `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Fonctionnalités supplémentaires

### Modèles d'e-mails

Modèles d'e-mails personnalisables pour :

- E-mails de bienvenue
- Réinitialisation du mot de passe
- Vérification des e-mails
- Confirmations d'abonnement
- Bulletin

[En savoir plus sur les modèles d'e-mails →](/guides/email-templates)

### Système de thèmes

Plusieurs thèmes prédéfinis :

- EverWorks (par défaut)
- Entreprise
- Matériel
- Drôle

[En savoir plus sur les thèmes →](/guides/theming)

### Système de couleurs dynamique

Génération automatique de palette de couleurs (nuances 50 à 950) à partir des couleurs de base.

[En savoir plus sur les couleurs dynamiques →](/guides/dynamic-colors)

### Tests réactifs

Lignes directrices et bonnes pratiques en matière de tests multi-appareils.

[En savoir plus sur les tests →](/development/testing)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Prochaines étapes

- [Tech Stack](./tech-stack) - Explorez la pile technologique
- [Aperçu de l'architecture](./overview) - Comprendre l'architecture

## Ressources

- [Configuration du développement](/development/local-setup) - Configurez votre environnement
- [Guide de déploiement](/deployment/overview) - Déployer en production
- [Documentation API](/development/api-documentation) - Référence API
