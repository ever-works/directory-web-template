---
id: multi-tenancy
title: Configuration multi-tenant
sidebar_label: Multi-Tenant
sidebar_position: 13
---

# Configuration multi-tenant

Ce document explique comment le support multi-tenant fonctionne dans le Directoire Web Template.

## Vue d'ensemble

Le template utilise une approche **base de données partagée, isolation au niveau des lignes** :

- Une seule base de données PostgreSQL sert plusieurs **tenants** (sites web de répertoire).
- Chaque table possède une colonne `tenant_id` qui limite les données à un tenant spécifique.
- Toutes les requêtes filtrent automatiquement par le tenant courant — aucune fuite de données entre tenants.

## Configuration rapide

### 1. Définir la variable d'environnement

```bash
TENANT_ID="votre-id-tenant-unique"
```

Il peut s'agir de n'importe quelle chaîne unique (ex. un UUID ou un slug lisible comme `"mon-repertoire"`).

### 2. Déployer

Au premier démarrage, l'application va :

1. Exécuter les migrations de base de données (ajoute la colonne `tenant_id` si absente)
2. Créer une ligne tenant correspondant à votre valeur `TENANT_ID`
3. Migrer les données `tenant_id` NULL existantes vers votre tenant
4. Peupler les données par défaut (utilisateur admin, rôles, permissions)

Aucun SQL manuel n'est nécessaire — tout est automatique.

### 3. Vérifier

Vérifiez les logs serveur pour :

```
[DB Init] Ensured environment tenant 'votre-id-tenant-unique' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## Fonctionnement de la résolution du tenant

La résolution du tenant courant utilise une stratégie en **cascade** :

| Priorité | Source | Description |
| -------- | ------ | ----------- |
| 1 | **Session** | `user.tenantId` depuis le token JWT (utilisateurs authentifiés) |
| 2 | **Var d'env** | Variable d'environnement `TENANT_ID` |
| 3 | **En-tête HTTP** | En-tête `x-tenant-domain` (pour le routage par sous-domaine) |
| 4 | **Base de données** | Première ligne tenant active (repli ultime) |

La fonction `getTenantId()` de `lib/auth/tenant.ts` implémente cette chaîne.

## Fichiers clés

| Fichier | Objectif |
| ------- | -------- |
| `lib/auth/tenant.ts` | `getTenantId()` — résolution tenant côté serveur avec mise en cache |
| `lib/config/env.ts` | Validation de la variable d'environnement `TENANT_ID` |
| `lib/db/schema.ts` | Table tenant + FK `tenant_id` sur toutes les tables |
| `lib/db/initialize.ts` | Auto-création du tenant env + migration au démarrage |
| `components/context/tenant-provider.tsx` | Contexte React pour l'accès tenant côté client |
| `app/api/tenant/route.ts` | `GET /api/tenant` — retourne les infos du tenant courant |
