---
id: exercises
title: Ejercicios Prácticos
sidebar_label: Ejercicios
sidebar_position: 5
---

# Ejercicios Prácticos

Practica lo que has aprendido con ejercicios y desafíos del mundo real.

## 🎯 Objetivos

- ✅ Practicar la creación de endpoints de API
- ✅ Aplicar estándares de documentación Swagger
- ✅ Implementar validación y manejo de errores
- ✅ Construir funcionalidades completas desde cero
- ✅ Ganar confianza en el flujo de desarrollo

**Tiempo estimado**: 3–5 días

---

## Ejercicio 1: Ruta GET Simple

**Dificultad**: ⭐ Principiante  
**Duración**: 15–30 minutos  
**Objetivo**: Aprender la estructura básica de anotaciones y el flujo de trabajo

### Tarea

Crea un endpoint GET simple que retorna información del servidor.

### Pasos

1. **Crear el archivo**: `app/api/training/server-info/route.ts`

2. **Implementar la ruta**:

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

3. **Probar el flujo**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Criterios de Éxito

- [ ] El endpoint aparece en Scalar UI bajo la etiqueta "System"
- [ ] Todos los campos de respuesta documentados con ejemplos
- [ ] El endpoint funciona cuando se prueba en Scalar UI
- [ ] Sin errores de generación

---

## Ejercicio 2: Ruta POST con Validación

**Dificultad**: ⭐⭐ Intermedio  
**Duración**: 30–45 minutos  
**Objetivo**: Aprender documentación del cuerpo de solicitud y manejo de errores

### Tarea

Crea un endpoint POST para retroalimentación de usuarios con validación.

### Pasos

1. **Crear el archivo**: `app/api/training/feedback/route.ts`

2. **Implementar con validación**:

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

3. **Probar con datos válidos e inválidos**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan García",
    "email": "juan@ejemplo.com",
    "category": "feature",
    "message": "¡Excelente plataforma!",
    "rating": 5
  }'
```

---

## Ejercicio 3: Implementación Completa de Funcionalidad

**Dificultad**: ⭐⭐⭐ Avanzado  
**Duración**: 1–2 días  
**Objetivo**: Crear una funcionalidad completa con operaciones CRUD y documentación

### Tarea

Implementa una API simple de gestión de notas con funcionalidad CRUD completa.

### Requisitos

- `GET /api/training/notes` – Listar todas las notas
- `POST /api/training/notes` – Crear una nueva nota
- `GET /api/training/notes/[id]` – Obtener una sola nota
- `PUT /api/training/notes/[id]` – Actualizar una nota
- `DELETE /api/training/notes/[id]` – Eliminar una nota
