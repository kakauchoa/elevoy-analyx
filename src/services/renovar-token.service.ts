import { prisma } from "@/lib/prisma";
import { criptografar, descriptografar } from "@/lib/cripto";

interface MetaTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
}

interface ResultadoRenovacao {
  ok: boolean;
  erro?: string;
}

/**
 * Renova o token global se estiver expirando em menos de 7 dias.
 * Usa o App ID e App Secret configurados em Configurações → App Meta.
 */
export async function renovarTokenGlobal(): Promise<ResultadoRenovacao> {
  const config = await prisma.configuracaoMetaApp.findFirst({
    where: { tokenAcesso: { not: null } },
    select: { id: true, appId: true, appSecret: true, tokenAcesso: true, tokenExpiraEm: true },
    orderBy: { atualizadoEm: "desc" },
  });

  if (!config?.tokenAcesso) {
    return { ok: false, erro: "Token global não configurado" };
  }

  // Renova somente se expira em menos de 7 dias ou sem data de expiração
  const limite7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (config.tokenExpiraEm && config.tokenExpiraEm > limite7Dias) {
    return { ok: true };
  }

  try {
    const tokenAtual = descriptografar(config.tokenAcesso);
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
      await prisma.configuracaoMetaApp.update({
        where: { id: config.id },
        data: { tokenStatus: "erro" },
      });
      return { ok: false, erro: msg };
    }

    const expiresIn = data.expires_in ?? 60 * 24 * 60 * 60;
    const novaExpiracao = new Date(Date.now() + expiresIn * 1000);
    const diasRestantes = (novaExpiracao.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const novoStatus = diasRestantes > 7 ? "ok" : "expirando";

    await prisma.configuracaoMetaApp.update({
      where: { id: config.id },
      data: {
        tokenAcesso: criptografar(data.access_token),
        tokenExpiraEm: novaExpiracao,
        tokenStatus: novoStatus,
      },
    });

    console.log(`[renovarToken] Token global renovado — expira em ${novaExpiracao.toISOString()}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.configuracaoMetaApp
      .update({ where: { id: config.id }, data: { tokenStatus: "erro" } })
      .catch(() => {});
    return { ok: false, erro: msg };
  }
}
