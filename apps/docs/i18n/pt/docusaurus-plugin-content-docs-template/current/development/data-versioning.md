---
id: data-versioning
title: Sistema de Versionamento de Dados
sidebar_label: Versionamento Dados
sidebar_position: 6
---

# Sistema de Exibição de Versão de Dados

O Ever Works inclui um sistema de versionamento de dados que mostra aos usuários a versão atual dos dados que estão visualizando, proporcionando transparência sobre a atualidade do conteúdo.

## Visão Geral

O sistema fornece:
- 📊 **Exibição de versão em tempo real** - Mostra a versão atual do repositório de dados
- 🔄 **Atualização automática** - Atualiza periodicamente as informações de versão
- 🎨 **Múltiplas variantes** - Visualizações em badge, inline e detalhada
- 💡 **Detalhes em tooltip** - Passe o mouse para informações abrangentes
- ⚡ **Suporte a ISR** - Funciona com Regeneração Estática Incremental
- 🛡️ **Tratamento de erros** - Fallback gracioso quando indisponível

## Arquitetura

```mermaid
graph TB
    Component[VersionDisplay] --> Hook[useVersionInfo]
    Hook --> API[/api/version]
    API --> Git[Git Repository]
    Git --> Sync[Auto Sync]
    Sync --> Cache[Cache Layer]
    Cache --> Response[Version Info]
```

## Componentes

### VersionDisplay

Componente principal para exibir informações de versão.

```tsx
import { VersionDisplay } from "@/components/version";

// Exibição inline básica
<VersionDisplay variant="inline" />

// Variante badge
<VersionDisplay variant="badge" />

// Visualização detalhada com informações adicionais
<VersionDisplay variant="detailed" showDetails={true} />
```

**Props**:
- `variant`: `"inline" | "badge" | "detailed"` - Estilo de exibição
- `showDetails`: `boolean` - Mostrar informações estendidas (somente variante detalhada)
- `className`: `string` - Classes CSS adicionais
- `refreshInterval`: `number` - Intervalo de atualização automática em ms (padrão: 5 minutos)

### VersionTooltip

Componente wrapper que adiciona um tooltip com informações detalhadas de versão.

```tsx
import { VersionTooltip } from "@/components/version";

<VersionTooltip>
  <VersionDisplay variant="badge" />
</VersionTooltip>
```

**Recursos**:
- Mostra hash e data do commit
- Exibe mensagem do commit
- Mostra informações do autor
- Links para o repositório

### Hook useVersionInfo

Hook personalizado para gerenciar informações de versão com cache e atualização automática.

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

const { versionInfo, loading, error, refetch } = useVersionInfo({
  refreshInterval: 5 * 60 * 1000, // 5 minutos
  retryOnError: true,
  retryDelay: 10000
});
```

**Retorna**:
- `versionInfo`: Objeto de dados de versão
- `loading`: Estado de carregamento
- `error`: Estado de erro
- `refetch`: Função de atualização manual

## Endpoint da API

### GET /api/version

Retorna informações sobre a versão atual do repositório de dados.

**Resposta**:
```json
{
  "commit": "abc1234",
  "date": "2024-01-01T12:00:00.000Z",
  "message": "Update data items",
  "author": "Developer Name",
  "repository": "https://github.com/owner/repo",
  "lastSync": "2024-01-01T12:05:00.000Z"
}
```

**Recursos**:
- Sincronização automática do repositório antes de buscar
- Cabeçalhos de cache adequados para desempenho ideal
- Suporte a ETag para cache eficiente
- Tratamento de erros com códigos de status HTTP apropriados

**Cabeçalhos de Cache**:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
ETag: "abc1234"
```

## Configuração

### Variáveis de Ambiente

```env
# URL do repositório de dados
DATA_REPOSITORY=https://github.com/your-org/your-data-repo

# Token do GitHub para repositórios privados (opcional)
GH_TOKEN=ghp_your_github_token_here

# Intervalo de sincronização do repositório (opcional, padrão: 5 minutos)
REPO_SYNC_INTERVAL=300000
```

### Estratégia de Cache

#### Cache do Lado do Cliente
- **Duração**: 1 minuto
- **Estratégia**: stale-while-revalidate
- **Atualização**: Atualizações automáticas em segundo plano

#### Cache do Lado do Servidor
- **Duração**: 60 segundos
- **Estratégia**: s-maxage com revalidação
- **ETag**: Baseado no hash do commit

## Exemplos de Uso

### Badge de Versão no Rodapé

```tsx
// components/footer/Footer.tsx
import { VersionDisplay } from "@/components/version";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <p>© 2024 Ever Works</p>
        <VersionDisplay variant="badge" />
      </div>
    </footer>
  );
}
```

### Painel Administrativo

```tsx
// app/admin/dashboard/page.tsx
import { VersionDisplay } from "@/components/version";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Painel Administrativo</h1>
      <VersionDisplay 
        variant="detailed" 
        showDetails={true}
        refreshInterval={60000} // 1 minuto
      />
    </div>
  );
}
```

### Implementação Personalizada

```tsx
import { useVersionInfo } from "@/hooks/use-version-info";

export function CustomVersionDisplay() {
  const { versionInfo, loading, error, refetch } = useVersionInfo();

  if (loading) return <div>Carregando versão...</div>;
  if (error) return <div>Versão indisponível</div>;

  return (
    <div>
      <p>Versão dos dados: {versionInfo.commit.substring(0, 7)}</p>
      <p>Atualizado: {new Date(versionInfo.date).toLocaleDateString()}</p>
      <button onClick={refetch}>Atualizar</button>
    </div>
  );
}
```

## Variantes de Exibição

### Variante Inline

Exibição de texto compacto adequada para rodapés ou barras laterais.

```tsx
<VersionDisplay variant="inline" />
// Saída: "Data v.abc1234 • Atualizado há 2 horas"
```

### Variante Badge

Badge em forma de pílula com ícone, perfeito para cabeçalhos ou navegação.

```tsx
<VersionDisplay variant="badge" />
// Saída: [🔄 v.abc1234]
```

### Variante Detalhada

Visualização abrangente com todas as informações de versão.

```tsx
<VersionDisplay variant="detailed" showDetails={true} />
// Saída: Cartão com commit, data, mensagem, autor, link do repositório
```

## Melhores Práticas

### 1. Posicionamento
- **Rodapé**: Use variante inline ou badge
- **Painéis administrativos**: Use variante detalhada
- **Cabeçalhos**: Use variante badge
- **Tooltips**: Envolva qualquer variante com VersionTooltip

### 2. Intervalos de Atualização
- **Páginas públicas**: 5-10 minutos
- **Páginas administrativas**: 1-2 minutos
- **Painéis em tempo real**: 30 segundos

### 3. Tratamento de Erros
- Sempre forneça UI de fallback
- Registre erros para monitoramento
- Mostre mensagens amigáveis ao usuário

### 4. Desempenho
- Use durações de cache apropriadas
- Implemente stale-while-revalidate
- Evite chamadas de API excessivas

## Solução de Problemas

### Versão Não Atualizando

**Problema**: As informações de versão não são atualizadas

**Solução**: Verifique o intervalo de atualização e as configurações de cache

```tsx
// Forçar atualização imediata
const { refetch } = useVersionInfo();
refetch();
```

### Erros de API

**Problema**: `/api/version` retorna erros

**Solução**: Verifique as variáveis de ambiente e o acesso ao repositório

```bash
# Check environment variables
echo $DATA_REPOSITORY
echo $GH_TOKEN

# Test repository access
git ls-remote $DATA_REPOSITORY
```

### Carregamento Lento

**Problema**: O componente de versão carrega lentamente

**Solução**: Otimize o cache e reduza a frequência de atualização
