---
id: backup-recovery
title: Sauvegarde et récupération
sidebar_label: Sauvegarde & Récupération
sidebar_position: 3
---

# Sauvegarde et récupération

Ce guide couvre les stratégies de sauvegarde de base de données, la récupération point-à-temps, l'automatisation des sauvegardes et les procédures de reprise après sinistre pour le modèle Ever Works. Le modèle utilise une **architecture de stockage dual** : PostgreSQL pour les données transactionnelles, et un CMS basé sur Git (répertoire `.content/`) pour le contenu. Chacun nécessite sa propre approche de sauvegarde.

## Architecture de stockage

| Type de données | Stockage | Méthode de sauvegarde |
|-----------------|---------|----------------------|
| Utilisateurs, rôles, permissions | PostgreSQL | Dumps de base de données |
| Sessions, comptes OAuth | PostgreSQL | Dumps de base de données |
| Abonnements, paiements | PostgreSQL | Dumps de base de données |
| Commentaires, votes, signalements | PostgreSQL | Dumps de base de données |
| Éléments, catégories, tags | Dépôt Git (`.content/`) | Historique Git |
| Collections, pages | Dépôt Git (`.content/`) | Historique Git |
| Paramètres applicatifs | Fichiers (JSON) | Sauvegarde de fichiers |
| Fichiers de sauvegarde de catégories | Fichiers YAML | Copies horodatées automatiques |

## Connexion à la base de données

La connexion à la base de données est configurée dans `lib/db/drizzle.ts` avec le pooling de connexions :

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

La taille du pool est par défaut de 20 en production et 10 en développement, configurable via `DB_POOL_SIZE` (limitée entre 1 et 50).

## Méthodes de sauvegarde

### Sauvegarde complète avec pg_dump

```bash
# Sauvegarde complète (format personnalisé — le plus flexible pour la restauration)
pg_dump -Fc \
  -h votre-db-host \
  -U votre-db-user \
  -d votre-db-name \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Sauvegarde SQL simple (lisible par l'humain)
pg_dump \
  -h votre-db-host \
  -U votre-db-user \
  -d votre-db-name \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde uniquement du schéma (pour le débogage des migrations)
pg_dump --schema-only \
  -h votre-db-host \
  -U votre-db-user \
  -d votre-db-name \
  > schema_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde compressée
pg_dump -h votre-db-host -U votre-db-user -d votre-db-name \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Sauvegardes de tables spécifiques

```bash
# Données utilisateurs et d'authentification
pg_dump -t users -t accounts -t sessions -t user_roles \
  -h host -U user -d dbname > users_backup.sql

# Données de paiement et d'abonnement
pg_dump -t subscriptions -t subscription_history \
  -t payment_providers -t payment_accounts \
  -h host -U user -d dbname > payments_backup.sql

# Données d'interaction de contenu
pg_dump -t comments -t votes -t favorites -t activity_logs \
  -h host -U user -d dbname > interactions_backup.sql
```

### Sauvegardes avec des fournisseurs gérés

- **Supabase** : Sauvegardes quotidiennes automatiques + récupération point-à-temps sur les plans Pro
- **Neon** : Snapshots basés sur des branches avec restauration instantanée
- **Railway** : Sauvegardes automatiques avec rétention configurable
- **AWS RDS** : Sauvegardes automatisées avec jusqu'à 35 jours de rétention

## Automatisation des sauvegardes

### Script de sauvegarde automatisé

```bash
#!/bin/bash
# backup-database.sh
set -euo pipefail

DB_URL="${DATABASE_URL}"
BACKUP_DIR="/backups/everworks"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Démarrage de la sauvegarde..."
pg_dump -Fc "${DB_URL}" -f "${BACKUP_FILE}"

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Sauvegarde réussie : ${BACKUP_FILE} (${SIZE})"
else
    echo "[$(date)] ERREUR : Fichier de sauvegarde manquant ou vide"
    exit 1
fi

# Nettoyer les anciennes sauvegardes
find "${BACKUP_DIR}" -name "backup_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours"
```

### Planification cron

```bash
# Sauvegarde quotidienne à 2h du matin (avant la synchronisation à 3h)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Sauvegarde complète hebdomadaire le dimanche à 1h
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Sauvegarde de l'état de migration

Avant de déployer de nouvelles versions avec des changements de schéma :

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

## Procédures de récupération

### Restauration complète de la base de données

```bash
# Restaurer depuis le format personnalisé (supprime et recrée les objets)
pg_restore -c -d votre-db-name backup_20250101_020000.dump

# Restaurer vers une nouvelle base de données
createdb votre-db-name-restored
pg_restore -d votre-db-name-restored backup_20250101_020000.dump

# Restaurer depuis un fichier SQL
psql -h host -U user -d dbname < backup_20250101_020000.sql

# Restaurer depuis un fichier compressé
gunzip -c backup.sql.gz | psql -h host -U user -d dbname
```
