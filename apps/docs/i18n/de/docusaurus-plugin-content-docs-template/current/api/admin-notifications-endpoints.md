---
id: admin-notifications-endpoints
title: "Admin Notifications API Endpoints"
sidebar_label: "Admin Notifications API Endpoints"
---

# Admin Benachrichtigungen API Endpunkte

Die Admin Benachrichtigungen API verwaltet In-App-Benachrichtigungen für Admin-Benutzer. Sie unterstützt das Auflisten von Benachrichtigungen mit ungelesenen Zählungen, das Erstellen neuer Benachrichtigungen für bestimmte Benutzer und das Markieren von Benachrichtigungen als gelesen (einzeln oder in Masse). Benachrichtigungen werden in der Datenbank gespeichert und sind auf einzelne Benutzer beschränkt.

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|--------|------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin | Benachrichtigungen für aktuellen Admin auflisten |
| `POST` | `/api/admin/notifications` | Authentifiziert | Neue Benachrichtigung erstellen |
| `PATCH` | `/api/admin/notifications/{id}/read` | Authentifiziert | Einzelne Benachrichtigung als gelesen markieren |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Authentifiziert | Alle Benachrichtigungen als gelesen markieren |

## Authentifizierung

Die Benachrichtigungs-Endpunkte verwenden zwei Authentifizierungsebenen:

**Nur Admin (GET-Liste):** Erfordert sowohl Authentifizierung als auch Admin-Rolle.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Authentifizierter Benutzer (POST, PATCH):** Erfordert eine gültige Sitzung, aber keine Admin-Rolle. Die Markierung-als-gelesen-Endpunkte sind auf die eigenen Benachrichtigungen des authentifizierten Benutzers beschränkt.

## Endpunkte

### GET `/api/admin/notifications`

Ruft die neuesten 50 Benachrichtigungen für den authentifizierten Admin-Benutzer ab, sortiert nach Erstellungsdatum (neueste zuerst). Gibt auch die Gesamtzahl der ungelesenen Benachrichtigungen zurück.

**Antwort (200):**

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

**Verhaltensdetails:**
- Maximal 50 Benachrichtigungen werden pro Anfrage zurückgegeben
- Ergebnisse werden nach `createdAt` absteigend sortiert (neueste zuerst)
- `unreadCount` wird separat berechnet, indem Benachrichtigungen gezählt werden, bei denen `isRead = false`
- Benachrichtigungen sind auf die ID des authentifizierten Benutzers beschränkt

### POST `/api/admin/notifications`

Erstellt eine neue Benachrichtigung für einen bestimmten Benutzer. Das Feld `data` akzeptiert ein Objekt, das vor der Speicherung JSON-stringifiziert wird. Dieser Endpunkt erfordert keine Admin-Rechte – jeder authentifizierte Benutzer kann Benachrichtigungen erstellen (typischerweise intern vom System aufgerufen).

**Anfragekörper:**

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

| Feld | Typ | Erforderlich | Beschreibung |
|-------|------|----------|-------------|
| `type` | string | Ja | Benachrichtigungstyp-Kennung (z.B. `"item_approved"`, `"comment_received"`) |
| `title` | string | Ja | Kurzer Benachrichtigungstitel |
| `message` | string | Ja | Vollständige Benachrichtigungsnachricht |
| `userId` | string | Ja | Ziel-Benutzer-ID zum Empfang der Benachrichtigung |
| `data` | object | Nein | Zusätzliche Metadaten (bei Speicherung JSON-stringifiziert) |

**Antwort (200):**

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

Markiert eine bestimmte Benachrichtigung als gelesen. Setzt `isRead` auf `true`, zeichnet den aktuellen Zeitstempel in `readAt` auf und aktualisiert `updatedAt`. Nur der Benachrichtigungseigentümer kann seine eigenen Benachrichtigungen markieren – die Abfrage filtert nach Benachrichtigungs-ID und authentifizierter Benutzer-ID.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string | Eindeutige Benachrichtigungs-Kennung |

**Antwort (200):**

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

Markiert alle ungelesenen Benachrichtigungen des authentifizierten Benutzers in einer einzigen Massenoperation als gelesen. Aktualisiert `isRead`, `readAt` und `updatedAt` für jede passende Benachrichtigung. Gibt die Anzahl der aktualisierten Benachrichtigungen zurück.

**Antwort (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Verhaltensdetails:**
- Aktualisiert nur Benachrichtigungen, bei denen `isRead = false` für den aktuellen Benutzer ist
- `updatedCount` kann `0` sein, wenn keine ungelesenen Benachrichtigungen vorhanden sind
- Alle passenden Benachrichtigungen werden in einer einzigen Datenbankabfrage aktualisiert

## Benachrichtigungs-Datenmodell

| Feld | Typ | Nullable | Beschreibung |
|-------|------|----------|-------------|
| `id` | string | Nein | Eindeutige Benachrichtigungs-Kennung |
| `userId` | string | Nein | ID des Benutzers, der die Benachrichtigung erhält |
| `type` | string | Nein | Benachrichtigungstyp (z.B. `"item_approved"`, `"comment_received"`) |
| `title` | string | Nein | Kurzer Anzeigetitel |
| `message` | string | Nein | Vollständige Benachrichtigungsnachricht |
| `data` | string | Ja | JSON-stringifizierte zusätzliche Metadaten |
| `isRead` | boolean | Nein | Ob die Benachrichtigung gelesen wurde |
| `readAt` | datetime | Ja | Zeitstempel, wann als gelesen markiert |
| `createdAt` | datetime | Nein | Erstellungs-Zeitstempel |
| `updatedAt` | datetime | Ja | Letzter Aktualisierungs-Zeitstempel |

## Fehlercodes

| Status | Fehler | Ursache |
|--------|-------|-------|
| `400` | Fehlende Pflichtfelder | POST fehlt type, title, message oder userId |
| `400` | Benachrichtigungs-ID ist erforderlich | PATCH mit leerem ID-Parameter |
| `401` | Nicht autorisiert | Keine aktive Sitzung |
| `403` | Verboten | Nicht-Admin-Benutzer auf GET-Listendpunkt |
| `404` | Benachrichtigung nicht gefunden | Ungültige ID oder Benachrichtigung gehört einem anderen Benutzer |
| `500` | Interner Serverfehler | Datenbank- oder Serverfehler |

## Häufige Benachrichtigungstypen

Das Feld `type` ist ein freier String, aber die Anwendung verwendet diese Werte üblicherweise:

| Typ | Beschreibung |
|------|-------------|
| `item_approved` | Ein Element wurde von einem Admin genehmigt |
| `item_rejected` | Ein Element wurde abgelehnt |
| `comment_received` | Ein neuer Kommentar wurde zu einem Element gepostet |
| `submission_received` | Eine neue Elementeinreichung wurde empfangen |

## Verwandte Dokumentation

- [Admin Endpunkte Übersicht](./admin-endpoints.md)
- [Antwortmuster](./response-patterns.md)
- [Anfragenvalidierung](./request-validation.md)

See the [English documentation](/api/admin-notifications-endpoints) for the full content of this section.
