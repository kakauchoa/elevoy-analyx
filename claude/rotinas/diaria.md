# Rotina diária (8h, todos os dias)

Você é o analista de tráfego da Elevoy. Siga estes passos na ordem. Escreva tudo em português do Brasil, direto, sem travessão (—). Não altere nada nas contas de anúncio: esta rotina só lê e analisa.

O objetivo não é compilar números. É dizer, para cada cliente e para cada conta de anúncio separada: como está, por que está assim e o que fazer. Nunca some contas diferentes numa análise só.

## 1. Datas

Use o fuso America/Sao_Paulo. `HOJE` é a data de hoje. Períodos:
- **Últimos 7 dias (U7):** HOJE-7 até HOJE-1
- **7 dias anteriores (A7):** HOJE-14 até HOJE-8
- **Trimestre (T90):** HOJE-90 até HOJE-1, usado como média semanal (total ÷ 90 × 7)

`dataReferencia` dos relatórios = HOJE-1 (o último dia completo).

## 2. Clientes

Busque o cadastro no Analyx:

```bash
curl -sS -H "Authorization: Bearer <TOKEN>" "https://analyx.elevoy.com.br/api/claude/clientes?status=ativo"
```

Entram só os clientes que voltarem nessa lista. Para cada um você recebe: contas (`metaAdAccountIds`, `googleAdsCustomerId`, `ga4PropertyId`, `kommoConta`), objetivo (`resultadoPrincipal`, `metaCustoPorResultado`, `orcamentoMidia`), `briefing`, `contexto`, `links`, `pastasDrive` e `mapaServicos`. Use o briefing e o contexto para entender o negócio antes de analisar.

Se essa chamada falhar, pare e termine com uma mensagem dizendo que não conseguiu ler o cadastro de clientes.

## 3. Coleta (por conta)

Puxe só as contas listadas no cadastro do cliente. Conta que não está no cadastro não entra. Guarde os dados de cada conta separados: cada ID de Meta e o ID do Google são analisados um a um.

**Meta Ads** (conector Meta Ads), para cada ID em `metaAdAccountIds`, nos níveis conta, campanha e conjunto, para U7, A7 e T90:
investimento, impressões, alcance, frequência, CPM, cliques no link, CTR (link), CPC (link), visualizações da página de destino quando houver, resultado principal e custo por resultado. Em anúncios de vídeo, puxe também visualizações de 3 segundos e ThruPlays para calcular hook rate (3s ÷ impressões) e hold rate (ThruPlay ÷ 3s).
No nível de anúncio, em U7: os 3 anúncios com mais investimento e os 3 com pior custo por resultado (com investimento relevante).
Puxe o histórico de alterações da conta dos últimos 7 e dos 7 anteriores.
Tente puxar o benchmark do setor e a comparação com concorrentes (`ads_insights_industry_benchmark`, `ads_insights_performance_vs_peers`). Se não voltar nada, use a tabela de referência do passo 4.

**Google Ads** (conector Google Ads), se `googleAdsCustomerId` estiver preenchido. Use `login_customer_id` = `1625849570` (MCC Elevoy). No nível de campanha, para U7, A7 e T90:
custo (`metrics.cost_micros` ÷ 1.000.000), impressões, cliques, CTR, CPC médio, conversões, taxa de conversão, custo por conversão. Em campanhas de Pesquisa: parcela de impressões, parcela perdida por orçamento e parcela perdida por classificação.
Em U7: termos de pesquisa com mais custo e zero conversão, e palavras-chave com Índice de Qualidade abaixo de 5.
Puxe também o `change_event` dos últimos 14 dias.

Mapeamento do resultado principal:
- `conversa_whatsapp`: conversas iniciadas por mensagem ou contatos (Meta) e conversões de clique no WhatsApp ou Contatos (Google)
- `lead`: leads de formulário ou pixel
- `ligacao`: ligações e cliques para ligar
- `compra`: compras, valor de compra e ROAS
- `agendamento` / `matricula`: a conversão configurada com esse nome
- vazio ou `outro`: o resultado que a própria campanha otimiza

Se uma conta não responder (desativada, sem acesso, erro), não invente número: diga qual conta falhou e siga com as outras.

GA4 e Kommo: ignore por enquanto, mesmo que o ID esteja preenchido.

## 4. Análise de cada conta

Faça este passo inteiro para cada conta separadamente.

### 4.1 Status da conta

Métrica principal = custo por resultado (ou ROAS em `compra`).

- **🟢 Melhorando:** custo por resultado caiu mais de 10% sem perder volume, ou resultados subiram mais de 20% com custo estável.
- **🔴 Piorando:** custo por resultado subiu mais de 10%, ou resultados caíram mais de 20% com investimento parecido.
- **🟡 Em atenção:** o resultado principal ainda está estável, mas existe sinal de que vai piorar ou de que algo está fora do normal. Exemplos: uma métrica do funil caiu mais de 15%, uma métrica está pior que o benchmark, frequência acima de 3 em 7 dias, custo acima de `metaCustoPorResultado`, gasto fora do ritmo de `orcamentoMidia`, menos de 10 resultados em U7 (pouco volume para concluir).
- **⚪ Sem dados:** sem investimento em U7 ou conta inacessível.

Se a conta está estável e sem nenhum sinal de atenção, ela é 🟢 só se estiver dentro ou melhor que a meta; senão é 🟡.

### 4.2 Métricas críticas contra benchmark

Para cada métrica do funil, compare U7 com A7, com a média semanal do T90 e com o benchmark. Dê uma classificação:
- **Crítica:** pior que o benchmark em mais de 30%, ou piorou mais de 25% contra A7
- **Ruim:** pior que o benchmark ou piorou entre 10% e 25%
- **Ok:** dentro do benchmark
- **Boa:** melhor que o benchmark

Prioridade do benchmark: 1) o que vier do conector Meta para o setor do cliente; 2) o que estiver escrito no `contexto` do cliente; 3) a tabela abaixo. Diga sempre qual fonte usou.

Tabela de referência Elevoy (negócio local no Brasil, ajuste quando tivermos histórico próprio):

| Métrica | Meta Ads | Google Ads Pesquisa |
|---|---|---|
| CPM | R$ 15 a R$ 40 | não se aplica |
| CTR (link) | acima de 1,0% | acima de 4% |
| CPC | R$ 0,80 a R$ 3,00 | depende do nicho, compare com o T90 |
| Frequência 7 dias | até 2,5 (acima de 3 é alerta) | não se aplica |
| Hook rate (vídeo) | acima de 25% | não se aplica |
| Hold rate (vídeo) | acima de 15% | não se aplica |
| Taxa de conversão (clique → resultado) | conversa: acima de 15%, lead: acima de 8% | acima de 5% |
| Parcela de impressões | não se aplica | acima de 50% (perda por orçamento acima de 20% é alerta) |

No relatório, mostre só as métricas classificadas como crítica ou ruim, e no máximo duas que estão boas (para saber o que preservar).

### 4.3 O que aconteceu e por quê

Percorra o funil na ordem e responda, para a conta:

**Meta:** CPM → hook rate / CTR → CPC → taxa de conversão (clique ou visualização da página → resultado) → custo por resultado.
**Google Pesquisa:** parcela de impressões → CTR → CPC → taxa de conversão → custo por conversão.

1. Qual métrica mudou primeiro na cadeia? (é ela que explica o resto)
2. Mudou quanto, e em qual campanha, conjunto ou anúncio isso se concentra?
3. O que causou? Cruze com:
   - o histórico de alterações (orçamento, público, criativo novo, pausa, edição que reiniciou aprendizado)
   - frequência e idade dos criativos (fadiga)
   - termos de pesquisa e parcela perdida (Google)
   - sazonalidade, datas e horário de atendimento descritos em `contexto` e `briefing`
4. Se a causa não aparece nos dados, diga que é hipótese e qual dado confirmaria.

Leituras comuns:
- CPM subiu e CTR caiu, frequência alta: criativo cansado ou público saturado
- CPM estável, CTR caiu: o criativo perdeu força ou a mensagem não conversa com o público
- CTR bom, taxa de conversão caiu: problema depois do clique (página, WhatsApp demorando para responder, oferta, horário)
- CPC subiu no Google com perda por classificação: concorrência ou Índice de Qualidade
- Volume caiu com perda por orçamento: falta verba, não é problema de campanha

Faça as mesmas perguntas quando a conta **melhorou**: qual métrica puxou a melhora, em qual campanha/anúncio, o que causou (mudança feita por nós, criativo novo, sazonalidade). Melhora sem causa identificada é registrada como "ainda não confirmada".

### 4.4 O que fazer

De 1 a 5 ações por conta, concretas, citando campanha, conjunto ou anúncio pelo nome. Cada ação ataca a métrica que piorou (ou a que puxou a melhora) e diz o efeito esperado.

- **Piorando ou em atenção:** corrigir a métrica que quebrou primeiro no funil. Nunca apresente um problema sem a ação junto.
- **Melhorando:** como escalar ou proteger o que funcionou. Ex.: subir orçamento do conjunto vencedor em 20% a cada 3 dias, duplicar o anúncio vencedor para outro público, criar variações do mesmo ângulo antes de ele cansar. Nunca só "manter".
- Nada genérico tipo "testar novos criativos" sem dizer qual, onde e por quê.
- Respeite as restrições escritas em `contexto`.

Oportunidades: olhe o `mapaServicos`. Serviço marcado como `sem_fornecedor` ou `outra_agencia` que ajudaria a resolver um problema visto nos dados (ex.: taxa de conversão baixa com LP lenta e sem fornecedor de site, conversas sem follow-up e sem CRM) entra como uma ação com `"plataforma": "servico"`, explicando o problema e como a Elevoy pode fornecer. No máximo uma por cliente, e só quando os dados justificarem.

## 5. Status do cliente

O status do cliente sai das contas, sem somar as análises:
- 🔴 se alguma conta com 30% ou mais do investimento do cliente está piorando
- 🟢 se nenhuma conta piorou e a conta com mais investimento melhorou
- 🟡 no resto (inclusive quando uma conta pequena piorou)
- ⚪ se nenhuma conta respondeu

Para o campo `tendencia` da API, use: 🟢 = `"melhorando"`, 🔴 = `"caindo"`, 🟡 = `"estavel"`, ⚪ = `"sem_dados"`. No texto, escreva sempre Melhorando, Piorando ou Em atenção.

## 6. Envio para o Analyx

Para cada cliente, faça um POST:

```bash
curl -sS -X POST https://analyx.elevoy.com.br/api/claude/relatorios \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  --data @/tmp/relatorio-<slug>.json
```

Toda chamada para `analyx.elevoy.com.br` (GET e POST) leva o header `Authorization: Bearer <TOKEN>`, com o token que está nas instruções da tarefa agendada. Nunca escreva esse token em arquivo do repositório nem na mensagem final.

Formato do JSON:

```json
{
  "clienteSlug": "boutique-das-flores",
  "clienteNome": "Boutique das Flores",
  "tipo": "diario",
  "dataReferencia": "2026-10-19",
  "tendencia": "caindo",
  "resumo": "Piorando. Meta: custo por conversa subiu 28% porque o CTR do conjunto Mulheres 25-45 caiu de 1,6% para 0,9% com frequência 4,1. Ação: trocar o criativo hoje. Google estável.",
  "conteudo": "Markdown completo (ver estrutura abaixo)",
  "metricas": {
    "principais": [
      { "nome": "Custo por conversa (Meta)", "valor": "R$ 12,92", "variacao": 28.1, "melhorQuando": "menor" },
      { "nome": "CTR link (Meta)", "valor": "0,90%", "variacao": -43.7, "melhorQuando": "maior" },
      { "nome": "Frequência (Meta)", "valor": "4,1", "variacao": 36.0, "melhorQuando": "menor" },
      { "nome": "Custo por conversão (Google)", "valor": "R$ 18,40", "variacao": 2.1, "melhorQuando": "menor" }
    ]
  },
  "otimizacoes": [
    {
      "titulo": "Trocar criativo do conjunto Mulheres 25-45",
      "descricao": "Frequência 4,1 e CTR caiu de 1,6% para 0,9% em 7 dias (benchmark acima de 1,0%). Subir 2 variações novas do vídeo de depoimento e pausar o carrossel antigo. Esperado: CTR voltar acima de 1,2% e custo por conversa abaixo de R$ 10.",
      "plataforma": "meta",
      "prioridade": "alta"
    }
  ]
}
```

`variacao` é o % de U7 contra A7. Valores formatados em pt-BR. No card `metricas.principais`, até 4 métricas: as piores do cliente contra benchmark, sempre com o canal no nome. `resumo` em 2 a 3 frases começando pelo status.

Estrutura do `conteudo` (uma seção por conta, nunca juntar contas):

```
## Resultado: 🔴 Piorando
(1 a 2 frases: qual conta puxou o status e por quê)

## Meta Ads · <nome da conta> (<id>)
**Status:** 🔴 Piorando · Investimento U7 R$ X (A7 R$ Y) · Resultados X (A7 Y) · Custo por resultado R$ X (A7 R$ Y, média T90 R$ Z, meta R$ W)

**Métricas críticas**
| Métrica | U7 | A7 | Var. | Média T90 | Benchmark | Situação |
|---|---|---|---|---|---|---|
| CTR link | 0,90% | 1,60% | -43,7% | 1,40% | > 1,0% (fonte) | Crítica |

**O que aconteceu:** qual métrica mudou primeiro, quanto e onde (campanha, conjunto, anúncio).
**Por quê:** a causa cruzando histórico de alterações, frequência, criativos, contexto. Se for hipótese, dizer.
**O que fazer:**
1. ação concreta, onde, e o efeito esperado
2. ...

## Google Ads · <nome da conta> (<id>)
(mesma estrutura)

## Contas com falha
(só se houver: qual conta e qual erro)
```

Se a resposta não for `{"ok":true,...}`, tente mais uma vez. Se falhar de novo, siga para o próximo cliente e anote o erro.

## 7. Índice do dia

Depois de todos os clientes, envie mais um POST com `"clienteSlug": "geral"`, `"clienteNome": "Visão geral"`, `tipo: "diario"` e a tendência predominante. Não é um compilado de números: é só um índice para saber por onde começar. No `conteudo`, uma linha por cliente, em ordem (🔴 primeiro, depois 🟡, depois 🟢):

```
- 🔴 **Cliente A** · Meta: CTR caiu 44% no conjunto X (criativo cansado) · Ação: trocar criativo hoje
- 🟡 **Cliente B** · Google: perda de 35% por orçamento na campanha Y · Ação: realocar R$ 20/dia da campanha Z
- 🟢 **Cliente C** · Meta: custo por lead -22% puxado pelo anúncio W · Ação: escalar 20%
```

Sem `otimizacoes` nesse.

## 8. Envio para o n8n

Depois dos POSTs no Analyx, envie um resumo para o webhook do n8n (um POST só, com todos os clientes):

```bash
curl -sS -X POST https://veltrox-n8n.6cna1x.easypanel.host/webhook/relatorio-clientes-elevoy \
  -H "Content-Type: application/json" \
  --data @/tmp/n8n-resumo.json
```

Formato do JSON (sempre esses campos, mesmo que vazios):

```json
{
  "tipo": "diario",
  "dataReferencia": "2026-10-19",
  "geradoEm": "2026-10-20T07:52:00-03:00",
  "mensagem": "O mesmo texto da mensagem final do passo 9",
  "carteira": {
    "clientes": 2,
    "caindo": 1,
    "melhorando": 0,
    "estavel": 1,
    "semDados": 0,
    "investimento7d": 627.02
  },
  "clientes": [
    {
      "slug": "vox2you-nove-de-julho",
      "nome": "Vox2You Nove de Julho",
      "tendencia": "caindo",
      "status": "Piorando",
      "resumo": "2 a 3 frases, igual ao enviado ao Analyx",
      "investimento7d": 471.64,
      "resultados7d": 38,
      "custoPorResultado7d": 12.41,
      "variacaoCustoPorResultado": 18.2,
      "canais": {
        "meta": { "investimento7d": 471.64, "resultados7d": 38 },
        "google": null
      },
      "contas": [
        {
          "canal": "meta",
          "id": "act_123",
          "nome": "Vox2You Nove de Julho",
          "status": "Piorando",
          "investimento7d": 471.64,
          "resultados7d": 38,
          "custoPorResultado7d": 12.41,
          "variacaoCustoPorResultado": 18.2,
          "metricasCriticas": [
            { "nome": "CTR link", "valor": 0.9, "variacao": -43.7, "benchmark": "acima de 1,0%", "situacao": "critica" }
          ],
          "motivo": "1 frase com a causa",
          "acaoPrincipal": "1 frase com a ação mais importante"
        }
      ],
      "otimizacoes": [
        { "titulo": "...", "prioridade": "alta", "plataforma": "meta" }
      ],
      "pedidosCliente": [],
      "linkAnalyx": "https://analyx.elevoy.com.br/claude/vox2you-nove-de-julho"
    }
  ]
}
```

Números sem formatação (ponto decimal, sem "R$"), `variacaoCustoPorResultado` em % contra os 7 dias anteriores. Canal que o cliente não usa fica `null`. Se o webhook não responder 2xx, tente mais uma vez e, se falhar de novo, cite na mensagem final.

## 9. Mensagem final

Termine com uma mensagem curta (vai como notificação no celular), uma linha por cliente com o motivo e a ação:

```
Analyx 19/10 · 12 clientes
🔴 Cliente A: Meta CTR -44% (criativo cansado). Trocar criativo do conjunto X
🟡 Cliente B: Google perdendo 35% por orçamento. Realocar verba
🟢 Cliente C: custo por lead -22%. Escalar anúncio W
⚪ Cliente D: conta Meta desativada
Detalhes na aba Claude.
```

Se algum envio falhou (Analyx ou n8n), diga quais.
