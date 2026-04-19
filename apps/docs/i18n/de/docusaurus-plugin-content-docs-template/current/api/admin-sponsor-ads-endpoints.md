---
id: admin-sponsor-ads-endpoints
title: "Admin Sponsor Ads API Endpoints"
sidebar_label: "Admin Sponsor Ads API Endpoints"
---

# Admin Sponsor-Anzeigen API Endpunkte

Die Sponsor-Anzeigen API ermöglicht Administratoren die Verwaltung des gesamten Lebenszyklus von gesponserten Werbeanzeigen: Genehmigung, Ablehnung, Stornierung und Filterung.

## Basispfad

```
/api/admin/sponsor-ads
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | --------------------------------------- | -------- | ------------------------------------------- |
| `GET` | `/api/admin/sponsor-ads` | Admin | Paginierte Liste abrufen |
| `GET` | `/api/admin/sponsor-ads/{id}` | Admin | Einzelne Sponsor-Anzeige abrufen |
| `DELETE` | `/api/admin/sponsor-ads/{id}` | Admin | Sponsor-Anzeige löschen |
| `POST` | `/api/admin/sponsor-ads/{id}/approve` | Admin | Sponsor-Anzeige genehmigen |
| `POST` | `/api/admin/sponsor-ads/{id}/reject` | Admin | Sponsor-Anzeige ablehnen |
| `POST` | `/api/admin/sponsor-ads/{id}/cancel` | Admin | Sponsor-Anzeige stornieren |

---

## Sponsor-Anzeigen auflisten

```
GET /api/admin/sponsor-ads
```

Gibt eine paginierte Liste von Sponsor-Anzeigen mit optionalem Status-Filter und Sortierung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
| ----------- | ------- | -------- | ------------------------------------------------------ |
| `page` | integer | `1` | Seitennummer |
| `limit` | integer | `10` | Ergebnisse pro Seite (1–100) |
| `status` | string | – | Filter: `pending`, `pending_payment`, `active`, `rejected`, `expired`, `cancelled` |
| `sortBy` | string | `createdAt` | Sortierfeld: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status` |
| `sortOrder` | string | `asc` | Sortierrichtung: `asc` oder `desc` |

**Antwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Listing",
      "status": "pending",
      "interval": "monthly",
      "startDate": "2024-02-01T00:00:00.000Z",
      "endDate": "2024-02-29T23:59:59.000Z",
      "client": { "id": "client_xyz", "name": "Acme Corp" },
      "created_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## Einzelne Sponsor-Anzeige abrufen

```
GET /api/admin/sponsor-ads/{id}
```

Gibt vollständige Details für eine Sponsor-Anzeige zurück, einschließlich Zahlungsinformationen, Inhaltsdaten und Client-Referenz.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Listing",
    "description": "An excellent productivity tool for teams",
    "status": "pending",
    "interval": "monthly",
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-02-29T23:59:59.000Z",
    "client": { "id": "client_xyz", "name": "Acme Corp", "email": "contact@acme.com" },
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Sponsor-Anzeige löschen

```
DELETE /api/admin/sponsor-ads/{id}
```

Löscht eine Sponsor-Anzeige permanent.

**Antwort (200):**

```json
{
  "success": true,
  "message": "Sponsor ad deleted successfully"
}
```

---

## Sponsor-Anzeige genehmigen

```
POST /api/admin/sponsor-ads/{id}/approve
```

Genehmigt eine Sponsor-Anzeige und setzt den Status auf `active`. Das optionale Feld `forceApprove` ermöglicht die Genehmigung von Anzeigen im Status `pending_payment` (bei manueller Zahlungsbestätigung).

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| -------------- | ------- | -------- | --------------------------------------------------- |
| `forceApprove` | boolean | Nein | `true` um `pending_payment`-Anzeigen zu genehmigen |
| `interval` | string | Nein | `weekly` oder `monthly` |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active"
  },
  "message": "Sponsor ad approved successfully"
}
```

---

## Sponsor-Anzeige ablehnen

```
POST /api/admin/sponsor-ads/{id}/reject
```

Lehnt eine Sponsor-Anzeige mit einem Pflichtgrund ab.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ----------------- | ------ | -------- | --------------------------------- |
| `rejectionReason` | string | Ja | Grund (10–500 Zeichen) |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Sponsor-Anzeige stornieren

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Storniert eine Sponsor-Anzeige mit Status `pending`, `pending_payment` oder `active`. Validiert mit Zod (`cancelSponsorAdSchema`).

**Anfragekörper (optional):**

| Feld | Typ | Erforderlich | Beschreibung |
| -------------- | ------ | -------- | --------------------------------------- |
| `cancelReason` | string | Nein | Stornierungsgrund (max. 500 Zeichen) |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Status-Lebenszyklus

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

| Status | Bedeutung |
| ----------------- | ------------------------------------------------------- |
| `pending_payment` | Vom Benutzer erstellt, Zahlungsbestätigung ausstehend |
| `pending` | Zahlung erhalten, Admin-Prüfung ausstehend |
| `active` | Genehmigt und aktuell aktiv |
| `rejected` | Vom Admin mit Begründung abgelehnt |
| `expired` | Enddatum automatisch überschritten |
| `cancelled` | Vom Admin oder Benutzer storniert |

---

## Validierungsregeln

| Feld | Regel |
| ----------------- | -------------------------------------------------------------- |
| `interval` | Muss `weekly` oder `monthly` sein |
| `rejectionReason` | Erforderlich beim Ablehnen; 10–500 Zeichen |
| `cancelReason` | Optional beim Stornieren; max. 500 Zeichen |
| `forceApprove` | Boolean; nur relevant bei `pending_payment`-Status |
| `sortBy` | Muss `createdAt`, `updatedAt`, `startDate`, `endDate` oder `status` sein |
| `sortOrder` | Muss `asc` oder `desc` sein |

## Fehlercodes

| Status | Bedeutung |
| ------ | ----------------------------------------------------------------- |
| `400` | Validierungsfehler, ungültiger Statusübergang, Zahlung nicht erhalten |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Sponsor-Anzeige nicht gefunden |
| `500` | Interner Serverfehler |

## Verwandte Dokumentation

- [Admin Users API](./admin-users-endpoints.md) – Benutzerkontoverwaltung
- [Admin Clients API](./admin-clients-endpoints.md) – Client-Profilverwaltung
- [Authentifizierung](../architecture/nextauth-configuration.md) – Sitzungsverwaltung und Schutzmechanismen

See the [English documentation](/api/admin-sponsor-ads-endpoints) for the full content of this section.
