---
id: exercises
title: Praktische Übungen
sidebar_label: Übungen
sidebar_position: 5
---

# Praktische Übungen

Üben Sie das Gelernte anhand praxisnaher Übungen und Herausforderungen.

## 🎯 Lernziele

Nach Abschluss dieser Übungen werden Sie:

- ✅ Das Erstellen von API-Endpunkten üben
- ✅ Swagger-Dokumentationsstandards anwenden
- ✅ Validierung und Fehlerbehandlung implementieren
- ✅ Vollständige Funktionen von Grund auf entwickeln
- ✅ Vertrauen in den Entwicklungsworkflow gewinnen

**Geschätzte Zeit**: 3–5 Tage

---

## Übung 1: Einfache GET-Route

**Schwierigkeitsgrad**: ⭐ Anfänger  
**Dauer**: 15–30 Minuten  
**Ziel**: Grundlegende Annotationsstruktur und Workflow erlernen

### Aufgabe

Erstellen Sie einen einfachen GET-Endpunkt, der Server-Informationen zurückgibt.

### Schritte

1. **Datei erstellen**: `app/api/training/server-info/route.ts`

2. **Route implementieren**:

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime. Public endpoint that requires no authentication."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     server:
 *                       type: string
 *                       example: "Ever Works API"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     uptime:
 *                       type: number
 *                       description: "Server uptime in seconds"
 *                       example: 3600.5
 *               required: ["success", "data"]
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      server: "Ever Works API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
}
```

3. **Workflow testen**:

```bash
# Dokumentation generieren
yarn generate-docs

# Dokumentation prüfen
open http://localhost:3000/api/reference

# Endpunkt testen
curl http://localhost:3000/api/training/server-info
```

### Erfolgskriterien

- [ ] Endpunkt erscheint in der Scalar UI unter dem "System"-Tag
- [ ] Alle Antwortfelder sind mit Beispielen dokumentiert
- [ ] Endpunkt funktioniert beim Testen in der Scalar UI
- [ ] Keine Generierungsfehler
- [ ] Antwort stimmt mit der Dokumentation überein

---

## Übung 2: POST-Route mit Validierung

**Schwierigkeitsgrad**: ⭐⭐ Mittelstufe  
**Dauer**: 30–45 Minuten  
**Ziel**: Request-Body-Dokumentation und Fehlerbehandlung erlernen

### Aufgabe

Erstellen Sie einen POST-Endpunkt für Benutzer-Feedback mit Validierung.

### Schritte

1. **Datei erstellen**: `app/api/training/feedback/route.ts`

2. **Mit Validierung implementieren**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(10).max(1000),
  rating: z.number().min(1).max(5).optional()
});
```

3. **Mit gültigen und ungültigen Daten testen**:

```bash
# Gültige Anfrage
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "category": "feature",
    "message": "Great platform!",
    "rating": 5
  }'

# Ungültige Anfrage (fehlendes Pflichtfeld)
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "email": "invalid-email"
  }'
```

### Erfolgskriterien

- [ ] Endpunkt erscheint in der Scalar UI
- [ ] Request-Body-Schema vollständig dokumentiert
- [ ] Alle Antwortcodes (201, 400) dokumentiert
- [ ] Validierung funktioniert korrekt
- [ ] Fehlerantworten enthalten hilfreiche Details

---

## Übung 3: Vollständige Funktionsimplementierung

**Schwierigkeitsgrad**: ⭐⭐⭐ Fortgeschritten  
**Dauer**: 1–2 Tage  
**Ziel**: Vollständige Funktion mit CRUD-Operationen und Dokumentation erstellen

### Aufgabe

Implementieren Sie eine einfache Notiz-Verwaltungs-API mit vollständiger CRUD-Funktionalität.

### Anforderungen

- `GET /api/training/notes` – Alle Notizen auflisten
- `POST /api/training/notes` – Neue Notiz erstellen
- `GET /api/training/notes/[id]` – Einzelne Notiz abrufen
- `PUT /api/training/notes/[id]` – Notiz aktualisieren
- `DELETE /api/training/notes/[id]` – Notiz löschen

Alle Endpunkte müssen:
- Vollständige Swagger-Annotationen haben
- Eingabe mit Zod validieren
- Geeignete Fehlercodes zurückgeben
- Das standardisierte Tag-System verwenden

---

## Code-Review-Übung

**Schwierigkeitsgrad**: ⭐⭐ Mittelstufe  
**Dauer**: 1–2 Stunden  
**Ziel**: Code-Review-Fähigkeiten entwickeln

### Aufgabe

Überprüfen Sie den folgenden Code auf Probleme:

1. TypeScript-Typ-Sicherheit
2. Sicherheitslücken
3. Performance-Probleme
4. Fehlende Validierung
5. Dokumentationslücken

Geben Sie konstruktives Feedback und schlagen Sie Verbesserungen vor.
