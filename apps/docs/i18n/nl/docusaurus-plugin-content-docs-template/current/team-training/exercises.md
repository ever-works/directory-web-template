---
id: exercises
title: Praktische Oefeningen
sidebar_label: Oefeningen
sidebar_position: 5
---

# Praktische Oefeningen

Oefen wat u hebt geleerd met praktische oefeningen en uitdagingen.

## 🎯 Leerdoelen

Door deze oefeningen te voltooien, zult u:

- ✅ Het maken van API-eindpunten oefenen
- ✅ Swagger-documentatiestandaarden toepassen
- ✅ Validatie en foutafhandeling implementeren
- ✅ Volledige functies van scratch bouwen
- ✅ Vertrouwen opdoen in de ontwikkelingsworkflow

**Geschatte tijd**: 3–5 dagen

---

## Oefening 1: Eenvoudige GET-route

**Moeilijkheidsgraad**: ⭐ Beginner  
**Duur**: 15–30 minuten  
**Doel**: Basisannotatiestructuur en workflow leren

### Taak

Maak een eenvoudig GET-eindpunt dat serverinformatie teruggeeft.

### Stappen

1. **Bestand aanmaken**: `app/api/training/server-info/route.ts`

2. **Route implementeren**:

```typescript
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/training/server-info:
 *   get:
 *     tags: ["System"]
 *     summary: "Get server information"
 *     description: "Returns basic server information including version, current timestamp, and uptime."
 *     responses:
 *       200:
 *         description: "Server information retrieved successfully"
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
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Succescriteria

- [ ] Eindpunt verschijnt in Scalar UI onder de tag "System"
- [ ] Alle responsvelden zijn gedocumenteerd met voorbeelden
- [ ] Eindpunt werkt bij testen in Scalar UI
- [ ] Geen generatiefouten

---

## Oefening 2: POST-route met validatie

**Moeilijkheidsgraad**: ⭐⭐ Gemiddeld  
**Duur**: 30–45 minuten  
**Doel**: Verzoekbody-documentatie en foutafhandeling leren

### Taak

Maak een POST-eindpunt voor gebruikersfeedback met validatie.

### Stappen

1. **Bestand aanmaken**: `app/api/training/feedback/route.ts`

2. **Met validatie implementeren**:

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

3. **Testen met geldige en ongeldige gegevens**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "category": "feature",
    "message": "Great platform!",
    "rating": 5
  }'
```

---

## Oefening 3: Volledige Functie-implementatie

**Moeilijkheidsgraad**: ⭐⭐⭐ Gevorderd  
**Duur**: 1–2 dagen  
**Doel**: Volledige functie met CRUD-operaties en documentatie maken

### Taak

Implementeer een eenvoudige notitiebeheers-API met volledige CRUD-functionaliteit.

### Vereisten

- `GET /api/training/notes` – Alle notities weergeven
- `POST /api/training/notes` – Nieuwe notitie aanmaken
- `GET /api/training/notes/[id]` – Enkele notitie ophalen
- `PUT /api/training/notes/[id]` – Notitie bijwerken
- `DELETE /api/training/notes/[id]` – Notitie verwijderen
