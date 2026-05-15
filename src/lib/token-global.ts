import { prisma } from "./prisma";
import { descriptografar } from "./cripto";

export async function obterTokenGlobal(): Promise<string> {
  const config = await prisma.configuracaoMetaApp.findFirst({
    where: { tokenAcesso: { not: null } },
    select: { tokenAcesso: true },
    orderBy: { atualizadoEm: "desc" },
  });

  if (!config?.tokenAcesso) {
    throw new Error(
      "Token Meta não configurado. Acesse Configurações → App Meta e insira o token de longa duração."
    );
  }

  return descriptografar(config.tokenAcesso);
}
