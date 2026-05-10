import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/cripto";
import { sincronizarContaAnuncio } from "@/services/meta-insights.service";
import { renovarTokensExpirandos } from "@/services/renovar-token.service";

function ontem(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Sincroniza todas as contas ativas para a data de ontem.
 * Chamado pelo cron das 4h ou manualmente.
 *
 * Fluxo:
 * 1. Renova tokens que estão expirando (requer ConfiguracaoMetaApp configurada)
 * 2. Para cada conta ativa: busca insights de ontem e salva no banco
 */
export async function sincronizarTodasContas(): Promise<void> {
  console.log("[sincronizacao] Iniciando — renewing tokens...");

  const resultadoTokens = await renovarTokensExpirandos();
  console.log(
    `[sincronizacao] Tokens renovados: ${resultadoTokens.renovados}, erros: ${resultadoTokens.erros.length}`
  );

  const contas = await prisma.contaAnuncio.findMany({
    where: { ativo: true },
    select: { id: true, accountIdMeta: true, tokenAcesso: true, tokenStatus: true },
  });

  console.log(`[sincronizacao] Sincronizando ${contas.length} conta(s)...`);
  const data = ontem();

  for (const conta of contas) {
    if (conta.tokenStatus === "expirado" || conta.tokenStatus === "erro") {
      console.warn(`[sincronizacao] Conta ${conta.id} ignorada — token com status "${conta.tokenStatus}"`);
      continue;
    }

    try {
      const tokenAcesso = descriptografar(conta.tokenAcesso);
      const resultado = await sincronizarContaAnuncio({
        contaAnuncioId: conta.id,
        accountIdMeta: conta.accountIdMeta,
        tokenAcesso,
        dataInicio: data,
        dataFim: data,
      });
      console.log(
        `[sincronizacao] Conta ${conta.id}: ${resultado.sincronizados} sincronizados` +
        (resultado.erros.length ? ` | erros: ${resultado.erros.join("; ")}` : "")
      );
    } catch (e) {
      console.error(`[sincronizacao] Exceção conta ${conta.id}:`, e);
    }

    // Pausa de 2s entre contas para não sobrecarregar a API do Meta
    await new Promise((r) => setTimeout(r, 2_000));
  }

  console.log("[sincronizacao] Concluído.");
}
