---
id: cron-verification
title: Vérification des Cron Jobs Vercel
sidebar_label: Vérification Cron
sidebar_position: 9
---

# Vérification des Cron Jobs Vercel

## Réponses rapides

### Question 1 : Est-ce que ça fonctionne sur Vercel sans Trigger.dev ?
**OUI** – Le système est correctement configuré pour utiliser Vercel Crons lorsque :
- `VERCEL=1` (défini automatiquement par Vercel)
- Les variables d'environnement Trigger.dev ne sont **PAS** définies

### Question 2 : Comment vérifier que ça fonctionne ?
**Suivez les 4 étapes ci-dessous.**

---

## État de configuration actuel

### Ce qui a été corrigé

| Composant | État | Détails |
|-----------|------|---------|
| `vercel.json` | **CORRIGÉ** | Inclut maintenant les **3** cron jobs (n'en avait qu'1) |
| `initialize-jobs.ts` | **CORRIGÉ** | Enregistre maintenant les **3** tâches (n'en avait que 2) |
| Endpoints API | **OK** | Les 3 endpoints existent et fonctionnent |
| Documentation | **CRÉÉE** | Nouveau guide `CRON_JOBS.md` |

### Liste complète des Cron Jobs

| # | Nom de la tâche | Endpoint | Planification | Objectif |
|---|----------------|----------|---------------|---------|
| 1 | Sync du dépôt | `/api/cron/sync` | `*/5 * * * *` | Synchronise le contenu toutes les 5 minutes |
| 2 | Rappels de renouvellement | `/api/cron/subscription-reminders` | `0 9 * * *` | Envoie des emails de rappel à 9h quotidiennement |
| 3 | Nettoyage d'expiration | `/api/cron/subscription-expiration` | `0 0 * * *` | Traite les abonnements expirés à minuit |

---

## Processus de vérification en 4 étapes

### Étape 1 : Vérifier le tableau de bord Vercel – Cron Jobs

**Modèle d'URL :**
```
https://vercel.com/{ÉQUIPE}/{PROJET}/settings/cron-jobs
```

**Ce qu'il faut rechercher :**
- [ ] Affiche **3 cron jobs** (pas seulement 1)
- [ ] Chacun a la bonne planification
- [ ] Tous affichent l'état « Actif »

**Résultat attendu :**

| Chemin | Planification | État |
|--------|---------------|------|
| `/api/cron/sync` | Toutes les 5 minutes | Actif |
| `/api/cron/subscription-reminders` | 0 9 \* \* \* | Actif |
| `/api/cron/subscription-expiration` | 0 0 \* \* \* | Actif |

---

### Étape 2 : Vérifier les journaux Vercel

**Modèle d'URL :**
```
https://vercel.com/{ÉQUIPE}/{PROJET}/logs?requestPaths={CHEMIN}
```

**Vérifier chaque endpoint :**
- `/api/cron/sync` — Doit s'exécuter toutes les 5 minutes
- `/api/cron/subscription-reminders` — Doit s'exécuter quotidiennement à 9h
- `/api/cron/subscription-expiration` — Doit s'exécuter quotidiennement à minuit

**Ce qu'il faut rechercher :**
- [ ] Statut HTTP 200
- [ ] Aucune erreur dans les journaux
- [ ] Timestamp récent

---

### Étape 3 : Déclencher manuellement les Cron Jobs (pour tester)

```bash
# Tester le sync (avec CRON_SECRET)
curl -X GET https://votre-domaine.vercel.app/api/cron/sync \
  -H "Authorization: Bearer votre-cron-secret"

# Tester les rappels d'abonnement
curl -X GET https://votre-domaine.vercel.app/api/cron/subscription-reminders \
  -H "Authorization: Bearer votre-cron-secret"

# Tester le nettoyage d'expiration
curl -X GET https://votre-domaine.vercel.app/api/cron/subscription-expiration \
  -H "Authorization: Bearer votre-cron-secret"
```

**Résultat attendu :**
```json
{ "success": true, "message": "..." }
```

---

### Étape 4 : Vérifier les variables d'environnement

Assurez-vous que ces variables sont définies dans Vercel :

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `CRON_SECRET` | Secret aléatoire sécurisé | Oui |
| `TRIGGER_SECRET_KEY` | **Non définie** (pour utiliser Vercel Crons) | Non |

---

## Résolution des problèmes

| Symptôme | Cause probable | Solution |
|---------|----------------|----------|
| Seulement 1 cron job visible | Ancien `vercel.json` | Mettre à jour `vercel.json` avec les 3 jobs |
| Erreur 401 | `CRON_SECRET` manquant | Définir `CRON_SECRET` dans les variables d'environnement |
| Utilisation de Trigger.dev au lieu de Vercel | Variables Trigger.dev définies | Supprimer `TRIGGER_SECRET_KEY` et `TRIGGER_API_KEY` |
| Sync ne s'exécute pas | `DISABLE_AUTO_SYNC=true` | Vérifier et supprimer cette variable |
