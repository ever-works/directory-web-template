---
id: roadmap
title: Roadmap & Direzione Futura
sidebar_label: Roadmap
---

# Roadmap & Direzione Futura

Questa pagina delinea la direzione di sviluppo attuale del Directory Web Template e come la community può partecipare nel definire il suo futuro.

## Visione del Prodotto

Il Directory Web Template mira a essere la soluzione open-source più completa per la creazione di siti web directory professionali. La visione a lungo termine comprende:

- **Siti web directory pronti per la produzione** che siano belli, performanti e completamente personalizzabili
- **Gestione facile dei contenuti** tramite il CMS basato su Git con generazione di contenuti opzionale alimentata dalla IA tramite la [Ever Works Platform](https://docs.ever.works)
- **Pagamento e autenticazione estensibili** che supportano più provider out of the box
- **Internazionalizzazione di prim'ordine** con supporto RTL completo e copertura linguistica crescente

## Aree di Sviluppo Attivo

### Performance e Core Web Vitals

- Ottimizzazione del Largest Contentful Paint (LCP) per le pagine di elenco e dettaglio degli elementi
- Riduzione della dimensione del bundle JavaScript tramite migliore code splitting e tree shaking
- Miglioramento della pipeline di ottimizzazione delle immagini per screenshot e loghi degli elementi della directory
- Implementazione del prerendering parziale per caricamenti iniziali delle pagine più veloci

### Miglioramenti delle Funzionalità

- Aggiunta di più funzionalità di filtraggio e ricerca (ricerca sfaccettata, filtri avanzati)
- Implementazione di funzionalità di contenuto generato dagli utenti (recensioni, valutazioni, commenti)
- Aggiunta di più integrazioni di provider di pagamento e funzionalità di gestione degli abbonamenti
- Espansione del sistema di temi con più temi integrati e personalizzazione più semplice

### Esperienza degli Sviluppatori

- Miglioramento della configurazione dello sviluppo locale con migliore documentazione e messaggi di errore
- Aggiunta di una copertura di test E2E più completa con Playwright
- Creazione di template iniziali per tipologie comuni di directory (SaaS, attività locali, risorse)
- Miglioramento della sicurezza dei tipi TypeScript in tutto il codice

### Internazionalizzazione

- Aggiunta di più traduzioni linguistiche integrate
- Miglioramento del supporto del layout RTL per arabo ed ebraico
- Supporto della configurazione linguistica per directory
- Aggiunta di flussi di lavoro di traduzione automatizzati

### Documentazione

- Espansione della documentazione di riferimento API con più esempi
- Aggiunta di video tutorial per attività comuni
- Creazione di architecture decision records (ADR) per le principali decisioni di progettazione
- Costruzione di guide interattive e ambienti playground

## Come Proporre Funzionalità

### GitHub Issues

Il metodo principale per proporre funzionalità è tramite GitHub Issues su [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Quando si crea una richiesta di funzionalità:

1. **Controlla prima le issue esistenti** per evitare duplicati.
2. **Descrivi il problema** che stai cercando di risolvere, non solo la soluzione che vuoi.
3. **Fornisci contesto** sul tuo caso d'uso, tipo di directory e scala.
4. **Includi esempi** (mockup, schemi API, esempi di configurazione).

### GitHub Discussions

Per idee più ampie che necessitano di input dalla community: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Unisciti al [Discord di Ever Works](https://discord.gg/ever) per conversazioni in tempo reale su funzionalità e direzione del progetto.

## Come Vengono Decise le Priorità

| Fattore                        | Peso    | Descrizione                                                              |
| ------------------------------ | ------- | ------------------------------------------------------------------------ |
| **Domanda degli utenti**       | Alto    | Numero di richieste, upvote e interesse della community                  |
| **Allineamento strategico**    | Alto    | Quanto bene la funzionalità si allinea con la visione del prodotto       |
| **Sforzo di implementazione**  | Medio   | Complessità, investimento di tempo e onere di manutenzione               |
| **Rischio di breaking change** | Medio   | Potenziale di disturbare gli utenti esistenti                            |
| **Disponibilità dei contributori** | Medio | Se i manutentori o i membri della community possono farsene carico    |

### Livelli di Priorità

- **P0 (Critico):** Vulnerabilità di sicurezza, bug che causano perdita di dati o problemi bloccanti. Affrontati immediatamente.
- **P1 (Alto):** Funzionalità o fix su cui si sta attivamente lavorando per il prossimo rilascio.
- **P2 (Medio):** Funzionalità approvate pianificate ma non ancora programmate.
- **P3 (Basso):** Miglioramenti piacevoli da avere. Ottimi candidati per contributi della community.

## Contribuire alla Roadmap

1. **Inviare richieste di funzionalità ben scritte** con chiare descrizioni dei problemi e casi d'uso.
2. **Contribuire codice.** Le pull request sono il percorso più rapido dall'idea alla realtà. Vedi la [Guida ai Contributi](/contributing).
3. **Partecipare alle discussioni.** Fornire feedback sulle proposte e condividere la propria esperienza.
4. **Segnalare bug.** Report di bug affidabili aiutano a stabilire le priorità delle correzioni e a migliorare la stabilità.

## Cadenza dei Rilasci

I rilasci vengono effettuati quando è pronto un insieme significativo di funzionalità e correzioni:

- **Patch release** (correzioni di bug) vengono pubblicati secondo necessità, spesso settimanalmente durante lo sviluppo attivo.
- **Minor release** (nuove funzionalità) vengono pubblicati circa mensilmente.
- **Major release** (breaking changes) sono poco frequenti e accompagnati da guide alla migrazione.

Vedi la pagina [Changelog & Versioning](/changelog) per i dettagli.

## Rimanere Aggiornati

- **Segui il repository** su GitHub per le notifiche
- **Metti una stella al repository** per mostrare supporto e aiutare altri a scoprire il progetto
- **Unisciti al [Discord](https://discord.gg/ever)** per aggiornamenti in tempo reale
- **Segui [@everworks](https://twitter.com/everworks)** su Twitter

## Contatto

- **Email:** [ever@ever.co](mailto:ever@ever.co)
- **Sito web:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
