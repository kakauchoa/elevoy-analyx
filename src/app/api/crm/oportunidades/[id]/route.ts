import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarEventoCalendario, atualizarEventoCalendario, deletarEventoCalendario } from "@/lib/google-calendar";
import { includeOportunidadeCompleto as includeCompleto } from "@/lib/crm-includes";

type Params = Promise<{ id: string }>;

async function verificarOportunidade(id: string, usuarioId: string) {
  return prisma.crmOportunidade.findFirst({ where: { id, usuarioId }, include: includeCompleto });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const oportunidade = await verificarOportunidade(id, session.user.id);
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    const body = (await req.json()) as {
      etapaId?: string;
      titulo?: string;
      telefone?: string | null;
      empresa?: string | null;
      email?: string | null;
      notas?: string | null;
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

    if (body.etapaId) {
      const etapa = await prisma.crmEtapa.findFirst({ where: { id: body.etapaId, usuarioId: session.user.id } });
      if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });
    }

    const dados: Record<string, string | number | Date | null | undefined> = {};
    if (body.etapaId) dados.etapaId = body.etapaId;
    if (body.titulo?.trim()) dados.titulo = body.titulo.trim();
    if ("notas" in body) dados.notas = body.notas?.trim() || null;
    if ("valor" in body) dados.valor = body.valor ?? null;
    if ("origemId" in body) dados.origemId = body.origemId || null;
    if ("meioCampanha" in body) dados.meioCampanha = body.meioCampanha?.trim() || null;
    if ("campanha" in body) dados.campanha = body.campanha?.trim() || null;
    if ("conteudo" in body) dados.conteudo = body.conteudo?.trim() || null;
    if ("termo" in body) dados.termo = body.termo?.trim() || null;
    if ("dataMensagem" in body) dados.dataMensagem = body.dataMensagem ? new Date(body.dataMensagem) : null;
    if ("dataContato" in body) dados.dataContato = body.dataContato ? new Date(body.dataContato) : null;

    const mudouDataReuniao = "dataReuniao" in body;
    const novaDataReuniao = mudouDataReuniao ? (body.dataReuniao ? new Date(body.dataReuniao) : null) : undefined;
    if (mudouDataReuniao) dados.dataReuniao = novaDataReuniao ?? null;

    // Campos de contato/empresa vivem em models separados agora
    const dadosContato: Record<string, string | null> = {};
    if (body.telefone !== undefined) dadosContato.telefone = body.telefone?.trim() || null;
    if (body.email !== undefined) dadosContato.email = body.email?.trim() || null;
    if (body.titulo?.trim()) dadosContato.nome = body.titulo.trim();

    if (Object.keys(dadosContato).length > 0) {
      await prisma.crmContato.update({ where: { id: oportunidade.contatoId }, data: dadosContato });
    }

    if (body.empresa !== undefined) {
      const nomeEmpresa = body.empresa?.trim() || null;
      if (nomeEmpresa && oportunidade.negocioId) {
        await prisma.crmNegocio.update({ where: { id: oportunidade.negocioId }, data: { nome: nomeEmpresa } });
      } else if (nomeEmpresa && !oportunidade.negocioId) {
        const negocio = await prisma.crmNegocio.create({
          data: { usuarioId: session.user.id, nome: nomeEmpresa },
        });
        dados.negocioId = negocio.id;
      } else if (!nomeEmpresa) {
        dados.negocioId = null;
      }
    }

    const atualizado = await prisma.crmOportunidade.update({
      where: { id },
      data: dados,
      include: includeCompleto,
    });

    if (mudouDataReuniao) {
      if (!novaDataReuniao && oportunidade.googleCalendarEventId) {
        await deletarEventoCalendario(session.user.id, oportunidade.googleCalendarEventId);
        await prisma.crmOportunidade.update({ where: { id }, data: { googleCalendarEventId: null } });
      } else if (novaDataReuniao && oportunidade.googleCalendarEventId) {
        await atualizarEventoCalendario(
          session.user.id,
          oportunidade.googleCalendarEventId,
          `Reunião: ${atualizado.titulo}`,
          novaDataReuniao
        );
      } else if (novaDataReuniao && !oportunidade.googleCalendarEventId) {
        const eventId = await criarEventoCalendario({
          usuarioId: session.user.id,
          summary: `Reunião: ${atualizado.titulo}`,
          description: atualizado.notas ?? undefined,
          dataFollowUp: novaDataReuniao,
        });
        if (eventId) {
          await prisma.crmOportunidade.update({ where: { id }, data: { googleCalendarEventId: eventId } });
        }
      }
    }

    const completa = await prisma.crmOportunidade.findUnique({ where: { id }, include: includeCompleto });
    return NextResponse.json(completa);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const oportunidade = await verificarOportunidade(id, session.user.id);
    if (!oportunidade) return NextResponse.json({ erro: "Oportunidade não encontrada" }, { status: 404 });

    if (oportunidade.googleCalendarEventId) {
      await deletarEventoCalendario(session.user.id, oportunidade.googleCalendarEventId);
    }

    await prisma.crmOportunidade.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
