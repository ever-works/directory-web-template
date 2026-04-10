---
title: Erste Bereitstellung
sidebar_label: Erste Bereitstellung
sidebar_position: 4
---

# Erste Bereitstellung

In der Produktion bereitstellen.

## Option 1: Vercel (Empfohlen)

1. Pushen Sie Ihren Code zu GitHub
2. Gehen Sie zu https://vercel.com/new
3. Importieren Sie Ihr Repository
4. Fügen Sie alle Umgebungsvariablen aus Ihrer .env.local hinzu
5. Klicken Sie auf Bereitstellen

## Option 2: Docker

```bash
# Image erstellen
docker build -t directory-web .

# Container ausführen
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  directory-web
```

## Option 3: Selbst gehostet (Node.js)

```bash
pnpm build
pnpm start
```

## Checkliste nach der Bereitstellung

- [ ] Umgebungsvariablen gesetzt
- [ ] Datenbank verbunden und migriert
- [ ] Domain konfiguriert
- [ ] SSL-Zertifikat aktiv
- [ ] Admin-Konto erstellt
- [ ] Inhalt aus dem Daten-Repository synchronisiert
