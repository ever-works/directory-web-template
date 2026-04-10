---
id: glossary
title: Słownik Terminów
sidebar_label: Słownik
---

# Słownik Terminów

Kluczowe terminy i pojęcia stosowane w całej dokumentacji Directory Web Template.

## Podstawowe Pojęcia Dziedzinowe

### Katalog

Zbiór zorganizowanych wpisów (elementów) zgrupowanych wokół konkretnego tematu lub niszy. Katalog jest encją najwyższego poziomu. Przykłady: "SaaS Tools Directory", "Developer Resources Directory" lub "Local Business Directory".

### Element

Pojedynczy wpis lub listing w katalogu. Element reprezentuje jedną skatalogowaną encję (narzędzie, firmę, zasób lub usługę). Elementy mają ustrukturyzowane pola (nazwa, opis, URL, logo), należą do kategorii i mogą być tagowane.

### Kategoria

Hierarchiczna klasyfikacja używana do organizowania elementów. Kategorie tworzą strukturę drzewa (relacje rodzic/dziecko) i zapewniają podstawowy mechanizm nawigacji i filtrowania.

### Tag

Płaska, niehierarchiczna etykieta przypisana do elementów w celu przekrojowej klasyfikacji. Tagi są używane do wtórnego filtrowania i odkrywania. Element może mieć wiele tagów, takich jak "open-source", "freemium" lub "API-available".

### Kolekcja

Kuratorowana grupa elementów, niezależna od kategorii lub tagów. Kolekcje to zestawy zdefiniowane przez użytkownika lub redakcyjnie kuratorowane, takie jak "Top 10 Wyborów" lub "Nowości Miesiąca".

### Taksonomia

Ogólny system klasyfikacji katalogu, obejmujący kategorie, tagi i wszelkie inne struktury organizacyjne.

### Slug

Przyjazny dla URL, czytelny dla człowieka identyfikator wywodzący się z nazwy encji. Slugi są używane w URL-ach zamiast numerycznych ID. Na przykład "Visual Studio Code" staje się `visual-studio-code`.

## Wzorce Architektoniczne

### Repozytorium

Klasa warstwy dostępu do danych, która hermetyzuje zapytania i mutacje bazy danych dla konkretnej encji. Repozytoria abstrahują Drizzle ORM i zapewniają czysty interfejs dla serwisów. Znajduje się w `lib/repositories/`.

### Serwis

Klasa warstwy logiki biznesowej, która orkiestruje operacje w repozytoriach, zewnętrznych API i innych serwisach. Serwisy zawierają centralną logikę aplikacji i są wywoływane przez programy obsługi tras API. Znajduje się w `lib/services/`.

### Webhook

Wywołanie zwrotne HTTP wyzwalane przez zdarzenie. Template używa webhooków do powiadomień od dostawców płatności (Stripe, LemonSqueezy, Polar) oraz aktualizacji statusu wdrożenia. Punkty końcowe webhooków walidują przychodzące żądania przy użyciu podpisów lub wspólnych sekretów.

## Zarządzanie Treścią

### CMS Oparty na Git

Podejście do zarządzania treścią stosowane przez Template. Dane katalogu (elementy, kategorie, metadane) są przechowywane jako pliki strukturalne (YAML, Markdown) w repozytorium Git. Template klonuje to repozytorium podczas budowania i odczytuje zawartość z lokalnego systemu plików. Zmiany są wprowadzane przez commity i pull requesty.

### Community PR

Pull request przesłany przez członka społeczności w celu dodania lub aktualizacji elementów w repozytorium CMS opartym na Git katalogu. Community PRy przechodzą przez proces recenzji przed scaleniem.

## Baza Danych

### Drizzle ORM

Lekkie, TypeScript-first ORM używane przez Template. Drizzle zapewnia konstruktor zapytań podobny do SQL z pełnym bezpieczeństwem typów. Definicje schematu są pisane jako kod TypeScript, a migracje są generowane jako zwykłe pliki SQL przez Drizzle Kit.

### Migracja

Wersjonowana zmiana schematu bazy danych. Migracje są generowane za pomocą `pnpm db:generate` i stosowane za pomocą `pnpm db:migrate`. Pliki migracji są przechowywane w `lib/db/migrations/`.

## Uwierzytelnianie

### NextAuth.js

Biblioteka uwierzytelniania (v5) używana przez Template. Zapewnia obsługę OAuth dla wielu dostawców (Google, GitHub, Facebook, Twitter, Microsoft) z zarządzaniem sesjami i tokenami JWT.

### Supabase Auth

Alternatywny backend uwierzytelniania obsługiwany przez Template. Supabase Auth zapewnia uwierzytelnianie e-mail/hasło, magic linki i społecznościowe OAuth przez zarządzaną usługę Supabase.

## Płatności

### Subskrypcja

Cykliczne zobowiązanie płatnicze zarządzane przez jednego z obsługiwanych dostawców płatności (Stripe, LemonSqueezy lub Polar). Template obsługuje tworzenie subskrypcji, zarządzanie nimi i przetwarzanie webhooków.

## Wdrożenie

### Vercel

Podstawowa platforma wdrożeń dla Template. Vercel zapewnia wdrożenie bez konfiguracji dla aplikacji Next.js, w tym automatyczne wdrożenia podglądowe, funkcje edge i dystrybucję CDN.

### Docker

Alternatywna metoda wdrożenia. Template może być konteneryzowany i wdrażany w dowolnym środowisku hostingowym zgodnym z Docker.
