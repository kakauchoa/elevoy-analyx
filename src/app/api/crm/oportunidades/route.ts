import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarEventoCalendario } from "@/lib/google-calendar";
import { includeOportunidadeCompleto as includeCompleto } from "@/lib/crm-includes";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const oportunidades = await prisma.crmOportunidade.findMany({
      where: { usuarioId: session.user.id },
      include: includeCompleto,
      orderBy: { criadoEm: "asc" },
    });

    return NextResponse.json(oportunidades);
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
      titulo?: string;
      telefone?: string;
      empresa?: string;
      email?: string;
      notas?: string;
      valor?: number | null;
      origemId?: string | null;
      meioCampanha?: string | null;
      campanha?: string | null;
      conteudo?: string | null;
      termo?: string | null;
      dataContato?: string | null;
      dataMensagem?: string | null;
      dataReuniao?: string | null;
    };

    if (!body.etapaId || !body.titulo?.trim()) {
      return NextResponse.json({ erro: "etapaId e titulo são obrigatórios" }, { status: 400 });
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
        usuarioId: session.user.id,
        nome: body.titulo.trim(),
        telefone: body.telefone?.trim() || null,
        email: body.email?.trim() || null,
      },
    });

    const negocio = body.empresa?.trim()
      ? await prisma.crmNegocio.create({
          data: { usuarioId: session.user.id, nome: body.empresa.trim() },
        })
      : null;

    const oportunidade = await prisma.crmOportunidade.create({
      data: {
        usuarioId: session.user.id,
        etapaId: body.etapaId,
        contatoId: contato.id,
        negocioId: negocio?.id ?? null,
        titulo: body.titulo.trim(),
        valor: body.valor ?? null,
        origemId: body.origemId || null,
        meioCampanha: body.meioCampanha?.trim() || null,
        campanha: body.campanha?.trim() || null,
        conteudo: body.conteudo?.trim() || null,
        termo: body.termo?.trim() || null,
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
        summary: `Reunião: ${oportunidade.titulo}`,
        description: oportunidade.notas ?? undefined,
        dataFollowUp: dataReuniao,
      });
      if (eventId) {
        await prisma.crmOportunidade.update({
          where: { id: oportunidade.id },
          data: { googleCalendarEventId: eventId },
        });
      }
    }

    const completa = await prisma.crmOportunidade.findUnique({
      where: { id: oportunidade.id },
      include: includeCompleto,
    });

    return NextResponse.json(completa, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
