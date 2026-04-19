---
id: admin-notifications-endpoints
title: Points de terminaison API Admin – Notifications
sidebar_label: Admin Notifications
sidebar_position: 33
---

# Points de terminaison API Admin – Notifications

L'API Admin Notifications gère les notifications in-app pour les utilisateurs admin. Elle prend en charge la liste des notifications avec les comptages non lus, la création de nouvelles notifications pour des utilisateurs spécifiques et le marquage des notifications comme lues (individuellement ou en masse). Les notifications sont stockées en base de données et ciblées sur des utilisateurs individuels.

## Résumé des routes

| Méthode  | Chemin                                                   | Auth           | Description                                        |
| -------- | -------------------------------------------------------- | -------------- | -------------------------------------------------- |
| `GET`    | `/api/admin/notifications`                               | Admin          | Lister les notifications de l'admin actuel        |
| `POST`   | `/api/admin/notifications`                               | Authentifié    | Créer une nouvelle notification                    |
| `PATCH`  | `/api/admin/notifications/{id}/read`                     | Authentifié    | Marquer une notification comme lue                 |
| `PATCH`  | `/api/admin/notifications/mark-all-read`                 | Authentifié    | Marquer toutes les notifications comme lues        |

## Authentification

Les points de terminaison de notification utilisent deux niveaux d'authentification :

**Admin uniquement (liste GET) :** Requiert à la fois l'authentification et le rôle admin.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Utilisateur authentifié (POST, PATCH) :** Requiert une session valide mais pas le rôle admin. Les points de terminaison de marquage comme lu sont ciblés sur les propres notifications de l'utilisateur authentifié.

## Points de terminaison

### GET `/api/admin/notifications`

Récupère les 50 dernières notifications de l'utilisateur admin authentifié, triées par date de création (les plus récentes en premier). Retourne également le nombre total de notifications non lues.

**Réponse (200) :**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Détails de comportement :**
- Maximum 50 notifications sont retournées par requête
- Les résultats sont ordonnés par `createdAt` décroissant (les plus récentes en premier)
- `unreadCount` est calculé séparément en comptant les notifications où `isRead = false`
- Les notifications sont ciblées sur l'ID de l'utilisateur authentifié

### POST `/api/admin/notifications`

Crée une nouvelle notification pour un utilisateur spécifié. Le champ `data` accepte un objet qui sera converti en JSON avant le stockage. Ce point de terminaison ne requiert pas de privilèges admin — tout utilisateur authentifié peut créer des notifications (généralement appelé en interne par le système).

**Corps de la requête :**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

| Champ     | Type   | Requis | Description                                                                      |
| --------- | ------ | ------ | -------------------------------------------------------------------------------- |
| `type`    | chaîne | Oui    | Identifiant du type de notification (ex. `"item_approved"`, `"comment_received"`)|
| `title`   | chaîne | Oui    | Titre court de la notification                                                   |
| `message` | chaîne | Oui    | Message complet de la notification                                               |
| `userId`  | chaîne | Oui    | ID de l'utilisateur cible qui reçoit la notification                             |
| `data`    | objet  | Non    | Métadonnées supplémentaires (sérialisées en JSON au stockage)                    |

**Réponse (200) :**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

Marque une notification spécifique comme lue. Définit `isRead` à `true`, enregistre l'horodatage actuel dans `readAt` et met à jour `updatedAt`. Seul le propriétaire de la notification peut marquer ses propres notifications — la requête filtre à la fois par ID de notification et par ID d'utilisateur authentifié.

**Paramètres de chemin :**

| Paramètre | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| `id`      | chaîne | Identifiant unique de la notification |

**Réponse (200) :**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

Marque toutes les notifications non lues de l'utilisateur authentifié comme lues en une seule opération en masse. Met à jour `isRead`, `readAt` et `updatedAt` pour chaque notification correspondante. Retourne le nombre de notifications mises à jour.

**Réponse (200) :**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Détails de comportement :**
- Met à jour uniquement les notifications où `isRead = false` pour l'utilisateur actuel
- `updatedCount` peut être `0` si aucune notification n'est non lue
- Toutes les notifications correspondantes sont mises à jour en une seule requête en base de données

## Modèle de données de notification

| Champ       | Type      | Nullable | Description                                                              |
| ----------- | --------- | -------- | ------------------------------------------------------------------------ |
| `id`        | chaîne    | Non      | Identifiant unique de la notification                                    |
| `userId`    | chaîne    | Non      | ID de l'utilisateur recevant la notification                             |
| `type`      | chaîne    | Non      | Type de notification (ex. `"item_approved"`, `"comment_received"`)       |
| `title`     | chaîne    | Non      | Titre d'affichage court                                                  |
| `message`   | chaîne    | Non      | Message complet de la notification                                       |
| `data`      | chaîne    | Oui      | Métadonnées supplémentaires sérialisées en JSON                          |
| `isRead`    | booléen   | Non      | Indique si la notification a été lue                                     |
| `readAt`    | datetime  | Oui      | Horodatage du marquage comme lu                                          |
| `createdAt` | datetime  | Non      | Horodatage de création                                                   |
| `updatedAt` | datetime  | Oui      | Horodatage de la dernière mise à jour                                    |

## Codes d'erreur

| Statut | Erreur                  | Cause                                                          |
| ------ | ----------------------- | -------------------------------------------------------------- |
| `400`  | Champs requis manquants | POST sans type, title, message ou userId                       |
| `400`  | ID de notification requis | PATCH avec paramètre ID vide                                 |
| `401`  | Non autorisé            | Pas de session active                                          |
| `403`  | Accès refusé            | Utilisateur non-admin sur le point de terminaison liste GET    |
| `404`  | Notification introuvable| ID invalide ou notification appartenant à un autre utilisateur |
| `500`  | Erreur interne          | Échec de la base de données ou du serveur                      |

## Types de notification courants

Le champ `type` est une chaîne libre, mais l'application utilise généralement ces valeurs :

| Type                   | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `item_approved`        | Un élément a été approuvé par un admin                 |
| `item_rejected`        | Un élément a été rejeté                                |
| `comment_received`     | Un nouveau commentaire a été publié sur un élément     |
| `submission_received`  | Une nouvelle soumission d'élément a été reçue          |

## Documentation associée

- [Aperçu des points de terminaison Admin](./admin-endpoints.md)
- [Modèles de réponse](./response-patterns.md)
- [Validation des requêtes](./request-validation.md)

