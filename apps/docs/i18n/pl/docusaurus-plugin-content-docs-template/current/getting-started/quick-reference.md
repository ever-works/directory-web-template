---
title: Podręczny przewodnik
sidebar_label: Podręczny przewodnik
sidebar_position: 5
---

# Podręczny przewodnik

## Polecenia

```bash
pnpm run dev       # Uruchom serwery deweloperskie
pnpm run build     # Zbuduj wszystko
pnpm run lint      # Lintuj wszystko
pnpm db:generate   # Generuj migracje
pnpm db:migrate    # Zastosuj migracje
pnpm db:seed       # Seeduj dane
```

## Kluczowe pliki

| Plik | Przeznaczenie |
|------|---------------|
| apps/web/.env.local | Zmienne środowiskowe |
| apps/web/.content/ | Treść CMS |
| apps/web/app/ | Trasy Next.js |
| apps/web/lib/ | Logika biznesowa |
