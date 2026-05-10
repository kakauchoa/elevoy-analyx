import { prisma } from "@/lib/prisma";

export interface AcessoContas {
  isAdmin: boolean;
  contaIds: string[];
}

/**
 * Resolve quais contas o usuário pode ver.
 * Admin (criador): vê todas as suas contas (usuario_id na tabela contas_anuncio).
 * Sub-gestor: vê apenas as contas vinculadas via gestor_contas.
 */
export async function resolverAcesso(usuarioId: string): Promise<AcessoContas> {
  const [criadas, vinculadas] = await Promise.all([
    prisma.contaAnuncio.findMany({
      where: { usuarioId, ativo: true },
      select: { id: true },
    }),
    prisma.gestorConta.findMany({
      where: { usuarioId },
      select: { contaAnuncioId: true },
    }),
  ]);

  if (criadas.length > 0) {
    return { isAdmin: true, contaIds: criadas.map((c) => c.id) };
  }

  return { isAdmin: false, contaIds: vinculadas.map((v) => v.contaAnuncioId) };
}

/**
 * Verifica se o usuário tem acesso a uma conta específica.
 * Criador da conta OU presente em gestor_contas.
 */
export async function verificarAcessoConta(
  usuarioId: string,
  contaId: string
): Promise<boolean> {
  const [comoCriador, comoVinculo] = await Promise.all([
    prisma.contaAnuncio.findFirst({
      where: { id: contaId, usuarioId, ativo: true },
      select: { id: true },
    }),
    prisma.gestorConta.findFirst({
      where: { usuarioId, contaAnuncioId: contaId },
      select: { id: true },
    }),
  ]);
  return !!(comoCriador || comoVinculo);
}
