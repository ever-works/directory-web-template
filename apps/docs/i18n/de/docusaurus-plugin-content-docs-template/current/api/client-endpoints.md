---
id: client-endpoints
title: "Client API Endpoints"
sidebar_label: "Client API Endpoints"
---

# Client API Endpunkte

Client-seitige API-Endpunkte dienen authentifizierten Endbenutzern (keine Admins). Diese Routen verwalten das Client-Dashboard, Einreichungen, Favoriten und öffentliche Elementinteraktionen wie Kommentare, Abstimmungen und Aufrufe.

## Client-Dashboard & Einträge (`/api/client`)

Alle `/api/client/*`-Routen erfordern eine authentifizierte Sitzung mit gültiger `clientProfileId`.

### Dashboard

| Methode | Pfad | Beschreibung |
| ------- | ---------------------------------- | -------------------------------------------- |
| `GET` | `/api/client/dashboard/stats` | Client-Dashboard-Statistiken (Anzahl Einträge, Aufrufe, Engagement) |

### Client-Einträge

| Methode | Pfad | Beschreibung |
| -------- | --------------------------------------- | -------------------------------------------- |
| `GET` | `/api/client/items` | Vom aktuellen Client eingereichte Einträge auflisten |
| `POST` | `/api/client/items` | Neuen Eintrag zur Prüfung einreichen |
| `GET` | `/api/client/items/stats` | Client-Eintragsstatistiken |
| `GET` | `/api/client/items/coordinates` | Koordinaten der Client-Einträge abrufen |
| `GET` | `/api/client/items/[id]` | Eintragsdetails abrufen |
| `PUT` | `/api/client/items/[id]` | Eigenen Eintrag aktualisieren |
| `DELETE` | `/api/client/items/[id]` | Eigenen Eintrag löschen (weiche Löschung) |
| `POST` | `/api/client/items/[id]/restore` | Weich gelöschten Eintrag wiederherstellen |

### Geo-Statistiken

| Methode | Pfad | Beschreibung |
| ------- | ---------------------- | ------------------------------------------ |
| `GET` | `/api/client/geo-stats` | Geografische Statistiken für Client-Einträge |

## Öffentliche Elementinteraktionen (`/api/items`)

### Kommentare

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ----------------------------------------------- | -------- | ------------------------------- |
| `GET` | `/api/items/[slug]/comments` | Öffentlich | Kommentare auflisten |
| `POST` | `/api/items/[slug]/comments` | Erforderlich | Kommentar hinzufügen |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Erforderlich | Eigenen Kommentar aktualisieren |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Erforderlich | Eigenen Kommentar löschen |

### Abstimmungen

| Methode | Pfad | Authentifizierung | Beschreibung |
| ------- | -------------------------------- | -------- | ----------------------------------- |
| `GET` | `/api/items/[slug]/votes/count` | Öffentlich | Abstimmungsanzahl abrufen |
| `GET` | `/api/items/[slug]/votes/status` | Erforderlich | Eigenen Abstimmungsstatus abrufen |
| `POST` | `/api/items/[slug]/votes` | Erforderlich | Für einen Eintrag abstimmen |

### Aufrufe

| Methode | Pfad | Authentifizierung | Beschreibung |
| ------- | ----------------------------- | -------- | ----------------------- |
| `POST` | `/api/items/[slug]/views` | Öffentlich | Seitenaufruf aufzeichnen |

## Favoriten (`/api/favorites`)

Verwaltet Favoriteneinträge des Benutzers. Alle Endpunkte erfordern Authentifizierung.

| Methode | Pfad | Beschreibung |
| -------- | ----------------------------- | ----------------------------------------- |
| `GET` | `/api/favorites` | Favoriteneinträge des Benutzers auflisten |
| `POST` | `/api/favorites/[itemSlug]` | Favoritenstatus für einen Eintrag umschalten |
| `DELETE` | `/api/favorites/[itemSlug]` | Eintrag aus Favoriten entfernen |

## Benutzerprofil (`/api/user`)

| Methode | Pfad | Beschreibung |
| ------- | --------------------------- | -------------------------------------- |
| `GET` | `/api/user/profile/location` | Erkannten Standort des Benutzers abrufen |
| `GET` | `/api/user/currency` | Erkannte/bevorzugte Währung abrufen |
| `GET` | `/api/user/plan-status` | Aktuellen Abonnementstatus abrufen |
| `GET` | `/api/user/subscription` | Abonnementdetails abrufen |
| `GET` | `/api/user/payments` | Zahlungshistorie abrufen |

## Öffentliche Datenendpunkte

| Methode | Pfad | Beschreibung |
| ------- | -------------------------------- | ----------------------------------- |
| `GET` | `/api/categories/exists` | Prüfen ob Kategorien vorhanden sind |
| `GET` | `/api/collections/exists` | Prüfen ob Kollektionen vorhanden sind |
| `GET` | `/api/featured-items` | Vorgestellte Einträge auflisten |
| `GET` | `/api/sponsor-ads` | Aktive Sponsor-Anzeigen abrufen |

## Paginierungsmuster

Client-seitige Listenendpunkte unterstützen Standard-Paginierungsparameter:

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
```

Antworten enthalten Paginierungsmetadaten:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

See the [English documentation](/api/client-endpoints) for the full content of this section.
