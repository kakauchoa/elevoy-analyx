# Rotina semanal (segunda, 9h)

Mesmas regras de escrita, coleta e envio da `claude/rotinas/diaria.md` (leia ela primeiro). O que muda está abaixo.

## Clientes

Os mesmos da diária: lista de `GET /api/claude/clientes?status=ativo`.

## Períodos

- **Semana (S):** segunda a domingo da semana passada (HOJE-7 até HOJE-1)
- **Semana anterior (S-1):** HOJE-14 até HOJE-8
- **Trimestre (T90):** como na diária

`dataReferencia` = HOJE-1 (o domingo).

## O que já foi feito

Antes de analisar, busque o que foi feito na semana:

```bash
curl -sS "https://analyx.elevoy.com.br/api/claude/otimizacoes?cliente=<slug>&status=feita&desde=<HOJE-7>"
```

Junte com o histórico de alterações das contas no Meta e no Google (`change_event`). Se uma otimização foi marcada como feita, avalie se ela surtiu efeito.

Busque também os diários da semana para manter a coerência:

```bash
curl -sS "https://analyx.elevoy.com.br/api/claude/relatorios?cliente=<slug>&tipo=diario&desde=<HOJE-7>"
```

## Estrutura do `conteudo`

```
## Resultado da semana
(S vs S-1 vs média do trimestre)

## O que melhorou
- ...

## O que piorou
- ...

## O que fizemos
- data · ação · efeito observado

## Plano da semana
1. ...

## Precisamos do cliente
- ...
```

## Campos extras no JSON

- `"tipo": "semanal"`
- `"pedidosCliente"`: lista do que precisa vir do cliente para melhorar o resultado (criativos novos, fotos, aprovação de oferta, feedback de qualidade dos leads, atualização de preço...). Lista vazia se não precisar de nada. Isso aparece em destaque no Analyx.
- `"otimizacoes"`: o plano da semana, de 2 a 6 itens.

## Visão geral e mensagem final

Envie também o `geral` com `"tipo": "semanal"`: resumo da carteira, quem precisa de atenção, e a lista consolidada do que pedir para cada cliente.

Envio para o n8n: igual ao passo 7 da diária, com `"tipo": "semanal"` e, em cada cliente, também `"melhorou"`, `"piorou"`, `"fizemos"` e `"planoDaSemana"` (listas de frases curtas).

Mensagem final para notificação:

```
Analyx · semana 13 a 19/10
Melhoraram: ...
Pioraram: ...
Pedir aos clientes: Cliente A (criativos), Cliente B (feedback dos leads)
Plano completo na aba Claude.
```
