---
id: favorites-endpoints
title: "Favorites API Endpoints"
sidebar_label: "Favorites API Endpoints"
---

# Favoriten-API-Endpunkte

Die Favoriten-API ermöglicht authentifizierten Benutzern, ihre persönliche Liste von Lieblingseinträgen zu verwalten. Jeder Favorit speichert Eintrags-Metadaten (Name, Symbol, Kategorie) für eine schnelle Anzeige ohne Join mit der Inhaltsschicht.

**Quelldateien:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Endpunktübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| GET | `/api/favorites` | Sitzung | Alle Favoriten des aktuellen Benutzers auflisten |
| POST | `/api/favorites` | Sitzung | Einen Eintrag zu Favoriten hinzufügen |
| DELETE | `/api/favorites/{itemSlug}` | Sitzung | Einen Eintrag aus Favoriten entfernen |

Alle Endpunkte erfordern eine authentifizierte Benutzersitzung und eine funktionierende Datenbankverbindung.

---

## GET `/api/favorites`

Gibt alle vom authentifizierten Benutzer als Favorit markierten Einträge zurück, sortiert nach Erstellungsdatum (älteste zuerst).

### Antwortstruktur

#### 200 – Erfolgreich

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

#### 401 – Nicht autorisiert

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## POST `/api/favorites`

Fügt einen Eintrag zu den Favoriten des authentifizierten Benutzers hinzu. Beinhaltet Duplikatprüfung.

### Anfragekörper

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `itemSlug` | string | **Ja** | Eindeutiger Eintrags-Slug-Identifier |
| `itemName` | string | **Ja** | Eintrags-Anzeigename |
| `itemIconUrl` | string | Nein | URL zum Eintrags-Icon |
| `itemCategory` | string | Nein | Kategoriename für den Eintrag |

### Antwortstruktur

#### 201 – Erstellt

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

#### 409 – Konflikt (Duplikat)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Entfernt einen bestimmten Eintrag aus der Favoritenliste des authentifizierten Benutzers.

### Pfadparameter

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|-------------|
| `itemSlug` | string | **Ja** | Der Slug des zu entfernenden Eintrags |

### Antwortstruktur

#### 200 – Erfolgreich entfernt

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 404 – Nicht gefunden

```json
{
  "success": false,
  "error": "Favorite not found"
}
```
