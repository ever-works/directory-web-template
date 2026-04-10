---
id: onboarding
title: Przewodnik Wdrożeniowy
sidebar_label: Wdrożenie
sidebar_position: 2
---

# Przewodnik Wdrożeniowy

Witamy w Ever Works! Ten przewodnik pomoże Ci skonfigurować środowisko deweloperskie i wnieść pierwszy wkład.

## 🎯 Cele

Po ukończeniu tego modułu:

- ✅ Będziesz mieć w pełni skonfigurowane środowisko deweloperskie
- ✅ Zrozumiesz strukturę projektu
- ✅ Będziesz w stanie uruchomić aplikację lokalnie
- ✅ Dokonasz swojej pierwszej zmiany w kodzie
- ✅ Zrozumiesz przepływ pracy

**Szacowany czas**: 1–2 dni

---

## Krok 1: Konfiguracja Środowiska

### 1.1 Zainstaluj potrzebne narzędzia

Postępuj zgodnie ze szczegółowym [Przewodnikiem Instalacji](/getting-started/installation) aby zainstalować:

- Node.js 20.19.0+
- pnpm ([instalacja](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (zalecany)

### 1.2 Sklonuj Repozytorium

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 Skonfiguruj Zmienne Środowiskowe

**Szybka lista kontrolna**:

- [ ] Połączenie z bazą danych skonfigurowane
- [ ] Sekrety uwierzytelniania ustawione
- [ ] Klucze dostawcy płatności dodane (opcjonalnie dla developmentu)

---

## Krok 2: Konfiguracja Bazy Danych

### 2.1 Uruchom PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 Uruchom Migracje

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## Krok 3: Uruchom Serwer Deweloperski

```bash
pnpm run dev
```

Sprawdź w przeglądarce:

- [ ] Strona główna ładuje się pod `http://localhost:3000`
- [ ] Możesz założyć konto
- [ ] Możesz się zalogować/wylogować
- [ ] Dokumentacja API dostępna pod `http://localhost:3000/api/reference`

---

## Krok 4: Zrozum Strukturę Projektu

```
directory-web-template/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   └── messages/
│   └── web-e2e/
├── packages/
└── turbo.json
```

---

## Krok 5: Przepływ Pracy Deweloperskiej

### 5.1 Utwórz gałąź funkcji

```bash
git checkout main
git pull origin main
git checkout -b feature/nazwa-funkcji
```

### 5.2 Zatwierdź i wypchnij

```bash
git add .
git commit -m "feat: dodać system powiadomień użytkownika"
git push origin feature/nazwa-funkcji
```

---

## ✅ Lista Kontrolna Wdrożenia

- [ ] Środowisko deweloperskie w pełni skonfigurowane
- [ ] Aplikacja działa lokalnie
- [ ] Baza danych podłączona i wypełniona
- [ ] Struktura projektu zrozumiana
- [ ] Pierwsza gałąź utworzona
- [ ] Pierwszy commit dokonany

---

## Następne Kroki

1. [Dokumentacja API](/team-training/api-documentation) – Poznaj system dokumentacji
2. [Najlepsze Praktyki](/team-training/best-practices) – Poznaj standardy kodowania
3. [Ćwiczenia](/team-training/exercises) – Ćwicz z prawdziwymi zadaniami

Potrzebujesz pomocy? Zapytaj swojego mentora lub sprawdź kanał Slack zespołu! 🚀
