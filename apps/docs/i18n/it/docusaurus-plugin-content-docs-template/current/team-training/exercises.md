---
id: exercises
title: Esercitazioni Pratiche
sidebar_label: Esercitazioni
sidebar_position: 5
---

# Esercitazioni Pratiche

Metti in pratica quello che hai imparato con esercizi e sfide del mondo reale.

## 🎯 Obiettivi

- ✅ Esercitarsi nella creazione di endpoint API
- ✅ Applicare gli standard di documentazione Swagger
- ✅ Implementare validazione e gestione degli errori
- ✅ Costruire funzionalità complete da zero
- ✅ Acquisire fiducia nel flusso di sviluppo

**Tempo stimato**: 3–5 giorni

---

## Esercizio 1: Route GET Semplice

**Difficoltà**: ⭐ Principiante  
**Durata**: 15–30 minuti  
**Obiettivo**: Imparare la struttura base delle annotazioni e il flusso di lavoro

### Compito

Crea un semplice endpoint GET che restituisce informazioni sul server.

### Passi

1. **Crea il file**: `app/api/training/server-info/route.ts`

2. **Implementa la route**:

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

3. **Testa il flusso**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Criteri di Successo

- [ ] L'endpoint appare nella Scalar UI sotto il tag "System"
- [ ] Tutti i campi della risposta sono documentati con esempi
- [ ] L'endpoint funziona quando testato nella Scalar UI
- [ ] Nessun errore di generazione

---

## Esercizio 2: Route POST con Validazione

**Difficoltà**: ⭐⭐ Intermedio  
**Durata**: 30–45 minuti  
**Obiettivo**: Imparare la documentazione del corpo della richiesta e la gestione degli errori

### Compito

Crea un endpoint POST per il feedback degli utenti con validazione.

### Passi

1. **Crea il file**: `app/api/training/feedback/route.ts`

2. **Implementa con validazione**:

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

3. **Testa con dati validi e non validi**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mario Rossi",
    "email": "mario@example.com",
    "category": "feature",
    "message": "Ottima piattaforma!",
    "rating": 5
  }'
```

---

## Esercizio 3: Implementazione Completa di una Funzionalità

**Difficoltà**: ⭐⭐⭐ Avanzato  
**Durata**: 1–2 giorni  
**Obiettivo**: Creare una funzionalità completa con operazioni CRUD e documentazione

### Compito

Implementa una semplice API di gestione note con funzionalità CRUD completa.

### Requisiti

- `GET /api/training/notes` – Elenca tutte le note
- `POST /api/training/notes` – Crea una nuova nota
- `GET /api/training/notes/[id]` – Recupera una singola nota
- `PUT /api/training/notes/[id]` – Aggiorna una nota
- `DELETE /api/training/notes/[id]` – Elimina una nota
