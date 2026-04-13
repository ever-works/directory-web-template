---
id: extraction-endpoints
title: "Extraction & Verification Endpoints"
sidebar_label: "Extraction & Verification Endpoints"
---

# Extraktions- & Verifizierungs-Endpunkte

Diese Endpunkte bieten URL-Metadaten-Extraktion (via Ever Works Platform API) und Google-reCAPTCHA-Token-Verifizierung. Beide agieren als sichere serverseitige Proxys, um API-Schlüssel und Geheimnisse aus dem clientseitigen Code herauszuhalten.

**Quelldateien:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Endpunktübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|-------------------|--------------|
| POST | `/api/extract` | Keine | Eintrags-Metadaten von einer URL extrahieren |
| POST | `/api/verify-recaptcha` | Keine | reCAPTCHA-Token verifizieren |

---

## POST `/api/extract`

Ein sicherer Proxy, der Eintrags-Metadaten (Name, Beschreibung, Kategorievorschläge) von einer gegebenen URL mithilfe der Ever Works Platform API extrahiert.

### Feature-Verfügbarkeit

Dieser Endpunkt erfordert eine konfigurierte `PLATFORM_API_URL`. Wenn nicht konfiguriert, gibt er eine graceful Antwort zurück:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Anfragekörper

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `url` | string (URL) | **Ja** | Die URL, von der Metadaten extrahiert werden |
| `existingCategories` | string[] | Nein | Bestehende Kategorienamen für die Kategorisierung |

### Beispielanfrage

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Antwort: 200 (Erfolgreich)

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Fehlerantworten

| Status | Beschreibung |
|--------|--------------|
| 400 | Ungültiges URL-Format (Zod-Validierung) |
| Variiert | Upstream-API-Fehler (Statuscode von der Platform API weitergeliefert) |
| 500 | Interner Server-Fehler bei der Extraktion |

---

## POST `/api/verify-recaptcha`

Verifiziert ein Google-reCAPTCHA-Token durch Kommunikation mit Googles `siteverify`-API. Unterstützt sowohl reCAPTCHA v2- als auch v3-Tokens.

### Anfragekörper

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|-------------|
| `token` | string | **Ja** | reCAPTCHA-Token aus der clientseitigen Verifizierung |

### Beispielanfrage

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Antwort: 200 (Verifiziert)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Antwort: 200 (Verifizierung fehlgeschlagen)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Entwicklungsmodus-Bypass

Wenn `RECAPTCHA_SECRET_KEY` nicht konfiguriert ist und `NODE_ENV` den Wert `"development"` hat, umgeht der Endpunkt die Verifizierung und gibt Erfolg zurück.
