---
id: config-feature-endpoints
title: "Config & Feature Flags API Reference"
sidebar_label: "Config & Feature Flags API Reference"
---

# Konfigurations- & Feature-Flags API-Referenz

## Übersicht

Der Config-Features-Endpunkt gibt die aktuellen Feature-Verfügbarkeits-Flags der Anwendung zurück. Diese Flags zeigen an, welche datenbankabhängigen Features aktiv sind, sodass das Frontend beim Fehlen von Features graceful degradieren kann. Dies ist ein öffentlicher, gecachter Endpunkt, der für häufigen Abruf ausgelegt ist.

## Endpunkte

### GET /api/config/features

Gibt die aktuelle Feature-Verfügbarkeit basierend auf der Systemkonfiguration und der Datenbankverfügbarkeit zurück.

**Anfrage**

Keine Parameter oder Anfragekörper erforderlich.

**Antwort**
```typescript
{
  ratings: boolean;         // Ob das Bewertungs-Feature verfügbar ist
  comments: boolean;        // Ob das Kommentar-Feature verfügbar ist
  favorites: boolean;       // Ob das Favoriten-Feature verfügbar ist
  featuredItems: boolean;   // Ob das Featured-Items-Feature verfügbar ist
  surveys: boolean;         // Ob das Umfragen-Feature verfügbar ist
}
```

**Beispiel**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Bewertungskomponente rendern
}

if (!features.surveys) {
  // Umfragebereich ausblenden
}
```

## Authentifizierung

Dieser Endpunkt ist **öffentlich** – keine Authentifizierung erforderlich. Er ist dafür ausgelegt, vom Frontend beim ersten Seitenaufruf abgerufen zu werden, um zu bestimmen, welche UI-Features gerendert werden sollen.

## Fehlerantworten

| Status | Beschreibung |
|--------|-------------|
| 200 | Feature-Flags erfolgreich abgerufen |
| 500 | Interner Fehler – gibt alle Flags als `false` zurück mit `no-cache`-Header |

Bei einem Fehler gibt der Endpunkt alle Features als `false` zurück, damit die Anwendung sicher fehlschlägt, anstatt defekte Funktionalität anzuzeigen.

## Ratenbegrenzung

Antworten werden mit folgenden Headern gecacht:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Effektiv 5 Minuten auf CDN-Ebene gecacht mit einem 10-Minuten-Stale-While-Revalidate-Fenster.

Fehlerantworten verwenden `Cache-Control: no-cache`, um das Cachen des degradierten Zustands zu verhindern.

## Verwandte Endpunkte

- [Health-Endpunkte](./health-endpoints) – Datenbankverbindungs-Gesundheitsprüfung
