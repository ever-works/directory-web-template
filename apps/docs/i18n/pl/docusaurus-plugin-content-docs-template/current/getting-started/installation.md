---
title: Instalacja
sidebar_label: Instalacja
sidebar_position: 1
---

# Instalacja

## Wymagania wstępne
- Node.js >= 20.19.0
- pnpm
- Git
- PostgreSQL (opcjonalne)

## Wymagania systemowe
- System operacyjny: Windows, macOS lub Linux
- Pamięć: minimum 4 GB RAM
- Dysk: 2 GB wolnego miejsca

## Kroki

1. Klonowanie:
```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
```

2. Instalacja:
```bash
pnpm install
```

3. Konfiguracja:
```bash
cp apps/web/.env.example apps/web/.env.local
```

4. Uruchomienie:
```bash
pnpm run dev
```
Odwiedź http://localhost:3000
