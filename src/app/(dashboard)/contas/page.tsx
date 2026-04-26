import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListaContas } from "@/components/contas/ListaContas";
import { ContaAnuncio } from "@/types/dashboard";

export default async function ContasPage() {
  const session = await getServerSession(authOptions);

  const contas = await prisma.contaAnuncio.findMany({
    where: { usuarioId: session!.user.id, ativo: true },
    select: {
      id: true,
      nomeCliente: true,
      slugCompartilhavel: true,
      accountIdMeta: true,
      tipoFunil: true,
      metricaPrincipal: true,
      labelMetricaPrincipal: true,
      labelCustoPorResultado: true,
      compartilhamentoAtivo: true,
      ultimaSincronizacao: true,
      criadoEm: true,
    },
    orderBy: { criadoEm: "desc" },
  });

  // Serializa objetos Date para string (Next.js não serializa Date ao passar para client components)
  const contasSerializadas: ContaAnuncio[] = contas.map((c) => ({
    ...c,
    tipoFunil: c.tipoFunil as ContaAnuncio["tipoFunil"],
    ultimaSincronizacao: c.ultimaSincronizacao?.toISOString() ?? null,
    criadoEm: c.criadoEm.toISOString(),
  }));

  return (
    <div className="p-8">
      <ListaContas contasIniciais={contasSerializadas} />
    </div>
  );
}
