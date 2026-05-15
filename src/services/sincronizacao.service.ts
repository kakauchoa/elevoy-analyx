import { prisma } from "@/lib/prisma";
import { obterTokenGlobal } from "@/lib/token-global";
import { sincronizarContaAnuncio } from "@/services/meta-insights.service";
import { renovarTokenGlobal } from "@/services/renovar-token.service";

function ontem(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Sincroniza todas as contas ativas para a data de ontem.
 * Usa o token global configurado em Configurações → App Meta.
 */
export async function sincronizarTodasContas(): Promise<void> {
  console.log("[sincronizacao] Iniciando — renovando token global...");

  const resultadoToken = await renovarTokenGlobal();
  if (!resultadoToken.ok) {
    console.warn(`[sincronizacao] Aviso na renovação do token: ${resultadoToken.erro}`);
  } else {
    console.log("[sincronizacao] Token global renovado com sucesso.");
  }

  let tokenAcesso: string;
  try {
    tokenAcesso = await obterTokenGlobal();
  } catch (e) {
    console.error("[sincronizacao] Abortado — token global não configurado:", e);
    return;
  }

  const contas = await prisma.contaAnuncio.findMany({
    where: { ativo: true },
    select: { id: true, accountIdMeta: true },
  });

  console.log(`[sincronizacao] Sincronizando ${contas.length} conta(s)...`);
  const data = ontem();

  for (const conta of contas) {
    try {
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

    await new Promise((r) => setTimeout(r, 2_000));
  }

  console.log("[sincronizacao] Concluído.");
}
