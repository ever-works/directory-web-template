---
id: roadmap
title: Mapa Drogowy & Przyszły Kierunek
sidebar_label: Mapa Drogowy
---

# Mapa Drogowy & Przyszły Kierunek

Ta strona opisuje aktualny kierunek rozwoju Directory Web Template oraz jak społeczność może uczestniczyć w kształtowaniu jego przyszłości.

## Wizja Produktu

Directory Web Template dąży do bycia najbardziej kompleksowym rozwiązaniem open-source do budowania profesjonalnych stron katalogowych. Długoterminowa wizja obejmuje:

- **Produkcyjne strony katalogowe**, które są piękne, wydajne i w pełni konfigurowalne
- **Łatwe zarządzanie treścią** przez CMS oparty na Git z opcjonalnym generowaniem treści opartym na AI za pośrednictwem [Platformy Ever Works](https://docs.ever.works)
- **Rozszerzalne płatności i uwierzytelnianie** obsługujące wielu dostawców od razu po instalacji
- **Internacjonalizacja pierwszej klasy** z pełną obsługą RTL i rosnącym pokryciem językowym

## Obszary Aktywnego Rozwoju

### Wydajność i Core Web Vitals

- Optymalizacja Largest Contentful Paint (LCP) dla stron z listą elementów i stron szczegółów
- Zmniejszenie rozmiaru pakietu JavaScript przez lepszy code splitting i tree shaking
- Ulepszenie potoku optymalizacji obrazów dla zrzutów ekranu i logo elementów katalogu
- Implementacja częściowego prerenderowania dla szybszego początkowego ładowania stron

### Ulepszenia Funkcji

- Dodanie większych możliwości filtrowania i wyszukiwania (wyszukiwanie fasetowe, zaawansowane filtry)
- Implementacja funkcji treści generowanych przez użytkowników (recenzje, oceny, komentarze)
- Dodanie więcej integracji dostawców płatności i funkcji zarządzania subskrypcjami
- Rozszerzenie systemu motywów o więcej wbudowanych motywów i łatwiejszą personalizację

### Doświadczenie Deweloperów

- Ulepszenie konfiguracji lokalnego środowiska deweloperskiego z lepszą dokumentacją i komunikatami o błędach
- Dodanie bardziej kompleksowego pokrycia testów E2E z Playwright
- Tworzenie szablonów startowych dla typowych typów katalogów (SaaS, lokalne firmy, zasoby)
- Ulepszenie bezpieczeństwa typów TypeScript w całej bazie kodu

### Internacjonalizacja

- Dodanie więcej wbudowanych tłumaczeń językowych
- Ulepszenie obsługi układu RTL dla arabskiego i hebrajskiego
- Obsługa konfiguracji językowej per katalog
- Dodanie zautomatyzowanych przepływów pracy tłumaczeń

### Dokumentacja

- Rozszerzenie dokumentacji referencyjnej API o więcej przykładów
- Dodanie samouczków wideo dla typowych zadań
- Tworzenie rekordów decyzji architektonicznych (ADR) dla głównych decyzji projektowych
- Budowanie interaktywnych przewodników i środowisk playground

## Jak Proponować Funkcje

### GitHub Issues

Podstawowym sposobem proponowania funkcji są GitHub Issues pod adresem [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Podczas tworzenia żądania funkcji:

1. **Najpierw sprawdź istniejące zgłoszenia**, aby uniknąć duplikatów.
2. **Opisz problem**, który próbujesz rozwiązać, a nie tylko rozwiązanie, które chcesz.
3. **Podaj kontekst** dotyczący przypadku użycia, rodzaju katalogu i skali.
4. **Dołącz przykłady** (makiety, schematy API, przykłady konfiguracji).

### GitHub Discussions

Dla szerszych pomysłów wymagających wkładu społeczności: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Dołącz do [Discord Ever Works](https://discord.gg/ever) w celu rozmów w czasie rzeczywistym na temat funkcji i kierunku projektu.

## Jak Ustalane Są Priorytety

| Czynnik                        | Waga   | Opis                                                                     |
| ------------------------------ | ------ | ------------------------------------------------------------------------ |
| **Popyt użytkowników**         | Wysoka | Liczba żądań, głosów za i zainteresowania społeczności                   |
| **Zgodność strategiczna**      | Wysoka | Jak dobrze funkcja jest zgodna z wizją produktu                          |
| **Wysiłek implementacji**      | Średnia | Złożoność, nakład czasu i obciążenie utrzymaniem                        |
| **Ryzyko breaking change**     | Średnia | Potencjał zakłócenia istniejących użytkowników                          |
| **Dostępność współtwórców**    | Średnia | Czy opiekunowie lub członkowie społeczności mogą to podjąć              |

### Poziomy Priorytetów

- **P0 (Krytyczny):** Luki bezpieczeństwa, błędy utraty danych lub problemy blokujące. Rozwiązywane natychmiast.
- **P1 (Wysoki):** Funkcje lub poprawki, nad którymi aktywnie pracuje się dla następnego wydania.
- **P2 (Średni):** Zatwierdzone funkcje zaplanowane, ale jeszcze nie zaplanowane w harmonogramie.
- **P3 (Niski):** Miłe do posiadania ulepszenia. Świetne kandydaty do wkładów społeczności.

## Udział w Kształtowaniu Mapy Drogowej

1. **Przesyłaj dobrze napisane żądania funkcji** z jasnymi opisami problemów i przypadkami użycia.
2. **Wnoś kod.** Pull requesty to najszybsza ścieżka od pomysłu do rzeczywistości. Zobacz [Przewodnik dla Współtwórców](/contributing).
3. **Bierz udział w dyskusjach.** Przekazuj opinie na temat propozycji i dziel się swoimi doświadczeniami.
4. **Zgłaszaj błędy.** Rzetelne raporty błędów pomagają ustalać priorytety poprawek i poprawiać stabilność.

## Kadencja Wydań

Wydania są tworzone, gdy gotowy jest znaczący zestaw funkcji i poprawek:

- **Wydania patch** (poprawki błędów) są publikowane w razie potrzeby, często co tydzień podczas aktywnego rozwoju.
- **Wydania minor** (nowe funkcje) są publikowane mniej więcej co miesiąc.
- **Wydania major** (breaking changes) są rzadkie i towarzyszą im przewodniki migracji.

Szczegóły znajdziesz na stronie [Changelog & Wersjonowanie](/changelog).

## Bądź Na Bieżąco

- **Obserwuj repozytorium** na GitHub, aby otrzymywać powiadomienia
- **Oznacz repozytorium gwiazdką**, aby wyrazić wsparcie i pomóc innym odkryć projekt
- **Dołącz do [Discord](https://discord.gg/ever)** w celu aktualizacji w czasie rzeczywistym
- **Śledź [@everworks](https://twitter.com/everworks)** na Twitterze

## Kontakt

- **E-mail:** [ever@ever.co](mailto:ever@ever.co)
- **Strona internetowa:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
