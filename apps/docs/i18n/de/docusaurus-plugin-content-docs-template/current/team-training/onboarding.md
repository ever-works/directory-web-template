---
id: onboarding
title: Onboarding-Leitfaden
sidebar_label: Onboarding
sidebar_position: 2
---

# Onboarding-Leitfaden

Willkommen bei Ever Works! Dieser Leitfaden hilft Ihnen dabei, Ihre Entwicklungsumgebung einzurichten und Ihren ersten Beitrag zu leisten.

## 🎯 Lernziele

Am Ende dieses Moduls werden Sie:

- ✅ Eine vollständig konfigurierte Entwicklungsumgebung haben
- ✅ Die Projektstruktur verstehen
- ✅ Die Anwendung lokal ausführen
- ✅ Ihre erste Code-Änderung vorgenommen haben
- ✅ Den Entwicklungsworkflow verstehen

**Geschätzte Zeit**: 1–2 Tage

---

## Schritt 1: Einrichtung der Umgebung

### 1.1 Erforderliche Werkzeuge installieren

Folgen Sie dem detaillierten [Installationsleitfaden](/getting-started/installation), um zu installieren:

- Node.js 20.19.0+
- pnpm ([installieren](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (empfohlen)

### 1.2 Repository klonen

```bash
# Repository klonen
git clone https://github.com/ever-co/ever-works.git
cd ever-works

# Abhängigkeiten installieren (pnpm ist der Monorepo-Paketmanager)
pnpm install
```

### 1.3 Umgebungsvariablen konfigurieren

Folgen Sie dem [Leitfaden zur Umgebungseinrichtung](/getting-started/environment-setup), um Ihre `apps/web/.env.local`-Datei zu konfigurieren.

**Schnell-Checkliste**:

- [ ] Datenbankverbindung konfiguriert
- [ ] Authentifizierungs-Secrets gesetzt
- [ ] Zahlungsanbieter-Schlüssel hinzugefügt (optional für Entwicklung)
- [ ] E-Mail-Dienst konfiguriert (optional für Entwicklung)

---

## Schritt 2: Datenbankeinrichtung

### 2.1 PostgreSQL starten

```bash
# Mit Docker (empfohlen)
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14

# Oder lokale PostgreSQL-Installation verwenden
```

### 2.2 Migrationen ausführen

```bash
# Datenbankbefehle vom Web-App-Verzeichnis ausführen
cd apps/web

# Schema in Datenbank übertragen
pnpm exec drizzle-kit push

# (Optional) Mit Beispieldaten befüllen
pnpm run db:seed
```

### 2.3 Datenbankverbindung prüfen

```bash
# Drizzle Studio öffnen, um die Datenbank zu inspizieren (von apps/web/)
pnpm exec drizzle-kit studio

# Zugriff unter http://localhost:4983
```

---

## Schritt 3: Entwicklungsserver starten

### 3.1 Anwendung ausführen

```bash
# Entwicklungsserver starten (vom Monorepo-Root)
pnpm run dev

# Oder nur die Web-App starten
pnpm run dev:web

# Server startet unter http://localhost:3000
```

### 3.2 Installation prüfen

Browser öffnen und prüfen:

- [ ] Startseite lädt unter `http://localhost:3000`
- [ ] Konto erstellen möglich
- [ ] Anmelden/Abmelden funktioniert
- [ ] API-Dokumentation zugänglich unter `http://localhost:3000/api/reference`
- [ ] Keine Konsolenfehler in den Browser-DevTools

:::tip Erstmalige Einrichtung
Bei Problemen den [Fehlerbehebungsleitfaden](/getting-started/installation#troubleshooting) prüfen oder den Mentor fragen.
:::

---

## Schritt 4: Projektstruktur verstehen

### 4.1 Wichtige Verzeichnisse

```
directory-web-template/                       # Turborepo-Monorepo-Root
├── apps/
│   ├── web/                      # Next.js-Webanwendung
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── api/              # API-Routen
│   │   │   ├── [locale]/         # Internationalisierte Seiten
│   │   │   └── layout.tsx        # Root-Layout
│   │   ├── components/           # React-Komponenten
│   │   │   ├── ui/               # UI-Komponenten (HeroUI)
│   │   │   └── ...
│   │   ├── lib/                  # Hilfsmittel und Bibliotheken
│   │   │   ├── db/               # Datenbank (Drizzle ORM)
│   │   │   ├── auth/             # Authentifizierung
│   │   │   └── ...
│   │   ├── public/               # Statische Assets
│   │   ├── .content/             # Git-basierter CMS-Inhalt
│   │   └── messages/             # i18n-Übersetzungen
│   ├── web-e2e/                  # Playwright-E2E-Tests
│   └── docs/                     # Dokumentationsseite
├── packages/                     # Gemeinsame Konfigurationen und Bibliotheken
├── turbo.json                    # Turborepo-Pipeline-Konfiguration
├── pnpm-workspace.yaml           # pnpm-Workspace-Definition
└── package.json                  # Root-package.json
```

### 4.2 Wichtige Dateien

- `apps/web/app/api/**/route.ts` – API-Endpunkte
- `apps/web/lib/db/schema/` – Datenbankschemata
- `apps/web/components/` – React-Komponenten
- `apps/web/messages/` – Übersetzungsdateien
- `apps/web/.env.local` – Umgebungsvariablen
- `turbo.json` – Turborepo-Pipeline-Konfiguration
- `pnpm-workspace.yaml` – Workspace-Paketdefinitionen

[Mehr über die Architektur →](/architecture/overview)

---

## Schritt 5: Entwicklungsworkflow

### 5.1 Feature-Branch erstellen

```bash
# Immer einen Branch von main erstellen
git checkout main
git pull origin main
git checkout -b feature/ihr-feature-name
```

### 5.2 Änderungen vornehmen

1. **Zu ändernde Dateien identifizieren**
2. **Änderungen vornehmen**
3. **Lokal testen**
4. **API-Dokumentation generieren** (wenn API-Routen geändert wurden)

```bash
# Wenn Sie API-Routen geändert haben (von apps/web/)
cd apps/web && pnpm run generate-docs
```

### 5.3 Committen und Pushen

```bash
# Änderungen stagen
git add .

# Mit beschreibender Nachricht committen
git commit -m "feat: Benutzer-Benachrichtigungssystem hinzufügen"

# Zum Remote pushen
git push origin feature/ihr-feature-name
```

### 5.4 Pull Request erstellen

1. Zum GitHub-Repository gehen
2. Pull Request vom Ihrem Branch erstellen
3. PR-Vorlage ausfüllen
4. Code-Review anfordern
5. Feedback berücksichtigen
6. Nach Genehmigung zusammenführen

:::tip Commit-Nachrichten
[Conventional Commits](https://www.conventionalcommits.org/) befolgen:

- `feat:` – Neue Funktion
- `fix:` – Fehlerbehebung
- `docs:` – Dokumentationsänderungen
- `refactor:` – Code-Refactoring
- `test:` – Tests hinzufügen
:::

---

## Schritt 6: Ihre erste Aufgabe

### 6.1 Übungsaufgabe

Versuchen Sie diese einfache Aufgabe, um sich mit dem Workflow vertraut zu machen:

**Aufgabe**: Einen neuen API-Endpunkt hinzufügen, der Server-Informationen zurückgibt

1. `apps/web/app/api/server-info/route.ts` erstellen
2. Swagger-Dokumentation hinzufügen
3. Dokumentation mit `cd apps/web && pnpm run generate-docs` generieren
4. In der Scalar UI testen
5. Einen PR erstellen

[Detaillierte Übung ansehen →](/team-training/exercises#exercise-1-simple-get-route)

---

## ✅ Onboarding-Checkliste

Bevor Sie zum nächsten Modul übergehen, stellen Sie sicher:

- [ ] Entwicklungsumgebung vollständig eingerichtet
- [ ] Anwendung läuft lokal
- [ ] Datenbank verbunden und befüllt
- [ ] Projektstruktur verstanden
- [ ] Entwicklungsworkflow bekannt
- [ ] Ersten Branch erstellt
- [ ] Ersten Commit vorgenommen
- [ ] Übungsaufgabe abgeschlossen

---

## Nächste Schritte

Gut gemacht! Sie sind bereit für:

1. [API-Dokumentation](/team-training/api-documentation) – Das Dokumentationssystem erlernen
2. [Best Practices](/team-training/best-practices) – Codierungsstandards erlernen
3. [Übungen](/team-training/exercises) – Mit echten Aufgaben üben

---

## Weitere Ressourcen

- [Schnellreferenz](/getting-started/quick-reference) – Wesentliche Befehle und Muster
- [Tech-Stack](/architecture/tech-stack) – Verwendete Technologien
- [Testleitfaden](/development/testing) – Wie man Tests schreibt

Benötigen Sie Hilfe? Fragen Sie Ihren Mentor oder schauen Sie im Team-Slack-Kanal nach! 🚀
