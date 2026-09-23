import { prisma } from "@/lib/prisma";

/**
 * Resolve o id de uma CrmOrigem a partir de um nome bruto vindo de uma automação
 * (ex: WhatsApp/CTWA, Meta Lead Ads). Faz match case-insensitive contra origens já
 * aprovadas; se não achar, cria a origem como pendente de avaliação (aprovado=false)
 * para o gestor revisar em Configurações do CRM → Origens.
 */
export async function resolverOrigem(usuarioId: string, nomeBruto: string): Promise<string> {
  const nome = nomeBruto.trim();

  const existente = await prisma.crmOrigem.findFirst({
    where: { usuarioId, nome: { equals: nome } },
  });
  if (existente) return existente.id;

  const criada = await prisma.crmOrigem.create({
    data: { usuarioId, nome, aprovado: false },
  });
  return criada.id;
}
