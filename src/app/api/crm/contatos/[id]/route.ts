import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarEventoCalendario, atualizarEventoCalendario, deletarEventoCalendario } from "@/lib/google-calendar";

type Params = Promise<{ id: string }>;

const includeCompleto = {
  campos: true,
  tags: { include: { tag: true } },
};

async function verificarContato(id: string, usuarioId: string) {
  return prisma.crmContato.findFirst({ where: { id, usuarioId }, include: includeCompleto });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await verificarContato(id, session.user.id);
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    const body = (await req.json()) as {
      nome?: string;
      telefone?: string | null;
      empresa?: string | null;
      email?: string | null;
      notas?: string | null;
      dataContato?: string | null;
      dataMensagem?: string | null;
    };

    const dados: Record<string, string | Date | null | undefined> = {};
    if (body.nome?.trim()) dados.nome = body.nome.trim();
    if ("telefone" in body) dados.telefone = body.telefone?.trim() || null;
    if ("empresa" in body) dados.empresa = body.empresa?.trim() || null;
    if ("email" in body) dados.email = body.email?.trim() || null;
    if ("notas" in body) dados.notas = body.notas?.trim() || null;
    if ("dataMensagem" in body) dados.dataMensagem = body.dataMensagem ? new Date(body.dataMensagem) : null;

    const mudouDataContato = "dataContato" in body;
    const novaDataContato = mudouDataContato ? (body.dataContato ? new Date(body.dataContato) : null) : undefined;
    if (mudouDataContato) dados.dataContato = novaDataContato ?? null;

    const atualizado = await prisma.crmContato.update({
      where: { id },
      data: dados,
      include: includeCompleto,
    });

    if (mudouDataContato) {
      if (!novaDataContato && contato.googleCalendarEventId) {
        await deletarEventoCalendario(session.user.id, contato.googleCalendarEventId);
        await prisma.crmContato.update({ where: { id }, data: { googleCalendarEventId: null } });
      } else if (novaDataContato && contato.googleCalendarEventId) {
        await atualizarEventoCalendario(session.user.id, contato.googleCalendarEventId, atualizado.nome, novaDataContato);
      } else if (novaDataContato && !contato.googleCalendarEventId) {
        const eventId = await criarEventoCalendario({
          usuarioId: session.user.id,
          summary: atualizado.nome,
          description: atualizado.notas ?? undefined,
          dataFollowUp: novaDataContato,
        });
        if (eventId) {
          await prisma.crmContato.update({ where: { id }, data: { googleCalendarEventId: eventId } });
        }
      }
    }

    return NextResponse.json(atualizado);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const contato = await verificarContato(id, session.user.id);
    if (!contato) return NextResponse.json({ erro: "Contato não encontrado" }, { status: 404 });

    if (contato.googleCalendarEventId) {
      await deletarEventoCalendario(session.user.id, contato.googleCalendarEventId);
    }

    await prisma.crmContato.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
