---
id: reports-endpoints
title: "Reports Endpoints"
sidebar_label: "Reports Endpoints"
---

# Melde-Endpunkte

Das Meldesystem ermöglicht authentifizierten Benutzern das Markieren unangemessener Inhalte und bietet Administratoren Tools zur Überprüfung, Moderation und Auflösung von Meldungen. Meldungen unterstützen Inhaltstypen wie Einträge und Kommentare mit integrierter Duplikat-Verhinderung.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/reports` | POST | Benutzer | Inhaltsmeldung einreichen |
| `/api/admin/reports` | GET | Admin | Meldungen mit Filtern auflisten |
| `/api/admin/reports/stats` | GET | Admin | Meldestatistiken abrufen |
| `/api/admin/reports/[id]` | GET | Admin | Einzelne Meldung abrufen |
| `/api/admin/reports/[id]` | PUT | Admin | Meldungsstatus und Auflösung aktualisieren |

## Öffentliche Endpunkte

### Meldung einreichen

```
POST /api/reports
```

Authentifizierte Benutzer können Einträge oder Kommentare für unangemessene Inhalte melden. Jeder Benutzer kann denselben Inhalt nur einmal melden (Duplikat-Verhinderung über `hasUserReportedContent`-Prüfung). Gesperrte Benutzer (suspendiert oder gebannt) können keine Meldungen einreichen.

**Authentifizierung:** Erforderlich (sitzungsbasiert)

**Anfragekörper:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "Dieses Tool bewirbt schädliche Software"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `contentType` | string | Ja | Inhaltstyp: `"item"` oder `"comment"` |
| `contentId` | string | Ja | ID oder Slug des gemeldeten Inhalts |
| `reason` | string | Ja | Eines von: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |
| `details` | string | Nein | Zusätzliche Informationen zur Meldung |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Fehlerantworten:**

| Status | Bedingung |
|---|---|
| 400 | Ungültiger Inhaltstyp, fehlende Inhalts-ID oder ungültiger Grund |
| 401 | Benutzer nicht angemeldet |
| 403 | Client-Profil erforderlich oder Benutzer ist suspendiert/gebannt |
| 404 | Client-Profil nicht gefunden |
| 409 | Benutzer hat diesen Inhalt bereits gemeldet |
| 500 | Interner Serverfehler |

**Quelle:** `template/app/api/reports/route.ts`

## Admin-Endpunkte

Alle Admin-Endpunkte erfordern `session.user.isAdmin` gleich `true`.

### Meldungen auflisten

```
GET /api/admin/reports
```

Gibt eine paginierte Liste von Inhaltsmeldungen mit Informationen zum Melder zurück. Unterstützt Filterung nach Status, Inhaltstyp und Grund sowie Textsuche über Inhalts-ID, Details und Melder-Name/E-Mail.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|---|---|---|---|
| `page` | integer | 1 | Seitennummer (Minimum 1) |
| `limit` | integer | 10 | Ergebnisse pro Seite (1-100) |
| `search` | string | - | Suche über Inhalts-ID, Details, Melder-Name/E-Mail |
| `status` | string | - | Filter: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `contentType` | string | - | Filter: `"item"`, `"comment"` |
| `reason` | string | - | Filter: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"` |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**Quelle:** `template/app/api/admin/reports/route.ts`

### Meldestatistiken abrufen

```
GET /api/admin/reports/stats
```

Gibt aggregierte Statistiken zu Meldungen zurück, einschließlich Anzahl nach Status, Inhaltstyp und Grund.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**Quelle:** `template/app/api/admin/reports/stats/route.ts`

### Meldung nach ID abrufen

```
GET /api/admin/reports/[id]
```

Ruft eine einzelne Meldung mit vollständigen Details einschließlich Melder- und Prüferinformationen ab.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `id` | string | Meldungs-ID |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

| Status | Bedingung |
|---|---|
| 403 | Kein Admin |
| 404 | Meldung nicht gefunden |

**Quelle:** `template/app/api/admin/reports/[id]/route.ts`

### Meldung aktualisieren

```
PUT /api/admin/reports/[id]
```

Aktualisiert den Status, die Auflösung und die Prüfungsnotiz einer Meldung. Wenn eine Auflösung festgelegt wird, führt das System automatisch die entsprechende Moderationsaktion aus (Inhalt entfernen, Benutzer warnen, sperren oder bannen).

**Anfragekörper:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Bestätigter Spam-Inhalt, aus Auflistung entfernt"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `status` | string | Nein | `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"` |
| `resolution` | string | Nein | `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"` |
| `reviewNote` | string | Nein | Admin-Notizen zur Überprüfung |

**Moderationsaktionen nach Auflösung:**

| Auflösung | Aktion |
|---|---|
| `content_removed` | Ruft `removeContent()` auf, um den gemeldeten Eintrag oder Kommentar zu entfernen |
| `user_warned` | Ruft `warnUser()` auf, um dem Inhalts-Eigentümer eine Warnung zu erteilen |
| `user_suspended` | Ruft `suspendUser()` auf, um das Konto des Inhalts-Eigentümers zu sperren |
| `user_banned` | Ruft `banUser()` auf, um den Inhalts-Eigentümer dauerhaft zu sperren |
| `no_action` | Keine Moderationsaktion wird ausgeführt |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

| Status | Bedingung |
|---|---|
| 400 | Ungültiger Status oder Auflösungswert; Inhalts-Eigentümer nicht gefunden für benutzerebene Aktionen |
| 403 | Kein Admin |
| 404 | Meldung nicht gefunden |

**Quelle:** `template/app/api/admin/reports/[id]/route.ts`

## Datenmodell

Meldungen verwenden folgende Enums aus `lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **ReportReason:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **ReportStatus:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **ReportResolution:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## Integration mit Moderation

Wenn eine Meldung mit einer benutzerbezogenen Auflösung abgeschlossen wird (`user_warned`, `user_suspended`, `user_banned`), geht das System wie folgt vor:

1. Sucht den Inhalts-Eigentümer über `getContentOwner()`
2. Führt die entsprechende Moderationsfunktion aus `lib/services/moderation.service` aus
3. Verwendet `reviewNote` als Begründung für die Moderationsaktion
4. Erfasst die ID des Admins als Prüfer

Schlagen Moderationsaktionen fehl, gelingt das Meldungsupdate dennoch, der Fehler wird jedoch protokolliert. Das Feld `moderationResult` in der Antwort gibt an, ob die Aktion erfolgreich war.
