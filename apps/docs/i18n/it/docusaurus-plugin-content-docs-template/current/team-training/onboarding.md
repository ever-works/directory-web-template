---
id: onboarding
title: Guida all'Onboarding
sidebar_label: Onboarding
sidebar_position: 2
---

# Guida all'Onboarding

Benvenuto in Ever Works! Questa guida ti aiuterà a configurare il tuo ambiente di sviluppo ed effettuare il tuo primo contributo.

## 🎯 Obiettivi

Al termine di questo modulo:

- ✅ Avrai un ambiente di sviluppo completamente configurato
- ✅ Capirai la struttura del progetto
- ✅ Potrai eseguire l'applicazione localmente
- ✅ Avrai effettuato la tua prima modifica al codice
- ✅ Capirai il flusso di sviluppo

**Tempo stimato**: 1–2 giorni

---

## Passo 1: Configurazione dell'Ambiente

### 1.1 Installare gli strumenti necessari

Segui la [Guida all'Installazione](/getting-started/installation) dettagliata per installare:

- Node.js 20.19.0+
- pnpm ([installazione](https://pnpm.io/installation))
- PostgreSQL 14+
- Git
- VS Code (consigliato)

### 1.2 Clonare il Repository

```bash
git clone https://github.com/ever-co/ever-works.git
cd ever-works
pnpm install
```

### 1.3 Configurare le Variabili d'Ambiente

**Lista di controllo rapida**:

- [ ] Connessione al database configurata
- [ ] Segreti di autenticazione impostati
- [ ] Chiavi del provider di pagamento aggiunte (opzionale per lo sviluppo)

---

## Passo 2: Configurazione del Database

### 2.1 Avviare PostgreSQL

```bash
docker run --name everworks-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=everworks \
  -p 5432:5432 \
  -d postgres:14
```

### 2.2 Eseguire le Migrazioni

```bash
cd apps/web
pnpm exec drizzle-kit push
pnpm run db:seed
```

---

## Passo 3: Avviare il Server di Sviluppo

```bash
pnpm run dev
```

Verifica nel browser:

- [ ] La homepage si carica su `http://localhost:3000`
- [ ] Puoi creare un account
- [ ] Puoi accedere/disconnetterti
- [ ] La documentazione API è accessibile su `http://localhost:3000/api/reference`

---

## Passo 4: Capire la Struttura del Progetto

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

## Passo 5: Flusso di Sviluppo

### 5.1 Creare un branch per la funzionalità

```bash
git checkout main
git pull origin main
git checkout -b feature/nome-della-funzionalita
```

### 5.2 Eseguire il commit e il push

```bash
git add .
git commit -m "feat: aggiungere sistema di notifiche utente"
git push origin feature/nome-della-funzionalita
```

---

## ✅ Checklist di Onboarding

- [ ] Ambiente di sviluppo completamente configurato
- [ ] Applicazione in esecuzione localmente
- [ ] Database connesso e popolato
- [ ] Struttura del progetto compresa
- [ ] Primo branch creato
- [ ] Primo commit effettuato

---

## Prossimi Passi

1. [Documentazione API](/team-training/api-documentation) – Impara il sistema di documentazione
2. [Best Practices](/team-training/best-practices) – Impara gli standard di codifica
3. [Esercitazioni](/team-training/exercises) – Esercitati con compiti reali

Hai bisogno di aiuto? Chiedi al tuo mentor o controlla il canale Slack del team! 🚀
