import { prisma } from "@/lib/prisma";
import { criptografar, descriptografar } from "@/lib/cripto";

interface ResultadoRenovacao {
  renovados: number;
  erros: string[];
}

interface MetaTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
}

/**
 * Renova tokens que expiram em menos de 7 dias ou que ainda não têm data de expiração.
 * Requer que o admin tenha configurado o App Meta em /configuracoes/meta.
 */
export async function renovarTokensExpirandos(): Promise<ResultadoRenovacao> {
  const resultado: ResultadoRenovacao = { renovados: 0, erros: [] };

  const configs = await prisma.configuracaoMetaApp.findMany({
    select: { usuarioId: true, appId: true, appSecret: true },
  });

  if (configs.length === 0) return resultado;

  const limite7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const config of configs) {
    let appSecret: string;
    try {
      appSecret = descriptografar(config.appSecret);
    } catch {
      resultado.erros.push(`Erro ao descriptografar app_secret do usuário ${config.usuarioId}`);
      continue;
    }

    const contas = await prisma.contaAnuncio.findMany({
      where: {
        usuarioId: config.usuarioId,
        ativo: true,
        OR: [
          { tokenExpiraEm: null },
          { tokenExpiraEm: { lte: limite7Dias } },
        ],
      },
      select: { id: true, tokenAcesso: true },
    });

    for (const conta of contas) {
      try {
        const tokenAtual = descriptografar(conta.tokenAcesso);

        const url =
          `https://graph.facebook.com/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${config.appId}` +
          `&client_secret=${encodeURIComponent(appSecret)}` +
          `&fb_exchange_token=${encodeURIComponent(tokenAtual)}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        const data = (await res.json()) as MetaTokenResponse;

        if (!res.ok || data.error || !data.access_token) {
          const msg = data.error?.message ?? "Resposta inválida da API do Meta";
          await prisma.contaAnuncio.update({
            where: { id: conta.id },
            data: { tokenStatus: "erro" },
          });
          resultado.erros.push(`Conta ${conta.id}: ${msg}`);
          console.error(`[renovarToken] Conta ${conta.id}: ${msg}`);
          continue;
        }

        const expiresIn = data.expires_in ?? 60 * 24 * 60 * 60; // default 60 dias
        const novaExpiracao = new Date(Date.now() + expiresIn * 1000);
        const diasRestantes = (novaExpiracao.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        const novoStatus = diasRestantes > 7 ? "ok" : "expirando";

        await prisma.contaAnuncio.update({
          where: { id: conta.id },
          data: {
            tokenAcesso: criptografar(data.access_token),
            tokenExpiraEm: novaExpiracao,
            tokenStatus: novoStatus,
          },
        });

        resultado.renovados++;
        console.log(`[renovarToken] Conta ${conta.id} renovada — expira em ${novaExpiracao.toISOString()}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await prisma.contaAnuncio
          .update({ where: { id: conta.id }, data: { tokenStatus: "erro" } })
          .catch(() => {});
        resultado.erros.push(`Conta ${conta.id}: ${msg}`);
        console.error(`[renovarToken] Exceção conta ${conta.id}:`, e);
      }
    }
  }

  return resultado;
}

/**
 * Renova o token de uma única conta específica.
 * Retorna o novo tokenExpiraEm e tokenStatus em caso de sucesso.
 */
export async function renovarTokenConta(
  contaId: string,
  usuarioId: string
): Promise<{ ok: true; tokenExpiraEm: Date; tokenStatus: string } | { ok: false; erro: string }> {
  const [config, conta] = await Promise.all([
    prisma.configuracaoMetaApp.findUnique({
      where: { usuarioId },
      select: { appId: true, appSecret: true },
    }),
    prisma.contaAnuncio.findFirst({
      where: { id: contaId, usuarioId, ativo: true },
      select: { tokenAcesso: true },
    }),
  ]);

  if (!config) return { ok: false, erro: "App Meta não configurado. Acesse Configurações → App Meta." };
  if (!conta) return { ok: false, erro: "Conta não encontrada." };

  try {
    const tokenAtual = descriptografar(conta.tokenAcesso);
    const appSecret = descriptografar(config.appSecret);

    const url =
      `https://graph.facebook.com/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${config.appId}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(tokenAtual)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as MetaTokenResponse;

    if (!res.ok || data.error || !data.access_token) {
      const msg = data.error?.message ?? "Resposta inválida da API do Meta";
      await prisma.contaAnuncio.update({ where: { id: contaId }, data: { tokenStatus: "erro" } });
      return { ok: false, erro: msg };
    }

    const expiresIn = data.expires_in ?? 60 * 24 * 60 * 60;
    const novaExpiracao = new Date(Date.now() + expiresIn * 1000);
    const diasRestantes = (novaExpiracao.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const novoStatus = diasRestantes > 7 ? "ok" : "expirando";

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: {
        tokenAcesso: criptografar(data.access_token),
        tokenExpiraEm: novaExpiracao,
        tokenStatus: novoStatus,
      },
    });

    return { ok: true, tokenExpiraEm: novaExpiracao, tokenStatus: novoStatus };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.contaAnuncio
      .update({ where: { id: contaId }, data: { tokenStatus: "erro" } })
      .catch(() => {});
    return { ok: false, erro: msg };
  }
}
