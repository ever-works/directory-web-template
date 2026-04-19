---
id: queries
title: Informacje o zapytaniach do bazy danych
sidebar_label: Zapytania
sidebar_position: 2
---

# Informacje o zapytaniach do bazy danych

Katalog `lib/db/queries/` zawiera ponad 23 moduły zapytań uporządkowane według domen. Każdy moduł zawiera zapytania Drizzle ORM dotyczące określonego obszaru funkcji, zgodnie z zasadą pojedynczej odpowiedzialności.

## Przegląd modułu

Wszystkie moduły zapytań są eksportowane w formie beczki z `lib/db/queries/index.ts` w celu wygodnego importowania:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Moduły zapytań

### aktywność.zapytania.ts

Rejestrowanie i pobieranie aktywności na potrzeby systemu ścieżki audytu.

**Kluczowe funkcje:**
- Rejestruj działania użytkowników (logowanie, rejestracja, zmiany konta)
- Zapytaj o historię aktywności według użytkownika lub zakresu dat

### uwierzytelnianie.zapytania.ts

Operacje na bazach danych związane z uwierzytelnianiem.

**Kluczowe funkcje:**
- Znajdź użytkownika przez e-mail w celu uwierzytelnienia poświadczeń
- Utwórz i zweryfikuj tokeny resetowania hasła
- Zarządzaj tokenami weryfikacyjnymi

### klient.zapytania.ts

Największy moduł zapytań (37 KB), obsługujący wszystkie operacje skierowane do klienta.

**Kluczowe funkcje:**
- Operacje CRUD na profilu klienta
- Przesyłanie i zarządzanie przedmiotami klientów
- Agregacja danych w panelu klienta
- Wyszukuj i filtruj dane klientów
- Zapytania o listę stron podzielone na strony

### komentarz.zapytania.ts

Operacje systemu komentowania.

**Kluczowe funkcje:**
- Twórz, aktualizuj i nietrwale usuwaj komentarze
- Pobierz komentarze według elementu z paginacją
- Zapytania dotyczące moderacji komentarzy (administrator)
- Agregacja ocen

### firma.zapytania.ts

Zapytania kierownictwa firmy.

**Kluczowe funkcje:**
- Działalność firmy CRUD
- Wyszukiwanie i filtrowanie firm
- Zarządzanie skojarzeniami pozycja-firma
- Statystyki i analizy firmowe

### dashboard.queries.ts

Agregacja danych w panelu administracyjnym i panelu klienta.

**Kluczowe funkcje:**
- Statystyki panelu administracyjnego (całkowita liczba użytkowników, pozycji, przychodów)
- Statystyki panelu klienta (zgłoszenia, wyświetlenia, zaangażowanie)
- Dane szeregów czasowych dla wykresów
- Podsumowania działań

### zaangażowanie.zapytania.ts

Zagregowane wskaźniki zaangażowania dotyczące wyświetleń, głosów, ulubionych i komentarzy.

**Kluczowe funkcje:**
- Uzyskaj wyniki zaangażowania dla przedmiotów
- Łączna liczba wyświetleń
- Oblicz wskaźniki popularności
- Rankingi zaangażowania

### integracja-mapping.queries.ts

Operacje mapowania integracji CRM.

**Kluczowe funkcje:**
- Twórz i aktualizuj mapowania integracji
- Wyszukaj identyfikatory CRM z identyfikatorów Ever ID i odwrotnie
- Śledź znaczniki czasu synchronizacji i skróty wersji
- Operacje mapowania zbiorczego

### element.zapytania.ts

Zapytania o podstawowe elementy (elementy są przechowywane w Git, ale metadane są śledzone w bazie danych).

**Kluczowe funkcje:**
- Operacje na metadanych elementu
- Śledzenie widoku przedmiotu
- Dane dotyczące zaangażowania przedmiotu

### item-audit.queries.ts

Operacje dziennika audytu pozycji.

**Kluczowe funkcje:**
- Rejestruj działania związane z tworzeniem, aktualizacją, usuwaniem i przeglądaniem elementów
- Zapytaj o historię audytu dla konkretnych pozycji
- Filtruj dzienniki kontrolne według typu działania, wykonawcy lub zakresu dat

### widok-przedmiotu.zapytania.ts

Śledzenie i analiza widoku przedmiotu.

**Kluczowe funkcje:**
- Rejestruj unikalne dzienne wyświetlenia (z deduplikacją według identyfikatora widza i daty)
- Zapytanie o liczbę wyświetleń według elementu i zakresu dat
- Wyświetl agregację analiz

### indeks lokalizacji.zapytania.ts

Wyszukiwanie i indeksowanie oparte na lokalizacji.

**Kluczowe funkcje:**
- Zapytania geoprzestrzenne dotyczące pobliskich obiektów
- Zarządzanie indeksem lokalizacji
- Obliczenia odległości
- Wyszukiwanie oparte na lokalizacji za pomocą filtrów

### moderacja.zapytania.ts

System moderacji treści.

**Kluczowe funkcje:**
- Twórz raporty dotyczące treści i zarządzaj nimi
- Zaktualizuj status i rozdzielczość raportu
- Rejestruj działania moderacyjne
- Statystyki moderacji i zarządzanie kolejkami

### biuletyn.zapytania.ts

Zarządzanie subskrypcją newslettera.

**Kluczowe funkcje:**
- Operacje subskrypcji i anulowania subskrypcji
- Sprawdź stan subskrypcji
- Lista aktywnych subskrybentów
- Śledź historię wysyłania e-maili

### płatność.zapytania.ts

Operacje na bazach danych związane z płatnościami.

**Kluczowe funkcje:**
- Zarządzanie dostawcami płatności
- Łączenie konta płatniczego
- Rejestracja transakcji
- Zapytania dotyczące historii płatności

### raport.zapytania.ts

Zapytania do systemu raportowania treści.

**Kluczowe funkcje:**
- Tworzenie raportów (element lub komentarz)
- Raporty listowe z filtrami i paginacją
- Zaktualizuj stan raportu
- Analityka raportów

### subskrypcja.zapytania.ts

Zarządzanie cyklem życia subskrypcji (17 KB).

**Kluczowe funkcje:**
- Twórz i aktualizuj subskrypcje
- Zmiany statusu subskrypcji
- Zapis historii subskrypcji
- Znajdź subskrypcje według identyfikatora użytkownika lub dostawcy
- Operacje odnowienia i anulowania
- Analityka subskrypcji

### ankieta.zapytania.ts

Działanie systemu pomiarowego.

**Kluczowe funkcje:**
- Badanie operacji CRUD
- Nagrywanie odpowiedzi na ankietę
- Agregacja odpowiedzi i analityka
- Zarządzanie statusem ankiety (wersja robocza, publikacja, zamknięcie)

### użytkownik.zapytania.ts

Zapytania dotyczące zarządzania użytkownikami.

**Kluczowe funkcje:**
- Operacje CRUD użytkownika
- Wyszukiwanie i filtrowanie użytkowników
- Zarządzanie rolami użytkowników
- Usunięcie konta (usunięcie miękkie)

### głosuj.zapytania.ts

Działanie systemu głosowania.

**Kluczowe funkcje:**
- Twórz, aktualizuj i usuwaj głosy
- Sprawdź istniejące głosy na parę użytkownik-element
- Łączne zliczanie głosów według pozycji
- Przełączanie typu głosowania (głosowanie za/przeciw)

## Wspólne narzędzia

### typy.ts

Udostępnione typy TypeScript używane w modułach zapytań:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Wspólne funkcje narzędziowe do tworzenia zapytań:

- Pomocnicy paginacji (obliczanie przesunięcia, formatowanie wyników)
- Typowi konstruktorzy filtrów
- Pomocnicy fragmentów SQL

## Wzorce zapytań

### Standardowy wzorzec zapytania

Wszystkie moduły zapytań mają spójny wzór:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Zapytania paginowane

Wiele modułów implementuje zapytania podzielone na strony:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Zapytania agregujące

Moduły zaangażowania i pulpitu nawigacyjnego korzystają z agregacji SQL:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Konwencja importowa

Importuj funkcje zapytań poprzez eksport beczki:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
