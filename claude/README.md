# Claude | Analyx Relatórios

Área do Claude dentro do repo. Aqui fica tudo que o Claude precisa para gerar a visão diária e o relatório semanal de cada cliente. Não depende de nenhuma parte do app (Next.js, Prisma, banco).

## Estrutura

```
claude/
  README.md              este arquivo
  clientes/
    _modelo/             modelo copiado a cada cliente novo
      cliente.json       cadastro: quem é, contas, objetivo, metas
      contexto.md        o negócio em texto livre
      log-acoes.md       o que foi feito nas campanhas e por quê
    <slug-do-cliente>/   uma pasta por cliente, mesmos 3 arquivos
  rotinas/
    diaria.md            roteiro da rotina das 8h (todo dia)
    semanal.md           roteiro da rotina de segunda 9h
```

## Onde os relatórios aparecem

As rotinas enviam cada relatório para `POST /api/claude/relatorios` no Analyx, que salva nas tabelas `claude_relatorios` e `claude_otimizacoes`. Eles aparecem na aba **Claude → Relatórios** do painel (só admin):

- `/claude`: visão geral, card por cliente com tendência, métricas e pendências
- `/claude/<slug>`: histórico de relatórios e lista de otimizações (marcar como feita ou descartar)

O token fica na variável `CLAUDE_RELATORIOS_TOKEN` do app e como segredo de rede no ambiente das rotinas. Nunca neste repo.

## Cadastro de cliente novo

Quando você disser "novo cliente", o Claude pergunta, nessa ordem:

1. Nome do cliente e segmento
2. ID da conta de anúncio do Meta (pode ser mais de uma)
3. Customer ID do Google Ads (formato 123-456-7890)
4. ID da propriedade do GA4
5. Advertiser ID do TikTok Ads (se tiver)
6. Resultado principal: lead, conversa no WhatsApp, compra, agendamento, matrícula...
7. Meta de custo por resultado e orçamento mensal
8. Ticket médio (se souber)
9. Contexto: o que vende, pra quem, região, sazonalidade, o que não pode ser feito

Antes de criar a pasta, o Claude testa cada ID puxando dados reais. Conta que não responde não entra no cadastro.

Plataforma que o cliente não usa fica com `null`.

## Regras

- Nada de token, senha ou chave de API nesses arquivos. Só IDs.
- O `slug` é o nome da pasta: minúsculo, sem acento, com hífen (ex: `boutique-das-flores`).
- Cliente pausado: `"ativo": false`. Ele sai dos relatórios mas a pasta fica.
- Toda otimização feita entra no `log-acoes.md`. É dali que sai o "o que fizemos" do relatório de segunda.
