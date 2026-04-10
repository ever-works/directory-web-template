---
id: exercises
title: Exercícios Práticos
sidebar_label: Exercícios
sidebar_position: 5
---

# Exercícios Práticos

Pratique o que aprendeu com exercícios e desafios do mundo real.

## 🎯 Objetivos

- ✅ Praticar a criação de endpoints de API
- ✅ Aplicar padrões de documentação Swagger
- ✅ Implementar validação e tratamento de erros
- ✅ Construir funcionalidades completas do zero
- ✅ Ganhar confiança no fluxo de desenvolvimento

**Tempo estimado**: 3–5 dias

---

## Exercício 1: Rota GET Simples

**Dificuldade**: ⭐ Iniciante  
**Duração**: 15–30 minutos  
**Objetivo**: Aprender a estrutura básica de anotações e o fluxo de trabalho

### Tarefa

Crie um endpoint GET simples que retorna informações do servidor.

### Passos

1. **Criar o arquivo**: `app/api/training/server-info/route.ts`

2. **Implementar a rota**:

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

3. **Testar o fluxo**:

```bash
yarn generate-docs
open http://localhost:3000/api/reference
curl http://localhost:3000/api/training/server-info
```

### Critérios de Sucesso

- [ ] Endpoint aparece na Scalar UI sob a tag "System"
- [ ] Todos os campos de resposta documentados com exemplos
- [ ] Endpoint funciona quando testado na Scalar UI
- [ ] Nenhum erro de geração

---

## Exercício 2: Rota POST com Validação

**Dificuldade**: ⭐⭐ Intermediário  
**Duração**: 30–45 minutos  
**Objetivo**: Aprender documentação do corpo da requisição e tratamento de erros

### Tarefa

Crie um endpoint POST para feedback de usuários com validação.

### Passos

1. **Criar o arquivo**: `app/api/training/feedback/route.ts`

2. **Implementar com validação**:

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

3. **Testar com dados válidos e inválidos**:

```bash
curl -X POST http://localhost:3000/api/training/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "category": "feature",
    "message": "Ótima plataforma!",
    "rating": 5
  }'
```

---

## Exercício 3: Implementação Completa de Funcionalidade

**Dificuldade**: ⭐⭐⭐ Avançado  
**Duração**: 1–2 dias  
**Objetivo**: Criar uma funcionalidade completa com operações CRUD e documentação

### Tarefa

Implemente uma API simples de gerenciamento de notas com funcionalidade CRUD completa.

### Requisitos

- `GET /api/training/notes` – Listar todas as notas
- `POST /api/training/notes` – Criar uma nova nota
- `GET /api/training/notes/[id]` – Obter uma única nota
- `PUT /api/training/notes/[id]` – Atualizar uma nota
- `DELETE /api/training/notes/[id]` – Excluir uma nota
