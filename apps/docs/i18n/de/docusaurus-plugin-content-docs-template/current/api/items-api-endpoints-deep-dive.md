---
id: items-api-endpoints-deep-dive
title: "Items API Endpoints Deep Dive"
sidebar_label: "Items API Endpoints Deep Dive"
---

# Einträge-API-Endpunkte – Detaillierte Übersicht

Die Einträge-API stellt öffentliche Endpunkte für die Interaktion mit Einträgen bereit, einschließlich Kommentare, Stimmen, Aufrufs-Tracking, Unternehmenszuordnungen und Engagement-Metriken. Diese Endpunkte unterstützen die zentralen benutzerseitigen Features der Verzeichniswebsite.

**Quellverzeichnis:** `template/app/api/items/`

---

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| `GET` | `/api/items/{slug}/comments` | Öffentlich | Eintrags-Kommentare auflisten |
| `POST` | `/api/items/{slug}/comments` | Sitzung | Kommentar erstellen |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Sitzung (Inhaber) | Kommentar aktualisieren |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Sitzung (Inhaber) | Kommentar löschen |
| `GET` | `/api/items/{slug}/comments/rating` | Öffentlich | Bewertungsstatistiken abrufen |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Öffentlich | Einzelne Kommentarbewertung abrufen |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Öffentlich | Kommentarbewertung aktualisieren |
| `GET` | `/api/items/{slug}/company` | Admin | Eintrags-Unternehmen abrufen |
| `POST` | `/api/items/{slug}/company` | Admin | Unternehmen einem Eintrag zuweisen |
| `DELETE` | `/api/items/{slug}/company` | Admin | Unternehmen von Eintrag entfernen |
| `POST` | `/api/items/{slug}/views` | Öffentlich | Eintrags-Aufruf aufzeichnen |
| `GET` | `/api/items/{slug}/votes` | Öffentlich | Stimmeninformationen + Benutzerstatus abrufen |
| `POST` | `/api/items/{slug}/votes` | Sitzung | Stimme abgeben oder aktualisieren |
| `DELETE` | `/api/items/{slug}/votes` | Sitzung | Stimme entfernen |
| `GET` | `/api/items/{slug}/votes/count` | Öffentlich | Nur Stimmenanzahl abrufen |
| `GET` | `/api/items/{slug}/votes/status` | Sitzung | Benutzerstimmen-Datensatz abrufen |
| `GET` | `/api/items/engagement` | Öffentlich | Batch-Engagement-Metriken |
| `GET` | `/api/items/popularity-scores` | Öffentlich | Popularitäts-Scores debuggen |

---

## Kommentare

### Kommentare auflisten

Gibt alle Kommentare für einen bestimmten Eintrag einschließlich Benutzerprofilinformationen zurück.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/items/{slug}/comments` |
| **Authentifizierung** | Keine (öffentlich) |
| **Quelle** | `items/[slug]/comments/route.ts` |

#### Antwort

**Status 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
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

---

### Kommentar erstellen

Erstellt einen neuen Kommentar mit einer Bewertung für einen Eintrag.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `POST` |
| **Pfad** | `/api/items/{slug}/comments` |
| **Authentifizierung** | Sitzung (Benutzer mit Client-Profil) |
| **Quelle** | `items/[slug]/comments/route.ts` |

#### Anfragekörper

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `content` | `string` | Ja | Kommentartext (darf nicht leer sein) |
| `rating` | `integer` | Ja | Bewertung von 1 bis 5 |

#### Statuscodes

| Status | Beschreibung |
|--------|--------------|
| 200 | Kommentar erfolgreich erstellt |
| 400 | Ungültiger Inhalt oder Bewertung |
| 401 | Authentifizierung erforderlich |
| 403 | Benutzer ist gesperrt (suspendiert oder gebannt) |
| 404 | Client-Profil nicht gefunden |
| 500 | Server-Fehler |

:::note Moderation
Gesperrte Benutzer (suspendiert oder gebannt) erhalten eine 403-Antwort. Die Prüfung `isUserBlocked()` wird anhand des Status-Feldes des Client-Profils durchgeführt.
:::

---

### Kommentar aktualisieren

Aktualisiert Inhalt und/oder Bewertung eines Kommentars. Nur der Kommentarautor kann seinen Kommentar aktualisieren.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `PUT` |
| **Pfad** | `/api/items/{slug}/comments/{commentId}` |
| **Authentifizierung** | Sitzung (Kommentarinhaber) |

#### Anfragekörper

Mindestens ein Feld muss angegeben werden:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Feld | Typ | Erforderlich | Einschränkungen |
|------|-----|--------------|----------------|
| `content` | `string` | Nein | 1–1000 Zeichen |
| `rating` | `integer` | Nein | 1–5 |

---

### Kommentar löschen

Soft-löscht einen Kommentar. Nur der Kommentarautor kann seinen Kommentar löschen.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `DELETE` |
| **Pfad** | `/api/items/{slug}/comments/{commentId}` |
| **Authentifizierung** | Sitzung (Kommentarinhaber) |

**Status 204** – Kein Inhalt (Kommentar erfolgreich gelöscht).

---

### Bewertungsstatistiken abrufen

Gibt aggregierte Bewertungsstatistiken für einen Eintrag zurück: Durchschnittsbewertung und Gesamtanzahl.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/items/{slug}/comments/rating` |
| **Authentifizierung** | Keine (öffentlich) |

**Status 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `averageRating` | `number` | Durchschnittsbewertung (0 wenn keine Bewertungen, max. 5) |
| `totalRatings` | `number` | Gesamtanzahl nicht-gelöschter Kommentare mit Bewertungen |
