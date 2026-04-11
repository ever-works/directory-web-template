---
title: Primeiro Deploy
sidebar_label: Primeiro Deploy
sidebar_position: 4
---

# Primeiro Deploy

## Opção 1: Vercel (Recomendado)
1. Envie o código para o GitHub
2. Acesse vercel.com/new
3. Importe o repositório
4. Adicione as variáveis de ambiente
5. Faça o deploy

## Opção 2: Docker
```bash
docker build -t directory-web .
docker run -p 3000:3000 -e DATABASE_URL="..." directory-web
```

## Opção 3: Node.js
```bash
pnpm build && pnpm start
```

## Checklist
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] Domínio configurado
- [ ] SSL ativo
