---
id: admin-categories-endpoints
title: "Admin Categories API Endpoints"
sidebar_label: "Admin Categories API Endpoints"
---

# Admin Kategorien API Endpunkte

Die Admin Kategorien API bietet vollständige CRUD-Operationen für die Verwaltung von Inhaltskategorien, einschließlich Neuordnung und Git-basierter Synchronisierung mit einem Remote-Daten-Repository. Alle Endpunkte erfordern Admin-Authentifizierung per sitzungsbasierter Authentifizierung.

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Admin | Kategorien auflisten (paginiert) |
| `POST` | `/api/admin/categories` | Admin | Neue Kategorie erstellen |
| `GET` | `/api/admin/categories/all` | Admin | Alle Kategorien abrufen (aus Content-Cache) |
| `GET` | `/api/admin/categories/{id}` | Admin | Einzelne Kategorie nach ID abrufen |
| `PUT` | `/api/admin/categories/{id}` | Admin | Kategorie aktualisieren |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Weiche oder harte Löschung einer Kategorie |
| `PUT` | `/api/admin/categories/reorder` | Admin | Kategorien nach ID-Array neu ordnen |
| `GET` | `/api/admin/categories/git` | Admin | Git-Repository-Status und Kategorien abrufen |
| `POST` | `/api/admin/categories/git` | Admin | Kategorie per Git-Commit erstellen |

## Authentifizierung

Alle Kategorieverwaltungs-Endpunkte prüfen, ob eine aktive Sitzung mit Admin-Rechten besteht:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Endpunkte

### GET `/api/admin/categories`

Gibt eine paginierte Liste von Kategorien mit optionaler Filterung und Sortierung zurück.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Seitennummer (Minimum: 1) |
| `limit` | integer | `10` | Elemente pro Seite (1–100) |
| `includeInactive` | string | `"false"` | Inaktive Kategorien einschließen |
| `sortBy` | string | `"name"` | Sortierfeld: `"name"` oder `"id"` |
| `sortOrder` | string | `"asc"` | Sortierrichtung: `"asc"` oder `"desc"` |

**Antwort (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Erstellt eine neue Kategorie. Das Feld `id` ist optional und wird automatisch aus dem Namen generiert, wenn es nicht angegeben wird. Invalidiert Content-Caches bei Erfolg.

**Anfragekörper:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|-------|------|----------|-------------|
| `id` | string | Nein | URL-freundlicher Slug (`^[a-z0-9-]+$`). Wird automatisch generiert wenn weggelassen. |
| `name` | string | Ja | Anzeigename (2–100 Zeichen) |

**Antwort (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Gibt alle Kategorien aus dem Content-Cache für eine bestimmte Locale zurück. Nützlich für Admin-Dropdowns und Auswahlfelder.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|------|---------|-------------|
| `locale` | string | `"en"` | Locale-Code für den Content-Abruf |

**Antwort (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Ruft eine einzelne Kategorie anhand ihrer eindeutigen Kennung ab.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Aktualisiert den Namen einer bestehenden Kategorie. Invalidiert Content-Caches bei Erfolg.

**Anfragekörper:**

```json
{ "name": "Productivity Tools" }
```

**Antwort (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Löscht eine Kategorie. Standardmäßig wird eine weiche Löschung (Deaktivierung) durchgeführt. Verwenden Sie den Abfrageparameter `hard=true` für die permanente Löschung. Invalidiert Content-Caches bei Erfolg.

**Abfrageparameter:**

| Parameter | Typ | Standard | Beschreibung |
|-----------|------|---------|-------------|
| `hard` | string | `"false"` | Auf `"true"` setzen für permanente Löschung |

**Antwort (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Ordnet Kategorien anhand eines Arrays von Kategorie-IDs neu. Die Position jeder ID im Array bestimmt ihre neue Anzeigereihenfolge.

**Anfragekörper:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Validierungsregeln:**
- `categoryIds` muss ein nicht leeres Array sein
- Alle Werte müssen Strings sein

**Antwort (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Ruft den Git-Repository-Status und Kategorien aus dem konfigurierten GitHub-Daten-Repository ab. Erfordert die Umgebungsvariablen `DATA_REPOSITORY` und `GITHUB_TOKEN`.

**Antwort (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Erstellt eine neue Kategorie und committed sie direkt in das GitHub-Daten-Repository. Erfordert die Umgebungsvariablen `DATA_REPOSITORY` und `GH_TOKEN`.

**Anfragekörper:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Sowohl `id` als auch `name` sind für die Git-basierte Erstellung erforderlich.

**Antwort (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Fehlercodes

| Status | Fehler | Ursache |
|--------|-------|-------|
| `400` | Ungültige Paginierungsparameter | Seite < 1 oder Limit außerhalb 1–100 |
| `400` | Kategoriename ist erforderlich | Fehlender `name` in der Erstellungsanfrage |
| `400` | categoryIds muss ein Array sein | Ungültige Neuordnungs-Payload |
| `401` | Nicht autorisiert. Admin-Zugriff erforderlich. | Fehlende oder nicht-admin Sitzung |
| `404` | Kategorie nicht gefunden | Ungültige Kategorie-ID |
| `409` | Kategorie mit diesem Namen existiert bereits | Doppelter Name beim Erstellen/Aktualisieren |
| `500` | DATA_REPOSITORY nicht konfiguriert | Fehlende Umgebungsvariable für Git-Endpunkte |
| `500` | GitHub-Token nicht konfiguriert | Fehlende `GITHUB_TOKEN` oder `GH_TOKEN` |

## Cache-Invalidierung

Alle Schreiboperationen (erstellen, aktualisieren, löschen, neuordnen) rufen `invalidateContentCaches()` auf, um sicherzustellen, dass Änderungen in der gesamten Anwendung sofort sichtbar sind.

## Verwandte Dokumentation

- [Admin Endpunkte Übersicht](./admin-endpoints.md)
- [Öffentliche Kategorien-Endpunkte](./category-endpoints.md)
- [Antwortmuster](./response-patterns.md)
- [Anfragenvalidierung](./request-validation.md)

See the [English documentation](/api/admin-categories-endpoints) for the full content of this section.
