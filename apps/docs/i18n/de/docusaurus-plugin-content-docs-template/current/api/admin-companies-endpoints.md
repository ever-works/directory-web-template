---
id: admin-companies-endpoints
title: "Admin Companies API Endpoints"
sidebar_label: "Admin Companies API Endpoints"
---

# Admin Unternehmen API Endpunkte

Die Admin Unternehmen API bietet Verwaltungsendpunkte für Unternehmensdatensätze. Unternehmen repräsentieren Organisationen, die mit gelisteten Elementen verknüpft sind. Die API unterstützt vollständige CRUD-Operationen mit Zod-basierter Validierung, Domain-/Slug-Eindeutigkeitsprüfung und optionaler CRM-Synchronisierung bei Aktualisierungen.

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Admin | Unternehmen auflisten (paginiert, durchsuchbar) |
| `POST` | `/api/admin/companies` | Admin | Neues Unternehmen erstellen |
| `GET` | `/api/admin/companies/{id}` | Admin | Einzelnes Unternehmen nach UUID abrufen |
| `PUT` | `/api/admin/companies/{id}` | Admin | Unternehmen aktualisieren |
| `DELETE` | `/api/admin/companies/{id}` | Admin | Unternehmen dauerhaft löschen |

## Authentifizierung

Alle Unternehmens-Endpunkte prüfen, ob die Sitzung Admin-Rechte hat:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Endpunkte

### GET `/api/admin/companies`

Gibt eine paginierte Liste von Unternehmen mit Such- und Statusfilterung zurück. Gibt auch globale Anzahlen aktiver und inaktiver Unternehmen unabhängig von den angewendeten Filtern zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Seitennummer (muss >= 1 sein) |
| `limit` | integer | `10` | Elemente pro Seite (1–100) |
| `q` | string | – | Suche nach Name oder Domain (case-insensitive) |
| `status` | string | – | Filter: `"active"` oder `"inactive"` |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

Die Werte `meta.activeCount` und `meta.inactiveCount` spiegeln globale Gesamtwerte wider und werden nicht von den Filtern `q` oder `status` beeinflusst. So kann die Benutzeroberfläche Tab-Zählungen neben gefilterten Ergebnissen anzeigen.

### POST `/api/admin/companies`

Erstellt einen neuen Unternehmensdatensatz. Anfragedaten werden mit dem Zod-Schema (`createCompanySchema`) validiert. Domain- und Slug-Werte werden auf Kleinbuchstaben normalisiert. Vor der Einfügung wird die Eindeutigkeit für `domain` und `slug` geprüft.

**Anfragekörper:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|-------|------|----------|-------------|
| `name` | string | Ja | Unternehmensname (1–255 Zeichen) |
| `website` | string (URI) | Nein | Vollständige Website-URL |
| `domain` | string | Nein | Normalisierte Domain (max. 255 Zeichen) |
| `slug` | string | Nein | URL-freundliche Kennung (`^[a-z0-9-]+$`, max. 255) |
| `status` | string | Nein | `"active"` oder `"inactive"` (Standard: `"active"`) |

**Validierung:** Verwendet Zod-Schema-Validierung. Bei Fehler werden detaillierte feldspezifische Fehler zurückgegeben:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Antwort (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Ruft ein einzelnes Unternehmen anhand seiner UUID ab.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string (UUID) | Eindeutige Unternehmenskennung |

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Aktualisiert ein bestehendes Unternehmen. Unterstützt partielle Aktualisierungen – nur angegebene Felder werden geändert. Validiert mit `updateCompanySchema`. Domain- und Slug-Eindeutigkeit wird bei Änderung dieser Felder erneut geprüft. Nach einer erfolgreichen Aktualisierung werden die Unternehmensdaten optional mit einem CRM-System synchronisiert.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string (UUID) | Eindeutige Unternehmenskennung |

**Anfragekörper:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Alle Felder sind optional. Nur angegebene Felder werden aktualisiert.

**CRM-Synchronisierung:**

Wenn `TWENTY_CRM_ENABLED` nicht auf `"false"` gesetzt ist, wird das aktualisierte Unternehmen automatisch mit dem Twenty CRM-System synchronisiert. Diese Synchronisierung ist nicht blockierend – wenn sie fehlschlägt, gibt die API trotzdem Erfolg für die Datenbankaktualisierung zurück.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Löscht ein Unternehmen dauerhaft. Dies ist eine harte Löschung – der Datensatz wird aus der Datenbank entfernt. Verknüpfte Element-Unternehmens-Verbindungen werden über CASCADE-Einschränkungen entfernt.

**Pfadparameter:**

| Parameter | Typ | Beschreibung |
|-----------|------|-------------|
| `id` | string (UUID) | Eindeutige Unternehmenskennung |

**Antwort (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
Die Löschung von Unternehmen ist dauerhaft und kann nicht rückgängig gemacht werden. Alle Element-Zuordnungen für das gelöschte Unternehmen werden durch Datenbank-CASCADE-Regeln entfernt.
:::

## Validierungsregeln

Unternehmensdaten werden mit Zod-Schemas validiert, die in `lib/validations/company.ts` definiert sind:

| Feld | Regel |
|-------|------|
| `name` | Erforderlich, 1–255 Zeichen |
| `website` | Optional, muss gültiges URI-Format haben |
| `domain` | Optional, max. 255 Zeichen, auf Kleinbuchstaben normalisiert |
| `slug` | Optional, max. 255 Zeichen, nur Kleinbuchstaben, Ziffern und Bindestriche |
| `status` | Optional, muss `"active"` oder `"inactive"` sein |

## Fehlercodes

| Status | Fehler | Ursache |
|--------|-------|-------|
| `400` | Validierungsfehler | Zod-Schema-Validierungsfehler (mit Felddetails) |
| `400` | Ungültiger Seitenparameter | Seite ist keine positive ganze Zahl |
| `400` | Ungültiger Limit-Parameter | Limit außerhalb des Bereichs 1–100 |
| `401` | Nicht autorisiert | Fehlende oder nicht-admin Sitzung |
| `404` | Unternehmen nicht gefunden | Kein Unternehmen mit der gegebenen UUID |
| `409` | Unternehmen mit dieser Domain existiert bereits | Domain-Eindeutigkeitsverletzung |
| `409` | Unternehmen mit diesem Slug existiert bereits | Slug-Eindeutigkeitsverletzung |
| `500` | Fehler beim Erstellen/Aktualisieren/Löschen des Unternehmens | Server- oder Datenbankfehler |

## Verwandte Dokumentation

- [Admin Endpunkte Übersicht](./admin-endpoints.md)
- [Antwortmuster](./response-patterns.md)
- [Anfragenvalidierung](./request-validation.md)

See the [English documentation](/api/admin-companies-endpoints) for the full content of this section.
