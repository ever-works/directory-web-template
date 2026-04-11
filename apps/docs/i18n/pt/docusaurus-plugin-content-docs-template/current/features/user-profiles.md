---
id: user-profiles
title: Perfis e configurações de usuário
sidebar_label: Perfis de usuário
sidebar_position: 18
---

# Perfis e configurações de usuário

O modelo Ever Works inclui um sistema de perfil de usuário com páginas de perfil público, navegação por guias, gerenciamento de avatar, links sociais e componentes de exibição de perfil. Os usuários podem mostrar suas informações, portfólio, habilidades e itens enviados por meio de uma interface de perfil estruturada.

## Visão geral da arquitetura

| Componente | Caminho | Finalidade |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Conteúdo da página de perfil principal com roteamento de guias |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Barra de navegação com guia fixa |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Capa do perfil, avatar, biografia e links sociais |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Componente de etiqueta de habilidade/interesse |
| `ProfileButton` | `components/header/profile-button.tsx` | Acionador do menu do perfil do cabeçalho |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Menu suspenso do perfil |

## Estrutura de dados do perfil

```tsx
// lib/types/profile.ts
interface Profile {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatar: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLink[];
}

interface SocialLink {
  platform: string;    // 'github', 'linkedin', 'twitter', etc.
  url: string;
  displayName: string;
}
```

## Cabeçalho do perfil

O componente `ProfileHeader` renderiza a seção superior de um perfil de usuário com um banner de capa gradiente, avatar com botão de edição e informações biográficas:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Recursos

| Recurso | Descrição |
|---|---|
| Bandeira da capa | Fundo gradiente usando cores primárias e secundárias do tema |
| Avatares | Imagem circular com borda circular, dimensionamento responsivo (24x24 a 28x28) |
| Botão Editar | Mostrado apenas quando `isOwnProfile` é verdadeiro |
| Substituição de imagem | Mostra espaço reservado para ícone do usuário em erro de carregamento de imagem |
| Links sociais | Renderiza ícones específicos da plataforma (GitHub, LinkedIn, Twitter) |
| Localização e empresa | Displays com alfinetes de mapa e ícones de pasta |
| Link do site | Link externo com ícone de globo |

### Tratamento de erros de avatar

O componente inclui tratamento robusto de erros de imagem:

```tsx
const [imageError, setImageError] = useState(false);

// Reset error when avatar URL changes
useEffect(() => {
  setImageError(false);
}, [profile.avatar]);

// Render fallback on error
{!imageError && profile.avatar ? (
  <Image src={profile.avatar} onError={() => setImageError(true)} />
) : (
  <FiUser className="w-8 h-8 text-gray-400" />
)}
```

### Ícones de plataformas sociais

| Plataforma | Ícone |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Outros | `FiGlobe` (genérico) |

## Navegação no perfil

O componente `ProfileNavigation` fornece uma navegação com guias fixas:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Guias disponíveis

| ID da guia | Etiqueta | Ícone |
|---|---|---|
| `about` | Sobre | `FiUser` |
| `portfolio` | Portfólio | `FiBriefcase` |
| `skills` | Habilidades | `FiAward` |
| `submissions` | Envios | `FiFileText` |

### Recursos de navegação

- **Posicionamento fixo** -- Permanece no topo ao rolar com fundo desfocado
- **Otimizado para dispositivos móveis** - Rolagem horizontal em telas pequenas
- **Foco visível** -- Indicador de anel para navegação pelo teclado
- **Reconhecimento de tema** -- A guia Ativa usa cores primárias do tema

## Conteúdo do perfil

O componente `ProfileContent` orquestra a página de perfil combinando navegação e conteúdo da guia:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Seções da guia

| Seção | Componente | Conteúdo |
|---|---|---|
| Sobre | `AboutSection` | Informações pessoais, biografia, detalhes |
| Portfólio | `PortfolioSection` | Amostras de trabalho e projetos |
| Habilidades | `SkillsSection` | Etiquetas de habilidades e conhecimentos |
| Envios | `SubmissionsSection` | Itens enviados pelo usuário |

Cada seção é renderizada com um cabeçalho consistente:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Componentes do botão de perfil

### Botão de perfil de cabeçalho

Um botão no cabeçalho do site que abre o menu do perfil:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Exibição do cabeçalho do perfil

Mostra o nome e o avatar do usuário em formato compacto:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Menu de perfil

Um menu suspenso com ações de perfil:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Design Responsivo

Os componentes do perfil são criados com uma abordagem que prioriza os dispositivos móveis:

| Ponto de interrupção | Comportamento |
|---|---|
| Móvel | Avatar centralizado, layout empilhado, rolagem de guia horizontal |
| Tablet+ | Avatar alinhado à esquerda, layout lado a lado |
| Área de trabalho | Cartão de largura total com restrições de largura máxima |

### Dimensionamento de avatar

| Tela | Tamanho |
|---|---|
| Móvel | 24x24 (96px) |
| Área de trabalho | 28x28 (112px) |

## Integração de Tema

O sistema de perfis usa o sistema de temas do modelo:

- O gradiente do banner de capa usa variáveis CSS `--theme-primary` e `--theme-secondary` - Os estados das guias ativas usam cores primárias do tema
- O modo escuro é totalmente compatível com taxas de contraste apropriadas
- Os estados de foco usam transições de cores com reconhecimento de tema

## Estrutura de layout

```
ProfileHeader (cover + avatar + info card)
  |
  +-- Cover Banner (gradient)
  +-- Avatar (overlapping cover)
  +-- Info Card
      +-- Name & Title
      +-- Bio
      +-- Location / Company / Website
      +-- Social Links

ProfileContent
  |
  +-- ProfileNavigation (sticky tabs)
  +-- Active Section
      +-- AboutSection
      +-- PortfolioSection
      +-- SkillsSection
      +-- SubmissionsSection
```

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Conteúdo do perfil | `components/profile/profile-content.tsx` |
| Navegação de perfil | `components/profile/profile-navigation.tsx` |
| Cabeçalho do perfil | `components/profile/profile-header.tsx` |
| Etiqueta de perfil | `components/profile/profile-tag.tsx` |
| Botão de perfil do cabeçalho | `components/header/profile-button.tsx` |
| Menu Perfil | `components/profile-button/profile-menu.tsx` |
| Tipos de perfil | `lib/types/profile.ts` |
