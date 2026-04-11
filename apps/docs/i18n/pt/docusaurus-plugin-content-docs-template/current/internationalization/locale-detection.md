---
id: locale-detection
title: Detecção de Locale e Roteamento
sidebar_label: Detecção de Locale
sidebar_position: 3
---

# Detecção de Locale e Roteamento

O template usa `next-intl` para detecção de localização com correspondência automática do idioma do navegador, roteamento baseado em URL, persistência de cookies e sistema de fallback de mensagens.

## Fluxo de Detecção

Quando uma requisição chega, a localização é determinada através desta sequência:

1. **Prefixo de URL** — Se a URL contiver um prefixo de localização (como `/fr/about`), aquela localização é usada diretamente
2. **Cookie** — Se não houver prefixo de URL, o sistema verifica um cookie de localização definido pelo LanguageSwitcher
3. **Cabeçalho Accept-Language** — Se não houver cookie, lê o cabeçalho de preferências de idioma do navegador
4. **Fallback padrão** — Se nenhuma correspondência for encontrada, a localização padrão (`en`) é usada

## Arquivos de Origem

| Arquivo | Papel na detecção |
|------|-------------------|
| `i18n/routing.ts` | Define localizações suportadas, estratégia de prefixo |
| `i18n/request.ts` | Valida localização resolvida, carrega mensagens |
| `i18n/navigation.ts` | Fornece Link, router, redirect compatíveis com localização |
| `lib/constants.ts` | Fonte de verdade para o array LOCALES e RTL_LOCALES |
| `components/language-switcher.tsx` | Define cookie de localização via router.replace |
| `app/[locale]/layout.tsx` | Valida localização, rejeita inválidas com notFound() |

## Configuração de Roteamento

```typescript
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localeDetection: true,
  localePrefix: "as-needed",
});
```

### Estratégia de Prefixo

| Requisição | Localização Resolvida | URL Exibida |
|---------|-----------------|-----------|
| `/about` | `en` | `/about` (sem prefixo para padrão) |
| `/fr/about` | `fr` | `/fr/about` (prefixo para não padrão) |
| `/en/about` | `en` | Redirecionado para `/about` |

## Lógica de Fallback de Mensagens

- As mensagens em inglês servem como camada base com todas as chaves presentes
- As mensagens específicas da localização substituem apenas as chaves que definem
- Qualquer chave ausente no arquivo de localização mantém seu valor em inglês
- Objetos aninhados são mesclados recursivamente

## Persistência de Cookie

Quando um usuário seleciona uma localização através do LanguageSwitcher, o `next-intl` define um cookie que armazena a preferência:

```typescript
const changeLanguage = useCallback(
  (locale: string) => {
    if (locale === currentLocale || isPending) return;

    startTransition(() => {
      router.replace(pathname, { locale });
    });
    setIsOpen(false);
  },
  [currentLocale, isPending, router, pathname]
);
```

## Detecção Accept-Language

```
Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
```

O sistema encontra correspondência com o array `LOCALES` suportado. A primeira localização correspondente vence.

## Validação no Nível de Layout

```typescript
export default async function RootLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        {/* Provedores de aplicação e filhos */}
      </NextIntlClientProvider>
    </>
  );
}
```

## Solução de Problemas de Localização

| Sintoma | Causa Provável | Solução |
|---------|-------------|----------|
| Chaves de tradução exibidas em vez de texto | Chave ausente no arquivo de localização | Adicionar chave a `messages/en.json` (fallback) |
| Localização errada sendo exibida | Cookie sobrepõe URL | Limpar cookies do navegador ou usar modo anônimo |
| 404 em URLs de localização | Localização não no array LOCALES | Adicionar código a `lib/constants.ts` |
| Layout RTL não aplicado | Localização não em RTL_LOCALES | Adicionar a `RTL_LOCALES` em `lib/constants.ts` |

## Melhores Práticas

1. **Sempre usar `Link` de `@/i18n/navigation`** em vez de `next/link`
2. **Adicionar todas as novas chaves primeiro em `en.json`** pois serve como fallback para cada localização
3. **Testar a detecção** configurando preferências de idioma do navegador
4. **Confiar no fallback `deepmerge`** — arquivos parcialmente traduzidos são esperados e tratados
