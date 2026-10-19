import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sessaoAdmin } from "@/lib/claude-relatorios";
import { serializarCliente } from "@/lib/claude-clientes";
import { FichaClienteForm } from "@/components/claude/FichaClienteForm";

export const dynamic = "force-dynamic";

export default async function FichaClienteClaudePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await sessaoAdmin())) redirect("/");

  const { id } = await params;
  const cliente = await prisma.claudeCliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  const ultimo = await prisma.claudeRelatorio.findFirst({
    where: { clienteSlug: cliente.slug },
    orderBy: { dataReferencia: "desc" },
    select: { dataReferencia: true },
  });

  return (
    <FichaClienteForm
      key={cliente.atualizadoEm.toISOString()}
      inicial={serializarCliente(cliente)}
      ultimoRelatorio={ultimo?.dataReferencia.toISOString().slice(0, 10) ?? null}
    />
  );
}
