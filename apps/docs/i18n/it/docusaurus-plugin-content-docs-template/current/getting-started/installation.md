---
title: Installazione
sidebar_label: Installazione
sidebar_position: 1
---

# Installazione

## Prerequisiti
- Node.js >= 20.19.0
- pnpm (npm install -g pnpm)
- Git
- PostgreSQL (opzionale)

## Requisiti di Sistema
- OS: Windows, macOS o Linux
- Memoria: 4 GB RAM minimo, 8 GB consigliato
- Archiviazione: 2 GB di spazio libero

## Passi di Installazione

### 1. Clonare il Repository
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

### 2. Installare le Dipendenze
```bash
pnpm install
```

### 3. Configurare l'Ambiente
```bash
cp apps/web/.env.example apps/web/.env.local
```

### 4. Configurare le Variabili d'Ambiente
Modifica apps/web/.env.local:
```bash
NODE_ENV=development
AUTH_SECRET="your-secret-key"
DATABASE_URL="postgresql://user:password@localhost:5432/everworks"
DATA_REPOSITORY="https://github.com/your-org/your-data"
```

### 5. Avviare il Server di Sviluppo
```bash
pnpm run dev
```
Visita http://localhost:3000
