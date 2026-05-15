import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarEventoCalendario } from "@/lib/google-calendar";

const includeCompleto = {
  campos: true,
  tags: { include: { tag: true } },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const contatos = await prisma.crmContato.findMany({
      where: { usuarioId: session.user.id },
      include: includeCompleto,
      orderBy: { criadoEm: "asc" },
    });

    return NextResponse.json(contatos);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      etapaId?: string;
      nome?: string;
      telefone?: string;
      empresa?: string;
      email?: string;
      notas?: string;
      dataContato?: string | null;
      dataMensagem?: string | null;
      dataReuniao?: string | null;
    };

    if (!body.etapaId || !body.nome?.trim()) {
      return NextResponse.json({ erro: "etapaId e nome são obrigatórios" }, { status: 400 });
    }

    const etapa = await prisma.crmEtapa.findFirst({
      where: { id: body.etapaId, usuarioId: session.user.id },
    });
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    const dataContato = body.dataContato ? new Date(body.dataContato) : null;
    const dataMensagem = body.dataMensagem ? new Date(body.dataMensagem) : null;
    const dataReuniao = body.dataReuniao ? new Date(body.dataReuniao) : null;

    const contato = await prisma.crmContato.create({
      data: {
        etapaId: body.etapaId,
        usuarioId: session.user.id,
        nome: body.nome.trim(),
        telefone: body.telefone?.trim() || null,
        empresa: body.empresa?.trim() || null,
        email: body.email?.trim() || null,
        notas: body.notas?.trim() || null,
        dataContato,
        dataMensagem,
        dataReuniao,
      },
      include: includeCompleto,
    });

    // Google Calendar sincroniza com data de reunião (não com data de contato)
    if (dataReuniao) {
      const eventId = await criarEventoCalendario({
        usuarioId: session.user.id,
        summary: `Reunião: ${contato.nome}`,
        description: contato.notas ?? undefined,
        dataFollowUp: dataReuniao,
      });
      if (eventId) {
        await prisma.crmContato.update({
          where: { id: contato.id },
          data: { googleCalendarEventId: eventId },
        });
      }
    }

    return NextResponse.json(contato, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
