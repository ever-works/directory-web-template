---
id: testing
title: Guia de Testes Responsivos
sidebar_label: Testes
sidebar_position: 4
---

# Guia de Testes Responsivos

Este guia cobre as melhores práticas para testar design responsivo em diferentes dispositivos e tamanhos de tela.

## Dispositivos de Teste

### Mobile (320px - 768px)

| Dispositivo          | Resolução | Notas                       |
|----------------------|-----------|-----------------------------|
| iPhone SE            | 375x667   | Menor iPhone moderno        |
| iPhone 12/13/14      | 390x844   | Tamanho padrão de iPhone    |
| Samsung Galaxy S20   | 360x800   | Dispositivo Android popular |
| iPad Mini Retrato    | 768x1024  | Tablet pequeno              |

### Tablet (768px - 1024px)

| Dispositivo          | Resolução | Notas                     |
|----------------------|-----------|---------------------------|
| iPad Air             | 820x1180  | iPad padrão               |
| iPad Pro 11"         | 834x1194  | Tablet profissional       |
| Surface Pro 7        | 912x1368  | Tablet Windows            |

### Desktop (1024px+)

| Dispositivo          | Resolução  | Notas                         |
|----------------------|------------|-------------------------------|
| Laptop               | 1366x768   | Resolução comum de laptop     |
| Desktop HD           | 1920x1080  | Desktop padrão                |
| Monitor 4K           | 3840x2160  | Display de alta resolução     |

## Lista de Verificação de Testes

### 1. Navegação

- [ ] **Mobile**: Menu hambúrguer visível e funcional
- [ ] **Desktop**: Barra de navegação horizontal exibida corretamente
- [ ] **Todos os dispositivos**: Todos os links de navegação são acessíveis
- [ ] **Alvos de toque**: Mínimo de 44x44px no mobile
- [ ] **Navegação por teclado**: Ordem de tabulação é lógica

### 2. Conteúdo

- [ ] **Legibilidade do texto**: Sem necessidade de zoom para ler o conteúdo
- [ ] **Imagens**: Responsivas e corretamente dimensionadas para cada breakpoint
- [ ] **Sem scroll horizontal**: Conteúdo cabe dentro da viewport
- [ ] **Comprimento de linha**: Largura de leitura ideal (45-75 caracteres)
- [ ] **Tamanhos de fonte**: Apropriados para cada tamanho de dispositivo

### 3. Interações

- [ ] **Alvos de toque**: Mínimo de 44x44px para mobile
- [ ] **Espaçamento**: Espaço suficiente entre elementos clicáveis
- [ ] **Estados de hover**: Somente em dispositivos com capacidade de hover
- [ ] **Estados de foco**: Indicadores de foco visíveis pelo teclado
- [ ] **Formulários**: Fáceis de preencher em dispositivos móveis

### 4. Desempenho

- [ ] **Tempo de carregamento**: < 3 segundos em conexão 3G
- [ ] **Imagens**: Otimizadas para cada tamanho de tela
- [ ] **Animações**: Desempenho suave de 60 FPS
- [ ] **Core Web Vitals**: Atendem aos limites do Google
- [ ] **Tamanho do bundle**: JavaScript e CSS otimizados

### 5. Layout

- [ ] **Sistema de grid**: Adapta-se corretamente nos breakpoints
- [ ] **Flexbox/Grid**: Sem quebras de layout
- [ ] **Espaçamento**: Padding e margens consistentes
- [ ] **Alinhamento**: Alinhamento adequado em todos os tamanhos
- [ ] **Overflow**: Sem problemas de overflow de conteúdo

## Ferramentas de Teste

### DevTools do Browser

#### Chrome DevTools
1. Abra o DevTools (F12 ou Cmd+Option+I)
2. Clique no ícone da barra de ferramentas de dispositivos (Cmd+Shift+M)
3. Selecione o dispositivo ou insira dimensões personalizadas
4. Teste diferentes velocidades de rede

#### Firefox Developer Tools
1. Abra o DevTools (F12)
2. Clique em Modo de Design Responsivo (Cmd+Option+M)
3. Selecione predefinições de dispositivos
4. Teste eventos de toque

### Serviços de Teste Online

- **[BrowserStack](https://www.browserstack.com/)** - Teste em dispositivos reais
- **[LambdaTest](https://www.lambdatest.com/)** - Testes entre browsers
- **[Sauce Labs](https://saucelabs.com/)** - Plataforma de testes automatizados

### Testes de Desempenho

- **[Lighthouse](https://developers.google.com/web/tools/lighthouse)** - Auditoria de desempenho
- **[WebPageTest](https://www.webpagetest.org/)** - Análise detalhada de desempenho
- **[PageSpeed Insights](https://pagespeed.web.dev/)** - Ferramenta de desempenho do Google

## Métricas Alvo

### Pontuações do Lighthouse

| Métrica         | Alvo  | Crítico |
|-----------------|-------|---------|
| Desempenho      | > 90  | > 50    |
| Acessibilidade  | > 95  | > 80    |
| Melhores Práticas| > 95 | > 80    |
| SEO             | > 95  | > 80    |

### Core Web Vitals

| Métrica | Bom | Precisa de Melhoria | Ruim |
|---------|-----|---------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |

### Métricas Específicas para Mobile

- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Tamanho de Alvo de Toque**: >= 48x48px
- **Atraso de Toque**: < 300ms

## Fluxo de Trabalho de Testes

### 1. Testes Locais

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir no browser
http://localhost:3000
```

### 2. Testes em Dispositivos

1. **Use o modo responsivo do DevTools**
2. **Teste em dispositivos físicos** quando possível
3. **Use depuração remota** para dispositivos móveis
4. **Teste diferentes orientações** (retrato/paisagem)

### 3. Testes Automatizados

```bash
# Executar auditoria Lighthouse
npm run lighthouse

# Executar testes de acessibilidade
npm run test:a11y

# Executar testes de regressão visual
npm run test:visual
```

## Problemas Comuns e Soluções

### Problema: Scroll Horizontal no Mobile

**Solução**: Verifique elementos com largura fixa

```css
/* ❌ Ruim */
.container {
  width: 1200px;
}

/* ✅ Bom */
.container {
  max-width: 1200px;
  width: 100%;
  padding: 0 1rem;
}
```

### Problema: Texto Muito Pequeno no Mobile

**Solução**: Use tamanhos de fonte responsivos

```css
/* ❌ Ruim */
body {
  font-size: 12px;
}

/* ✅ Bom */
body {
  font-size: 16px; /* Tamanho base para mobile */
}

@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}
```

### Problema: Alvos de Toque Muito Pequenos

**Solução**: Garanta tamanho mínimo de 44x44px

```css
/* ✅ Bom */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

### Problema: Imagens Não Responsivas

**Solução**: Use técnicas de imagens responsivas

```jsx
// ✅ Bom - componente Image do Next.js
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>
```

## Melhores Práticas

### 1. Abordagem Mobile-First
- Projete para mobile primeiro, depois aprimora para telas maiores
- Use media queries `min-width` em vez de `max-width`

### 2. Aprimoramento Progressivo
- Garanta que a funcionalidade principal funcione sem JavaScript
- Adicione aprimoramentos para browsers capazes

### 3. Design Amigável ao Toque
- Alvos de toque mínimos de 44x44px
- Espaçamento adequado entre elementos interativos
- Evite interações somente por hover

### 4. Otimização de Desempenho
- Carregamento lazy de imagens e componentes
- Minimize o tamanho do bundle JavaScript
- Use divisão de código
- Otimize fontes e assets

### 5. Acessibilidade
- Teste com leitores de tela
- Garanta que a navegação por teclado funcione
- Mantenha contraste de cores suficiente
- Forneça alternativas em texto para imagens

## Próximos Passos

- [Configuração Local](./local-setup) - Configure seu ambiente de desenvolvimento
- [Documentação da API](./api-documentation) - Aprenda sobre documentação de API
- [Deploy](/docs/deployment) - Faça o deploy do seu aplicativo

## Recursos

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Web.dev Performance](https://web.dev/performance/)
