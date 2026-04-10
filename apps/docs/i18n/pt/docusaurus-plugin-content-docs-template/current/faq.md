---
id: faq
title: Perguntas Frequentes
sidebar_label: FAQ
---

# Perguntas Frequentes

## Geral

### O que é o Directory Web Template?
Uma solução full-stack de site de diretório Next.js pronta para produção. Clone, personalize e faça deploy para criar sites de diretório profissionais.

### Posso usar o Template sem a Plataforma Ever Works?
Sim. O Template funciona de forma independente. A Plataforma é um produto opcional separado.

## Stack Tecnológico

### Quais tecnologias o Template utiliza?
- Framework: Next.js 15, React 19
- Linguagem: TypeScript 5
- Estilização: Tailwind CSS 4, HeroUI React
- ORM: Drizzle ORM com PostgreSQL
- Auth: NextAuth.js v5
- Pagamentos: Stripe, LemonSqueezy, Polar

### Quais provedores de autenticação são suportados?
Google, GitHub, Facebook, Twitter e Microsoft via NextAuth.js v5.

### Quais provedores de pagamento são suportados?
Stripe, LemonSqueezy e Polar.

## Deploy

### Como faço o deploy do Template?
Recomendado: Vercel. Docker também é suportado.

### Qual banco de dados devo usar?
PostgreSQL, normalmente via Supabase ou conexão direta.

## Conteúdo

### Como funciona o CMS baseado em Git?
O conteúdo é armazenado em arquivos YAML/Markdown em um repositório Git, clonado no momento do build em .content/.

### Posso adicionar itens manualmente?
Sim, edite os arquivos YAML/Markdown no repositório de dados do CMS.
