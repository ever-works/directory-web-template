---
id: cron-verification
title: Vercel Cron Verificatie
sidebar_label: Cron Verificatie
sidebar_position: 9
---

# ✅ Vercel Cron Jobs – Verificatiechecklist

## 🎯 Snel Antwoord op Uw Vragen

### Vraag 1: Werkt het op Vercel zonder Trigger.dev?
**✅ JA** – Het systeem is correct geconfigureerd om Vercel Crons te gebruiken wanneer:
- `VERCEL=1` (automatisch ingesteld door Vercel)
- Trigger.dev-omgevingsvariabelen zijn **NIET** ingesteld

### Vraag 2: Hoe verifieer ik dat het werkt?
**✅ Volg de 4 stappen hieronder**

---

## 📊 Huidige Configuratiestatus

### ✅ Wat is opgelost

| Component | Status | Details |
|-----------|--------|---------|
| `vercel.json` | ✅ **OPGELOST** | Bevat nu **alle 3** cron-taken (was slechts 1) |
| `initialize-jobs.ts` | ✅ **OPGELOST** | Registreert nu **alle 3** taken (was slechts 2) |
| API-eindpunten | ✅ **OK** | Alle 3 eindpunten bestaan en werken |
| Documentatie | ✅ **AANGEMAAKT** | Nieuwe `CRON_JOBS.md`-handleiding |

### 📋 Volledige Lijst van Cron-taken

| # | Taaknaam | Eindpunt | Schema | Doel |
|---|----------|----------|--------|------|
| 1 | Repository-sync | `/api/cron/sync` | `*/5 * * * *` | Synchroniseert inhoud elke 5 minuten |
| 2 | Verlengingsherinneringen | `/api/cron/subscription-reminders` | `0 9 * * *` | Stuurt herinneringse-mails dagelijks om 9 uur |
| 3 | Vervalingsopschoning | `/api/cron/subscription-expiration` | `0 0 * * *` | Verwerkt verlopen abonnementen om middernacht |

---

## 🔍 4-Staps Verificatieproces

### Stap 1: Vercel Dashboard controleren – Cron-taken

**URL-sjabloon:**
```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

**Voor awesome-time-tracking-website:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**Waar op te letten:**
- [ ] Toont **3 cron-taken** (niet slechts 1)
- [ ] Elk heeft het juiste schema
- [ ] Allemaal tonen status "Actief"

**Verwacht resultaat:**

| Pad | Schema | Status |
|-----|--------|--------|
| `/api/cron/sync` | Elke 5 minuten | ✅ Actief |
| `/api/cron/subscription-reminders` | 0 9 * * * | ✅ Actief |
| `/api/cron/subscription-expiration` | 0 0 * * * | ✅ Actief |

---

### Stap 2: Vercel-logboeken controleren

**URL-sjabloon:**
```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths={PATH}
```

**Elk eindpunt controleren:**

#### A. Sync-logboeken
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```
- [ ] Logboeken verschijnen elke 5 minuten
- [ ] Statuscodes zijn 200 (succes)
- [ ] Geen 401-fouten (authenticatie)
- [ ] Geen 500-fouten (crashes)

#### B. Herinneringslogboeken
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-reminders
```
- [ ] Logboeken verschijnen eenmaal dagelijks om 9:00 uur
- [ ] Statuscodes zijn 200 of 207 (succes/gedeeltelijk succes)

#### C. Vervalingslogboeken
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsubscription-expiration
```
- [ ] Logboeken verschijnen eenmaal dagelijks om middernacht
- [ ] Statuscodes zijn 200 (succes)

---

### Stap 3: Toepassingslogboeken controleren

**Zoek naar deze logberichten:**

#### Bij het starten van de toepassing
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

**✅ Dit bevestigt:** Systeem heeft Vercel-omgeving gedetecteerd

#### Bij elke synchronisatie (elke 5 min.)
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

#### Bij verlengingsherinneringen (dagelijks 9 uur)
```
[Cron] Subscription reminders job completed
```

#### Bij vervalingsopschoning (dagelijks middernacht)
```
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: N subscriptions expired
```

---

### Stap 4: Omgevingsvariabelen controleren

**Vereist:**
```bash
CRON_SECRET=<ingesteld-in-vercel>
```

**NIET ingesteld (om Vercel te gebruiken, niet Trigger.dev):**
```bash
TRIGGER_SECRET_KEY=<moet-leeg-zijn>
TRIGGER_API_KEY=<moet-leeg-zijn>
TRIGGER_API_URL=<moet-leeg-zijn>
```

**Via Vercel CLI controleren:**
```bash
vercel env ls
```

**Via Dashboard controleren:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/environment-variables
```

---

## 🚨 Veelvoorkomende Problemen & Oplossingen

### Probleem 1: Slechts 1 cron-taak zichtbaar in Vercel

**Oorzaak:** Verouderde `vercel.json` werd geïmplementeerd  
**Oplossing:**
1. ✅ `vercel.json` is nu opgelost (3 crons)
2. Opnieuw implementeren op Vercel: `git push` of `vercel --prod`
3. 1-2 minuten wachten totdat Vercel nieuwe crons registreert

---

### Probleem 2: 401 Niet-geautoriseerde fouten

**Oorzaak:** `CRON_SECRET` niet ingesteld of komt niet overeen  
**Oplossing:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

---

### Probleem 3: Taken worden helemaal niet uitgevoerd

**Oorzaak:** Trigger.dev-modus wordt gebruikt in plaats van Vercel-modus

**Controle:**
```bash
# Should NOT be set
vercel env ls | grep TRIGGER
```
