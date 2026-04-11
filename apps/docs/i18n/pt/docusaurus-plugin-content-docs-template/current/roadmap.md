---
id: roadmap
title: Roadmap & Direção Futura
sidebar_label: Roadmap
---

# Roadmap & Direção Futura

Esta página descreve a direção de desenvolvimento atual do Directory Web Template e como a comunidade pode participar na definição do seu futuro.

## Visão do Produto

O Directory Web Template pretende ser a solução open-source mais abrangente para a construção de sites de diretório profissionais. A visão de longo prazo engloba:

- **Sites de diretório prontos para produção** que sejam bonitos, performáticos e totalmente personalizáveis
- **Gerenciamento fácil de conteúdo** através do CMS baseado em Git com geração de conteúdo opcional alimentada por IA via [Ever Works Platform](https://docs.ever.works)
- **Pagamento e autenticação extensíveis** com suporte a múltiplos provedores out of the box
- **Internacionalização de primeira classe** com suporte RTL completo e cobertura crescente de idiomas

## Áreas de Desenvolvimento Ativo

### Desempenho e Core Web Vitals

- Otimização do Largest Contentful Paint (LCP) para páginas de listagem e detalhes de itens
- Redução do tamanho do bundle JavaScript através de melhor code splitting e tree shaking
- Melhoria do pipeline de otimização de imagens para screenshots e logos de itens de diretório
- Implementação de prerendering parcial para carregamentos iniciais de página mais rápidos

### Melhorias de Funcionalidades

- Adição de mais capacidades de filtragem e busca (busca facetada, filtros avançados)
- Implementação de recursos de conteúdo gerado pelo usuário (avaliações, classificações, comentários)
- Adição de mais integrações de provedores de pagamento e recursos de gerenciamento de assinatura
- Expansão do sistema de temas com mais temas integrados e personalização mais fácil

### Experiência do Desenvolvedor

- Melhoria da configuração de desenvolvimento local com melhor documentação e mensagens de erro
- Adição de cobertura de teste E2E mais abrangente com Playwright
- Criação de templates iniciais para tipos comuns de diretório (SaaS, negócios locais, recursos)
- Melhoria da segurança de tipos TypeScript em toda a base de código

### Internacionalização

- Adição de mais traduções de idiomas integradas
- Melhoria do suporte de layout RTL para árabe e hebraico
- Suporte à configuração de idioma por diretório
- Adição de fluxos de trabalho de tradução automatizados

### Documentação

- Expansão da documentação de referência de API com mais exemplos
- Adição de tutoriais em vídeo para tarefas comuns
- Criação de architecture decision records (ADRs) para decisões de design importantes
- Construção de guias interativos e ambientes playground

## Como Propor Funcionalidades

### GitHub Issues

A maneira principal de propor funcionalidades é através de GitHub Issues em [github.com/ever-works/directory-web-template/issues](https://github.com/ever-works/directory-web-template/issues).

Ao criar uma solicitação de funcionalidade:

1. **Verifique as issues existentes** primeiro para evitar duplicatas.
2. **Descreva o problema** que você está tentando resolver, não apenas a solução que deseja.
3. **Forneça contexto** sobre seu caso de uso, tipo de diretório e escala.
4. **Inclua exemplos** (mockups, esquemas de API, exemplos de configuração).

### GitHub Discussions

Para ideias mais amplas que precisam de contribuição da comunidade: [github.com/ever-works/directory-web-template/discussions](https://github.com/ever-works/directory-web-template/discussions)

### Discord

Junte-se ao [Discord do Ever Works](https://discord.gg/ever) para conversas em tempo real sobre funcionalidades e direção do projeto.

## Como as Prioridades São Decididas

| Fator                          | Peso   | Descrição                                                                |
| ------------------------------ | ------ | ------------------------------------------------------------------------ |
| **Demanda dos usuários**       | Alto   | Número de solicitações, upvotes e interesse da comunidade                |
| **Alinhamento estratégico**    | Alto   | Quão bem a funcionalidade se alinha com a visão do produto               |
| **Esforço de implementação**   | Médio  | Complexidade, investimento de tempo e carga de manutenção                |
| **Risco de breaking change**   | Médio  | Potencial de perturbar usuários existentes                               |
| **Disponibilidade de contribuidores** | Médio | Se mantenedores ou membros da comunidade podem assumir a tarefa      |

### Níveis de Prioridade

- **P0 (Crítico):** Vulnerabilidades de segurança, bugs de perda de dados ou problemas bloqueadores. Resolvidos imediatamente.
- **P1 (Alto):** Funcionalidades ou correções ativamente sendo trabalhadas para o próximo lançamento.
- **P2 (Médio):** Funcionalidades aprovadas planejadas mas ainda não agendadas.
- **P3 (Baixo):** Melhorias agradáveis de ter. Ótimos candidatos para contribuições da comunidade.

## Contribuindo para o Roadmap

1. **Enviar solicitações de funcionalidade bem escritas** com declarações claras de problemas e casos de uso.
2. **Contribuir código.** Pull requests são o caminho mais rápido da ideia para a realidade. Veja o [Guia de Contribuição](/contributing).
3. **Participar nas discussões.** Fornecer feedback sobre propostas e compartilhar sua experiência.
4. **Reportar bugs.** Relatórios de bugs confiáveis ajudam a priorizar correções e melhorar a estabilidade.

## Cadência de Lançamentos

Os lançamentos são feitos quando um conjunto significativo de funcionalidades e correções estiver pronto:

- **Patch releases** (correções de bugs) são publicados conforme necessário, frequentemente semanalmente durante o desenvolvimento ativo.
- **Minor releases** (novas funcionalidades) são publicados aproximadamente mensalmente.
- **Major releases** (breaking changes) são pouco frequentes e acompanhados de guias de migração.

Veja a página [Changelog & Versionamento](/changelog) para detalhes.

## Mantendo-se Atualizado

- **Observe o repositório** no GitHub para notificações
- **Dê uma estrela ao repositório** para mostrar suporte e ajudar outros a descobrir o projeto
- **Junte-se ao [Discord](https://discord.gg/ever)** para atualizações em tempo real
- **Siga [@everworks](https://twitter.com/everworks)** no Twitter

## Contato

- **E-mail:** [ever@ever.co](mailto:ever@ever.co)
- **Website:** [ever.works](https://ever.works)
- **Discord:** [discord.gg/ever](https://discord.gg/ever)
