---
id: admin-categories-endpoints
title: "Admin Categories API Endpoints"
sidebar_label: "Admin Categories API Endpoints"
---

# Admin Categorieën API Eindpunten

De Admin Categorieën API biedt volledige CRUD-bewerkingen voor het beheren van inhoudscategorieën, inclusief herordening en Git-gebaseerde synchronisatie met een externe gegevensrepository. Alle eindpunten vereisen beheerdersauthenticatie via sessiegebaseerde verificatie.

## Routeoverzicht

| Methode | Pad | Auth | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Admin | Categorieën weergeven (gepagineerd) |
| `POST` | `/api/admin/categories` | Admin | Een nieuwe categorie aanmaken |
| `GET` | `/api/admin/categories/all` | Admin | Alle categorieën ophalen (uit inhoudscache) |
| `GET` | `/api/admin/categories/{id}` | Admin | Een enkele categorie ophalen op ID |
| `PUT` | `/api/admin/categories/{id}` | Admin | Een categorie bijwerken |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Een categorie zacht of hard verwijderen |
| `PUT` | `/api/admin/categories/reorder` | Admin | Categorieën herordenen via ID-array |
| `GET` | `/api/admin/categories/git` | Admin | Git-repostatus en categorieën ophalen |
| `POST` | `/api/admin/categories/git` | Admin | Categorie aanmaken via Git-commit |

## Authenticatie

Alle eindpunten voor categoriebeheer controleren op een actieve sessie met beheerdersrechten:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Eindpunten

### GET `/api/admin/categories`

Geeft een gepagineerde lijst van categorieën terug met optionele filtering en sortering.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Paginanummer (minimaal: 1) |
| `limit` | integer | `10` | Items per pagina (1–100) |
| `includeInactive` | string | `"false"` | Inclusief inactieve categorieën |
| `sortBy` | string | `"name"` | Sorteerveld: `"name"` of `"id"` |
| `sortOrder` | string | `"asc"` | Sorteerrichting: `"asc"` of `"desc"` |

**Antwoord (200):**

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

Maakt een nieuwe categorie aan. Het veld `id` is optioneel en wordt automatisch gegenereerd uit de naam als het niet is opgegeven. Maakt inhoudscaches ongeldig na succes.

**Verzoeklichaam:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Veld | Type | Vereist | Beschrijving |
|-------|------|----------|-------------|
| `id` | string | Nee | URL-vriendelijke slug (`^[a-z0-9-]+$`). Automatisch gegenereerd indien weggelaten. |
| `name` | string | Ja | Weergavenaam (2–100 tekens) |

**Antwoord (201):**

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

Geeft alle categorieën terug uit de inhoudscache voor een opgegeven locale. Nuttig voor beheerdersdropdowns en selectors.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `locale` | string | `"en"` | Localecode voor ophalen van inhoud |

**Antwoord (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Haalt een enkele categorie op via zijn unieke identifier.

**Antwoord (200):**

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

Werkt de naam van een bestaande categorie bij. Maakt inhoudscaches ongeldig na succes.

**Verzoeklichaam:**

```json
{ "name": "Productivity Tools" }
```

**Antwoord (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Verwijdert een categorie. Standaard wordt een zachte verwijdering (deactivering) uitgevoerd. Gebruik de queryparameter `hard=true` voor permanente verwijdering. Maakt inhoudscaches ongeldig na succes.

**Queryparameters:**

| Parameter | Type | Standaard | Beschrijving |
|-----------|------|---------|-------------|
| `hard` | string | `"false"` | Stel in op `"true"` voor permanente verwijdering |

**Antwoord (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Herordent categorieën op basis van een array van categorie-ID's. De positie van elk ID in de array bepaalt de nieuwe weergavevolgorde.

**Verzoeklichaam:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Validatieregels:**
- `categoryIds` moet een niet-lege array zijn
- Alle waarden moeten strings zijn

**Antwoord (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Haalt de Git-repositorystatus en categorieën op van de geconfigureerde GitHub-gegevensrepository. Vereist de omgevingsvariabelen `DATA_REPOSITORY` en `GITHUB_TOKEN`.

**Antwoord (200):**

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

Maakt een nieuwe categorie aan en commit deze direct naar de GitHub-gegevensrepository. Vereist de omgevingsvariabelen `DATA_REPOSITORY` en `GH_TOKEN`.

**Verzoeklichaam:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Zowel `id` als `name` zijn vereist voor Git-gebaseerde aanmaak.
