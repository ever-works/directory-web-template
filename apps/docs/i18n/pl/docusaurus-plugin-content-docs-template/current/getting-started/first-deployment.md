---
title: Pierwsze wdrożenie
sidebar_label: Pierwsze wdrożenie
sidebar_position: 4
---

# Pierwsze wdrożenie

## Opcja 1: Vercel (zalecane)
1. Wypchnij kod na GitHub
2. Przejdź do vercel.com/new
3. Zaimportuj repozytorium
4. Dodaj zmienne środowiskowe
5. Wdróż

## Opcja 2: Docker
```bash
docker build -t directory-web .
docker run -p 3000:3000 -e DATABASE_URL="..." directory-web
```

## Opcja 3: Node.js
```bash
pnpm build && pnpm start
```

## Lista kontrolna
- [ ] Zmienne środowiskowe ustawione
- [ ] Baza danych zmigrowana
- [ ] Domena skonfigurowana
- [ ] SSL aktywny
