---
id: comment-endpoints
title: "Comment Endpoints"
sidebar_label: "Comment Endpoints"
---

# Kommentar-Endpunkte

Das Kommentarsystem stellt Endpunkte zum Erstellen, Lesen, Aktualisieren und Löschen von Kommentaren zu Einträgen bereit. Kommentare enthalten eine 1–5-Sterne-Bewertung und unterstützen sowohl öffentlichen Zugriff (Lesen) als auch authentifizierte Operationen (Erstellen/Bearbeiten/Löschen). Admin-Endpunkte bieten Moderationsfunktionen.

## Übersicht

### Öffentliche Endpunkte

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/items/[slug]/comments` | GET | Öffentlich | Kommentare für einen Eintrag auflisten |
| `/api/items/[slug]/comments/rating` | GET | Öffentlich | Aggregierte Bewertungsstatistiken abrufen |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Öffentlich | Bewertung eines einzelnen Kommentars abrufen |

### Authentifizierte Endpunkte

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/items/[slug]/comments` | POST | Benutzer | Neuen Kommentar erstellen |
| `/api/items/[slug]/comments/[commentId]` | PUT | Inhaber | Eigenen Kommentar aktualisieren |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Inhaber | Eigenen Kommentar löschen |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | Benutzer | Bewertung eines Kommentars aktualisieren |

### Admin-Endpunkte

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/admin/comments` | GET | Admin | Alle Kommentare mit Seitenumbruch auflisten |
| `/api/admin/comments/[id]` | GET | Admin | Kommentar nach ID abrufen |
| `/api/admin/comments/[id]` | PUT | Admin | Kommentarinhalt aktualisieren |
| `/api/admin/comments/[id]` | DELETE | Admin | Kommentar soft-löschen |

## Öffentliche Endpunkte

### Kommentare eines Eintrags auflisten

```
GET /api/items/[slug]/comments
```

Gibt alle Kommentare für einen bestimmten Eintrag einschließlich Benutzerprofilinformationen zurück. Keine Authentifizierung erforderlich.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `slug` | string | Eintrags-Slug |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Quelle:** `template/app/api/items/[slug]/comments/route.ts`

### Bewertungsstatistiken abrufen

```
GET /api/items/[slug]/comments/rating
```

Gibt die Durchschnittsbewertung und die Gesamtanzahl der Bewertungen für einen Eintrag zurück. Nur nicht gelöschte Kommentare werden gezählt.

**Erfolgsantwort (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Gibt `averageRating: 0` und `totalRatings: 0` zurück, wenn keine Bewertungen vorhanden sind.

**Quelle:** `template/app/api/items/[slug]/comments/rating/route.ts`

## Authentifizierte Endpunkte

### Kommentar erstellen

```
POST /api/items/[slug]/comments
```

Erstellt einen neuen Kommentar mit einer Bewertung für einen Eintrag. Authentifizierung und ein gültiges Client-Profil sind erforderlich. Gesperrten Benutzern ist das Kommentieren nicht gestattet.

**Authentifizierung:** Erforderlich

**Anfragekörper:**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

| Feld | Typ | Erforderlich | Einschränkungen |
|---|---|---|---|
| `content` | string | Ja | Darf nach dem Kürzen nicht leer sein |
| `rating` | integer | Ja | Muss zwischen 1 und 5 liegen |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Status | Bedingung |
|---|---|
| 400 | Leerer Inhalt oder ungültige Bewertung |
| 401 | Nicht authentifiziert |
| 403 | Benutzer ist gesperrt oder gebannt |
| 404 | Client-Profil nicht gefunden |

**Quelle:** `template/app/api/items/[slug]/comments/route.ts`

### Kommentar aktualisieren

```
PUT /api/items/[slug]/comments/[commentId]
```

Aktualisiert den Inhalt und/oder die Bewertung eines bestehenden Kommentars. Nur der Kommentarautor kann seinen eigenen Kommentar aktualisieren. Mindestens eines der Felder `content` oder `rating` muss angegeben werden.

**Authentifizierung:** Erforderlich (muss Kommentarinhaber sein)

**Anfragekörper:**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

| Feld | Typ | Erforderlich | Einschränkungen |
|---|---|---|---|
| `content` | string | Nein | 1–1000 Zeichen |
| `rating` | integer | Nein | Muss zwischen 1 und 5 liegen |

Die Antwort enthält den aktualisierten Kommentar mit einem `editedAt`-Zeitstempel.

| Status | Bedingung |
|---|---|
| 400 | Keine Felder angegeben, Inhalt zu lang oder ungültige Bewertung |
| 401 | Nicht authentifiziert |
| 404 | Kommentar nicht gefunden oder Benutzer ist nicht der Autor |

**Quelle:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Kommentar löschen

```
DELETE /api/items/[slug]/comments/[commentId]
```

Soft-löscht einen Kommentar. Nur der Kommentarautor kann seinen eigenen Kommentar löschen. Der Kommentar wird mit einem `deletedAt`-Zeitstempel markiert, anstatt dauerhaft entfernt zu werden.

**Authentifizierung:** Erforderlich (muss Kommentarinhaber sein)

**Erfolgsantwort:** 204 No Content

| Status | Bedingung |
|---|---|
| 401 | Nicht authentifiziert |
| 404 | Kommentar nicht gefunden, bereits gelöscht oder nicht im Besitz des Benutzers |

**Quelle:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Kommentarbewertung aktualisieren

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Aktualisiert nur die Bewertung eines bestimmten Kommentars.

**Anfragekörper:**

```json
{
  "rating": 4
}
```

**Quelle:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Admin-Endpunkte

Alle Admin-Endpunkte erfordern, dass `session.user.isAdmin` den Wert `true` hat.

### Alle Kommentare auflisten

```
GET /api/admin/comments
```

Gibt eine paginierte Liste aller Kommentare (ohne soft-gelöschte) mit Benutzerinformationen zurück. Unterstützt die Suche in Kommentarinhalt, Benutzername und E-Mail-Adresse.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `page` | integer | 1 | Seitennummer |
| `limit` | integer | 10 | Ergebnisse pro Seite (1–100) |
| `search` | string | - | Suche in Inhalt, Benutzername oder E-Mail |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

**Quelle:** `template/app/api/admin/comments/route.ts`
