---
id: vote-endpoints
title: "Vote Endpoints"
sidebar_label: "Vote Endpoints"
---

# Abstimmungs-Endpunkte

Das Abstimmungssystem stellt Endpunkte für Up- und Downvotes auf Einträgen bereit. Abstimmungen verwenden ein Netto-Score-Modell, bei dem die Anzahl die Upvotes minus Downvotes darstellt. Öffentliche Endpunkte geben die Abstimmungsanzahl zurück, authentifizierte Endpunkte ermöglichen das Abgeben, Aktualisieren und Entfernen von Stimmen. Gesperrte Benutzer werden an der Abstimmung gehindert.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/items/[slug]/votes` | GET | Öffentlich | Abstimmungsanzahl und Benutzer-Abstimmungsstatus abrufen |
| `/api/items/[slug]/votes` | POST | Benutzer | Stimme abgeben oder aktualisieren |
| `/api/items/[slug]/votes` | DELETE | Benutzer | Stimme entfernen |
| `/api/items/[slug]/votes/count` | GET | Öffentlich | Nur Netto-Abstimmungsanzahl abrufen |
| `/api/items/[slug]/votes/status` | GET | Benutzer | Vollständigen Abstimmungseintrag für den Benutzer abrufen |

## Kombinierter Abstimmungs-Endpunkt

### Abstimmungsinformationen abrufen

```
GET /api/items/[slug]/votes
```

Gibt die Netto-Abstimmungsanzahl für einen Eintrag und den aktuellen Abstimmungsstatus des Benutzers zurück, sofern dieser angemeldet ist. Keine Authentifizierung erforderlich; authentifizierte Benutzer erhalten jedoch ihren Abstimmungsstatus in der Antwort.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `slug` | string | Eintrag-Slug |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `success` | boolean | Bei Erfolg immer `true` |
| `count` | integer | Netto-Abstimmungsanzahl (Upvotes minus Downvotes) |
| `userVote` | string oder null | `"up"`, `"down"` oder `null` bei nicht angemeldetem Benutzer oder keiner Stimme |

Für nicht angemeldete Benutzer ist `userVote` immer `null`. Die Anzahl kann negativ sein, wenn mehr Downvotes als Upvotes vorhanden sind.

**Quelle:** `template/app/api/items/[slug]/votes/route.ts`

### Stimme abgeben oder aktualisieren

```
POST /api/items/[slug]/votes
```

Gibt eine neue Stimme ab oder ersetzt eine bestehende Stimme auf einem Eintrag. Wenn der Benutzer bereits abgestimmt hat, wird die vorherige Stimme gelöscht, bevor die neue erstellt wird. Das Ändern von Upvote zu Downvote (oder umgekehrt) ist damit ein einziger Vorgang.

**Authentifizierung:** Erforderlich

**Anfragekörper:**

```json
{
  "type": "up"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `type` | string | Ja | `"up"` für Upvote, `"down"` für Downvote |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

Die Antwort gibt die aktualisierte Netto-Abstimmungsanzahl nach Abgabe der Stimme zurück.

**Fehlerantworten:**

| Status | Bedingung |
|---|---|
| 400 | Ungültiger Abstimmungstyp (muss `"up"` oder `"down"` sein) |
| 401 | Nicht angemeldet |
| 403 | Benutzer ist gesperrt oder gebannt |
| 404 | Client-Profil nicht gefunden |

**Quelle:** `template/app/api/items/[slug]/votes/route.ts`

### Stimme entfernen

```
DELETE /api/items/[slug]/votes
```

Entfernt die Stimme des aktuellen Benutzers von einem Eintrag. Wenn keine Stimme vorhanden ist, wird der Vorgang erfolgreich ohne Fehler abgeschlossen (idempotent). Nach dem Entfernen ist `userVote` gleich `null`.

**Authentifizierung:** Erforderlich

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Status | Bedingung |
|---|---|
| 401 | Nicht angemeldet |
| 404 | Client-Profil nicht gefunden |

**Quelle:** `template/app/api/items/[slug]/votes/route.ts`

## Abstimmungsanzahl-Endpunkt

### Abstimmungsanzahl abrufen

```
GET /api/items/[slug]/votes/count
```

Gibt nur die Netto-Abstimmungsanzahl für einen Eintrag zurück. Dies ist ein leichtgewichtiger öffentlicher Endpunkt, der für die schnelle Abfrage der Abstimmungsanzahl ohne benutzerspezifischen Abstimmungsstatus optimiert ist.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "count": 15
}
```

Die Anzahl kann je nach Verhältnis von Up- und Downvotes positiv, negativ oder null sein.

**Quelle:** `template/app/api/items/[slug]/votes/count/route.ts`

## Abstimmungsstatus-Endpunkt

### Benutzer-Abstimmungsstatus abrufen

```
GET /api/items/[slug]/votes/status
```

Gibt den vollständigen Abstimmungseintrag für den authentifizierten Benutzer zu einem bestimmten Eintrag zurück. Gibt `null` zurück, wenn der Benutzer noch nicht abgestimmt hat.

**Authentifizierung:** Erforderlich

**Erfolgsantwort (200) – Benutzer hat abgestimmt:**

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Erfolgsantwort (200) – Keine Stimme:**

```json
null
```

Dieser Endpunkt gibt die rohen Datenbankwerte für `voteType` (`"UPVOTE"` oder `"DOWNVOTE"`) zurück, statt des vereinfachten `"up"` / `"down"`-Formats des kombinierten Endpunkts.

| Status | Bedingung |
|---|---|
| 401 | Nicht angemeldet |
| 404 | Client-Profil nicht gefunden |

**Quelle:** `template/app/api/items/[slug]/votes/status/route.ts`

## Wichtige Implementierungsdetails

- **Netto-Score:** Die Abstimmungsanzahl wird als Upvotes minus Downvotes berechnet. Ein negativer Wert bedeutet mehr Downvotes als Upvotes.
- **Stimme ersetzen:** Wenn ein Benutzer seinen Abstimmungstyp ändert, wird die vorhandene Stimme gelöscht und eine neue erstellt. Es gibt keine direkte Aktualisierung.
- **Gesperrte Benutzer:** Die `isUserBlocked()`-Prüfung am POST-Endpunkt verhindert, dass gesperrte oder gebannte Benutzer abstimmen. Die Prüfung wird nur beim Erstellen einer Stimme durchgeführt, nicht beim Entfernen.
- **VoteType-Enum:** Die Datenbank speichert Stimmen als `VoteType.UPVOTE` und `VoteType.DOWNVOTE`. Die API übersetzt diese für externe Verbraucher in `"up"` und `"down"`.
- **Idempotentes Löschen:** Das Löschen einer nicht vorhandenen Stimme gibt dennoch eine 200-Antwort mit der aktuellen Anzahl und `userVote: null` zurück.
