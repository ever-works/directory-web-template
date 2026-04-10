---
id: faq
title: Domande Frequenti
sidebar_label: Domande Frequenti
---

# Domande Frequenti

## Generale

### Cos'è il Directory Web Template?
Il Directory Web Template è una soluzione full-stack pronta per la produzione per siti web directory, costruita con Next.js, React, TypeScript e Tailwind CSS. Puoi clonarlo, personalizzarlo e distribuirlo per creare siti web directory professionali.

### Posso usare il Template senza la Piattaforma Ever Works?
Sì. Il Template funziona in modo indipendente come applicazione Next.js autonoma. La Piattaforma è un prodotto opzionale separato per la generazione di contenuti AI.

## Stack Tecnologico

### Quali tecnologie usa il Template?
- Framework: Next.js 15, React 19
- Linguaggio: TypeScript 5
- Styling: Tailwind CSS 4, HeroUI React, Radix UI
- ORM: Drizzle ORM con PostgreSQL
- Auth: NextAuth.js v5
- Pagamenti: Stripe, LemonSqueezy, Polar

### Quali provider di autenticazione sono supportati?
Google, GitHub, Facebook, Twitter e Microsoft tramite NextAuth.js v5.

### Quali provider di pagamento sono supportati?
Stripe, LemonSqueezy e Polar.

## Deployment

### Come distribuisco il Template?
Consigliato: Vercel per hosting Next.js senza configurazione. Docker è anch'esso supportato.

### Quale database dovrei usare?
PostgreSQL tramite Supabase (gestito) o PostgreSQL diretto.

## Contenuti

### Come funziona il CMS basato su Git?
I contenuti sono archiviati in file YAML/Markdown in un repository Git, clonato al momento della build nella directory .content/.

### Posso aggiungere elementi manualmente?
Sì. Modifica i file YAML/Markdown direttamente nel repository dei dati CMS.
