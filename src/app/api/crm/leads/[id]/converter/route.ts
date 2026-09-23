import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { includeOportunidadeCompleto as includeCompleto } from "@/lib/crm-includes";

type Params = Promise<{ id: string }>;

// Converte um Lead em Contato + (opcional) Negócio + Oportunidade, copiando os
// campos de atribuição (origem/meio/campanha/conteúdo/termo) para o card.
export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const lead = await prisma.crmLead.findFirst({ where: { id, usuarioId: session.user.id } });
    if (!lead) return NextResponse.json({ erro: "Lead não encontrado" }, { status: 404 });
    if (lead.convertidoEm) {
      return NextResponse.json({ erro: "Lead já foi convertido" }, { status: 409 });
    }

    const body = (await req.json()) as { etapaId?: string; empresa?: string; titulo?: string };
    if (!body.etapaId) return NextResponse.json({ erro: "etapaId é obrigatório" }, { status: 400 });

    const etapa = await prisma.crmEtapa.findFirst({ where: { id: body.etapaId, usuarioId: session.user.id } });
    if (!etapa) return NextResponse.json({ erro: "Etapa não encontrada" }, { status: 404 });

    const contato = await prisma.crmContato.create({
      data: {
        usuarioId: session.user.id,
        nome: lead.nome || "Sem nome",
        telefone: lead.telefone,
        email: lead.email,
      },
    });

    const negocio = body.empresa?.trim()
      ? await prisma.crmNegocio.create({ data: { usuarioId: session.user.id, nome: body.empresa.trim() } })
      : null;

    const oportunidade = await prisma.crmOportunidade.create({
      data: {
        usuarioId: session.user.id,
        etapaId: body.etapaId,
        leadId: lead.id,
        contatoId: contato.id,
        negocioId: negocio?.id ?? null,
        titulo: body.titulo?.trim() || lead.nome || "Novo negócio",
        origemId: lead.origemId,
        meioCampanha: lead.meioCampanha,
        campanha: lead.campanha,
        conteudo: lead.conteudo,
        termo: lead.termo,
        notas: lead.mensagem,
      },
      include: includeCompleto,
    });

    await prisma.crmLead.update({ where: { id: lead.id }, data: { convertidoEm: new Date() } });

    return NextResponse.json(oportunidade, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
