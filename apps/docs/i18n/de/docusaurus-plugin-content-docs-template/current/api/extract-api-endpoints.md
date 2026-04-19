---
id: extract-api-endpoints
title: "Extract API Endpoints"
sidebar_label: "Extract API Endpoints"
---

# Extrakt-API-Endpunkte

Die Extrakt-API stellt einen sicheren Proxy-Endpunkt bereit, um Eintrags-Metadaten (Name, Beschreibung, Kategorien usw.) von einer gegebenen URL zu extrahieren. Anfragen werden an die Ever Works Platform API weitergeleitet.

**Quelle:** `template/app/api/extract/route.ts`

---

## Metadaten von URL extrahieren

Extrahiert Eintrags-Metadaten von einer gegebenen URL, indem die Anfrage an die Platform API weitergeleitet wird.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `POST` |
| **Pfad** | `/api/extract` |
| **Authentifizierung** | Keine (öffentlich, erfordert aber konfigurierte `PLATFORM_API_URL`) |

### Anfragekörper

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `url` | `string` (URI) | Ja | Die URL, von der Metadaten extrahiert werden |
| `existingCategories` | `string[]` | Nein | Bestehende Kategorienamen für die KI-Kategorisierung |

### Antworten

**Status 200** – Extraktion erfolgreich.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

**Status 200** – Feature deaktiviert (Platform API nicht konfiguriert).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Wenn `PLATFORM_API_URL` nicht gesetzt ist, gibt der Endpunkt den Status `200` mit `featureDisabled: true` zurück. Dies ermöglicht dem Frontend, das Extraktions-Feature graceful auszublenden.
:::

**Status 400** – Ungültige Anfrage.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Status 500** – Server-Fehler bei der Extraktion.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validierung

Der Anfragekörper wird mit Zod validiert:
- `url` muss eine gültige URL-Zeichenkette sein.
- `existingCategories` ist ein optionales Array von Zeichenketten.

### Umgebungsvariablen

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `PLATFORM_API_URL` | Ja (für das Feature) | Basis-URL der Ever Works Platform API |
| `PLATFORM_API_SECRET_TOKEN` | Nein | Bearer-Token für authentifizierte Platform-API-Aufrufe |
