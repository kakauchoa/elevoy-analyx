import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const apenasNaoConvertidos = req.nextUrl.searchParams.get("naoConvertidos") === "1";

    const leads = await prisma.crmLead.findMany({
      where: {
        usuarioId: session.user.id,
        ...(apenasNaoConvertidos ? { convertidoEm: null } : {}),
      },
      include: { origem: true, oportunidade: { select: { id: true, titulo: true } } },
      orderBy: { criadoEm: "desc" },
    });

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      nome?: string;
      telefone?: string;
      email?: string;
      mensagem?: string;
      origemId?: string | null;
      meioCampanha?: string | null;
      campanha?: string | null;
      conteudo?: string | null;
      termo?: string | null;
      canal?: string | null;
    };

    const lead = await prisma.crmLead.create({
      data: {
        usuarioId: session.user.id,
        nome: body.nome?.trim() || null,
        telefone: body.telefone?.trim() || null,
        email: body.email?.trim() || null,
        mensagem: body.mensagem?.trim() || null,
        origemId: body.origemId || null,
        meioCampanha: body.meioCampanha?.trim() || null,
        campanha: body.campanha?.trim() || null,
        conteudo: body.conteudo?.trim() || null,
        termo: body.termo?.trim() || null,
        canal: body.canal?.trim() || "manual",
      },
      include: { origem: true },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
