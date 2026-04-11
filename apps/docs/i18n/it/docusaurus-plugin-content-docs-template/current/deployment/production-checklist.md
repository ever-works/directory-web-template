---
id: production-checklist
title: Checklist di Prontezza per la Produzione
sidebar_label: Checklist Produzione
sidebar_position: 7
---

# Checklist di Prontezza per la Produzione

Una checklist completa per garantire che la tua distribuzione Ever Works sia pronta per la produzione.

## Checklist Pre-Distribuzione

### 1. Configurazione dell'Ambiente

#### Variabili d'Ambiente Obbligatorie

- [ ] **Database**
  - `DATABASE_URL` configurato con PostgreSQL di produzione
  - Connection pooling del database abilitato
  - Modalità SSL abilitata per la produzione

- [ ] **Autenticazione**
  - `NEXTAUTH_URL` impostato sul dominio di produzione
  - `NEXTAUTH_SECRET` generato (minimo 32 caratteri)
  - Provider OAuth configurati (Google, GitHub, ecc.)
  - Credenziali Supabase Auth (se utilizzate)

- [ ] **Provider di Pagamento**
  - Chiavi di produzione Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Chiavi di produzione LemonSqueezy (se utilizzate)
  - Secrets webhook configurati
  - Modalità di test disabilitata

- [ ] **Servizi Email**
  - Chiave API Resend configurata
  - Credenziali Novu impostate (se utilizzate)
  - Template email testati
  - Dominio mittente verificato

- [ ] **Analytics & Monitoraggio**
  - Chiave di produzione PostHog
  - Sentry DSN configurato
  - Provider di tracciamento eccezioni impostato
  - Vercel Analytics abilitato (se su Vercel)

- [ ] **Integrazione CRM**
  - Credenziali Twenty CRM (se utilizzate)
  - Endpoint webhook configurati

- [ ] **Sicurezza**
  - `NODE_ENV=production`
  - Rate limiting configurato
  - Impostazioni CORS revisionate
  - Header CSP configurati

### 2. Database

- [ ] **Schema & Migrazioni**
  - Tutte le migrazioni applicate
  - Schema del database corrisponde al codice
  - Indici creati per le prestazioni
  - Vincoli di chiave esterna validati

- [ ] **Integrità dei Dati**
  - Dati seed caricati (se necessario)
  - Dati di test rimossi
  - Regole di validazione dei dati in atto

- [ ] **Backup & Ripristino**
  - Backup automatici configurati
  - Ripristino da backup testato
  - Ripristino point-in-time abilitato
  - Policy di conservazione dei backup impostata

- [ ] **Prestazioni**
  - Connection pooling configurato
  - Prestazioni delle query ottimizzate
  - Logging delle query lente abilitato
  - Monitoraggio del database attivo

### 3. Sicurezza

- [ ] **Autenticazione & Autorizzazione**
  - Hashing delle password verificato (bcrypt)
  - Gestione delle sessioni sicura
  - Token JWT firmati correttamente
  - Controllo degli accessi basato sui ruoli testato

- [ ] **Protezione dei Dati**
  - Dati PII cifrati a riposo
  - Oscuramento dei dati sensibili configurato
  - HTTPS applicato
  - Cookie sicuri abilitati

- [ ] **Sicurezza API**
  - Rate limiting attivo
  - Autenticazione API obbligatoria
  - Validazione degli input su tutti gli endpoint
  - Prevenzione SQL injection verificata

- [ ] **Dipendenze**
  - Tutte le dipendenze aggiornate
  - Vulnerabilità di sicurezza scansionate (`npm audit`)
  - Nessuna vulnerabilità critica
  - File di lock delle dipendenze committato

### 4. Prestazioni

- [ ] **Ottimizzazione Frontend**
  - Immagini ottimizzate (componente Next.js Image)
  - Code splitting implementato
  - Lazy loading per componenti pesanti
  - Dimensione bundle analizzata

- [ ] **Caching**
  - Asset statici nella cache
  - Risposte API nella cache (dove appropriato)
  - CDN configurato
  - Strategia di invalidazione della cache in atto

- [ ] **Core Web Vitals**
  - LCP < 2,5s
  - FID < 100ms
  - CLS < 0,1
  - Monitoraggio delle prestazioni attivo

- [ ] **Query del Database**
  - Query N+1 eliminate
  - Indici appropriati creati
  - Caching delle query abilitato
  - Connection pooling ottimizzato

### 5. Monitoraggio & Logging

- [ ] **Tracciamento degli Errori**
  - Sentry/PostHog configurato
  - Avvisi di errore impostati
  - Source map caricate
  - Raggruppamento degli errori configurato

- [ ] **Monitoraggio dell'Applicazione**
  - Endpoint health check (`/api/health`)
  - Monitoraggio uptime configurato
  - Metriche di prestazione tracciate
  - Metriche personalizzate definite

- [ ] **Logging**
  - Logging strutturato implementato
  - Livelli di log configurati
  - Aggregazione dei log impostata
  - Policy di conservazione dei log definita

- [ ] **Avvisi**
  - Avvisi per errori critici
  - Avvisi di degradazione delle prestazioni
  - Avvisi di uptime
  - Avvisi di fallimento dei pagamenti

### 6. Contenuto & Dati

- [ ] **CMS basato su Git**
  - Repository `.content` configurato
  - Sincronizzazione dei contenuti funzionante
  - Credenziali Git protette
  - Strategia di backup dei contenuti

- [ ] **Asset Multimediali**
  - Immagini ottimizzate
  - CDN configurato per i media
  - Limiti di upload configurati
  - Quota di archiviazione monitorata

- [ ] **Internazionalizzazione**
  - Tutte le traduzioni complete
  - Supporto RTL testato (Arabo)
  - Rilevamento locale funzionante
  - Formattazione data/numero verificata

### 7. Documentazione API

- [ ] **Sistema di Documentazione**
  - Spec OpenAPI generata (`yarn generate-docs`)
  - Scalar UI accessibile su `/api/reference`
  - Tutti gli endpoint documentati
  - Esempi testati

- [ ] **Standard API**
  - Convenzioni di denominazione coerenti
  - Codici di stato HTTP corretti
  - Risposte di errore standardizzate
  - Rate limiting documentato

### 8. Sistema di Pagamento

- [ ] **Configurazione Stripe**
  - Modalità produzione abilitata
  - Webhook configurati e testati
  - Portale clienti abilitato
  - Impostazioni fattura configurate

- [ ] **Configurazione LemonSqueezy** (se utilizzato)
  - Credenziali di produzione impostate
  - Webhook configurati
  - Conformità fiscale verificata

- [ ] **Gestione degli Abbonamenti**
  - Creazione dei piani testata
  - Flussi upgrade/downgrade testati
  - Flusso di cancellazione testato
  - Processo di rimborso documentato

### 9. Sistema Email

- [ ] **Email Transazionali**
  - Email di benvenuto testata
  - Reset password testato
  - Verifica email testata
  - Email di abbonamento testate

- [ ] **Template Email**
  - Tutti i template revisionati
  - Branding coerente
  - Responsive per mobile
  - Link di disiscrizione funzionanti

- [ ] **Consegnabilità**
  - Record SPF configurati
  - DKIM configurato
  - Policy DMARC impostata
  - Reputazione del mittente monitorata

### 10. Test

- [ ] **Test Funzionali**
  - Flusso di registrazione utente
  - Flusso di login/logout
  - Flusso di reset password
  - Flusso di invio elementi
  - Flusso di pagamento
  - Funzioni amministratore

- [ ] **Test Cross-browser**
  - Chrome testato
  - Firefox testato
  - Safari testato
  - Edge testato
  - Browser mobile testati

- [ ] **Test Responsive**
  - Mobile (320px – 480px)
  - Tablet (768px – 1024px)
  - Desktop (1280px+)
  - Schermi grandi (1920px+)

- [ ] **Test di Carico**
  - Traffico previsto simulato
  - Prestazioni database sotto carico
  - Tempi di risposta API accettabili
  - Nessuna perdita di memoria

### 11. Conformità & Legale

- [ ] **Privacy**
  - Informativa sulla privacy pubblicata
  - Consenso ai cookie implementato
  - Conformità GDPR (per utenti UE)
  - Funzionalità di esportazione dati

- [ ] **Termini di Servizio**
  - Termini di servizio pubblicati
  - Flusso di accettazione utente
  - Tracciamento versione dei termini

- [ ] **Accessibilità**
  - Conformità WCAG 2.1 AA
  - Navigazione da tastiera funzionante
  - Screen reader testato
  - Testo alternativo per le immagini

### 12. DevOps & Infrastruttura

- [ ] **Distribuzione**
  - Pipeline CI/CD configurata
  - Test automatizzati nella pipeline
  - Piano di rollback della distribuzione
  - Distribuzione a zero downtime

- [ ] **Scalabilità**
  - Auto-scaling configurato
  - Load balancer configurato
  - Repliche di lettura del database (se necessario)
  - CDN per asset statici

- [ ] **Disaster Recovery**
  - Ripristino da backup testato
  - Piano di failover documentato
  - Piano di risposta agli incidenti
  - Rotazione on-call definita

- [ ] **Documentazione**
  - Guida alla distribuzione aggiornata
  - Runbook creato
  - Diagrammi di architettura aggiornati
  - Formazione del team completata

---

## Comandi di Verifica

Esegui questi comandi per verificare la prontezza alla produzione:

### Audit di Sicurezza

```bash
# Verificare le vulnerabilità di sicurezza
npm audit --production

# Correggere le vulnerabilità
npm audit fix

# Verificare le dipendenze obsolete
npm outdated
```

### Verifica Build

```bash
# Build di produzione
npm run build

# Verificare l'output del build
ls -lh .next/

# Analizzare la dimensione del bundle
npm run analyze
```

### Verifica Database

```bash
# Verificare lo stato delle migrazioni
npx drizzle-kit check

# Generare una migrazione se necessario
npx drizzle-kit generate

# Applicare le migrazioni
npx drizzle-kit push
```

### Documentazione API

```bash
# Generare la specifica OpenAPI
yarn generate-docs

# Validare la documentazione
yarn docs:validate

# Verificare che la documentazione sia aggiornata
git diff --exit-code public/openapi.json
```

### Variabili d'Ambiente

```bash
# Verificare che tutte le variabili obbligatorie siano impostate
node scripts/check-env.js

# Testare la configurazione dell'ambiente
npm run test:env
```

---

## Workflow di Distribuzione

### Pre-Distribuzione

1. **Code Review**
   - Tutte le PR revisionate e approvate
   - Nessun conflitto di merge
   - Pipeline CI/CD superata

2. **Test**
   - Tutti i test superati
   - QA manuale completato
   - Ambiente di staging testato

3. **Documentazione**
   - Changelog aggiornato
   - Docs API rigenerate
   - Note sulla distribuzione preparate

### Passaggi della Distribuzione

1. **Backup**

   ```bash
   # Backup del database
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Distribuzione**

   ```bash
   # Distribuire in produzione
   git push production main

   # O con Vercel
   vercel --prod
   ```

3. **Verifica**

   ```bash
   # Verificare l'endpoint health
   curl https://your-domain.com/api/health

   # Verificare i log degli errori
   tail -f logs/error.log
   ```

4. **Monitoraggio**
   - Monitorare i tassi di errore in Sentry
   - Monitorare le prestazioni in PostHog
   - Verificare il monitoraggio uptime

### Post-Distribuzione

1. **Smoke Test**
   - La homepage si carica
   - L'utente può accedere
   - Il flusso di pagamento funziona
   - Il pannello amministratore è accessibile

2. **Monitoraggio**
   - Tassi di errore normali
   - Tempi di risposta accettabili
   - Nessuna perdita di memoria
   - Prestazioni database stabili

3. **Comunicazione**
   - Notificare il team della distribuzione
   - Aggiornare la pagina di stato
   - Annunciare le nuove funzionalità (se presenti)

---

## Piano di Rollback

Se vengono rilevati problemi dopo la distribuzione:

### Rollback Rapido

```bash
# Tornare alla distribuzione precedente
git revert HEAD
git push production main

# O con Vercel
vercel rollback
```

### Rollback Database

```bash
# Ripristinare dal backup
psql $DATABASE_URL < backup-YYYYMMDD.sql

# O usare il ripristino point-in-time
# (se supportato dal tuo provider di hosting)
```

### Comunicazione

1. Notificare immediatamente il team
2. Aggiornare la pagina di stato
3. Comunicare con gli utenti interessati
4. Documentare l'incidente per il post-mortem

---

## Metriche di Successo

Tieni traccia di queste metriche per garantire la salute della produzione:

### Prestazioni

- **Tempo di Risposta**: < 200ms (p95)
- **Uptime**: > 99,9%
- **Tasso di Errore**: < 0,1%
- **Core Web Vitals**: Tutti verdi

### Business

- **Registrazione Utenti**: Tracciamento funzionante
- **Tasso di Successo Pagamenti**: > 95%
- **Consegna Email**: > 98%
- **Disponibilità API**: > 99,9%

### Sicurezza

- **Tentativi di Accesso Falliti**: Monitorati
- **Hit Rate Limit API**: < 1%
- **Vulnerabilità di Sicurezza**: 0 critiche
- **Certificato SSL**: Valido e in auto-rinnovo

---

## Passi Successivi

Dopo una distribuzione riuscita:

- [Monitoraggio & Analytics](./monitoring) – Configurare un monitoraggio completo
- [Variabili d'Ambiente](./environment-variables) – Gestire i segreti di produzione
- [Distribuzione Docker](./docker) – Containerizzare l'applicazione
- [Supporto](../advanced-guide/support) – Ottenere aiuto quando necessario

## Risorse

### Documentazione Interna

- [Panoramica dell'Architettura](../architecture/overview)
- [Tech Stack](../architecture/tech-stack)
- [Documentazione API](../development/api-documentation)
- [Monitoraggio](./monitoring)

### Risorse Esterne

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Production Checklist](https://vercel.com/docs/concepts/deployments/overview)
- [PostgreSQL Best Practice di Produzione](https://www.postgresql.org/docs/current/runtime-config.html)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

## Riepilogo della Checklist

Usa questo riepilogo rapido per monitorare i progressi complessivi:

- [ ] **Ambiente**: Tutte le variabili configurate
- [ ] **Database**: Migrazioni applicate, backup configurati
- [ ] **Sicurezza**: Autenticazione, crittografia, rate limiting
- [ ] **Prestazioni**: Ottimizzato, in cache, monitorato
- [ ] **Monitoraggio**: Tracciamento errori, logging, avvisi
- [ ] **Contenuto**: CMS configurato, media ottimizzati, i18n completo
- [ ] **API**: Documentazione generata, standard seguiti
- [ ] **Pagamento**: Stripe/LS configurato, webhook testati
