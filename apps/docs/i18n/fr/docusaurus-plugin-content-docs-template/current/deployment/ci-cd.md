---
id: ci-cd
title: Pipeline CI/CD
sidebar_label: Pipeline CI/CD
sidebar_position: 3
---

# Pipeline CI/CD

Le Template Ever Works inclut un pipeline CI/CD complet construit avec GitHub Actions.

## Vue d'ensemble du workflow

Le pipeline se compose de six fichiers de workflow dans `.github/workflows/` :

| Workflow | Fichier | Déclencheur | Objectif |
|---|---|---|---|
| CI | `ci.yml` | Push/PR vers `main`, `develop` | Lint, vérification des types, construction |
| CodeQL | `codeql.yml` | Push/PR + planification hebdomadaire | Analyse des vulnérabilités de sécurité |
| Dev Deploy | `deploy_dev.yaml` | Push vers `develop` | Déploiement en environnement de prévisualisation |
| Prod Deploy | `deploy_prod.yaml` | Push vers `main` | Déploiement en production |
| Vercel Deploy | `deploy_vercel.yaml` | Appelé par les workflows dev/prod | Logique de déploiement Vercel partagée |

### Flux du pipeline

```
Branche fonctionnalité --> PR vers develop --> CI s'exécute
                                              |
                                              v
                                     Fusion dans develop --> Déploiement Dev (preview)
                                              |
                                              v
                                     PR vers main --> CI s'exécute
                                              |
                                              v
                                     Fusion dans main --> Déploiement Prod (production)
```

## Workflow CI (`ci.yml`)

Le workflow CI s'exécute sur chaque push et pull request. Il valide la qualité du code et s'assure que le projet se construit avec succès.

**Étapes :**
1. Checkout du code
2. Installation de Node.js et pnpm
3. Installation des dépendances (`pnpm install`)
4. Lint (`pnpm lint`)
5. Vérification des types TypeScript (`pnpm tsc --noEmit`)
6. Construction (`pnpm build`)

## Secrets requis pour GitHub Actions

Configurez ces secrets dans votre dépôt GitHub (Settings → Secrets) :

```bash
VERCEL_TOKEN=votre-token-vercel
VERCEL_ORG_ID=votre-org-vercel
VERCEL_PROJECT_ID=votre-projet-vercel
```

## Analyse de sécurité CodeQL

CodeQL analyse automatiquement le code pour détecter les vulnérabilités de sécurité courantes :
- Injection SQL
- XSS (Cross-Site Scripting)
- Path traversal
- Bugs de type CWE communs
