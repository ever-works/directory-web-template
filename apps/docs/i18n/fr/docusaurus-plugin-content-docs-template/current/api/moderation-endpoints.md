---
id: moderation-endpoints
title: "Système de Modération"
sidebar_label: "Modération"
sidebar_position: 28
---

# Système de Modération

Le système de modération fournit une modération programmatique du contenu via une couche de services plutôt que des points de terminaison API autonomes. Les actions de modération sont déclenchées automatiquement lorsque les administrateurs résolvent des signalements de contenu via l'API Reports. Le système prend en charge l'avertissement des utilisateurs, la suspension de comptes, l'interdiction de comptes et la suppression de contenu, avec un historique d'audit complet et des notifications par e-mail.

## Aperçu

La modération n'est pas exposée en tant que points de terminaison REST séparés. Elle est invoquée via le flux de résolution des signalements :

```
PUT /api/admin/reports/[id]  -->  la résolution déclenche l'action de modération
```

Lorsqu'un administrateur définit une valeur de `resolution` sur un signalement, la fonction de modération correspondante s'exécute automatiquement.

| Valeur de résolution | Fonction de modération | Effet |
|---|---|---|
| `content_removed` | `removeContent()` | Suppression logique du commentaire ou de l'élément signalé |
| `user_warned` | `warnUser()` | Incrémente le compteur d'avertissements de l'utilisateur |
| `user_suspended` | `suspendUser()` | Définit le statut de l'utilisateur à `"suspended"` |
| `user_banned` | `banUser()` | Définit le statut de l'utilisateur à `"banned"` |
| `no_action` | Aucune | Aucune action de modération prise |

## Actions de modération

### Supprimer le contenu

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Supprime le contenu signalé en fonction de son type. Pour les commentaires, cela effectue une suppression logique (définit `deletedAt`). Pour les éléments, cela supprime l'élément du dépôt de contenu basé sur Git.

**Paramètres :**

| Paramètre | Type | Description |
|---|---|---|
| `contentType` | `"item"` ou `"comment"` | Type de contenu à supprimer |
| `contentId` | chaîne | ID ou slug du contenu |
| `reportId` | chaîne | ID du signalement associé |
| `adminId` | chaîne | Utilisateur administrateur effectuant l'action |

**Étapes de traitement :**

1. Rechercher le propriétaire du contenu via `getContentOwner()`
2. Si commentaire : suppression logique via `deleteComment()`
3. Si élément : suppression du dépôt Git via `itemRepository.delete()`
4. Enregistrer l'historique de modération avec l'action `CONTENT_REMOVED`
5. Envoyer un e-mail de notification de suppression de contenu au propriétaire du contenu

**Source :** `template/lib/services/moderation.service.ts`

### Avertir un utilisateur

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Émet un avertissement à un utilisateur en incrémentant son champ `warningCount`. Les utilisateurs déjà bannis ne peuvent pas recevoir d'avertissements.

**Paramètres :**

| Paramètre | Type | Description |
|---|---|---|
| `userId` | chaîne | ID du profil client de l'utilisateur |
| `reason` | chaîne | Raison de l'avertissement |
| `reportId` | chaîne | ID du signalement associé |
| `adminId` | chaîne | Utilisateur administrateur effectuant l'action |

**Étapes de traitement :**

1. Vérifier que l'utilisateur existe et n'est pas déjà banni
2. Incrémenter le compteur d'avertissements via `incrementWarningCount()`
3. Enregistrer l'historique de modération avec l'action `WARN`
4. Envoyer une notification par e-mail d'avertissement avec le compteur d'avertissements actuel

**Résultat en cas de succès :**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Source :** `template/lib/services/moderation.service.ts`

### Suspendre un utilisateur

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Suspend un compte utilisateur en définissant son statut à `"suspended"` et en enregistrant un horodatage `suspendedAt`. Les utilisateurs suspendus ne peuvent pas créer de commentaires, soumettre des votes ou déposer des signalements.

**Gardes :**

- Retourne une erreur si l'utilisateur est déjà suspendu
- Retourne une erreur si l'utilisateur est déjà banni

**Étapes de traitement :**

1. Vérifier que l'utilisateur existe et n'est pas déjà suspendu ou banni
2. Définir le statut à `"suspended"` avec l'horodatage `suspendedAt`
3. Enregistrer l'historique de modération avec l'action `SUSPEND`
4. Envoyer une notification par e-mail de suspension

**Source :** `template/lib/services/moderation.service.ts`

### Bannir un utilisateur

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Bannit définitivement un compte utilisateur en définissant son statut à `"banned"` et en enregistrant un horodatage `bannedAt`. Les utilisateurs bannis sont bloqués pour toutes les actions authentifiées.

**Gardes :**

- Retourne une erreur si l'utilisateur est déjà banni

**Étapes de traitement :**

1. Vérifier que l'utilisateur existe et n'est pas déjà banni
2. Définir le statut à `"banned"` avec l'horodatage `bannedAt`
3. Enregistrer l'historique de modération avec l'action `BAN`
4. Envoyer une notification par e-mail de bannissement

**Source :** `template/lib/services/moderation.service.ts`

## Résolution du propriétaire du contenu

La fonction `getContentOwner()` détermine le propriétaire du contenu signalé :

| Type de contenu | Source du propriétaire |
|---|---|
| `comment` | Champ `comment.userId` de la table des commentaires |
| `item` | Champ `item.submitted_by` du dépôt d'éléments |

Cette information est utilisée par toutes les actions de modération au niveau utilisateur (`user_warned`, `user_suspended`, `user_banned`) pour identifier l'utilisateur cible de l'action.

**Source :** `template/lib/services/moderation.service.ts`

## Historique de modération

Toutes les actions de modération créent une piste d'audit dans la table de base de données `moderationHistory`.

### Champs de l'enregistrement d'historique

| Champ | Type | Description |
|---|---|---|
| `id` | chaîne | ID unique de l'enregistrement |
| `userId` | chaîne | ID du profil client de l'utilisateur affecté |
| `action` | chaîne | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` ou `"BAN"` |
| `reason` | chaîne ou null | Raison de l'action de modération |
| `reportId` | chaîne ou null | ID du signalement associé |
| `performedBy` | chaîne ou null | ID de l'utilisateur administrateur ayant effectué l'action |
| `contentType` | chaîne ou null | `"item"` ou `"comment"` (pour la suppression de contenu) |
| `contentId` | chaîne ou null | ID du contenu supprimé |
| `details` | objet ou null | Contexte supplémentaire (ex. : compteur d'avertissements, nom de l'élément) |
| `createdAt` | horodatage | Moment où l'action a été effectuée |

### Requêtes d'historique

| Fonction | Description |
|---|---|
| `getModerationHistoryByUser(userId, limit)` | Obtenir toutes les actions de modération pour un utilisateur (limite par défaut : 50) |
| `getModerationHistoryByReport(reportId)` | Obtenir les actions de modération liées à un signalement spécifique |

Les deux fonctions de requête enrichissent les résultats avec les informations du profil utilisateur et les détails de l'administrateur ayant effectué l'action.

**Source :** `template/lib/db/queries/moderation.queries.ts`

## Gestion du statut utilisateur

### Valeurs de statut

| Statut | Description |
|---|---|
| `active` | Compte normal, toutes les fonctionnalités disponibles |
| `suspended` | Temporairement restreint, ne peut pas créer de contenu |
| `banned` | Définitivement restreint, bloqué pour toutes les actions |

### Opérations de base de données

| Fonction | Description |
|---|---|
| `suspendUser(userId)` | Définit le statut à `"suspended"`, enregistre `suspendedAt` |
| `unsuspendUser(userId)` | Restaure le statut à `"active"`, efface `suspendedAt` |
| `banUser(userId)` | Définit le statut à `"banned"`, enregistre `bannedAt` |
| `unbanUser(userId)` | Restaure le statut à `"active"`, efface `bannedAt` |
| `incrementWarningCount(userId)` | Incrémente `warningCount` en utilisant SQL `COALESCE` |

### Vérifications d'utilisateur bloqué

Deux fonctions auxiliaires vérifient le statut utilisateur dans l'application :

- **`isUserBlocked(status)`** -- Retourne `true` si le statut est `"suspended"` ou `"banned"`
- **`getBlockReasonMessage(status)`** -- Retourne un message à destination de l'utilisateur expliquant pourquoi l'action est restreinte

Ces vérifications sont utilisées par les points de terminaison des commentaires, votes et signalements pour empêcher les utilisateurs bloqués de créer du contenu.

**Source :** `template/lib/db/queries/moderation.queries.ts`

## Notifications par e-mail

Le `EmailNotificationService` envoie des notifications non bloquantes pour les actions de modération :

| Méthode | Déclencheur |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Contenu supprimé par l'administrateur |
| `sendUserWarningEmail(email, reason, count)` | Avertissement émis |
| `sendUserSuspensionEmail(email, reason)` | Compte suspendu |
| `sendUserBanEmail(email, reason)` | Compte banni |

Tous les envois d'e-mail utilisent `.catch()` pour éviter que les échecs n'interrompent le flux de modération. Un e-mail en échec n'entraîne pas l'échec de l'action de modération elle-même.

## Détails clés d'implémentation

- **Modèle de couche de services :** La logique de modération réside dans `lib/services/moderation.service.ts`, et non dans les gestionnaires de routes API. Cela permet la réutilisation à travers différents points d'entrée.
- **Piste d'audit :** Chaque action de modération crée un enregistrement `moderationHistory`, fournissant un journal d'audit complet pour la conformité et la révision.
- **E-mails non bloquants :** Les notifications par e-mail sont envoyées de manière asynchrone avec des gestionnaires `.catch()`. Si le service d'e-mail est indisponible, l'action de modération réussit quand même.
- **Gardes d'idempotence :** Chaque action vérifie le statut actuel de l'utilisateur avant de procéder. Bannir un utilisateur déjà banni retourne une erreur plutôt que de créer une action en double.
- **Suppression logique vs suppression définitive :** Les commentaires sont supprimés logiquement (en définissant `deletedAt`), tandis que les éléments sont entièrement supprimés du dépôt Git. Cette différence reflète le modèle de stockage (base de données vs contenu basé sur des fichiers).
