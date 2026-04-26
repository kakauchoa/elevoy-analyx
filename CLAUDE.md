# CLAUDE.md — Plataforma de Dashboard Meta Ads

## Visão Geral do Projeto

Plataforma SaaS para gestores de tráfego pago monitorarem contas de anúncio do Meta Ads, com dashboard compartilhável para clientes, análise de métricas por funil, relatórios automáticos e cache inteligente via banco de dados MySQL para minimizar requisições à API do Meta.

---

## Stack Técnica

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + Prisma ORM
- **Banco de Dados:** MySQL (VPS com EasyPanel) + Redis para cache de sessão
- **Autenticação:** NextAuth.js com JWT
- **Pagamentos:** Stripe (assinatura mensal R$97/mês, até 3 contas)
- **Deploy:** VPS própria via EasyPanel (frontend + backend no mesmo servidor)
- **Agendamento:** node-cron para sincronização automática às 4h da manhã
- **Integrações:** Meta Ads API (Graph API v18+)

---

## Regras de Código

- Usar **named exports** em todos os componentes e módulos — nunca `default export` em componentes
- Usar **async/await** sempre — nunca `.then()`
- Usar **try/catch** em todas as chamadas de API
- Tipar tudo com **TypeScript** — nunca usar `any`
- Escrever **comentários em português** quando houver lógica de negócio importante
- Nunca usar CSS puro — sempre **Tailwind CSS**
- Não instalar dependências sem avisar antes na resposta

---

## Estrutura de Pastas

```
src/
├── app/                          # Rotas Next.js (App Router)
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard principal do gestor
│   │   ├── contas/page.tsx       # Gerenciamento de contas
│   │   ├── relatorios/page.tsx
│   │   ├── usuarios/page.tsx
│   │   └── acessos/page.tsx      # Visualizações por cliente
│   ├── compartilhavel/
│   │   └── [slug]/page.tsx       # Dashboard público do cliente
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── contas/route.ts
│       ├── meta/
│       │   ├── sincronizar/route.ts
│       │   └── insights/route.ts
│       ├── relatorio/route.ts
│       └── acessos/route.ts
├── components/
│   ├── dashboard/
│   │   ├── MetricasDestaque.tsx
│   │   ├── MetricasSecundarias.tsx
│   │   ├── GraficoMetricas.tsx
│   │   ├── TabelaCampanhas.tsx
│   │   ├── FiltrosPeriodo.tsx
│   │   └── BotaoRelatorio.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── LoadingSync.tsx
│   ├── contas/
│   │   ├── FormularioConta.tsx
│   │   └── SeletorFunil.tsx
│   └── ui/                       # Componentes genéricos reutilizáveis
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── meta-api.ts               # Funções de acesso à Graph API do Meta
│   ├── metricas.ts               # Cálculos e mapeamentos de métricas por funil
│   ├── relatorio.ts              # Geração de relatório via Anthropic API
│   └── utils.ts
├── services/
│   ├── meta-insights.service.ts  # Orquestra chamadas à API e salva no BD
│   ├── sincronizacao.service.ts  # Job de sincronização automática
│   └── acesso.service.ts         # Registro de acessos ao dashboard
├── types/
│   ├── meta.ts                   # Tipos da API do Meta
│   ├── metricas.ts               # Tipos de métricas e funis
│   └── dashboard.ts              # Tipos de exibição no dashboard
└── hooks/
    ├── useMetricas.ts
    ├── useFiltros.ts
    └── useSincronizacao.ts

prisma/
├── schema.prisma
└── migrations/                   # NUNCA editar manualmente
```

---

## Banco de Dados — Tabelas e Colunas MySQL

> **IMPORTANTE:** Nunca modificar arquivos em `prisma/migrations/` manualmente.
> Todas as migrações são geradas via `npx prisma migrate dev`.

### Tabela: `usuarios`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID gerado automaticamente |
| `nome` | VARCHAR(255) | Nome completo |
| `email` | VARCHAR(255) UNIQUE | Email de login |
| `senha_hash` | TEXT | Hash bcrypt da senha |
| `tipo` | ENUM('gestor','cliente') | Tipo de acesso |
| `ativo` | BOOLEAN | Conta ativa ou não |
| `criado_em` | DATETIME | Timestamp de criação |
| `atualizado_em` | DATETIME | Timestamp de atualização |

### Tabela: `contas_anuncio`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `usuario_id` | VARCHAR(36) FK | Gestor responsável |
| `nome_cliente` | VARCHAR(255) | Nome do cliente |
| `slug_compartilhavel` | VARCHAR(255) UNIQUE | Ex: `nome-do-cliente` — usado na URL `/compartilhavel/[slug]` |
| `account_id_meta` | VARCHAR(100) | ID da conta no Meta (ex: `act_123456`) |
| `token_acesso` | TEXT | Token de acesso à Graph API (armazenar criptografado) |
| `tipo_funil` | ENUM('whatsapp','landing_page_lead','landing_page_contato','ecommerce','conteudo','ecommerce_conteudo','outro') | Funil principal |
| `metrica_principal` | VARCHAR(100) | Nome do campo da métrica principal (ex: `whatsapp_clicks`) |
| `label_metrica_principal` | VARCHAR(255) | Texto exibido (ex: "Conversas no WhatsApp") |
| `label_custo_por_resultado` | VARCHAR(255) | Texto do custo (ex: "Custo por Conversa") |
| `compartilhamento_ativo` | BOOLEAN DEFAULT false | Se o dashboard está público |
| `ultima_sincronizacao` | DATETIME | Última sincronização bem-sucedida |
| `ativo` | BOOLEAN DEFAULT true | Conta ativa |
| `criado_em` | DATETIME | |
| `atualizado_em` | DATETIME | |

### Tabela: `campanhas`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conta_anuncio_id` | VARCHAR(36) FK | |
| `campanha_id_meta` | VARCHAR(100) UNIQUE | ID da campanha no Meta |
| `nome` | VARCHAR(500) | Nome da campanha |
| `status` | ENUM('ACTIVE','PAUSED','ARCHIVED','DELETED') | Status atual |
| `objetivo` | VARCHAR(100) | Objective retornado pela API |
| `criado_em` | DATETIME | |
| `atualizado_em` | DATETIME | |

### Tabela: `conjuntos_anuncio`

(Ad Sets / Públicos)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `campanha_id` | VARCHAR(36) FK | Referência à campanha |
| `adset_id_meta` | VARCHAR(100) UNIQUE | ID do conjunto no Meta |
| `nome` | VARCHAR(500) | Nome do conjunto de anúncio |
| `status` | ENUM('ACTIVE','PAUSED','ARCHIVED','DELETED') | |
| `criado_em` | DATETIME | |
| `atualizado_em` | DATETIME | |

### Tabela: `anuncios`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conjunto_anuncio_id` | VARCHAR(36) FK | |
| `anuncio_id_meta` | VARCHAR(100) UNIQUE | ID do anúncio no Meta |
| `nome` | VARCHAR(500) | Nome do anúncio |
| `status` | ENUM('ACTIVE','PAUSED','ARCHIVED','DELETED') | |
| `criado_em` | DATETIME | |
| `atualizado_em` | DATETIME | |

### Tabela: `insights_diarios`

Principal tabela de métricas. Uma linha por nível (conta/campanha/conjunto/anúncio) por dia.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conta_anuncio_id` | VARCHAR(36) FK | |
| `nivel` | ENUM('conta','campanha','conjunto','anuncio') | Nível do dado |
| `referencia_id` | VARCHAR(36) NULL | ID interno da campanha/conjunto/anúncio (NULL se nivel = 'conta') |
| `referencia_meta_id` | VARCHAR(100) | ID no Meta do objeto referenciado |
| `data` | DATE | Dia da métrica (YYYY-MM-DD) |
| `spend` | DECIMAL(15,4) | Valor gasto (R$) |
| `impressions` | BIGINT | Impressões totais |
| `reach` | BIGINT | Alcance único |
| `clicks` | BIGINT | Cliques totais |
| `inline_link_clicks` | BIGINT | Cliques inline no link |
| `cpm` | DECIMAL(10,4) | Custo por mil impressões |
| `ctr` | DECIMAL(10,6) | Taxa de cliques (%) |
| `cpc` | DECIMAL(10,4) | Custo por clique |
| `cpp` | DECIMAL(10,4) | Custo por 1000 pessoas alcançadas |
| `frequency` | DECIMAL(10,4) | Frequência média de exibição |
| `unique_clicks` | BIGINT | Cliques únicos |
| `unique_ctr` | DECIMAL(10,6) | CTR único (%) |
| `landing_page_views` | BIGINT | Visualizações de landing page |
| `landing_page_view_rate` | DECIMAL(10,6) | Taxa de carregamento da LP (%) |
| `outbound_clicks` | BIGINT | Cliques de saída |
| `outbound_ctr` | DECIMAL(10,6) | CTR de saída (%) |
| `resultado_principal` | BIGINT | Quantidade da métrica principal do funil |
| `tipo_resultado_principal` | VARCHAR(100) | Nome do action_type da métrica principal |
| `custo_por_resultado` | DECIMAL(10,4) | Custo por resultado principal |
| `whatsapp_clicks` | BIGINT | Cliques para WhatsApp |
| `whatsapp_cost` | DECIMAL(10,4) | Custo por conversa iniciada no WhatsApp |
| `lead_count` | BIGINT | Quantidade de leads |
| `cost_per_lead` | DECIMAL(10,4) | Custo por lead |
| `purchase_count` | BIGINT | Compras (e-commerce) |
| `purchase_value` | DECIMAL(15,4) | Valor total de compras |
| `purchase_roas` | DECIMAL(10,4) | ROAS (retorno sobre gasto em anúncios) |
| `cost_per_purchase` | DECIMAL(10,4) | Custo por compra |
| `add_to_cart` | BIGINT | Adições ao carrinho |
| `initiate_checkout` | BIGINT | Início de checkout |
| `contact_count` | BIGINT | Contatos gerados |
| `cost_per_contact` | DECIMAL(10,4) | Custo por contato |
| `post_engagement` | BIGINT | Engajamentos com publicação |
| `post_reactions` | BIGINT | Reações na publicação |
| `post_comments` | BIGINT | Comentários |
| `post_shares` | BIGINT | Compartilhamentos |
| `page_likes` | BIGINT | Curtidas na página |
| `video_view_3s` | BIGINT | Visualizações de vídeo por 3 segundos |
| `video_view_10s` | BIGINT | Visualizações de vídeo por 10 segundos |
| `video_view_25pct` | BIGINT | Visualizações até 25% do vídeo |
| `video_view_50pct` | BIGINT | Visualizações até 50% do vídeo |
| `video_view_75pct` | BIGINT | Visualizações até 75% do vídeo |
| `video_view_95pct` | BIGINT | Visualizações até 95% do vídeo |
| `video_view_100pct` | BIGINT | Visualizações completas (100%) |
| `video_avg_time_watched` | DECIMAL(10,4) | Tempo médio assistido (segundos) |
| `video_play_actions` | BIGINT | Plays no vídeo |
| `video_thruplay` | BIGINT | ThruPlays (15s ou vídeo completo) |
| `cost_per_thruplay` | DECIMAL(10,4) | Custo por ThruPlay |
| `sincronizado_em` | DATETIME | Quando foi salvo no BD |
| `criado_em` | DATETIME | |

**Índice único:** `(conta_anuncio_id, nivel, referencia_meta_id, data)` — garante upsert sem duplicatas.

### Tabela: `acessos_dashboard`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conta_anuncio_id` | VARCHAR(36) FK | Qual conta/cliente foi acessada |
| `slug` | VARCHAR(255) | Slug da URL acessada |
| `ip_visitante` | VARCHAR(45) | IP do visitante (suporta IPv6) |
| `user_agent` | TEXT | User-agent do navegador |
| `referrer` | TEXT | URL de origem do acesso |
| `pais` | VARCHAR(100) | País (geolocalização por IP) |
| `dispositivo` | ENUM('desktop','mobile','tablet','desconhecido') | Tipo de dispositivo detectado |
| `duracao_segundos` | INT NULL | Duração da sessão em segundos |
| `acessado_em` | DATETIME | Data e hora do acesso |

### Tabela: `relatorios_gerados`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conta_anuncio_id` | VARCHAR(36) FK | |
| `gerado_por_id` | VARCHAR(36) FK | ID do gestor que gerou |
| `conteudo` | LONGTEXT | Texto do relatório em Markdown |
| `periodo_inicio` | DATE | Data de início da análise |
| `periodo_fim` | DATE | Data de fim da análise |
| `criado_em` | DATETIME | |

### Tabela: `configuracoes_gtm`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | VARCHAR(36) PK | UUID |
| `conta_anuncio_id` | VARCHAR(36) FK UNIQUE | Uma config por conta |
| `gtm_container_id` | VARCHAR(50) NULL | Ex: `GTM-XXXXXXX` |
| `meta_pixel_id` | VARCHAR(50) NULL | ID do Pixel do Meta |
| `eventos_customizados` | JSON NULL | Array de eventos configurados pelo gestor |
| `ativo` | BOOLEAN DEFAULT false | Se o GTM está habilitado para este dashboard |
| `atualizado_em` | DATETIME | |

---

## Funis e Métricas Principais

### Regra de Seleção de Funil

Ao adicionar uma conta, o gestor seleciona o funil. O funil determina:
- Quais métricas aparecem em destaque
- O que é o "Resultado" e o "Custo por Resultado"
- Quais métricas ficam disponíveis no gráfico
- O conteúdo gerado no relatório automático

### Perguntas ao Adicionar uma Conta

1. Nome do cliente
2. ID da conta no Meta (ex: `act_123456789`)
3. Token de acesso (token de longa duração da Graph API)
4. Tipo de funil (dropdown)
5. **Se funil = `landing_page_lead` ou `landing_page_contato`** → perguntar qual a conversão principal (lead ou contato)
6. Slug da URL compartilhável (sugerido automaticamente com base no nome do cliente)

### Mapeamento de Funis e Métricas

```typescript
// src/lib/metricas.ts

export type TipoFunil =
  | 'whatsapp'
  | 'landing_page_lead'
  | 'landing_page_contato'
  | 'ecommerce'
  | 'conteudo'
  | 'ecommerce_conteudo'
  | 'outro';

export const CONFIGURACOES_FUNIL: Record<TipoFunil, ConfiguracaoFunil> = {
  whatsapp: {
    metricaPrincipal: 'whatsapp_clicks',
    labelMetricaPrincipal: 'Conversas no WhatsApp',
    labelCustoPorResultado: 'Custo por Conversa',
    metricasDestaque: ['spend', 'whatsapp_clicks', 'whatsapp_cost', 'cpm', 'ctr', 'unique_ctr'],
    submetricas: ['impressions', 'reach', 'clicks', 'outbound_clicks', 'frequency'],
    metricasGrafico: ['spend', 'whatsapp_clicks', 'whatsapp_cost', 'cpm', 'ctr', 'reach', 'impressions'],
  },
  landing_page_lead: {
    metricaPrincipal: 'lead_count',
    labelMetricaPrincipal: 'Leads',
    labelCustoPorResultado: 'Custo por Lead',
    metricasDestaque: ['spend', 'lead_count', 'cost_per_lead', 'cpm', 'ctr', 'landing_page_view_rate'],
    submetricas: ['impressions', 'reach', 'clicks', 'landing_page_views', 'frequency'],
    metricasGrafico: ['spend', 'lead_count', 'cost_per_lead', 'cpm', 'ctr', 'landing_page_views', 'reach'],
  },
  landing_page_contato: {
    metricaPrincipal: 'contact_count',
    labelMetricaPrincipal: 'Contatos',
    labelCustoPorResultado: 'Custo por Contato',
    metricasDestaque: ['spend', 'contact_count', 'cost_per_contact', 'cpm', 'ctr', 'landing_page_view_rate'],
    submetricas: ['impressions', 'reach', 'clicks', 'landing_page_views', 'frequency'],
    metricasGrafico: ['spend', 'contact_count', 'cost_per_contact', 'cpm', 'ctr', 'landing_page_views'],
  },
  ecommerce: {
    metricaPrincipal: 'purchase_count',
    labelMetricaPrincipal: 'Compras',
    labelCustoPorResultado: 'Custo por Compra',
    metricasDestaque: ['spend', 'purchase_count', 'cost_per_purchase', 'purchase_roas', 'ctr', 'cpm'],
    submetricas: ['impressions', 'reach', 'clicks', 'add_to_cart', 'initiate_checkout', 'purchase_value'],
    metricasGrafico: ['spend', 'purchase_count', 'purchase_roas', 'cpm', 'ctr', 'add_to_cart', 'cost_per_purchase'],
  },
  conteudo: {
    metricaPrincipal: 'video_thruplay',
    labelMetricaPrincipal: 'ThruPlays',
    labelCustoPorResultado: 'Custo por ThruPlay',
    metricasDestaque: ['spend', 'video_thruplay', 'cost_per_thruplay', 'video_view_3s', 'cpm', 'ctr'],
    submetricas: ['impressions', 'reach', 'video_view_25pct', 'video_view_50pct', 'video_view_100pct', 'video_avg_time_watched'],
    metricasGrafico: ['spend', 'video_thruplay', 'video_view_3s', 'video_view_100pct', 'cpm', 'ctr'],
  },
  ecommerce_conteudo: {
    metricaPrincipal: 'purchase_count',
    labelMetricaPrincipal: 'Compras',
    labelCustoPorResultado: 'Custo por Compra',
    metricasDestaque: ['spend', 'purchase_count', 'purchase_roas', 'video_thruplay', 'cpm', 'ctr'],
    submetricas: ['impressions', 'reach', 'video_view_3s', 'add_to_cart', 'purchase_value', 'frequency'],
    metricasGrafico: ['spend', 'purchase_count', 'purchase_roas', 'video_thruplay', 'cpm', 'ctr'],
  },
  outro: {
    metricaPrincipal: 'resultado_principal',
    labelMetricaPrincipal: 'Resultado',
    labelCustoPorResultado: 'Custo por Resultado',
    metricasDestaque: ['spend', 'resultado_principal', 'custo_por_resultado', 'cpm', 'ctr', 'impressions'],
    submetricas: ['reach', 'clicks', 'frequency', 'cpc'],
    metricasGrafico: ['spend', 'resultado_principal', 'custo_por_resultado', 'cpm', 'ctr'],
  },
};
```

---

## Fluxo de Sincronização de Dados

### Sincronização Automática — 4h da Manhã (node-cron)

```typescript
// src/services/sincronizacao.service.ts
// Agendamento: cron.schedule('0 4 * * *', ...)
//
// Lógica por execução:
// 1. Buscar todas as contas_anuncio com ativo = true
// 2. Para cada conta (uma por vez, com delay de 2s entre elas):
//    a. Calcular data de ontem
//    b. Verificar se já existe registro para conta + nivel='conta' + data=ontem
//    c. Se não existir: chamar a Graph API com token da conta
//    d. Salvar com upsert em insights_diarios para todos os níveis
//    e. Atualizar ultima_sincronizacao na conta
// 3. Logar resultado por conta com timestamp
```

### Sincronização Sob Demanda — ao Acessar o Dashboard

Quando `/compartilhavel/[slug]` é carregado:

1. Verificar se `insights_diarios` tem dados para o período e conta
2. **Se tiver** → usar dados do BD sem chamar a API
3. **Se não tiver** → disparar sincronização assíncrona e exibir `LoadingSync`:
   > "Estamos sincronizando os dados, aguarde e volte em alguns minutos"
4. Frontend faz polling a cada 30 segundos até os dados aparecerem e recarrega automaticamente

---

## Layout do Dashboard Compartilhável `/compartilhavel/[slug]`

Estrutura visual em ordem de cima para baixo:

```
[Header: Nome do cliente + Logo]        [Filtro de período ▼]

─── MÉTRICAS EM DESTAQUE ─────────────────────────────────────
[ Valor Gasto ] [ Resultado ] [ Custo/Resultado ] [ CPM ] [ CTR ] [ Taxa Conversão ]

─── MÉTRICAS SECUNDÁRIAS ─────────────────────────────────────
[ Impressões ] [ Alcance ] [ Cliques ] [ Frequência ] [...]

─── GRÁFICO POR DIA ──────────────────────────────────────────
[ Seletor de métricas para o gráfico (multi-select) ]
[ Gráfico de linha — dia a dia — métricas selecionadas ]

─── CAMPANHAS ────────────────────────────────────────────────
[ Buscar por: ○ Campanha ○ Público ○ Anúncio ] [campo de texto]

▼ Nome da Campanha                  ATIVA   R$xxx  result  CPM  CTR
    ▶ Público A                     ATIVO
         • Anúncio 1                ATIVO
         • Anúncio 2                PAUSADO
    ▶ Público B                     PAUSADO

─── (apenas para gestor logado) ─────────────────────────────
[ Botão: Gerar Relatório ]
```

### Filtros de Período

Opções no canto superior direito:
- Hoje
- Ontem
- Últimos 7 dias
- Últimos 30 dias
- Este mês
- Este trimestre
- Este ano

### Gráfico de Métricas

- Biblioteca: Recharts (já disponível no ecossistema Next.js)
- Eixo X: datas do período
- Eixo Y: valores (escala ajustável por métrica)
- Multi-select de métricas: checkboxes com as `metricasGrafico` do funil
- Cada métrica em cor distinta com legenda
- Exemplos de combinações úteis: `spend` × `cpm`, `resultado_principal` × `ctr`, `cpm` × `custo_por_resultado`

### Tabela de Campanhas

- Filtro no topo com 3 opções (radio): Campanha | Público | Anúncio
- Campo de texto: busca por "contém [texto]"
- Hierarquia expansível: Campanha → Conjuntos → Anúncios
- Badge de status: ATIVO (verde) | PAUSADO (amarelo) | ARQUIVADO (cinza)
- Colunas: Nome | Status | Gasto | Resultado | Custo/Resultado | CPM | CTR

---

## Integração com a Meta Graph API

### Campos de Insights Solicitados

```typescript
// src/lib/meta-api.ts

export const CAMPOS_INSIGHTS = [
  'spend',
  'impressions',
  'reach',
  'clicks',
  'inline_link_clicks',
  'cpm',
  'ctr',
  'cpc',
  'cpp',
  'frequency',
  'unique_clicks',
  'unique_ctr',
  'outbound_clicks',
  'outbound_ctr',
  'landing_page_views',
  'video_thruplay_watched_actions',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p95_watched_actions',
  'video_p100_watched_actions',
  'video_avg_time_watched_actions',
  'video_play_actions',
  'actions',                    // array de action_type com values
  'cost_per_action_type',       // custo por cada action_type
  'purchase_roas',
].join(',');

// Parâmetros obrigatórios na chamada:
// time_increment=1  (quebrar por dia)
// level=campaign    (ou adset, ad)
// time_range={ since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' }
```

### Mapeamento de `actions` para Colunas do BD

```typescript
// src/lib/metricas.ts

export const MAPA_ACTIONS: Record<string, keyof InsightDiario> = {
  'onsite_conversion.messaging_conversation_started_7d': 'whatsapp_clicks',
  'offsite_conversion.fb_pixel_lead': 'lead_count',
  'lead': 'lead_count',
  'offsite_conversion.fb_pixel_purchase': 'purchase_count',
  'purchase': 'purchase_count',
  'contact': 'contact_count',
  'offsite_conversion.fb_pixel_contact': 'contact_count',
  'post_engagement': 'post_engagement',
  'post_reaction': 'post_reactions',
  'comment': 'post_comments',
  'post': 'post_shares',
  'like': 'page_likes',
  'add_to_cart': 'add_to_cart',
  'initiate_checkout': 'initiate_checkout',
  'omni_add_to_cart': 'add_to_cart',
  'omni_initiated_checkout': 'initiate_checkout',
  'omni_purchase': 'purchase_count',
};

export const MAPA_VIDEO_ACTIONS: Record<string, keyof InsightDiario> = {
  'video_view': 'video_view_3s',
  'video_10_sec_watched_actions': 'video_view_10s',
  'video_p25_watched_actions': 'video_view_25pct',
  'video_p50_watched_actions': 'video_view_50pct',
  'video_p75_watched_actions': 'video_view_75pct',
  'video_p95_watched_actions': 'video_view_95pct',
  'video_p100_watched_actions': 'video_view_100pct',
  'video_avg_time_watched_actions': 'video_avg_time_watched',
  'video_play_actions': 'video_play_actions',
  'video_thruplay_watched_actions': 'video_thruplay',
};
```

---

## Geração de Relatório com Anthropic API

```typescript
// src/lib/relatorio.ts
// Endpoint: POST /api/relatorio
// Visível apenas para gestor autenticado

// O relatório analisa:
// - Como foi HOJE (comparado ao dia anterior)
// - Como foi ONTEM
// - Como foram os ÚLTIMOS 7 DIAS (média e tendência)
// - Comparativo com os ÚLTIMOS 30 DIAS (está melhorando ou piorando?)
// - Diagnóstico: os resultados estão bons ou ruins para o funil?
// - Insights: possíveis causas de variações nas métricas

// Chamar:
// modelo: claude-sonnet-4-20250514
// max_tokens: 1500
// Retornar Markdown formatado
// Exibir em modal com opção de copiar o texto
```

---

## Registro e Painel de Acessos

```typescript
// src/services/acesso.service.ts

// Ao cada acesso ao /compartilhavel/[slug]:
// 1. Registrar em acessos_dashboard: ip, user_agent, referrer, timestamp
// 2. Detectar dispositivo pelo user_agent (mobile/tablet/desktop)
// 3. Geolocalizar IP usando ip-api.com (requisição gratuita no backend)
// 4. Calcular duração via navigator.sendBeacon ao desmontar a página

// Painel /acessos (apenas gestor):
// - Tabela: cliente, data/hora, dispositivo, país, duração
// - Filtro por conta
// - Total de acessos por período
// - Gráfico de acessos por dia
```

---

## Configuração de GTM e Pixel do Meta

```typescript
// Em /contas, cada conta tem uma aba "Rastreamento"
// Campos:
// - ID do container GTM (ex: GTM-XXXXXXX)
// - ID do Pixel do Meta
// - Eventos customizados (JSON editável)
// - Toggle para ativar/desativar

// No layout de /compartilhavel/[slug]:
// - Se configuracoes_gtm.ativo = true, injetar snippet GTM no <head>
// - O snippet é injetado dinamicamente com o container_id correto
// - O Pixel do Meta também é injetado via GTM ou diretamente
```

---

## Variáveis de Ambiente (`.env`)

```env
# Banco de dados MySQL (VPS EasyPanel)
DATABASE_URL="mysql://usuario:senha@host:3306/nome_do_banco"

# Redis (cache de sessão — opcional)
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="chave-secreta-aleatoria-longa"
NEXTAUTH_URL="https://seu-dominio.com"

# Anthropic (relatórios automáticos)
ANTHROPIC_API_KEY="sk-ant-..."

# Meta Graph API
META_API_VERSION="v18.0"

# URL do app
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"

# Chave de criptografia para tokens (AES-256)
TOKEN_ENCRYPTION_KEY="chave-de-32-chars-aqui"
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum TipoUsuario {
  gestor
  cliente
}

enum TipoFunil {
  whatsapp
  landing_page_lead
  landing_page_contato
  ecommerce
  conteudo
  ecommerce_conteudo
  outro
}

enum StatusCampanha {
  ACTIVE
  PAUSED
  ARCHIVED
  DELETED
}

enum NivelInsight {
  conta
  campanha
  conjunto
  anuncio
}

enum TipoDispositivo {
  desktop
  mobile
  tablet
  desconhecido
}

model Usuario {
  id            String        @id @default(uuid())
  nome          String
  email         String        @unique
  senhaHash     String        @map("senha_hash") @db.Text
  tipo          TipoUsuario   @default(gestor)
  ativo         Boolean       @default(true)
  criadoEm      DateTime      @default(now()) @map("criado_em")
  atualizadoEm  DateTime      @updatedAt @map("atualizado_em")
  contas        ContaAnuncio[]
  relatorios    RelatorioGerado[]
  @@map("usuarios")
}

model ContaAnuncio {
  id                    String          @id @default(uuid())
  usuarioId             String          @map("usuario_id")
  nomeCliente           String          @map("nome_cliente")
  slugCompartilhavel    String          @unique @map("slug_compartilhavel")
  accountIdMeta         String          @map("account_id_meta")
  tokenAcesso           String          @db.Text @map("token_acesso")
  tipoFunil             TipoFunil       @map("tipo_funil")
  metricaPrincipal      String          @map("metrica_principal")
  labelMetricaPrincipal String          @map("label_metrica_principal")
  labelCustoPorResultado String         @map("label_custo_por_resultado")
  compartilhamentoAtivo Boolean         @default(false) @map("compartilhamento_ativo")
  ultimaSincronizacao   DateTime?       @map("ultima_sincronizacao")
  ativo                 Boolean         @default(true)
  criadoEm              DateTime        @default(now()) @map("criado_em")
  atualizadoEm          DateTime        @updatedAt @map("atualizado_em")
  usuario               Usuario         @relation(fields: [usuarioId], references: [id])
  campanhas             Campanha[]
  insights              InsightDiario[]
  acessos               AcessoDashboard[]
  relatorios            RelatorioGerado[]
  configuracaoGtm       ConfiguracaoGtm?
  @@map("contas_anuncio")
}

model Campanha {
  id              String          @id @default(uuid())
  contaAnuncioId  String          @map("conta_anuncio_id")
  campanhaIdMeta  String          @unique @map("campanha_id_meta")
  nome            String          @db.VarChar(500)
  status          StatusCampanha
  objetivo        String?
  criadoEm        DateTime        @default(now()) @map("criado_em")
  atualizadoEm    DateTime        @updatedAt @map("atualizado_em")
  conta           ContaAnuncio    @relation(fields: [contaAnuncioId], references: [id])
  conjuntos       ConjuntoAnuncio[]
  @@map("campanhas")
}

model ConjuntoAnuncio {
  id            String      @id @default(uuid())
  campanhaId    String      @map("campanha_id")
  adsetIdMeta   String      @unique @map("adset_id_meta")
  nome          String      @db.VarChar(500)
  status        StatusCampanha
  criadoEm      DateTime    @default(now()) @map("criado_em")
  atualizadoEm  DateTime    @updatedAt @map("atualizado_em")
  campanha      Campanha    @relation(fields: [campanhaId], references: [id])
  anuncios      Anuncio[]
  @@map("conjuntos_anuncio")
}

model Anuncio {
  id              String          @id @default(uuid())
  conjuntoId      String          @map("conjunto_anuncio_id")
  anuncioIdMeta   String          @unique @map("anuncio_id_meta")
  nome            String          @db.VarChar(500)
  status          StatusCampanha
  criadoEm        DateTime        @default(now()) @map("criado_em")
  atualizadoEm    DateTime        @updatedAt @map("atualizado_em")
  conjunto        ConjuntoAnuncio @relation(fields: [conjuntoId], references: [id])
  @@map("anuncios")
}

model InsightDiario {
  id                    String        @id @default(uuid())
  contaAnuncioId        String        @map("conta_anuncio_id")
  nivel                 NivelInsight
  referenciaId          String?       @map("referencia_id")
  referenciaMetaId      String        @map("referencia_meta_id")
  data                  DateTime      @db.Date
  spend                 Decimal?      @db.Decimal(15, 4)
  impressions           BigInt?
  reach                 BigInt?
  clicks                BigInt?
  inlineLinkClicks      BigInt?       @map("inline_link_clicks")
  cpm                   Decimal?      @db.Decimal(10, 4)
  ctr                   Decimal?      @db.Decimal(10, 6)
  cpc                   Decimal?      @db.Decimal(10, 4)
  cpp                   Decimal?      @db.Decimal(10, 4)
  frequency             Decimal?      @db.Decimal(10, 4)
  uniqueClicks          BigInt?       @map("unique_clicks")
  uniqueCtr             Decimal?      @map("unique_ctr") @db.Decimal(10, 6)
  landingPageViews      BigInt?       @map("landing_page_views")
  landingPageViewRate   Decimal?      @map("landing_page_view_rate") @db.Decimal(10, 6)
  outboundClicks        BigInt?       @map("outbound_clicks")
  outboundCtr           Decimal?      @map("outbound_ctr") @db.Decimal(10, 6)
  resultadoPrincipal    BigInt?       @map("resultado_principal")
  tipoResultadoPrincipal String?      @map("tipo_resultado_principal")
  custoPorResultado     Decimal?      @map("custo_por_resultado") @db.Decimal(10, 4)
  whatsappClicks        BigInt?       @map("whatsapp_clicks")
  whatsappCost          Decimal?      @map("whatsapp_cost") @db.Decimal(10, 4)
  leadCount             BigInt?       @map("lead_count")
  costPerLead           Decimal?      @map("cost_per_lead") @db.Decimal(10, 4)
  purchaseCount         BigInt?       @map("purchase_count")
  purchaseValue         Decimal?      @map("purchase_value") @db.Decimal(15, 4)
  purchaseRoas          Decimal?      @map("purchase_roas") @db.Decimal(10, 4)
  costPerPurchase       Decimal?      @map("cost_per_purchase") @db.Decimal(10, 4)
  addToCart             BigInt?       @map("add_to_cart")
  initiateCheckout      BigInt?       @map("initiate_checkout")
  contactCount          BigInt?       @map("contact_count")
  costPerContact        Decimal?      @map("cost_per_contact") @db.Decimal(10, 4)
  postEngagement        BigInt?       @map("post_engagement")
  postReactions         BigInt?       @map("post_reactions")
  postComments          BigInt?       @map("post_comments")
  postShares            BigInt?       @map("post_shares")
  pageLikes             BigInt?       @map("page_likes")
  videoView3s           BigInt?       @map("video_view_3s")
  videoView10s          BigInt?       @map("video_view_10s")
  videoView25pct        BigInt?       @map("video_view_25pct")
  videoView50pct        BigInt?       @map("video_view_50pct")
  videoView75pct        BigInt?       @map("video_view_75pct")
  videoView95pct        BigInt?       @map("video_view_95pct")
  videoView100pct       BigInt?       @map("video_view_100pct")
  videoAvgTimeWatched   Decimal?      @map("video_avg_time_watched") @db.Decimal(10, 4)
  videoPlayActions      BigInt?       @map("video_play_actions")
  videoThruplay         BigInt?       @map("video_thruplay")
  costPerThruplay       Decimal?      @map("cost_per_thruplay") @db.Decimal(10, 4)
  sincronizadoEm        DateTime      @default(now()) @map("sincronizado_em")
  criadoEm              DateTime      @default(now()) @map("criado_em")
  conta                 ContaAnuncio  @relation(fields: [contaAnuncioId], references: [id])
  @@unique([contaAnuncioId, nivel, referenciaMetaId, data])
  @@map("insights_diarios")
}

model AcessoDashboard {
  id              String          @id @default(uuid())
  contaAnuncioId  String          @map("conta_anuncio_id")
  slug            String
  ipVisitante     String?         @map("ip_visitante") @db.VarChar(45)
  userAgent       String?         @map("user_agent") @db.Text
  referrer        String?         @db.Text
  pais            String?         @db.VarChar(100)
  dispositivo     TipoDispositivo @default(desconhecido)
  duracaoSegundos Int?            @map("duracao_segundos")
  acessadoEm      DateTime        @default(now()) @map("acessado_em")
  conta           ContaAnuncio    @relation(fields: [contaAnuncioId], references: [id])
  @@map("acessos_dashboard")
}

model RelatorioGerado {
  id              String        @id @default(uuid())
  contaAnuncioId  String        @map("conta_anuncio_id")
  geradoPorId     String        @map("gerado_por_id")
  conteudo        String        @db.LongText
  periodoInicio   DateTime      @db.Date @map("periodo_inicio")
  periodoFim      DateTime      @db.Date @map("periodo_fim")
  criadoEm        DateTime      @default(now()) @map("criado_em")
  conta           ContaAnuncio  @relation(fields: [contaAnuncioId], references: [id])
  geradoPor       Usuario       @relation(fields: [geradoPorId], references: [id])
  @@map("relatorios_gerados")
}

model ConfiguracaoGtm {
  id              String        @id @default(uuid())
  contaAnuncioId  String        @unique @map("conta_anuncio_id")
  gtmContainerId  String?       @map("gtm_container_id") @db.VarChar(50)
  metaPixelId     String?       @map("meta_pixel_id") @db.VarChar(50)
  eventosCustomizados Json?     @map("eventos_customizados")
  ativo           Boolean       @default(false)
  atualizadoEm    DateTime      @updatedAt @map("atualizado_em")
  conta           ContaAnuncio  @relation(fields: [contaAnuncioId], references: [id])
  @@map("configuracoes_gtm")
}
```

---

## Deploy na VPS (EasyPanel)

### Requisitos na VPS

- Node.js 18+
- MySQL 8.0+
- PM2 para manter o processo ativo
- Nginx como reverse proxy (configurado pelo EasyPanel)

### Passos de Deploy

```bash
# 1. Clonar o repositório
git clone https://github.com/seu-usuario/meta-dashboard.git
cd meta-dashboard

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com os dados reais

# 4. Executar migrations
npx prisma migrate deploy
npx prisma generate

# 5. Build de produção
npm run build

# 6. Iniciar com PM2
pm2 start npm --name "meta-dashboard" -- start
pm2 save
pm2 startup
```

### Script de Atualização (`deploy.sh`)

```bash
#!/bin/bash
set -e
echo "Iniciando deploy..."
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart meta-dashboard
echo "Deploy concluído!"
```

---

## Notas de Segurança

- `token_acesso` DEVE ser armazenado criptografado com AES-256 usando `TOKEN_ENCRYPTION_KEY`
- Descriptografar apenas no momento da chamada à API do Meta
- O slug de compartilhamento não pode expor IDs internos do banco
- A rota `/compartilhavel/[slug]` não autentica, mas registra todos os acessos
- Botão "Gerar Relatório" verifica sessão NextAuth antes de renderizar
- Implementar rate limiting nas rotas de sincronização manual
- Validar `account_id_meta` e `token_acesso` antes de salvar (teste de chamada simples à API)

---

## Prioridade de Desenvolvimento (Ordem)

1. Schema Prisma + migrations iniciais no MySQL
2. Autenticação NextAuth (login do gestor)
3. CRUD de contas de anúncio com seleção de funil
4. Integração com Meta Graph API (busca de insights)
5. Sincronização manual com salvamento no BD
6. Dashboard compartilhável — métricas e layout
7. Gráfico de métricas editável (Recharts)
8. Tabela hierárquica de campanhas/públicos/anúncios
9. Filtros de período e busca por texto
10. Sincronização automática com node-cron (4h)
11. Geração de relatório com Anthropic API
12. Painel de acessos ao dashboard (`/acessos`)
13. Configuração de GTM e Pixel por conta (`/contas`)
14. Gestão de usuários clientes (`/usuarios`)