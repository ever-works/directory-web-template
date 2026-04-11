---
id: exercises
title: Ćwiczenia Praktyczne
sidebar_label: Ćwiczenia
sidebar_position: 5
---

# Ćwiczenia Praktyczne

Ćwicz to czego się nauczyłeś z realistycznymi zadaniami i wyzwaniami.

## 🎯 Cele

- ✅ Ćwiczyć tworzenie endpointów API
- ✅ Stosować standardy dokumentacji Swagger
- ✅ Implementować walidację i obsługę błędów
- ✅ Budować kompletne funkcje od podstaw
- ✅ Zyskać pewność siebie w przepływie pracy

**Szacowany czas**: 3–5 dni

---

## Ćwiczenie 1: Prosta Route GET

**Trudność**: ⭐ Początkujący  
**Czas trwania**: 15–30 minut  
**Cel**: Nauczyć się podstawowej struktury adnotacji i przepływu pracy

### Zadanie

Stwórz prosty endpoint GET zwracający informacje o serwerze.

### Kroki

1. **Utwórz plik**: `app/api/training/server-info/route.ts`

2. **Implementuj route**:

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

3. **Przetestuj przepływ**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Kryteria Sukcesu

- [ ] Endpoint pojawia się w Scalar UI pod tagiem "System"
- [ ] Wszystkie pola odpowiedzi udokumentowane z przykładami
- [ ] Endpoint działa po przetestowaniu w Scalar UI
- [ ] Brak błędów generowania

---

## Ćwiczenie 2: Route POST z Walidacją

**Trudność**: ⭐⭐ Średnio zaawansowany  
**Czas trwania**: 30–45 minut  
**Cel**: Nauczyć się dokumentacji ciała żądania i obsługi błędów

### Zadanie

Stwórz endpoint POST do zbierania opinii użytkowników z walidacją.

### Kroki

1. **Utwórz plik**: `app/api/training/feedback/route.ts`

2. **Implementuj z walidacją**:

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

3. **Przetestuj z poprawnymi i niepoprawnymi danymi**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jan Kowalski",
    "email": "jan@przyklad.pl",
    "category": "feature",
    "message": "Świetna platforma!",
    "rating": 5
  }'
```

---

## Ćwiczenie 3: Kompletna Implementacja Funkcji

**Trudność**: ⭐⭐⭐ Zaawansowany  
**Czas trwania**: 1–2 dni  
**Cel**: Stworzyć kompletną funkcję z operacjami CRUD i dokumentacją

### Zadanie

Zaimplementuj proste API zarządzania notatkami z pełną funkcjonalnością CRUD.

### Wymagania

- `GET /api/training/notes` – Lista wszystkich notatek
- `POST /api/training/notes` – Utwórz nową notatkę
- `GET /api/training/notes/[id]` – Pobierz pojedynczą notatkę
- `PUT /api/training/notes/[id]` – Zaktualizuj notatkę
- `DELETE /api/training/notes/[id]` – Usuń notatkę
