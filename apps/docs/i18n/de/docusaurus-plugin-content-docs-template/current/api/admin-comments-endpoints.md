---
id: admin-comments-endpoints
title: "Admin Comments API Endpoints"
sidebar_label: "Admin Comments API Endpoints"
---

# Admin Kommentare API Endpunkte

Die Admin Kommentare API bietet Moderationsfunktionen für die Verwaltung von Benutzerkommentaren. Admins können Kommentare auflisten, anzeigen, aktualisieren und weich löschen. Alle Endpunkte verwenden die Node.js-Laufzeitumgebung und erfordern Datenbankverfügbarkeit. Authentifizierungsprüfungen verwenden `403 Forbidden` für Nicht-Admin-Benutzer.

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|--------|------|------|-------------|
| `GET` | `/api/admin/comments` | Admin | Kommentare auflisten (paginiert, durchsuchbar) |
| `GET` | `/api/admin/comments/{id}` | Admin | Einzelnen Kommentar mit Benutzerinfo abrufen |
| `PUT` | `/api/admin/comments/{id}` | Admin | Kommentarinhalt aktualisieren |
| `DELETE` | `/api/admin/comments/{id}` | Admin | Kommentar weich löschen |

## Authentifizierung

Kommentarmoderations-Endpunkte prüfen den Admin-Status und geben `403 Forbidden` (nicht `401`) für Nicht-Admin-Benutzer zurück:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Datenbankanforderung

Die Kommentar-Endpunkte prüfen die Datenbankverfügbarkeit vor der Verarbeitung von Anfragen:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Wenn die Datenbank nicht konfiguriert ist, wird eine entsprechende Fehlerantwort zurückgegeben, bevor eine Authentifizierungsprüfung erfolgt.

## Endpunkte

### GET `/api/admin/comments`

Gibt eine paginierte Liste von Kommentaren mit zugehörigen Benutzerinformationen zurück. Unterstützt Volltext-Suche über Kommentarinhalt, Benutzernamen und E-Mail-Adressen. Es werden nur nicht gelöschte Kommentare zurückgegeben.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Seitennummer für Paginierung |
| `limit` | integer | `10` | Kommentare pro Seite (1–100) |
| `search` | string | `""` | Suche in Inhalt, Benutzername oder E-Mail |

**Suchverhalten:**

Die Suchabfrage wird case-insensitive (mit `ILIKE`) abgeglichen gegen:
- Kommentarinhalt
- Anzeigename des Benutzers
- E-Mail-Adresse des Benutzers

Sonderzeichen `%`, `_` und `\` werden escapet, um SQL-Pattern-Injection zu verhindern.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
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

### GET `/api/admin/comments/{id}`

Ruft einen bestimmten Kommentar anhand seiner ID mit vollständigen Benutzerprofilinformationen ab. Enthält einen Left-Join zur `clientProfiles`-Tabelle für Benutzerdaten.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string | Eindeutige Kommentar-Kennung |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Benutzer-Fallback:** Wenn das Benutzerprofil nicht gefunden wird (gelöschter Benutzer), wird ein Platzhalter-Objekt zurückgegeben:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Aktualisiert den Inhalt eines bestimmten Kommentars. Nur das Feld `content` kann geändert werden. Der Kommentar muss existieren und darf nicht weich gelöscht sein.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string | Eindeutige Kommentar-Kennung |

**Anfragekörper:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|-------|------|----------|-------------|
| `content` | string | Ja | Neuer Kommentartext (darf nach dem Trimmen nicht leer sein) |

**Validierungsregeln:**
- `content` ist erforderlich und darf nicht leer oder nur aus Leerzeichen bestehen
- Der Zielkommentar muss existieren und darf keinen `deletedAt`-Zeitstempel haben

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Führt eine weiche Löschung eines Kommentars durch, indem der `deletedAt`-Zeitstempel gesetzt wird. Der Kommentar muss existieren und darf noch nicht gelöscht sein. Weich gelöschte Kommentare werden aus allen Listenabfragen ausgeschlossen.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string | Eindeutige Kommentar-Kennung |

**Antwort (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Kommentar-Datenmodell

| Feld | Typ | Nullable | Beschreibung |
|-------|------|----------|-------------|
| `id` | string | Nein | Eindeutige Kommentar-Kennung |
| `content` | string | Nein | Kommentartextinhalt |
| `rating` | integer | Ja | Bewertungswert (1–5) |
| `userId` | string | Nein | Autor-Benutzer-ID |
| `itemId` | string | Nein | Zugeordnete Element-ID |
| `createdAt` | datetime | Ja | Erstellungs-Zeitstempel |
| `updatedAt` | datetime | Ja | Letzter Aktualisierungs-Zeitstempel |
| `deletedAt` | datetime | Ja | Weich-Lösch-Zeitstempel (null wenn aktiv) |

## Fehlercodes

| Status | Fehler | Ursache |
|--------|-------|-------|
| `400` | Inhalt ist erforderlich | Leerer oder fehlender Inhalt bei Aktualisierung |
| `403` | Verboten | Nicht-Admin-Benutzer versucht Zugriff |
| `404` | Kommentar nicht gefunden | Ungültige ID oder bereits weich gelöscht |
| `500` | Interner Serverfehler | Datenbank- oder Serverfehler |

## Implementierungshinweise

- Kommentare verwenden **weiche Löschung** – das Feld `deletedAt` wird gesetzt anstatt die Zeile zu entfernen. Dies bewahrt die Datenintegrität und ermöglicht eine potenzielle Wiederherstellung.
- Alle Listenabfragen filtern mit `isNull(comments.deletedAt)`, um gelöschte Kommentare auszuschließen.
- Benutzerdaten werden über einen `LEFT JOIN` auf `clientProfiles` abgerufen, um sicherzustellen, dass Kommentare von gelöschten Benutzern noch abrufbar sind.
- Die `runtime` ist für diese Routen auf `"nodejs"` gesetzt (nicht Edge).

## Verwandte Dokumentation

- [Admin Endpunkte Übersicht](./admin-endpoints.md)
- [Öffentliche Kommentar-Endpunkte](./comment-endpoints.md)
- [Antwortmuster](./response-patterns.md)
- [Anfragenvalidierung](./request-validation.md)

See the [English documentation](/api/admin-comments-endpoints) for the full content of this section.
