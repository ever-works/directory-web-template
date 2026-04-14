---
id: cron-endpoints
title: Points de terminaison API des tâches planifiées
sidebar_label: Endpoints Cron
sidebar_position: 6
---

# Points de terminaison API des tâches planifiées

Le modèle inclut trois endpoints de tâches planifiées qui s'exécutent à intervalles réguliers via Vercel Cron. Ces endpoints gèrent la synchronisation du contenu, les rappels d'abonnement et le traitement des expirations d'abonnement.

## Configuration Cron

Les planifications cron sont définies dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Synchronisation du contenu (`/api/cron/sync`)

| Méthode | Chemin | Planification | Description |
|---------|--------|---------------|-------------|
| `GET` | `/api/cron/sync` | Quotidien à 3h00 UTC | Synchroniser le dépôt de contenu basé sur Git |

### Ce que ça fait

La tâche cron de synchronisation extrait le dernier contenu du dépôt de données Git configuré (`DATA_REPOSITORY`) et met à jour le cache de contenu local. Cela garantit que l'application reflète les modifications apportées directement au dépôt de contenu (par exemple, via la fusion d'une PR GitHub).

### Processus de synchronisation

```
1. Vérifier l'autorisation CRON_SECRET
2. Vérifier si une synchronisation est déjà en cours (verrou mutex)
3. Extraire les dernières modifications du dépôt Git distant
4. Analyser et valider les fichiers de contenu YAML mis à jour
5. Mettre à jour le cache de contenu local
6. Retourner le résultat de synchronisation avec la durée
```

### Comportements clés

- **Verrou mutex** : Un seul sync peut s'exécuter à la fois. Les requêtes concurrentes sont rejetées avec un message de statut
- **Timeout** : Les opérations de synchronisation ont un timeout de 5 minutes pour éviter les processus en fuite
- **Logique de réessai** : Les synchronisations échouées réessaient jusqu'à 3 fois
- **Mode développement** : La synchronisation automatique peut être désactivée via la variable d'environnement `DISABLE_AUTO_SYNC=true`

### Réponse

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## Rappels d'abonnement (`/api/cron/subscription-reminders`)

| Méthode | Chemin | Planification | Description |
|---------|--------|---------------|-------------|
| `GET` | `/api/cron/subscription-reminders` | Quotidien à 9h00 UTC | Envoyer des e-mails de rappel d'expiration d'abonnement |

### Ce que ça fait

Identifie les abonnements expirant dans les 7 jours et envoie des e-mails de rappel aux abonnés concernés. Évite l'envoi de rappels en double en vérifiant l'historique des notifications dans la base de données.

### Logique de rappel

```
1. Vérifier l'autorisation CRON_SECRET
2. Interroger les abonnements expirant dans les 7 jours
3. Filtrer les abonnements ayant déjà reçu un rappel
4. Envoyer les e-mails de rappel via le service mail
5. Enregistrer les notifications envoyées dans la base de données
6. Retourner le nombre de rappels envoyés
```

### Réponse

```json
{
  "success": true,
  "remindersSent": 12,
  "message": "Subscription reminders sent successfully"
}
```

## Expiration d'abonnement (`/api/cron/subscription-expiration`)

| Méthode | Chemin | Planification | Description |
|---------|--------|---------------|-------------|
| `GET` | `/api/cron/subscription-expiration` | Quotidien à minuit UTC | Traiter les abonnements expirés |

### Ce que ça fait

Identifie les abonnements qui ont expiré et met à jour leur statut dans la base de données. Si la révocation des accès est activée, retire les permissions et les accès aux fonctionnalités premium des utilisateurs concernés.

### Processus d'expiration

```
1. Vérifier l'autorisation CRON_SECRET
2. Interroger les abonnements expirés (end_date < maintenant, statut = actif)
3. Mettre à jour le statut de l'abonnement vers "expiré"
4. Révoquer l'accès premium si configuré
5. Envoyer l'e-mail de confirmation d'expiration
6. Retourner les statistiques de traitement
```

### Réponse

```json
{
  "success": true,
  "processed": 5,
  "message": "Subscription expiration processing completed"
}
```

## Authentification des tâches cron

Toutes les routes cron vérifient l'en-tête `Authorization` par rapport à `CRON_SECRET` :

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Vercel envoie automatiquement cet en-tête lors de l'invocation des crons planifiés. Pour les tests manuels, incluez dans votre requête :

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-site.com/api/cron/sync
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Secret partagé pour l'authentification des invocations cron |
| `DISABLE_AUTO_SYNC` | Mettre à `true` pour désactiver la synchronisation automatique en développement |
