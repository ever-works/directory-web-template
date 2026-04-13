---
id: favorites-api-endpoints
title: "Favorites API Endpoints"
sidebar_label: "Favorites API Endpoints"
---

# Favoriten-API-Endpunkte

Die Favoriten-API ermöglicht authentifizierten Benutzern, ihre Lieblingseinträge zu verwalten. Benutzer können Einträge auflisten, hinzufügen und aus ihrer persönlichen Favoritenliste entfernen. Favoriteneinträge speichern Eintrags-Metadaten (Name, Symbol, Kategorie) für eine schnelle Anzeige ohne Join mit der Einträge-Tabelle.

**Quellverzeichnis:** `template/app/api/favorites/`

---

## Authentifizierung

Alle Favoriten-Endpunkte erfordern sitzungsbasierte Authentifizierung. Nicht authentifizierte Anfragen erhalten:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Benutzerfavoriten auflisten

Gibt alle vom authentifizierten Benutzer als Favorit markierten Einträge zurück.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/favorites` |
| **Authentifizierung** | Sitzung (Benutzer) |
| **Quelle** | `favorites/route.ts` |

### Antwort

**Status 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `favorites[].id` | `string` | Favoriten-Datensatz-ID |
| `favorites[].userId` | `string` | Benutzer, der den Eintrag als Favorit markiert hat |
| `favorites[].itemSlug` | `string` | Eintrags-Slug-Identifier |
| `favorites[].itemName` | `string` | Eintrags-Anzeigename |
| `favorites[].itemIconUrl` | `string \| null` | Eintrags-Icon-URL |
| `favorites[].itemCategory` | `string \| null` | Eintrags-Kategorie |
| `favorites[].createdAt` | `string` (ISO 8601) | Zeitpunkt, an dem der Eintrag als Favorit markiert wurde |
| `favorites[].updatedAt` | `string \| null` | Letzter Aktualisierungszeitstempel |

Favoriten sind nach `createdAt` sortiert (älteste zuerst).

---

## Favorit hinzufügen

Fügt einen Eintrag zur Favoritenliste des authentifizierten Benutzers hinzu.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `POST` |
| **Pfad** | `/api/favorites` |
| **Authentifizierung** | Sitzung (Benutzer) |
| **Quelle** | `favorites/route.ts` |

### Anfragekörper

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `itemSlug` | `string` | Ja | Eindeutiger Eintrags-Slug-Identifier (min. 1 Zeichen) |
| `itemName` | `string` | Ja | Eintrags-Anzeigename (min. 1 Zeichen) |
| `itemIconUrl` | `string` | Nein | Eintrags-Icon-URL |
| `itemCategory` | `string` | Nein | Eintrags-Kategorie |

### Antworten

**Status 201** – Favorit erfolgreich hinzugefügt.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Status 409** – Eintrag bereits in Favoriten.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

---

## Favorit entfernen

Entfernt einen bestimmten Eintrag aus der Favoritenliste des authentifizierten Benutzers.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `DELETE` |
| **Pfad** | `/api/favorites/{itemSlug}` |
| **Authentifizierung** | Sitzung (Benutzer) |
| **Quelle** | `favorites/[itemSlug]/route.ts` |

### Pfadparameter

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `itemSlug` | `string` | Eintrags-Slug-Identifier zum Entfernen aus Favoriten |

### Antworten

**Status 200** – Favorit erfolgreich entfernt.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status 404** – Favorit nicht gefunden.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```
