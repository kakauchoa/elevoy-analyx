import { prisma } from "@/lib/prisma";
import { obterTokenGlobal } from "@/lib/token-global";
import { enviarMensagemWhatsApp } from "@/lib/evolution-api";

const META_API_VERSION = process.env.META_API_VERSION ?? "v18.0";

const DESC_STATUS: Record<number, string> = {
  2: "Desabilitada",
  3: "Não liquidada (boleto vencido)",
  7: "Em revisão",
  9: "Em período de carência",
  100: "Temporariamente indisponível",
  101: "Pendente de encerramento",
};

interface MetaContaInfo {
  balance?: string;
  account_status?: number;
  error?: { message: string };
}

export interface ResultadoVerificacao {
  processadas: number;
  alertas: number;
  erros: number;
}

export async function verificarSaldoContas(): Promise<ResultadoVerificacao> {
  const config = await prisma.configuracaoPlataforma.findFirst();

  const evolutionConfigurada =
    config?.evolutionApiUrl &&
    config?.evolutionApiKey &&
    config?.evolutionInstance &&
    config?.evolutionWhatsapp;

  let token: string;
  try {
    token = await obterTokenGlobal();
  } catch {
    console.error("[verificarSaldo] Token global não configurado — abortando verificação");
    return { processadas: 0, alertas: 0, erros: 1 };
  }

  const contas = await prisma.contaAnuncio.findMany({
    where: { ativo: true, rastreamentoApenas: false },
    select: {
      id: true,
      nomeCliente: true,
      accountIdMeta: true,
      tipoPagamento: true,
      orcamentoMensal: true,
      limiteAlertaSaldo: true,
    },
  });

  let alertas = 0;
  let erros = 0;

  for (const conta of contas) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${conta.accountIdMeta}?fields=balance,account_status&access_token=${token}`
      );

      const dados = (await res.json()) as MetaContaInfo;

      if (dados.error) {
        erros++;
        continue;
      }

      // balance retorna o saldo disponível atual na conta (float em BRL)
      if (dados.balance !== undefined) {
        const saldoReal = Number(dados.balance);
        await prisma.contaAnuncio.update({
          where: { id: conta.id },
          data: { saldoAtual: saldoReal, saldoAtualizadoEm: new Date() },
        });
      }

      let tipoAlerta: string | null = null;
      let mensagem = "";
      let detalhes: Record<string, unknown> = {};

      if (conta.tipoPagamento === "boleto") {
        const saldo = Number(dados.balance ?? 0);
        const limite = conta.limiteAlertaSaldo ? Number(conta.limiteAlertaSaldo) : null;
        const orcamento = conta.orcamentoMensal ? Number(conta.orcamentoMensal) : null;

        // Dispara se o saldo estiver abaixo do limite configurado
        const abaixoDoLimite = limite !== null && saldo <= limite;

        if (abaixoDoLimite) {
          tipoAlerta = "saldo_baixo";
          mensagem =
            `⚠️ *Saldo baixo — ${conta.nomeCliente}*\n\n` +
            `Saldo atual: R$ ${saldo.toFixed(2)}\n` +
            `Limite de alerta: R$ ${limite!.toFixed(2)}\n` +
            (orcamento ? `Orçamento mensal: R$ ${orcamento.toFixed(2)}\n` : "") +
            `\nRecarregue o boleto para evitar interrupção nas campanhas.`;
          detalhes = { saldo, limite, orcamento };
        }
      } else if (conta.tipoPagamento === "cartao") {
        const status = dados.account_status;
        if (status !== undefined && status !== 1) {
          tipoAlerta = "cartao_erro";
          mensagem =
            `🚨 *Problema na conta — ${conta.nomeCliente}*\n\n` +
            `Status: ${DESC_STATUS[status] ?? `Erro ${status}`}\n\n` +
            `Acesse o Gerenciador de Anúncios para verificar o cartão de crédito.`;
          detalhes = { accountStatus: status };
        }
      }

      if (tipoAlerta) {
        alertas++;

        await prisma.notificacaoSaldo.create({
          data: {
            contaAnuncioId: conta.id,
            tipo: tipoAlerta,
            mensagem,
            detalhes: detalhes as object,
          },
        });

        if (evolutionConfigurada) {
          try {
            await enviarMensagemWhatsApp({
              baseUrl: config!.evolutionApiUrl!,
              apiKey: config!.evolutionApiKey!,
              instancia: config!.evolutionInstance!,
              numero: config!.evolutionWhatsapp!,
              texto: mensagem,
            });
          } catch {
            // notificação salva mesmo se o WhatsApp falhar
          }
        }
      }
    } catch {
      erros++;
    }
  }

  return { processadas: contas.length, alertas, erros };
}
