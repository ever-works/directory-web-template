---
id: admin-endpoints
title: "Admin API Endpoints"
sidebar_label: "Admin API Endpoints"
---

# Admin API Endpunkte

Die Admin API enthält ungefähr 60 Route-Handler in 19 Ressourcengruppen. Alle Admin-Endpunkte sind durch die `withAdminAuth`-Middleware geschützt, die sowohl die Authentifizierung als auch die Admin-Rollenzuweisung über eine Datenbankabfrage verifiziert.

## Authentifizierung

Jeder Admin-Endpunkt erfordert:

1. Eine gültige JWT-Sitzung (geprüft über `auth()`)
2. Eine Admin-Rolle in der `user_roles`-Tabelle (geprüft über `isAdmin()` aus `lib/db/roles.ts`)

Nicht authentifizierte Anfragen erhalten eine `401`-Antwort. Authentifizierte, aber nicht-admin Anfragen erhalten eine `403`-Antwort.

## Ressourcengruppen

### Kategorien (`/api/admin/categories`)

Inhaltskategorien mit Git-basierter Persistenz verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Kategorien mit Paginierung auflisten |
| `POST` | `/api/admin/categories` | Neue Kategorie erstellen |
| `GET` | `/api/admin/categories/all` | Alle Kategorien abrufen (ohne Paginierung) |
| `POST` | `/api/admin/categories/git` | Kategorien mit Git-Repository synchronisieren |
| `POST` | `/api/admin/categories/reorder` | Kategoriepositionen neu ordnen |
| `GET` | `/api/admin/categories/[id]` | Kategorie nach ID abrufen |
| `PUT` | `/api/admin/categories/[id]` | Kategorie aktualisieren |
| `DELETE` | `/api/admin/categories/[id]` | Kategorie löschen |

### Clients (`/api/admin/clients`)

Client-Benutzerkonten und -Profile verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Client-Profile mit Paginierung auflisten |
| `POST` | `/api/admin/clients/advanced-search` | Erweiterte Client-Suche mit Filtern |
| `POST` | `/api/admin/clients/bulk` | Massenoperationen auf Clients |
| `GET` | `/api/admin/clients/dashboard` | Client-Dashboard-Statistiken |
| `GET` | `/api/admin/clients/stats` | Aggregierte Client-Statistiken |
| `GET` | `/api/admin/clients/[clientId]` | Client-Profildetails abrufen |
| `PUT` | `/api/admin/clients/[clientId]` | Client-Profil aktualisieren |
| `DELETE` | `/api/admin/clients/[clientId]` | Client-Konto löschen |

### Kollektionen (`/api/admin/collections`)

Kuratierte Element-Kollektionen verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Alle Kollektionen auflisten |
| `POST` | `/api/admin/collections` | Neue Kollektion erstellen |
| `GET` | `/api/admin/collections/[id]` | Kollektionsdetails abrufen |
| `PUT` | `/api/admin/collections/[id]` | Kollektion aktualisieren |
| `DELETE` | `/api/admin/collections/[id]` | Kollektion löschen |
| `GET` | `/api/admin/collections/[id]/items` | Elemente in einer Kollektion auflisten |
| `PUT` | `/api/admin/collections/[id]/items` | Kollektionselemente aktualisieren |

### Kommentare (`/api/admin/comments`)

Benutzerkommentare moderieren.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Kommentare mit Moderationsfiltern auflisten |
| `GET` | `/api/admin/comments/[id]` | Kommentardetails abrufen |
| `PUT` | `/api/admin/comments/[id]` | Kommentar aktualisieren (genehmigen/ablehnen) |
| `DELETE` | `/api/admin/comments/[id]` | Kommentar löschen |

### Unternehmen (`/api/admin/companies`)

Mit Elementen verknüpfte Unternehmensprofile verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Unternehmen auflisten |
| `POST` | `/api/admin/companies` | Unternehmen erstellen |
| `GET` | `/api/admin/companies/[id]` | Unternehmensdetails abrufen |
| `PUT` | `/api/admin/companies/[id]` | Unternehmen aktualisieren |
| `DELETE` | `/api/admin/companies/[id]` | Unternehmen löschen |

### Dashboard (`/api/admin/dashboard`)

Aggregierte Dashboard-Analysen.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Dashboard-Zusammenfassungsstatistiken |

### Hervorgehobene Elemente (`/api/admin/featured-items`)

Herausgehobene Element-Highlights verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | Hervorgehobene Elemente auflisten |
| `POST` | `/api/admin/featured-items` | Element hervorheben |
| `GET` | `/api/admin/featured-items/[id]` | Details zu hervorgehobenem Element abrufen |
| `PUT` | `/api/admin/featured-items/[id]` | Einstellungen für hervorgehobenes Element aktualisieren |
| `DELETE` | `/api/admin/featured-items/[id]` | Aus hervorgehobenen Elementen entfernen |

### Geo-Analysen (`/api/admin/geo-analytics`)

Geografische Analysen und Besucherverteilungsdaten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Geografische Analysedaten abrufen |

### Elemente (`/api/admin/items`)

Vollständige Element-Content-Verwaltung.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Elemente mit Filtern und Paginierung auflisten |
| `POST` | `/api/admin/items` | Neues Element erstellen |
| `POST` | `/api/admin/items/bulk` | Massen-Elementoperationen (genehmigen, ablehnen, löschen) |
| `GET` | `/api/admin/items/stats` | Aggregierte Elementstatistiken |
| `GET` | `/api/admin/items/[id]` | Elementdetails abrufen |
| `PUT` | `/api/admin/items/[id]` | Element aktualisieren |
| `DELETE` | `/api/admin/items/[id]` | Element löschen |
| `GET` | `/api/admin/items/[id]/history` | Element-Prüfverlauf abrufen |
| `POST` | `/api/admin/items/[id]/review` | Element-Review einreichen (genehmigen/ablehnen) |

### Standortindex (`/api/admin/location-index`)

Geografischen Standort-Suchindex verwalten.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Standort-Suchindex neu aufbauen |

### Navigation (`/api/admin/navigation`)

Admin-Navigationskonfiguration.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Navigationsstruktur abrufen |
| `PUT` | `/api/admin/navigation` | Navigation aktualisieren |

### Benachrichtigungen (`/api/admin/notifications`)

Admin-Benachrichtigungsverwaltung.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin-Benachrichtigungen auflisten |
| `POST` | `/api/admin/notifications/mark-all-read` | Alle Benachrichtigungen als gelesen markieren |
| `POST` | `/api/admin/notifications/[id]/read` | Einzelne Benachrichtigung als gelesen markieren |

### Berichte (`/api/admin/reports`)

Verwaltung von Inhaltsberichten und Moderation.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | Inhaltsberichte auflisten |
| `GET` | `/api/admin/reports/stats` | Berichtsstatistiken |
| `GET` | `/api/admin/reports/[id]` | Berichtsdetails abrufen |
| `PUT` | `/api/admin/reports/[id]` | Berichtsstatus aktualisieren (lösen, verwerfen) |

### Rollen (`/api/admin/roles`)

Rollen- und Berechtigungsverwaltung für RBAC.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Rollen mit Paginierung auflisten |
| `POST` | `/api/admin/roles` | Neue Rolle erstellen |
| `GET` | `/api/admin/roles/active` | Nur aktive Rollen abrufen |
| `GET` | `/api/admin/roles/stats` | Rollenstatistiken |
| `GET` | `/api/admin/roles/[id]` | Rollendetails abrufen |
| `PUT` | `/api/admin/roles/[id]` | Rolle aktualisieren |
| `DELETE` | `/api/admin/roles/[id]` | Rolle löschen (weiche Löschung) |
| `GET` | `/api/admin/roles/[id]/permissions` | Rollenberechtigungen abrufen |
| `PUT` | `/api/admin/roles/[id]/permissions` | Rollenberechtigungen aktualisieren |

### Einstellungen (`/api/admin/settings`)

Verwaltung der Anwendungseinstellungen.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Alle Einstellungen abrufen |
| `PUT` | `/api/admin/settings` | Einstellungen aktualisieren |
| `GET` | `/api/admin/settings/map-status` | Kartenfunktionsstatus abrufen |

### Sponsor-Anzeigen (`/api/admin/sponsor-ads`)

Moderation von Sponsor-Werbeanzeigen.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Sponsor-Anzeigen auflisten |
| `GET` | `/api/admin/sponsor-ads/[id]` | Anzeigendetails abrufen |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Anzeige aktualisieren |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Sponsor-Anzeige genehmigen |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Sponsor-Anzeige ablehnen |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Sponsor-Anzeige abbrechen |

### Tags (`/api/admin/tags`)

Content-Tag-Verwaltung.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Tags mit Paginierung auflisten |
| `POST` | `/api/admin/tags` | Neuen Tag erstellen |
| `GET` | `/api/admin/tags/all` | Alle Tags abrufen (ohne Paginierung) |
| `GET` | `/api/admin/tags/[id]` | Tag-Details abrufen |
| `PUT` | `/api/admin/tags/[id]` | Tag aktualisieren |
| `DELETE` | `/api/admin/tags/[id]` | Tag löschen |

### Twenty CRM (`/api/admin/twenty-crm`)

CRM-Integrationskonfiguration und -tests.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | CRM-Konfiguration abrufen |
| `PUT` | `/api/admin/twenty-crm/config` | CRM-Konfiguration aktualisieren |
| `POST` | `/api/admin/twenty-crm/test-connection` | CRM-Verbindung testen |

### Benutzer (`/api/admin/users`)

Admin-Benutzerverwaltung.

| Methode | Pfad | Beschreibung |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Benutzer mit Paginierung auflisten |
| `POST` | `/api/admin/users` | Neuen Benutzer erstellen |
| `GET` | `/api/admin/users/stats` | Benutzerstatistiken |
| `GET` | `/api/admin/users/check-email` | E-Mail-Verfügbarkeit prüfen |
| `GET` | `/api/admin/users/check-username` | Benutzernamen-Verfügbarkeit prüfen |
| `GET` | `/api/admin/users/[id]` | Benutzerdetails abrufen |
| `PUT` | `/api/admin/users/[id]` | Benutzer aktualisieren |
| `DELETE` | `/api/admin/users/[id]` | Benutzer löschen |

## Gemeinsame Muster

### Massenoperationen

Mehrere Ressourcen unterstützen Massenoperationen über POST mit einem Array von IDs:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Statistik-Endpunkte

Die meisten Ressourcengruppen enthalten einen `/stats`-Endpunkt, der aggregierte Zählungen zurückgibt:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Prüfverlauf

Elemente unterstützen die Verfolgung des Prüfverlaufs über den Endpunkt `/[id]/history`, der aufzeichnet, wer wann Änderungen vorgenommen hat.

See the [English documentation](/api/admin-endpoints) for the full content of this section.
