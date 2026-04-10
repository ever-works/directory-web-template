---
id: api-documentation
title: Formation à la documentation API
sidebar_label: Documentation API
sidebar_position: 3
---

# Formation à la documentation API

Maîtrisez le système de documentation API automatisé avec les annotations Swagger et l'interface Scalar UI.

## Objectifs

À la fin de ce module, vous serez capable de :

- Comprendre le flux de travail de documentation API
- Écrire des annotations Swagger correctes
- Suivre les conventions de tags standardisées
- Générer et valider la documentation
- Résoudre les problèmes courants
- Maintenir une documentation API de haute qualité

**Durée estimée** : 2-3 jours

---

## Pourquoi ce système ?

### Problèmes résolus

- **Documentation incohérente** : Précédemment 8 tags Stripe différents dispersés sur les endpoints
- **Synchronisation manuelle** : La documentation souvent périmée par rapport au code réel
- **Mauvaise expérience développeur** : Swagger UI basique avec fonctionnalités limitées
- **Aucune norme** : Chaque développeur documentait différemment
- **Charge de maintenance** : Fichiers de documentation séparés à maintenir

### Avantages obtenus

- **Synchronisation automatique** : Documentation générée directement depuis les annotations du code
- **Interface moderne** : Scalar UI avec tests interactifs et meilleure UX
- **Normes cohérentes** : Système de tags unifié et modèles de documentation
- **Zéro maintenance** : Aucun fichier de documentation séparé à maintenir
- **Meilleur DX** : Les développeurs documentent en codant, pas après coup

---

## Architecture du système

### Composants principaux

1. **Annotations Swagger dans le code**
   - Commentaires JSDoc avec tags `@swagger`
   - Format OpenAPI 3.0
   - Intégrés directement dans les fichiers de routes
   - Versionnés avec le code

2. **Script generate-docs**
   - Scanne tous les fichiers `app/api/**/route.ts`
   - Extrait et valide les annotations Swagger
   - Génère le fichier unifié `public/openapi.json`
   - Crée des sauvegardes automatiques
   - Fusionne avec la documentation manuelle existante

3. **Interface Scalar UI**
   - Interface de documentation moderne et responsive
   - Capacités de test API interactives
   - Recherche et filtrage avancés
   - Meilleure UX que Swagger UI traditionnel
   - Accessible sur `/api/reference`

4. **Intégration du flux de travail automatisé**
   - Validation CI/CD de la documentation
   - Hooks pre-commit pour la cohérence
   - Mode watch pour le développement
   - Déploiement automatique avec l'app

---

## Structure des annotations Swagger

### Modèle de base

```typescript
/**
 * @swagger
 * /api/votre-endpoint:
 *   get:
 *     tags: ["Catégorie"]
 *     summary: "Résumé court"
 *     description: "Description détaillée de l'endpoint"
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: "Succès"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: "Non autorisé"
 *       500:
 *         description: "Erreur serveur interne"
 */
export async function GET(request: NextRequest) {
  // Votre implémentation
}
```

### Conventions de tags

| Tag | Description |
|-----|-------------|
| `Authentication` | Endpoints de connexion, déconnexion, inscription |
| `Users` | Gestion du profil utilisateur |
| `Items` | Opérations CRUD sur les éléments du répertoire |
| `Categories` | Gestion des catégories |
| `Admin` | Opérations réservées aux administrateurs |
| `Subscriptions` | Abonnements et paiements |
| `System` | Santé, informations, utilitaires |

---

## Générer la documentation

```bash
# Depuis apps/web/
pnpm docs:generate

# Mode watch (développement)
pnpm docs:watch

# Valider la documentation existante
pnpm docs:validate
```

La documentation générée est disponible sur :
- **Interface** : `http://localhost:3000/api/reference`
- **JSON brut** : `http://localhost:3000/api/openapi`

---

## Bonnes pratiques

### À faire

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]
 *     summary: "Lister tous les éléments"
 *     description: "Récupère une liste paginée de tous les éléments du répertoire."
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: "Liste récupérée avec succès"
 */
```

### À éviter

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     responses:
 *       200:
 *         description: "OK"
 */
// ❌ Trop vague — pas de tags, pas de description, pas de paramètres
```

---

## Résolution des problèmes

| Problème | Solution |
|---------|----------|
| L'annotation n'apparaît pas | Vérifier la syntaxe JSDoc et relancer `pnpm docs:generate` |
| Tags dupliqués | Utiliser les tags standardisés du système |
| Erreur de validation | Vérifier la conformité au format OpenAPI 3.0 |
| Interface non accessible | Vérifier que `NEXT_PUBLIC_ENABLE_API_DOCS=true` est défini |
