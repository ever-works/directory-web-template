---
title: Instalação
sidebar_label: Instalação
sidebar_position: 1
---

# Instalação

## Pré-requisitos
- Node.js >= 20.19.0
- pnpm
- Git
- PostgreSQL (opcional)

## Requisitos do Sistema
- SO: Windows, macOS ou Linux
- Memória: mínimo 4GB de RAM
- Armazenamento: 2GB livres

## Passos

1. Clonar:
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

2. Instalar:
```bash
pnpm install
```

3. Configurar:
```bash
cp apps/web/.env.example apps/web/.env.local
```

4. Iniciar:
```bash
pnpm run dev
```
Acesse http://localhost:3000
