---
id: cron-verification
title: Verifica Cron Vercel
sidebar_label: Verifica Cron
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Checklist di Verifica

## 🎯 Risposta Rapida alle Domande

### Domanda 1: Funziona su Vercel senza Trigger.dev?
**✅ SÌ** – Il sistema è correttamente configurato per usare Vercel Crons quando:
- `VERCEL=1` (impostato automaticamente da Vercel)
- Le variabili d'ambiente di Trigger.dev **NON** sono impostate

### Domanda 2: Come verificare che funzioni?
**✅ Seguire i 4 passaggi sottostanti**

---

## 📊 Stato Attuale della Configurazione

### ✅ Cosa è stato corretto

| Componente | Stato | Dettagli |
|-----------|-------|---------|
| `vercel.json` | ✅ **CORRETTO** | Include ora **tutti e 3** i cron job (prima era solo 1) |
| `initialize-jobs.ts` | ✅ **CORRETTO** | Registra ora **tutti e 3** i job (prima erano solo 2) |
| Endpoint API | ✅ **OK** | Tutti e 3 gli endpoint esistono e funzionano |
| Documentazione | ✅ **CREATA** | Nuova guida `CRON_JOBS.md` |

### 📋 Lista Completa dei Cron Job

| # | Nome Job | Endpoint | Pianificazione | Scopo |
|---|----------|----------|----------------|-------|
| 1 | Sync Repository | `/api/cron/sync` | `*/5 * * * *` | Sincronizza contenuti ogni 5 minuti |
| 2 | Promemoria Rinnovo | `/api/cron/subscription-reminders` | `0 9 * * *` | Invia email di promemoria alle 9 ogni giorno |
| 3 | Pulizia Scadenza | `/api/cron/subscription-expiration` | `0 0 * * *` | Elabora abbonamenti scaduti a mezzanotte |

---

## 🔍 Processo di Verifica in 4 Passi

### Passo 1: Controllare il Dashboard di Vercel – Cron Jobs

**Modello URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Per awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Cosa cercare:**
- [ ] Mostra **3 cron job** (non solo 1)
- [ ] Ognuno ha la pianificazione corretta
- [ ] Tutti mostrano lo stato "Attivo"

**Risultato atteso:**

| Percorso | Pianificazione | Stato |
|----------|----------------|-------|
| `/api/cron/sync` | Ogni 5 minuti | ✅ Attivo |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Attivo |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Attivo |

---

### Passo 2: Controllare i Log di Vercel

**Modello URL:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Controllare ogni endpoint:**

#### A. Log di Sync
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] I log appaiono ogni 5 minuti
- [ ] I codici di stato sono 200 (successo)
- [ ] Nessun errore 401 (autenticazione)
- [ ] Nessun errore 500 (crash)

#### B. Log dei Promemoria
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] I log appaiono una volta al giorno alle 9:00
- [ ] I codici di stato sono 200 o 207 (successo/successo parziale)

#### C. Log di Scadenza
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] I log appaiono una volta al giorno a mezzanotte
- [ ] I codici di stato sono 200 (successo)

---

### Passo 3: Controllare i Log dell'Applicazione

**Cercare questi messaggi di log:**

#### All'Avvio dell'Applicazione
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Questo conferma:** Il sistema ha rilevato l'ambiente Vercel

#### Ad Ogni Sync (ogni 5 min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### Ai Promemoria di Rinnovo (ore 9 quotidiane)
```
[Cron] Subscription reminders job completed
```

#### Alla Pulizia Scadenze (mezzanotte quotidiana)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Passo 4: Controllare le Variabili d'Ambiente

**Richieste:**
```bash
CRON_SECRET=<impostato-in-vercel>
```

**NON impostate (per usare Vercel, non Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<deve-essere-vuoto>
TRIGGER_API_KEY=<deve-essere-vuoto>
TRIGGER_API_URL=<deve-essere-vuoto>
```

**Controllare via Vercel CLI:**
```bash
vercel env ls
```

**Controllare via Dashboard:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/environment-variables
```

---

## 🚨 Problemi Comuni & Soluzioni

### Problema 1: Solo 1 cron job visibile in Vercel

**Causa:** Vecchio `vercel.json` distribuito  
**Soluzione:**
1. ✅ `vercel.json` è ora corretto (3 cron)
2. Ridistribuire su Vercel: `git push` o `vercel --prod`
3. Attendere 1-2 minuti per la registrazione dei nuovi cron da parte di Vercel

---

### Problema 2: Errori 401 Non Autorizzato

**Causa:** `CRON_SECRET` non impostato o non corrispondente  
**Soluzione:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Problema 3: I Job non vengono eseguiti affatto

**Causa:** Utilizzo della modalità Trigger.dev invece della modalità Vercel

**Controllo:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
