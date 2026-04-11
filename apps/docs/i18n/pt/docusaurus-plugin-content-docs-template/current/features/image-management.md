---
id: image-management
title: Gerenciamento de imagens
sidebar_label: Gerenciamento de imagens
sidebar_position: 21
---

# Gerenciamento de imagens

O modelo Ever Works inclui um sistema de gerenciamento de domínio de imagem que controla quais hosts de imagem externos são permitidos para otimização de imagem Next.js. O sistema mantém listas de domínios selecionadas para provedores de imagens e serviços de ícones comuns, fornece gerenciamento de domínio em tempo de execução, validação de URL e gera configuração `remotePatterns` para `next.config.js` .

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `image-domains.ts` | `lib/utils/image-domains.ts` | Listas de domínios principais, geração de padrões e utilitários de validação |
| `useImageDomains` | `hooks/use-image-domains.ts` | Gancho React para gerenciar domínios em tempo de execução |
| `useImageValidation` | `hooks/use-image-domains.ts` | Gancho React para validar URLs de imagens em domínios permitidos |

## Domínios pré-configurados

O sistema vem com duas listas de domínios selecionadas:

### Domínios de imagem comuns

Estes são serviços de hospedagem de imagens padrão usados para avatares de usuários e imagens de conteúdo:

| Domínio | Finalidade |
|---|---|
| `lh3.googleusercontent.com` | Imagens de perfil de usuário do Google |
| `avatars.githubusercontent.com` | Avatares de usuários do GitHub |
| `platform-lookaside.fbsbx.com` | Imagens de perfil do Facebook |
| `pbs.twimg.com` | Imagens de perfil do Twitter/X |
| `images.unsplash.com` | Fotografia stock Unsplash |

### Domínios de ícones

Serviços dedicados de ícones e ativos de design:

| Domínio | Finalidade |
|---|---|
| `flaticon.com` | Ícones flaticon |
| `iconify.design` | Biblioteca de ícones Iconify |
| `icons8.com` | Ativos Icons8 |
| `feathericons.com` | Conjunto de ícones de penas |
| `heroicons.com` | Biblioteca de heroícones |
| `tabler-icons.io` | Ícones de mesa |

## Padrões remotos Next.js

A função `generateImageRemotePatterns` cria o array `remotePatterns` para configuração da imagem Next.js:

```tsx
import { generateImageRemotePatterns } from '@/lib/utils/image-domains';

// next.config.js
module.exports = {
  images: {
    remotePatterns: generateImageRemotePatterns()
  }
};
```

### Padrões gerados

A função produz dois tipos de padrões:

1. **Padrões específicos** com nomes de caminho restritos para serviços conhecidos:

```tsx
{
  protocol: 'https',
  hostname: 'lh3.googleusercontent.com',
  pathname: '/a/**'
}
```

2. **Padrões curinga** para subdomínios de todos os domínios registrados:

```tsx
{
  protocol: 'https',
  hostname: '*.flaticon.com',
  pathname: '/**'
}
```

## Validação de Domínio

### `isAllowedImageDomain` Verifica se o nome do host de uma URL está na lista de domínios permitidos:

```tsx
import { isAllowedImageDomain } from '@/lib/utils/image-domains';

isAllowedImageDomain('https://images.unsplash.com/photo-123')  // true
isAllowedImageDomain('https://cdn.flaticon.com/icons/svg/123')  // true (subdomain match)
isAllowedImageDomain('https://evil-site.com/image.jpg')         // false
isAllowedImageDomain('/local/image.png')                        // true (non-HTTP URLs pass)
```

A função executa três níveis de correspondência:

| Verifique | Descrição |
|---|---|
| Correspondência exata | O nome do host corresponde exatamente a um domínio em qualquer uma das listas |
| Correspondência de subdomínio | O nome do host termina com `.{domain}` para qualquer domínio registrado |
| Passe não HTTP | URLs sem prefixo `http://` ou `https://` sempre passam |

### `isValidImageUrl` Valida se uma string é um URL de imagem estruturalmente válido:

```tsx
import { isValidImageUrl } from '@/lib/utils/image-domains';

isValidImageUrl('https://example.com/image.png')  // true
isValidImageUrl('/local/image.png')                // true (relative URLs allowed)
isValidImageUrl('')                                // false
isValidImageUrl('not-a-url')                       // false
```

### `isProblematicUrl` Detecta URLs que provavelmente não são links diretos de imagens:

```tsx
import { isProblematicUrl } from '@/lib/utils/image-domains';

isProblematicUrl('https://flaticon.com/icone-gratuite/some-page')  // true (page, not image)
isProblematicUrl('https://example.com?related_id=123')              // true (redirect URL)
isProblematicUrl('https://example.com/photo.jpg')                   // false (valid image extension)
```

| Regra de detecção | Descrição |
|---|---|
| URLs de páginas Flaticon | URLs com caminho `/icone-gratuite/` em flaticon.com |
| Parâmetros de redirecionamento | URLs contendo parâmetros de consulta `related_id=` ou `origin=` |
| Extensão de imagem ausente | URLs sem `.jpg` , `.jpeg` , `.png` , `.gif` , `.webp` , `.svg` ou `.ico` |

### `shouldShowFallback` Determina se um ícone substituto deve ser exibido em vez de uma imagem:

```tsx
import { shouldShowFallback } from '@/lib/utils/image-domains';

shouldShowFallback('')                                    // true (empty URL)
shouldShowFallback('https://flaticon.com/page/123')       // true (problematic)
shouldShowFallback('https://example.com/icon.png')        // false (valid image)
```

## Gerenciamento de domínio em tempo de execução

### Adicionando Domínios

```tsx
import { addImageDomain } from '@/lib/utils/image-domains';

// Add as a common image domain
addImageDomain('cdn.example.com');

// Add as an icon domain
addImageDomain('my-icons.example.com', true);
```

A função é idempotente – adicionar um domínio já registrado não tem efeito.

### Removendo Domínios

```tsx
import { removeImageDomain } from '@/lib/utils/image-domains';

removeImageDomain('cdn.example.com');
// Removes from both COMMON_IMAGE_DOMAINS and ICON_DOMAINS
```

### Obtendo todos os domínios

```tsx
import { getAllowedDomains } from '@/lib/utils/image-domains';

const { common, icons } = getAllowedDomains();
// common: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', ...]
// icons: ['flaticon.com', 'iconify.design', ...]
```

Retorna cópias das matrizes de domínio, evitando mutação externa.

## O Gancho `useImageDomains` Um gancho React para gerenciar domínios de imagem com sincronização de estado:

```tsx
import { useImageDomains } from '@/hooks/use-image-domains';

function ImageDomainManager() {
  const { domains, addDomain, removeDomain, checkDomain } = useImageDomains();

  return (
    <div>
      <h3>Common Domains ({domains.common.length})</h3>
      <ul>
        {domains.common.map(domain => (
          <li key={domain}>
            {domain}
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <h3>Icon Domains ({domains.icons.length})</h3>
      <ul>
        {domains.icons.map(domain => (
          <li key={domain}>{domain}</li>
        ))}
      </ul>

      <button onClick={() => addDomain('cdn.new-service.com')}>
        Add Domain
      </button>
    </div>
  );
}
```

### API de gancho

| Método | Parâmetros | Descrição |
|---|---|---|
| `domains` | -- | Estado atual: `{ common: string[], icons: string[] }` |
| `addDomain` | `(domain: string, isIconDomain?: boolean)` | Adicione um domínio e atualize o estado |
| `removeDomain` | `(domain: string)` | Remover um domínio (normaliza a entrada) e atualizar o estado |
| `checkDomain` | `(url: string)` | Verifique se o domínio de uma URL é permitido |

O método `removeDomain` normaliza a entrada cortando espaços em branco, letras minúsculas e removendo prefixos curinga ( `*.` ).

## O Gancho `useImageValidation` Um gancho leve para validar URLs de imagens em relação à lista de domínios permitidos:

```tsx
import { useImageValidation } from '@/hooks/use-image-domains';

function ImageUrlInput({ value, onChange }) {
  const { checkImageUrl } = useImageValidation();

  const handleChange = (url: string) => {
    const { isValid, error } = checkImageUrl(url);
    if (!isValid) {
      console.warn(error);
      // e.g., "Domain not allowed. Add cdn.example.com to image domains configuration."
    }
    onChange(url);
  };

  return <input value={value} onChange={(e) => handleChange(e.target.value)} />;
}
```

### Resultados de validação

| Cenário | `isValid` | `error` |
|---|---|---|
| URL não HTTP (caminho relativo) | `true` | -- |
| Domínio permitido | `true` | -- |
| Domínio não permitido | `false` | "Domínio não permitido. Adicione `hostname` à configuração dos domínios de imagem." |
| Formato de URL inválido | `false` | "Formato de URL inválido" |

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Utilitário de domínios de imagem | `lib/utils/image-domains.ts` |
| Gancho de domínios de imagem | `hooks/use-image-domains.ts` |
| Gancho de validação de imagem | `hooks/use-image-domains.ts` |
