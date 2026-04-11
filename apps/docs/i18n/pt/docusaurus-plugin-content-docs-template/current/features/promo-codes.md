---
id: promo-codes
title: Sistema de código promocional
sidebar_label: Códigos promocionais
sidebar_position: 14
---

# Sistema de código promocional

O modelo Ever Works inclui um sistema abrangente de códigos promocionais para exibir descontos promocionais, códigos de cupom e ofertas especiais nas páginas de listagem de itens. O sistema oferece suporte a vários tipos de descontos, rastreamento de vencimento, cópia da área de transferência, integração analítica e variantes de interface de usuário responsivas.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | Componente UI para exibição de códigos promocionais |
| `usePromoCode` | `hooks/use-promo-code.ts` | Gancho para gerenciamento de código promocional único |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Gancho para gerenciar vários códigos promocionais |
| `PromoCode` digite | `lib/content` | Definição de tipo para dados de código promocional |

## Tipos de desconto

O sistema suporta três tipos de desconto:

| Tipo | Exibir | Exemplo |
|---|---|---|
| `percentage` | `X% OFF` | "25% DE DESCONTO" |
| `fixed` | `$X OFF` | "$ 10 de desconto" |
| `free_shipping` | `FREE SHIPPING` | "FRETE GRÁTIS" |

## O Gancho `usePromoCode` ###Interface

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

### Uso

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## Acompanhamento de estatísticas

O gancho rastreia estatísticas de cópia e clique, persistidas em `localStorage` :

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

As estatísticas são salvas e restauradas automaticamente nas sessões:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Integração analítica

O gancho dispara automaticamente eventos do Google Analytics quando disponíveis:

| Evento | Categoria | Gatilho |
|---|---|---|
| `promo_code_copied` | `engagement` | Quando um código é copiado para a área de transferência |
| `promo_code_used` | `conversion` | Quando um código é ativado/clicado |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Gerenciando vários códigos promocionais

O gancho `usePromoCodes` se estende `usePromoCode` para coleções:

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### Melhor Algoritmo de Desconto

A função `getBestDiscount()` seleciona o melhor desconto disponível:
1. Filtra apenas códigos ativos (não expirados)
2. Compara descontos percentuais por valor (quanto maior, melhor)
3. Compara descontos fixos por valor (quanto maior, melhor)
4. Os códigos de frete grátis são sempre considerados competitivos

## Componente PromoCode

O `PromoCodeComponent` renderiza um cartão de código promocional estilizado com três variantes:

### Variantes

| Variante | Descrição |
|---|---|
| `default` | Cartão de tamanho normal com descrição, termos, botão copiar e botão usar |
| `compact` | Crachá embutido com código e ícone de cópia |
| `featured` | Padrão aprimorado com realce de anel e sombra maior |

### Uso

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### Adereços de componentes

| Suporte | Tipo | Padrão | Descrição |
|---|---|---|---|
| `promoCode` | `PromoCode` | obrigatório | O objeto de dados do código promocional |
| `className` | `string?` | `undefined` | Classes CSS adicionais |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Variante de exibição |
| `showDescription` | `boolean` | `true` | Mostrar a descrição do código |
| `showTerms` | `boolean` | `true` | Mostrar termos e condições |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Retorno de chamada quando o código é copiado |

## Suporte para área de transferência

A função de cópia inclui um substituto para navegadores mais antigos:

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## Internacionalização

O componente usa `next-intl` para todas as strings voltadas para o usuário:

| Chave de tradução | Uso |
|---|---|
| `common.EXPIRES` | Etiqueta de data de validade |
| `common.EXPIRED` | Texto do emblema expirado |
| `common.PROMO_CODE` | Etiqueta do campo de código |
| `common.COPIED` | Copiar texto de confirmação |
| `common.COPY` | Copiar texto do botão |
| `common.USE_CODE` | Use o texto do botão de código |
| `common.TERMS` | Etiqueta de termos |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Componente de código promocional | `components/promo-code/promo-code.tsx` |
| Ganchos de código promocional | `hooks/use-promo-code.ts` |
| Tipo de código promocional | `lib/content` (tipo exportado) |
