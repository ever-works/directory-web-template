---
id: roadmap
title: Roadmap & Toekomstrichting
sidebar_label: Roadmap
---

# Roadmap & Toekomstrichting

Deze pagina beschrijft de huidige ontwikkelingsrichting van het Directory Web Template en hoe de community kan bijdragen aan de vormgeving van de toekomst.

## Productvisie

Het Directory Web Template streeft ernaar de meest uitgebreide open-source oplossing te zijn voor het bouwen van professionele directorywebsites. De langetermijnvisie omvat:

- **Productierijpe directorywebsites** die mooi, performant en volledig aanpasbaar zijn
- **Eenvoudig contentbeheer** via het Git-gebaseerde CMS met optionele AI-gestuurde contentgeneratie via het [Ever Works Platform](https://docs.ever.works)
- **Uitbreidbare betaling en authenticatie** met ondersteuning voor meerdere providers out of the box
- **Eersteklas internationalisering** met volledige RTL-ondersteuning en groeiende taaldekking

## Actieve Ontwikkelingsgebieden

### Prestaties en Core Web Vitals

- Optimaliseren van Largest Contentful Paint (LCP) voor item-listing- en detailpagina's
- Vermindering van de JavaScript-bundelgrootte door betere code-splitting en tree shaking
- Verbeteren van de beeldoptimalisatiepijplijn voor screenshots en logo's van directoryitems
- Implementeren van gedeeltelijke prerendering voor snellere initiële paginalaadtijden

### Functieverbeteringen

- Toevoegen van meer filter- en zoekmogelijkheden (gefacetteerde zoekfunctie, geavanceerde filters)
- Implementeren van door gebruikers gegenereerde contentfuncties (reviews, beoordelingen, reacties)
- Toevoegen van meer betalingsprovider-integraties en abonnementbeheerfuncties
- Uitbreiding van het themasysteem met meer ingebouwde thema's en eenvoudigere aanpassing

### Ontwikkelaarservaring

- Verbeteren van de lokale ontwikkelingsinstallatie met betere documentatie en foutmeldingen
- Toevoegen van uitgebreidere E2E-testdekking met Playwright
- Maken van startertemplates voor veelvoorkomende directorytypen (SaaS, lokale bedrijven, bronnen)
- Verbeteren van TypeScript-typeveiligheid in de hele codebase

### Internationalisering

- Toevoegen van meer ingebouwde taalvertalingen
- Verbeteren van RTL-layoutondersteuning voor Arabisch en Hebreeuws
- Ondersteunen van per-directory taalconfiguratie
- Toevoegen van geautomatiseerde vertaalworkflows

### Documentatie

- Uitbreiden van de API-referentiedocumentatie met meer voorbeelden
- Toevoegen van videotutorials voor veelvoorkomende taken
- Maken van architecture decision records (ADR's) voor belangrijke ontwerpbeslissingen
- Bouwen van interactieve handleidingen en playground-omgevingen

## Functies Voorstellen

### GitHub Issues

De primaire manier om functies voor te stellen is via GitHub Issues op [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Bij het maken van een functieverzoek:

1. **Controleer bestaande issues** eerst om duplicaten te vermijden.
2. **Beschrijf het probleem** dat u probeert op te lossen, niet alleen de oplossing die u wilt.
3. **Geef context** over uw gebruikscase, directorytype en schaal.
4. **Voeg voorbeelden toe** (mockups, API-schema's, configuratievoorbeelden).

### GitHub Discussions

Voor bredere ideeën die community-input nodig hebben: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Sluit u aan bij de [Ever Works Discord](https://discord.gg/ever) voor realtime gesprekken over functies en projectrichting.

## Hoe Prioriteiten Worden Bepaald

| Factor                         | Gewicht | Beschrijving                                                           |
| ------------------------------ | ------- | ---------------------------------------------------------------------- |
| **Gebruikersvraag**            | Hoog    | Aantal verzoeken, upvotes en community-interesse                       |
| **Strategische afstemming**    | Hoog    | Hoe goed de functie aansluit bij de productvisie                       |
| **Implementatie-inspanning**   | Gemiddeld | Complexiteit, tijdsinvestering en onderhoudslasten                   |
| **Risico op breaking changes** | Gemiddeld | Potentieel om bestaande gebruikers te verstoren                      |
| **Bijdragerbeschikbaarheid**   | Gemiddeld | Of beheerders of community-leden het op zich kunnen nemen            |

### Prioriteitsniveaus

- **P0 (Kritisch):** Beveiligingskwetsbaarheden, bugs met gegevensverlies of blokkerende problemen. Worden onmiddellijk aangepakt.
- **P1 (Hoog):** Functies of fixes waaraan actief wordt gewerkt voor de volgende release.
- **P2 (Gemiddeld):** Goedgekeurde functies die gepland maar nog niet ingepland zijn.
- **P3 (Laag):** Leuke verbeteringen. Goede kandidaten voor community-bijdragen.

## Bijdragen aan de Roadmap

1. **Goed geschreven functieverzoeken indienen** met duidelijke probleembeschrijvingen en gebruiksgevallen.
2. **Code bijdragen.** Pull requests zijn het snelste pad van idee naar realiteit. Zie de [Bijdragegids](/contributing).
3. **Deelnemen aan discussies.** Geef feedback op voorstellen en deel uw ervaring.
4. **Bugs melden.** Betrouwbare bugrapporten helpen bij het prioriteren van fixes en het verbeteren van de stabiliteit.

## Releasecadans

Releases worden gemaakt wanneer een betekenisvolle set functies en fixes gereed is:

- **Patch-releases** (bugfixes) worden gepubliceerd wanneer nodig, vaak wekelijks tijdens actieve ontwikkeling.
- **Minor releases** (nieuwe functies) worden ongeveer maandelijks gepubliceerd.
- **Major releases** (breaking changes) zijn zeldzaam en gaan gepaard met migratiehandleidingen.

Zie de pagina [Changelog & Versiebeheer](/changelog) voor details.

## Op de Hoogte Blijven

- **Houd het repository in de gaten** op GitHub voor meldingen
- **Geef het repository een ster** om steun te tonen en anderen te helpen het project te ontdekken
- **Sluit u aan bij de [Discord](https://discord.gg/ever)** voor realtime updates
- **Volg [@everworks](https://twitter.com/everworks)** op Twitter

## Contact

- **E-mail:** [ever@ever.co](mailto:ever@ever.co)
- **Website:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
