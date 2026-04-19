---
id: admin-settings-endpoints
title: "Admin Settings Endpoints"
sidebar_label: "Admin Settings Endpoints"
---

# Admin Einstellungs-Endpunkte

Die Einstellungs-API ermöglicht Administratoren das Lesen und Aktualisieren der systemweiten Anwendungskonfiguration sowie die Überprüfung des Kartendienstestatus.

## Basispfad

```
/api/admin/settings
```

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| -------- | ------------------------------------ | -------- | ------------------------------------- |
| `GET` | `/api/admin/settings` | Admin | Alle aktuellen Einstellungen abrufen |
| `PATCH` | `/api/admin/settings` | Admin | Einzelne Einstellung aktualisieren |
| `GET` | `/api/admin/settings/map-status` | Admin | Kartendienstekonfiguration prüfen |

---

## Einstellungen abrufen

```
GET /api/admin/settings
```

Gibt das gesamte Einstellungsobjekt aus `config.yml` zurück. Sensible Schlüssel werden maskiert oder ausgeschlossen.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "general": {
      "siteName": "My Directory",
      "siteDescription": "A template for directory websites",
      "logo": "/images/logo.png",
      "favicon": "/favicon.ico"
    },
    "features": {
      "enableRegistration": true,
      "enableComments": true,
      "enableRatings": true,
      "enableFavorites": true
    },
    "email": {
      "fromAddress": "no-reply@example.com",
      "fromName": "Directory App"
    },
    "social": {
      "twitter": "",
      "facebook": "",
      "linkedin": ""
    }
  }
}
```

---

## Einstellung aktualisieren

```
PATCH /api/admin/settings
```

Aktualisiert einen einzelnen verschachtelten Konfigurationsschlüssel unter Verwendung von Punkt-Notation. Intern wird `configManager.updateNestedKey(key, value)` aufgerufen, das die Änderung in `config.yml` schreibt und den In-Memory-Konfigurationscache neu lädt.

**Anfragekörper:**

| Feld | Typ | Erforderlich | Beschreibung |
| ------- | ------ | -------- | ------------------------------------------------- |
| `key` | string | Ja | Punkt-notierter Konfigurationspfad (z.B. `general.siteName`) |
| `value` | any | Ja | Neuer Wert (Typ abhängig vom Schlüssel) |

**Beispiel:**

```json
{
  "key": "features.enableComments",
  "value": false
}
```

**Antwort (200):**

```json
{
  "success": true,
  "message": "Setting updated successfully",
  "data": {
    "key": "features.enableComments",
    "value": false
  }
}
```

:::caution Neustart kann erforderlich sein
Einige Konfigurationsänderungen (z.B. E-Mail-Anbieter, Authentifizierungsanbieter) erfordern möglicherweise einen Serverneustart, damit sie vollständig wirksam werden.
:::

---

## Kartendienstestatus prüfen

```
GET /api/admin/settings/map-status
```

Überprüft, ob Kartendiensteschlüssel konfiguriert sind, indem die Umgebungsvariablen `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` und `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` geprüft werden. Gibt den aktiven Anbieter und die Verfügbarkeit an.

**Antwort (200):**

```json
{
  "success": true,
  "data": {
    "mapbox": {
      "configured": true,
      "active": true
    },
    "google": {
      "configured": false,
      "active": false
    },
    "activeProvider": "mapbox"
  }
}
```

| Feld | Beschreibung |
| ---------------- | ---------------------------------------------- |
| `configured` | `true` wenn Umgebungsvariable vorhanden und nicht leer ist |
| `active` | `true` wenn dieser Anbieter derzeit verwendet wird |
| `activeProvider` | Name des aktiven Anbieters oder `null` |

---

## Fehlercodes

| Status | Bedeutung |
| ------ | -------------------------------------------------- |
| `400` | Ungültiger Schlüssel oder Wert |
| `401` | Authentifizierung erforderlich |
| `403` | Admin-Rechte erforderlich |
| `404` | Einstellungsschlüssel nicht gefunden |
| `500` | Fehler beim Schreiben in `config.yml` |

## Verwandte Dokumentation

- [Konfigurationsreferenz](../configuration/config-yml-reference.md) – Vollständige Liste aller Einstellungsschlüssel und ihrer Typen
- [Umgebungsvariablen](../configuration/environment-variables.md) – Kartendiensteschlüssel und andere Env-Variablen
- [Konfigurationsmanager](../architecture/configuration-manager.md) – Internes `configManager`-Modul

See the [English documentation](/api/admin-settings-endpoints) for the full content of this section.
