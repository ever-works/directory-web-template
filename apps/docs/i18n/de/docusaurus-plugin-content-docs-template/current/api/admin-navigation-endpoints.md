---
id: admin-navigation-endpoints
title: "Admin Navigation & Location Index Endpoints"
sidebar_label: "Admin Navigation & Location Index Endpoints"
---

# Admin Navigation & Standortindex Endpunkte

Diese Admin-Endpunkte verwalten benutzerdefinierte Website-Navigationslinks und den geografischen Standortindex. Navigationsendpunkte ermöglichen die Konfiguration von benutzerdefinierten Header- und Footer-Links, die in `config.yml` gespeichert sind. Standortindex-Endpunkte verwalten den räumlichen Index, der für geografische Analysen und Kartenfunktionen verwendet wird.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/admin/navigation` | GET | Admin | Benutzerdefinierte Navigationskonfiguration abrufen |
| `/api/admin/navigation` | PATCH | Admin | Benutzerdefinierte Navigationselemente aktualisieren |
| `/api/admin/location-index` | GET | Admin | Standortindex-Statistiken abrufen |
| `/api/admin/location-index` | POST | Admin | Standortindex neu aufbauen oder leeren |

## Navigations-Endpunkte

### Navigationskonfiguration abrufen

```
GET /api/admin/navigation
```

Ruft die `custom_header`- und `custom_footer`-Navigationselemente aus der `config.yml`-Datei der Website ab. Gibt leere Arrays zurück, wenn keine benutzerdefinierte Navigation konfiguriert ist.

**Authentifizierung:** Admin erforderlich (via `getCachedApiSession`)

**Erfolgsantwort (200):**

```json
{
  "custom_header": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Documentation",
      "path": "/pages/docs"
    }
  ],
  "custom_footer": [
    {
      "label": "GitHub",
      "path": "https://github.com/example"
    },
    {
      "label": "footer.PRIVACY_POLICY",
      "path": "/pages/privacy-policy"
    }
  ]
}
```

Jedes Navigationselement hat zwei Felder:

| Feld | Typ | Beschreibung |
|---|---|---|
| `label` | string | Anzeigetext (einfacher Text oder i18n-Übersetzungsschlüssel wie `"footer.PRIVACY_POLICY"`) |
| `path` | string | URL-Pfad (interne Route beginnend mit `/` oder externe URL mit `http://`/`https://`) |

| Status | Bedingung |
|---|---|
| 401 | Nicht als Admin authentifiziert |
| 500 | Konfiguration konnte nicht gelesen werden |

**Quelle:** `template/app/api/admin/navigation/route.ts`

### Navigationskonfiguration aktualisieren

```
PATCH /api/admin/navigation
```

Aktualisiert die benutzerdefinierten Header- oder Footer-Navigationselemente in `config.yml`. Validiert das Pfadformat jedes Elements, um XSS-Angriffe über gefährliche URL-Schemata zu verhindern.

**Authentifizierung:** Admin erforderlich

**Anfragekörper:**

```json
{
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    },
    {
      "label": "Blog",
      "path": "https://blog.example.com"
    }
  ]
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `type` | string | Ja | `"header"` oder `"footer"` |
| `items` | array | Ja | Array von Navigationselementen |
| `items[].label` | string | Ja | Nicht leeres Anzeigelabel |
| `items[].path` | string | Ja | Gültiger URL-Pfad |

**Pfadvalidierung:**

Die Funktion `isValidNavigationPath()` erzwingt strenge Pfadformatregeln:

| Pfadformat | Erlaubt | Beispiel |
|---|---|---|
| Interne Routen | Ja | `/about`, `/pages/docs` |
| HTTPS-URLs | Ja | `https://example.com` |
| HTTP-URLs | Ja | `http://example.com` |
| Protokoll-relative URLs | Nein | `//evil.com` |
| JavaScript-URLs | Nein | `javascript:alert(1)` |
| Data-URLs | Nein | `data:text/html,...` |
| Andere Schemata | Nein | `vbscript:`, `file:` |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "type": "header",
  "items": [
    {
      "label": "About",
      "path": "/about"
    }
  ]
}
```

**Fehlerantworten:**

| Status | Bedingung |
|---|---|
| 400 | `type` ist nicht `"header"` oder `"footer"` |
| 400 | `items` ist kein Array |
| 400 | Element fehlt `label`- oder `path`-Stringfelder |
| 400 | Ungültiges Pfadformat (XSS-Prävention) |
| 401 | Nicht als Admin authentifiziert |
| 500 | Konfiguration konnte nicht geschrieben werden |

Übergeben Sie ein leeres `items`-Array, um alle benutzerdefinierten Navigationen für den angegebenen Typ zu löschen.

**Quelle:** `template/app/api/admin/navigation/route.ts`

## Standortindex-Endpunkte

### Standortindex-Statistiken abrufen

```
GET /api/admin/location-index
```

Gibt Statistiken über den geografischen Standortindex zurück, einschließlich der Gesamtzahl indizierter Elemente, Stadt- und Länderzählungen und Rebuild-Metadaten.

**Authentifizierung:** Admin erforderlich (via `checkAdminAuth()`)

**Caching:** Deaktiviert – verwendet `force-dynamic`, `revalidate: 0` und `force-no-store`.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 450,
    "citiesCount": 85,
    "countriesCount": 25,
    "remoteCount": 30,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-15T08:00:00.000Z"
  }
}
```

| Status | Bedingung |
|---|---|
| 401 | Nicht als Admin authentifiziert |
| 500 | Interner Serverfehler |

**Quelle:** `template/app/api/admin/location-index/route.ts`

### Standortindex verwalten

```
POST /api/admin/location-index
```

Führt Verwaltungsaktionen am Standortindex durch. Unterstützt den Neuaufbau des Index von Grund auf oder das Leeren aller Einträge.

**Authentifizierung:** Admin erforderlich

**Anfragekörper:**

```json
{
  "action": "rebuild"
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `action` | string | Ja | `"rebuild"` oder `"clear"` |

**Aktionen:**

| Aktion | Beschreibung |
|---|---|
| `rebuild` | Ruft alle Elemente aus dem Repository ab und re-indiziert ihre Standortdaten. Gibt Rebuild-Statistiken zurück. |
| `clear` | Entfernt alle Einträge aus dem Standortindex. Gibt die Anzahl der gelöschten Einträge zurück. |

**Erfolgsantwort (200) – Rebuild:**

```json
{
  "success": true,
  "data": {
    "indexed": 420,
    "skipped": 80,
    "errors": 0
  }
}
```

**Erfolgsantwort (200) – Clear:**

```json
{
  "success": true,
  "data": {
    "cleared": 450
  }
}
```

**Fehlerantworten:**

| Status | Bedingung |
|---|---|
| 400 | Ungültige Aktion (nicht `"rebuild"` oder `"clear"`) |
| 401 | Nicht als Admin authentifiziert |
| 500 | Interner Serverfehler |

**Quelle:** `template/app/api/admin/location-index/route.ts`

## Wichtige Implementierungsdetails

- **XSS-Prävention:** Die Navigations-Pfadvalidierung lehnt alle URL-Schemata außer `/`, `http://` und `https://` ab. Dies blockiert `javascript:`, `data:`, `vbscript:` und protokoll-relative URLs (`//evil.com`), die für Cross-Site-Scripting verwendet werden könnten.
- **Config-Speicherung:** Navigationselemente werden in `config.yml` unter den Schlüsseln `custom_header` und `custom_footer` gespeichert, persistiert über `configManager.updateNestedKey()`.
- **i18n-Labels:** Navigationslabels können entweder einfacher Text oder Übersetzungsschlüssel sein (z.B. `"footer.PRIVACY_POLICY"`). Das Frontend ist für die Auflösung der Übersetzungsschlüssel verantwortlich.
- **Standortindex-Rebuild:** Die Rebuild-Operation lädt alle Elemente aus dem `ItemRepository` und übergibt sie an den Standortindexdienst. Dies kann eine ressourcenintensive Operation für große Datensätze sein.
- **Cache-Busting:** Standortindex-Endpunkte deaktivieren explizit das gesamte Caching, um sicherzustellen, dass das Admin-Dashboard immer aktuelle Daten anzeigt.

See the [English documentation](/api/admin-navigation-endpoints) for the full content of this section.
