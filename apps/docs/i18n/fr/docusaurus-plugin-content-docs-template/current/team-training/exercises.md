---
id: exercises
title: Exercices pratiques
sidebar_label: Exercices
sidebar_position: 5
---

# Exercices pratiques

Mettez en pratique ce que vous avez appris avec des exercices et des défis du monde réel.

## Objectifs

En complétant ces exercices, vous serez capable de :

- Créer des endpoints API
- Appliquer les normes de documentation Swagger
- Mettre en œuvre la validation et la gestion des erreurs
- Construire des fonctionnalités complètes à partir de zéro
- Prendre confiance dans le flux de travail de développement

**Durée estimée** : 3-5 jours

---

## Exercice 1 : Route GET simple

**Difficulté** : Débutant  
**Durée** : 15-30 minutes  
**Objectif** : Apprendre la structure d'annotation de base et le flux de travail

### Tâche

Créez un endpoint GET simple qui retourne des informations sur le serveur.

### Étapes

1. **Créer le fichier** : `app/api/training/server-info/route.ts`

2. **Implémenter la route** :

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Informations serveur"
 *     description: "Retourne les informations de base du serveur incluant la version, l'horodatage actuel et le temps de fonctionnement."
 *     responses:
 *       200:
 *         description: "Informations serveur récupérées avec succès"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     server:
 *                       type: string
 *                       example: "Ever Works API"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       description: "Temps de fonctionnement serveur en secondes"
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: 'Ever Works API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
}
```

3. **Générer la documentation** :

```bash
cd apps/web && pnpm docs:generate
```

4. **Vérifier** : Visitez `/api/reference` et trouvez votre nouvel endpoint

---

## Exercice 2 : Route POST avec validation

**Difficulté** : Intermédiaire  
**Durée** : 30-60 minutes  
**Objectif** : Apprendre la validation avec Zod et la gestion des erreurs

### Tâche

Créez un endpoint POST qui valide et traite les données.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  email: z.string().email('Email invalide'),
  message: z.string().min(10, 'Le message doit faire au moins 10 caractères').max(2000),
});

/**
 * @swagger
 * /api/training/contact:
 *   post:
 *     tags: ["System"]
 *     summary: "Envoyer un message de contact"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Message envoyé avec succès"
 *       400:
 *         description: "Données d'entrée invalides"
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = contactSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation échouée', details: result.error.flatten() },
      { status: 400 }
    );
  }
  
  // Traiter les données validées
  const { name, email, message } = result.data;
  
  return NextResponse.json({
    success: true,
    message: `Message reçu de ${name}`,
  });
}
```

---

## Exercice 3 : Route authentifiée

**Difficulté** : Avancé  
**Durée** : 45-90 minutes  
**Objectif** : Implémenter la vérification d'authentification et d'autorisation

### Tâche

Créez un endpoint protégé qui nécessite une authentification.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * @swagger
 * /api/training/profile:
 *   get:
 *     tags: ["Users"]
 *     summary: "Obtenir le profil de l'utilisateur connecté"
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: "Profil récupéré avec succès"
 *       401:
 *         description: "Non authentifié"
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentification requise' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  });
}
```

---

## Liste de vérification de complétion

- [ ] Exercice 1 : Route GET simple — endpoint avec Swagger docs
- [ ] Exercice 2 : Route POST avec validation Zod
- [ ] Exercice 3 : Route authentifiée avec vérification de session
- [ ] Documentation générée et vérifiée dans `/api/reference`
- [ ] Tous les tests lint passent (`pnpm lint`)
- [ ] TypeScript type-check réussi (`pnpm tsc --noEmit`)
