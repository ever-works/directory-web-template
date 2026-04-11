---
id: roadmap
title: Roadmap & Zukunftsplanung
sidebar_label: Roadmap
---

# Roadmap & Zukunftsplanung

Diese Seite beschreibt die aktuelle Entwicklungsrichtung des Directory Web Templates und wie die Community an der Gestaltung seiner Zukunft teilnehmen kann.

## Produktvision

Das Directory Web Template strebt danach, die umfassendste Open-Source-Lösung für den Aufbau professioneller Verzeichniswebsites zu sein. Die langfristige Vision umfasst:

- **Produktionsreife Verzeichniswebsites**, die schön, leistungsfähig und vollständig anpassbar sind
- **Einfaches Content-Management** durch das Git-basierte CMS mit optionaler KI-gestützter Inhaltsgenerierung über die [Ever Works Platform](https://docs.ever.works)
- **Erweiterbare Zahlung und Authentifizierung** mit sofortiger Unterstützung für mehrere Anbieter
- **Erstklassige Internationalisierung** mit vollständiger RTL-Unterstützung und wachsender Sprachabdeckung

## Aktive Entwicklungsbereiche

### Performance und Core Web Vitals

- Optimierung des Largest Contentful Paint (LCP) für Element-Listing- und Detailseiten
- Reduzierung der JavaScript-Bundle-Größe durch besseres Code-Splitting und Tree-Shaking
- Verbesserung der Bildoptimierungspipeline für Screenshots und Logos von Verzeichniselementen
- Implementierung von Partial Prerendering für schnellere anfängliche Seitenladevorgänge

### Funktionserweiterungen

- Hinzufügen weiterer Filter- und Suchfunktionen (facettierte Suche, erweiterte Filter)
- Implementierung von nutzergenerierten Inhaltsfunktionen (Bewertungen, Ratings, Kommentare)
- Hinzufügen weiterer Zahlungsanbieter-Integrationen und Abonnementverwaltungsfunktionen
- Erweiterung des Theming-Systems mit mehr integrierten Themes und einfacherer Anpassung

### Entwicklererlebnis

- Verbesserung der lokalen Entwicklungseinrichtung mit besserer Dokumentation und Fehlermeldungen
- Hinzufügen einer umfassenderen E2E-Testabdeckung mit Playwright
- Erstellen von Starter-Templates für gängige Verzeichnistypen (SaaS, lokale Unternehmen, Ressourcen)
- Verbesserung der TypeScript-Typsicherheit in der gesamten Codebasis

### Internationalisierung

- Hinzufügen weiterer integrierter Sprachübersetzungen
- Verbesserung der RTL-Layout-Unterstützung für Arabisch und Hebräisch
- Unterstützung der sprachspezifischen Konfiguration pro Verzeichnis
- Hinzufügen automatisierter Übersetzungsworkflows

### Dokumentation

- Erweiterung der API-Referenzdokumentation mit mehr Beispielen
- Hinzufügen von Video-Tutorials für häufige Aufgaben
- Erstellen von Architecture Decision Records (ADRs) für wichtige Designentscheidungen
- Entwicklung interaktiver Anleitungen und Playground-Umgebungen

## Wie man Funktionen vorschlägt

### GitHub Issues

Der primäre Weg, Funktionen vorzuschlagen, sind GitHub Issues unter [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Beim Erstellen einer Funktionsanfrage:

1. **Prüfen Sie vorhandene Issues** zuerst, um Duplikate zu vermeiden.
2. **Beschreiben Sie das Problem**, das Sie lösen möchten, nicht nur die gewünschte Lösung.
3. **Geben Sie Kontext** zu Ihrem Anwendungsfall, Verzeichnistyp und Umfang an.
4. **Fügen Sie Beispiele** bei (Mockups, API-Schemas, Konfigurationsbeispiele).

### GitHub Discussions

Für breitere Ideen, die Community-Input benötigen: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Treten Sie dem [Ever Works Discord](https://discord.gg/ever) für Echtzeit-Gespräche über Funktionen und Projektrichtung bei.

## Wie Prioritäten festgelegt werden

| Faktor                        | Gewichtung | Beschreibung                                                         |
| ----------------------------- | ----------- | -------------------------------------------------------------------- |
| **Nutzernachfrage**           | Hoch        | Anzahl der Anfragen, Upvotes und Community-Interesse                 |
| **Strategische Ausrichtung**  | Hoch        | Wie gut die Funktion mit der Produktvision übereinstimmt             |
| **Implementierungsaufwand**   | Mittel      | Komplexität, Zeitinvestition und Wartungsaufwand                     |
| **Risiko von Breaking Changes** | Mittel    | Potenzial zur Unterbrechung bestehender Nutzer                       |
| **Beitragsverfügbarkeit**     | Mittel      | Ob Maintainer oder Community-Mitglieder es übernehmen können         |

### Prioritätsstufen

- **P0 (Kritisch):** Sicherheitslücken, Datenverlust-Fehler oder blockierende Issues. Werden sofort behoben.
- **P1 (Hoch):** Funktionen oder Korrekturen, an denen aktiv für das nächste Release gearbeitet wird.
- **P2 (Mittel):** Genehmigte Funktionen, die geplant, aber noch nicht terminiert sind.
- **P3 (Niedrig):** Schöne Verbesserungen. Gute Kandidaten für Community-Beiträge.

## Zur Roadmap beitragen

1. **Gut formulierte Funktionsanfragen einreichen** mit klaren Problembeschreibungen und Anwendungsfällen.
2. **Code beisteuern.** Pull Requests sind der schnellste Weg von der Idee zur Realität. Siehe die [Beitragsanleitung](/contributing).
3. **An Diskussionen teilnehmen.** Geben Sie Feedback zu Vorschlägen und teilen Sie Ihre Erfahrungen.
4. **Fehler melden.** Zuverlässige Fehlerberichte helfen dabei, Korrekturen zu priorisieren und die Stabilität zu verbessern.

## Release-Kadenz

Releases werden veröffentlicht, wenn eine bedeutungsvolle Menge an Funktionen und Korrekturen bereit ist:

- **Patch-Releases** (Fehlerbehebungen) werden nach Bedarf veröffentlicht, oft wöchentlich bei aktiver Entwicklung.
- **Minor-Releases** (neue Funktionen) werden ungefähr monatlich veröffentlicht.
- **Major-Releases** (Breaking Changes) sind selten und werden von Migrationsanleitungen begleitet.

Siehe die Seite [Changelog & Versionierung](/changelog) für Details.

## Auf dem Laufenden bleiben

- **Beobachten Sie das Repository** auf GitHub für Benachrichtigungen
- **Markieren Sie das Repository** als Favorit, um Unterstützung zu zeigen und anderen zu helfen, das Projekt zu entdecken
- **Treten Sie dem [Discord](https://discord.gg/ever) bei** für Echtzeit-Updates
- **Folgen Sie [@everworks](https://twitter.com/everworks)** auf Twitter

## Kontakt

- **E-Mail:** [ever@ever.co](mailto:ever@ever.co)
- **Website:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
