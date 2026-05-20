import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

type Params = Promise<{ contaId: string }>;

export type WidgetTipo =
  | "metricas_destaque"
  | "metricas_secundarias"
  | "grafico"
  | "tabela_campanhas"
  | "funil_leads";

export interface Widget {
  tipo: WidgetTipo;
  ativo: boolean;
  config?: Record<string, unknown>;
}

export interface LayoutDashboard {
  widgets: Widget[];
}

const LAYOUT_PADRAO: LayoutDashboard = {
  widgets: [
    { tipo: "metricas_destaque", ativo: true },
    { tipo: "metricas_secundarias", ativo: true },
    { tipo: "grafico", ativo: true },
    { tipo: "tabela_campanhas", ativo: true },
    { tipo: "funil_leads", ativo: false },
  ],
};

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const config = await prisma.configuracaoDashboard.findUnique({
      where: { contaAnuncioId: contaId },
    });

    return NextResponse.json(config?.layout ?? LAYOUT_PADRAO);
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const layout = (await req.json()) as LayoutDashboard;

    await prisma.configuracaoDashboard.upsert({
      where: { contaAnuncioId: contaId },
      update: { layout: layout as object },
      create: {
        contaAnuncioId: contaId,
        layout: layout as object,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
