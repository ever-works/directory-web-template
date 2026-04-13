---
id: recaptcha-endpoints
title: "ReCAPTCHA API Reference"
sidebar_label: "ReCAPTCHA API Reference"
---

# ReCAPTCHA-API-Referenz

## Übersicht

Der ReCAPTCHA-Endpunkt bietet serverseitige Verifizierung von Google ReCAPTCHA v3-Tokens. Er fungiert als sicherer Proxy zwischen Client und der Verifizierungs-API von Google, sodass der geheime Schlüssel serverseitig verbleibt. Im Entwicklungsmodus kann die Verifizierung umgangen werden, wenn der geheime Schlüssel nicht konfiguriert ist.

## Endpunkte

### POST /api/verify-recaptcha

Verifiziert ein Google ReCAPTCHA v3-Token durch Kommunikation mit der `siteverify`-API von Google. Gibt das Verifizierungsergebnis einschließlich des Bot/Mensch-Scores zurück.

**Anfrage**
```typescript
{
  token: string;   // ReCAPTCHA-Token von clientseitigem grecaptcha.execute()
}
```

**Antwort**
```typescript
{
  success: boolean;           // Ob die Verifizierung bestanden wurde
  score?: number;             // 0.0 (Bot) bis 1.0 (Mensch)
  action?: string;            // Aktionsname der ReCAPTCHA-Herausforderung
  hostname?: string;          // Hostname der Verifizierung
  challenge_ts?: string;      // ISO 8601-Zeitstempel der Herausforderung
  error_codes?: string[];     // Fehlercodes der Google-API (falls vorhanden)
}
```

**Beispiel**
```typescript
// Clientseitig: Token abrufen
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Serverseitige Verifizierung
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Formularübermittlung fortsetzen
} else {
  // Vermutete Bot-Aktivität blockieren
}
```

### Verhalten im Entwicklungsmodus

Wenn `RECAPTCHA_SECRET_KEY` nicht konfiguriert ist und `NODE_ENV` den Wert `"development"` hat, umgeht der Endpunkt die Google-Verifizierung und gibt zurück:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

Eine Warnmeldung wird in der Konsole ausgegeben, die darauf hinweist, dass die Verifizierung umgangen wird.

## Authentifizierung

Dieser Endpunkt ist **öffentlich** – keine Authentifizierung erforderlich. Er ist für den Aufruf aus clientseitigen Formularübermittlungsabläufen vor oder während der Formularverarbeitung konzipiert.

## Fehlerantworten

| Status | Beschreibung |
|--------|-----------|
| 400 | Fehlender oder leerer `token` im Anfragekörper |
| 500 | `RECAPTCHA_SECRET_KEY` nicht konfiguriert (nur Produktion), Google-API-Anfrage fehlgeschlagen oder unerwarteter Laufzeitfehler |

## Rate-Limiting

Kein anwendungsseitiges Rate-Limiting angewendet. Die ReCAPTCHA-API von Google hat eigene Rate-Limits. Der Endpunkt verwendet das Format `application/x-www-form-urlencoded` bei der Kommunikation mit der Google-API.

## Verwandte Endpunkte

Dies ist ein eigenständiger Sicherheits-Endpunkt. Er wird typischerweise vor Formularübermittlungen oder sensiblen Aktionen in der gesamten Anwendung aufgerufen.
