---
id: translation-guide
title: Guia de Tradução
sidebar_label: Guia de Tradução
sidebar_position: 2
---

# Guia de Tradução

Este guia explica como usar e estender o sistema de tradução multilíngue do Ever Works baseado em next-intl.

## Idiomas Suportados

O Ever Works suporta mais de 13 idiomas:

| Idioma | Código | Bandeira |
|----------|------|------|
| 🇬🇧 Inglês | `en` | Padrão |
| 🇫🇷 Francês | `fr` | |
| 🇪🇸 Espanhol | `es` | |
| 🇩🇪 Alemão | `de` | |
| 🇨🇳 Chinês | `zh` | |
| 🇸🇦 Árabe | `ar` | Suporte RTL |
| 🇮🇹 Italiano | `it` | |
| 🇵🇹 Português | `pt` | |
| 🇷🇺 Russo | `ru` | |
| 🇳🇱 Holandês | `nl` | |
| 🇵🇱 Polonês | `pl` | |

## Utilização

### Em Componentes React

```typescript
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('help');

  return (
    <div>
      <h1>{t('PAGE_TITLE')}</h1>
      <p>{t('PAGE_SUBTITLE')}</p>
    </div>
  );
}
```

## Adicionando Novas Traduções

### Passo 1: Adicionar chaves em inglês

```json
{
  "help": {
    "NEW_SECTION_TITLE": "New Section",
    "NEW_SECTION_DESC": "Description of the new section"
  }
}
```

### Passo 2: Traduzir para outros idiomas

```json
{
  "help": {
    "NEW_SECTION_TITLE": "Nova Seção",
    "NEW_SECTION_DESC": "Descrição da nova seção"
  }
}
```

## Namespaces de Tradução

### Comum (`common`)
- Elementos de navegação
- Ações comuns (salvar, cancelar, excluir)

### Autenticação (`auth`)
- Login e registro
- Gerenciamento de senha

### Ajuda (`help`)
- Conteúdo do centro de ajuda
- Seções de FAQ

## Melhores Práticas

### 1. Convenções de nomenclatura

```json
{
  // ✅ Bom
  "FAQ_SETUP_TIME": "How long does setup take?",
  
  // ❌ Ruim
  "FAQ_1": "How long does setup take?"
}
```

### 2. Variáveis e espaços reservados

```json
{
  "WELCOME_MESSAGE": "Welcome {name}!",
  "ITEMS_COUNT": "You have {count} items"
}
```

### 3. Pluralização

```json
{
  "ITEMS": {
    "zero": "No items",
    "one": "1 item",
    "other": "{count} items"
  }
}
```

## Adicionando um Novo Idioma

### Passo 1: Criar arquivo de mensagens

```bash
cp messages/en.json messages/pt.json
```

### Passo 2: Atualizar configuração

```typescript
export const routing = defineRouting({
  locales: ['en', 'fr', 'es', 'de', 'zh', 'ar', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
```

### Passo 3: Adicionar ícone de bandeira

Colocar arquivo SVG em `/public/flags/pt.svg`

### Passo 4: Traduzir o conteúdo

Traduzir todas as chaves em `messages/pt.json` para o português

## Ferramentas Recomendadas

- **[i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)** - Extensão VS Code para gerenciamento de traduções
- **[BabelEdit](https://www.codeandweb.com/babeledit)** - Editor visual de traduções
- **[Crowdin](https://crowdin.com/)** - Plataforma de tradução colaborativa

## Checklist de Traduções

Ao adicionar novos recursos com texto:

- [ ] Adicionar chaves em inglês (`en.json`)
- [ ] Traduzir para francês (`fr.json`)
- [ ] Traduzir para espanhol (`es.json`)
- [ ] Traduzir para alemão (`de.json`)
