---
id: production-checklist
title: Lista de Verificação para Produção
sidebar_label: Checklist de Produção
sidebar_position: 7
---

# Lista de Verificação para Produção

Uma lista de verificação abrangente para garantir que sua implantação do Ever Works esteja pronta para produção.

## Checklist Pré-Implantação

### 1. Configuração do Ambiente

#### Variáveis de Ambiente Obrigatórias

- [ ] **Banco de Dados**
  - `DATABASE_URL` configurado com PostgreSQL de produção
  - Connection pooling do banco de dados habilitado
  - Modo SSL habilitado para produção

- [ ] **Autenticação**
  - `NEXTAUTH_URL` definido para o domínio de produção
  - `NEXTAUTH_SECRET` gerado (mínimo 32 caracteres)
  - Provedores OAuth configurados (Google, GitHub, etc.)
  - Credenciais do Supabase Auth (se utilizado)

- [ ] **Provedores de Pagamento**
  - Chaves de produção do Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - Chaves de produção do LemonSqueezy (se utilizado)
  - Secrets de webhook configurados
  - Modo de teste desabilitado

- [ ] **Serviços de E-mail**
  - Chave de API do Resend configurada
  - Credenciais do Novu definidas (se utilizado)
  - Templates de e-mail testados
  - Domínio do remetente verificado

- [ ] **Analytics & Monitoramento**
  - Chave de produção do PostHog
  - DSN do Sentry configurado
  - Provedor de rastreamento de exceções definido
  - Vercel Analytics habilitado (se no Vercel)

- [ ] **Integração CRM**
  - Credenciais do Twenty CRM (se utilizado)
  - Endpoints de webhook configurados

- [ ] **Segurança**
  - `NODE_ENV=production`
  - Rate limiting configurado
  - Configurações de CORS revisadas
  - Headers CSP configurados

### 2. Banco de Dados

- [ ] **Esquema & Migrações**
  - Todas as migrações aplicadas
  - Esquema do banco de dados corresponde ao código
  - Índices criados para desempenho
  - Restrições de chave estrangeira validadas

- [ ] **Integridade dos Dados**
  - Dados de seed carregados (se necessário)
  - Dados de teste removidos
  - Regras de validação de dados em vigor

- [ ] **Backup & Recuperação**
  - Backups automáticos configurados
  - Restauração de backup testada
  - Recuperação point-in-time habilitada
  - Política de retenção de backup definida

- [ ] **Desempenho**
  - Connection pooling configurado
  - Desempenho de consultas otimizado
  - Log de consultas lentas habilitado
  - Monitoramento do banco de dados ativo

### 3. Segurança

- [ ] **Autenticação & Autorização**
  - Hash de senha verificado (bcrypt)
  - Gerenciamento de sessão seguro
  - Tokens JWT assinados corretamente
  - Controle de acesso baseado em funções testado

- [ ] **Proteção de Dados**
  - Dados PII criptografados em repouso
  - Limpeza de dados sensíveis configurada
  - HTTPS aplicado
  - Cookies seguros habilitados

- [ ] **Segurança da API**
  - Rate limiting ativo
  - Autenticação de API obrigatória
  - Validação de entrada em todos os endpoints
  - Prevenção de injeção SQL verificada

- [ ] **Dependências**
  - Todas as dependências atualizadas
  - Vulnerabilidades de segurança verificadas (`npm audit`)
  - Nenhuma vulnerabilidade crítica
  - Arquivo de lock de dependências commitado

### 4. Desempenho

- [ ] **Otimização de Frontend**
  - Imagens otimizadas (componente Image do Next.js)
  - Code splitting implementado
  - Lazy loading para componentes pesados
  - Tamanho do bundle analisado

- [ ] **Cache**
  - Assets estáticos em cache
  - Respostas de API em cache (onde apropriado)
  - CDN configurado
  - Estratégia de invalidação de cache em vigor

- [ ] **Core Web Vitals**
  - LCP < 2,5s
  - FID < 100ms
  - CLS < 0,1
  - Monitoramento de desempenho ativo

- [ ] **Consultas do Banco de Dados**
  - Consultas N+1 eliminadas
  - Índices adequados criados
  - Cache de consultas habilitado
  - Connection pooling otimizado

### 5. Monitoramento & Logging

- [ ] **Rastreamento de Erros**
  - Sentry/PostHog configurado
  - Alertas de erro configurados
  - Source maps enviados
  - Agrupamento de erros configurado

- [ ] **Monitoramento da Aplicação**
  - Endpoint de verificação de saúde (`/api/health`)
  - Monitoramento de uptime configurado
  - Métricas de desempenho rastreadas
  - Métricas personalizadas definidas

- [ ] **Logging**
  - Logging estruturado implementado
  - Níveis de log configurados
  - Agregação de logs configurada
  - Política de retenção de logs definida

- [ ] **Alertas**
  - Alertas de erros críticos
  - Alertas de degradação de desempenho
  - Alertas de uptime
  - Alertas de falha de pagamento

### 6. Conteúdo & Dados

- [ ] **CMS Baseado em Git**
  - Repositório `.content` configurado
  - Sincronização de conteúdo funcionando
  - Credenciais Git protegidas
  - Estratégia de backup de conteúdo

- [ ] **Assets de Mídia**
  - Imagens otimizadas
  - CDN configurado para mídia
  - Limites de upload configurados
  - Cota de armazenamento monitorada

- [ ] **Internacionalização**
  - Todas as traduções completas
  - Suporte RTL testado (Árabe)
  - Detecção de locale funcionando
  - Formatação de data/número verificada

### 7. Documentação da API

- [ ] **Sistema de Documentação**
  - Spec OpenAPI gerada (`yarn generate-docs`)
  - Scalar UI acessível em `/api/reference`
  - Todos os endpoints documentados
  - Exemplos testados

- [ ] **Padrões de API**
  - Convenções de nomenclatura consistentes
  - Códigos de status HTTP corretos
  - Respostas de erro padronizadas
  - Rate limiting documentado

### 8. Sistema de Pagamento

- [ ] **Configuração do Stripe**
  - Modo de produção habilitado
  - Webhooks configurados e testados
  - Portal do cliente habilitado
  - Configurações de fatura configuradas

- [ ] **Configuração do LemonSqueezy** (se utilizado)
  - Credenciais de produção definidas
  - Webhooks configurados
  - Conformidade fiscal verificada

- [ ] **Gerenciamento de Assinaturas**
  - Criação de planos testada
  - Fluxos de upgrade/downgrade testados
  - Fluxo de cancelamento testado
  - Processo de reembolso documentado

### 9. Sistema de E-mail

- [ ] **E-mails Transacionais**
  - E-mail de boas-vindas testado
  - Redefinição de senha testada
  - Verificação de e-mail testada
  - E-mails de assinatura testados

- [ ] **Templates de E-mail**
  - Todos os templates revisados
  - Branding consistente
  - Responsivo para mobile
  - Links de cancelamento de assinatura funcionando

- [ ] **Entregabilidade**
  - Registros SPF configurados
  - DKIM configurado
  - Política DMARC definida
  - Reputação do remetente monitorada

### 10. Testes

- [ ] **Testes Funcionais**
  - Fluxo de registro de usuário
  - Fluxo de login/logout
  - Fluxo de redefinição de senha
  - Fluxo de envio de item
  - Fluxo de pagamento
  - Funções administrativas

- [ ] **Testes Cross-browser**
  - Chrome testado
  - Firefox testado
  - Safari testado
  - Edge testado
  - Navegadores mobile testados

- [ ] **Testes Responsivos**
  - Mobile (320px – 480px)
  - Tablet (768px – 1024px)
  - Desktop (1280px+)
  - Telas grandes (1920px+)

- [ ] **Testes de Carga**
  - Tráfego esperado simulado
  - Desempenho do banco de dados sob carga
  - Tempos de resposta da API aceitáveis
  - Sem vazamentos de memória

### 11. Conformidade & Jurídico

- [ ] **Privacidade**
  - Política de privacidade publicada
  - Consentimento de cookies implementado
  - Conformidade com LGPD/GDPR (se usuários da UE/Brasil)
  - Funcionalidade de exportação de dados

- [ ] **Termos de Serviço**
  - Termos de serviço publicados
  - Fluxo de aceitação do usuário
  - Rastreamento de versão dos termos

- [ ] **Acessibilidade**
  - Conformidade WCAG 2.1 AA
  - Navegação por teclado funcionando
  - Leitor de tela testado
  - Texto alternativo para imagens

### 12. DevOps & Infraestrutura

- [ ] **Implantação**
  - Pipeline CI/CD configurado
  - Testes automatizados no pipeline
  - Plano de rollback de implantação
  - Implantação com zero downtime

- [ ] **Escalabilidade**
  - Auto-scaling configurado
  - Load balancer configurado
  - Réplicas de leitura do banco de dados (se necessário)
  - CDN para assets estáticos

- [ ] **Recuperação de Desastres**
  - Restauração de backup testada
  - Plano de failover documentado
  - Plano de resposta a incidentes
  - Rotação on-call definida

- [ ] **Documentação**
  - Guia de implantação atualizado
  - Runbook criado
  - Diagramas de arquitetura atualizados
  - Treinamento da equipe concluído

---

## Comandos de Verificação

Execute estes comandos para verificar a prontidão para produção:

### Auditoria de Segurança

```bash
# Verificar vulnerabilidades de segurança
npm audit --production

# Corrigir vulnerabilidades
npm audit fix

# Verificar dependências desatualizadas
npm outdated
```

### Verificação de Build

```bash
# Build de produção
npm run build

# Verificar saída do build
ls -lh .next/

# Analisar tamanho do bundle
npm run analyze
```

### Verificação do Banco de Dados

```bash
# Verificar status das migrações
npx drizzle-kit check

# Gerar migração se necessário
npx drizzle-kit generate

# Aplicar migrações
npx drizzle-kit push
```

### Documentação da API

```bash
# Gerar especificação OpenAPI
yarn generate-docs

# Validar documentação
yarn docs:validate

# Verificar se a documentação está atualizada
git diff --exit-code public/openapi.json
```

### Variáveis de Ambiente

```bash
# Verificar se todas as variáveis obrigatórias estão definidas
node scripts/check-env.js

# Testar configuração do ambiente
npm run test:env
```

---

## Fluxo de Trabalho de Implantação

### Pré-Implantação

1. **Revisão de Código**
   - Todos os PRs revisados e aprovados
   - Sem conflitos de merge
   - Pipeline CI/CD aprovado

2. **Testes**
   - Todos os testes aprovados
   - QA manual concluído
   - Ambiente de staging testado

3. **Documentação**
   - Changelog atualizado
   - Docs da API regenerados
   - Notas de implantação preparadas

### Passos de Implantação

1. **Backup**

   ```bash
   # Fazer backup do banco de dados
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Implantação**

   ```bash
   # Implantar em produção
   git push production main

   # Ou com Vercel
   vercel --prod
   ```

3. **Verificação**

   ```bash
   # Verificar endpoint de saúde
   curl https://your-domain.com/api/health

   # Verificar logs de erro
   tail -f logs/error.log
   ```

4. **Monitoramento**
   - Monitorar taxas de erro no Sentry
   - Monitorar desempenho no PostHog
   - Verificar monitoramento de uptime

### Pós-Implantação

1. **Smoke Tests**
   - Página inicial carrega
   - Usuário consegue fazer login
   - Fluxo de pagamento funciona
   - Painel administrativo acessível

2. **Monitoramento**
   - Taxas de erro normais
   - Tempos de resposta aceitáveis
   - Sem vazamentos de memória
   - Desempenho do banco de dados estável

3. **Comunicação**
   - Notificar equipe sobre a implantação
   - Atualizar página de status
   - Anunciar novos recursos (se houver)

---

## Plano de Rollback

Se problemas forem detectados após a implantação:

### Rollback Rápido

```bash
# Reverter para implantação anterior
git revert HEAD
git push production main

# Ou com Vercel
vercel rollback
```

### Rollback do Banco de Dados

```bash
# Restaurar do backup
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Ou usar recuperação point-in-time
# (se suportado pelo seu provedor de hospedagem)
```

### Comunicação

1. Notificar equipe imediatamente
2. Atualizar página de status
3. Comunicar com usuários afetados
4. Documentar incidente para post-mortem

---

## Métricas de Sucesso

Acompanhe estas métricas para garantir a saúde em produção:

### Desempenho

- **Tempo de Resposta**: < 200ms (p95)
- **Uptime**: > 99,9%
- **Taxa de Erro**: < 0,1%
- **Core Web Vitals**: Todos verdes

### Negócio

- **Registro de Usuários**: Rastreamento funcionando
- **Taxa de Sucesso de Pagamentos**: > 95%
- **Entrega de E-mail**: > 98%
- **Disponibilidade de API**: > 99,9%

### Segurança

- **Tentativas de Login Falhadas**: Monitoradas
- **Hits de Rate Limit da API**: < 1%
- **Vulnerabilidades de Segurança**: 0 críticas
- **Certificado SSL**: Válido e com auto-renovação

---

## Próximos Passos

Após implantação bem-sucedida:

- [Monitoramento & Analytics](./monitoring) – Configurar monitoramento abrangente
- [Variáveis de Ambiente](./environment-variables) – Gerenciar segredos de produção
- [Implantação Docker](./docker) – Containerizar sua aplicação
- [Suporte](../advanced-guide/support) – Obter ajuda quando necessário

## Recursos

### Documentação Interna

- [Visão Geral da Arquitetura](../architecture/overview)
- [Tech Stack](../architecture/tech-stack)
- [Documentação da API](../development/api-documentation)
- [Monitoramento](./monitoring)

### Recursos Externos

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Production Checklist](https://vercel.com/docs/concepts/deployments/overview)
- [PostgreSQL Melhores Práticas de Produção](https://www.postgresql.org/docs/current/runtime-config.html)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

## Resumo da Checklist

Use este resumo rápido para acompanhar o progresso geral:

- [ ] **Ambiente**: Todas as variáveis configuradas
- [ ] **Banco de Dados**: Migrações aplicadas, backups configurados
- [ ] **Segurança**: Autenticação, criptografia, rate limiting
- [ ] **Desempenho**: Otimizado, em cache, monitorado
- [ ] **Monitoramento**: Rastreamento de erros, logging, alertas
- [ ] **Conteúdo**: CMS configurado, mídia otimizada, i18n completo
- [ ] **API**: Documentação gerada, padrões seguidos
- [ ] **Pagamento**: Stripe/LS configurado, webhooks testados
