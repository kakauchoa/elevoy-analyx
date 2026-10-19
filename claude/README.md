# Claude | Analyx Relatórios

Área do Claude no Analyx: cadastro de clientes, relatórios diários e semanais e otimizações sugeridas.

## Onde fica cada coisa

| O quê | Onde |
|---|---|
| Cadastro de clientes (contas, contrato, briefing, links, Drive, mapa de serviços) | Aba **Claude → Clientes** no Analyx, tabela `claude_clientes` |
| Relatórios e otimizações | Aba **Claude → Relatórios**, tabelas `claude_relatorios` e `claude_otimizacoes` |
| Roteiro das rotinas | `claude/rotinas/diaria.md` (8h, todo dia) e `claude/rotinas/semanal.md` (segunda 9h) |

## Como a rotina usa o cadastro

1. Lê `GET /api/claude/clientes?status=ativo`. Só cliente ativo entra.
2. Puxa somente as contas que estão na ficha do cliente (Meta e Google Ads; GA4 e Kommo depois).
3. Usa briefing, observações e mapa de serviços como contexto da análise.
4. Envia cada relatório para `POST /api/claude/relatorios`.

Para tirar um cliente das análises: status **Pausado** ou **Encerrado** na ficha. Para tirar uma conta: remova o ID dela da ficha.

## API (todas em `/api/claude`)

| Rota | Quem acessa |
|---|---|
| `GET clientes`, `GET clientes/:id` | Rotina (token) ou admin logado |
| `POST clientes`, `PATCH/DELETE clientes/:id` | Admin logado |
| `POST relatorios`, `GET relatorios`, `GET otimizacoes` | Rotina (token) ou admin logado |
| `PATCH otimizacoes/:id` | Admin logado |

O token fica na variável `CLAUDE_RELATORIOS_TOKEN` do app e como segredo de rede no ambiente das rotinas. Nunca neste repo.
