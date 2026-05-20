import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONFIGURACOES_FUNIL } from "@/lib/metricas";

function gerarSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function slugUnico(base: string): Promise<string> {
  let slug = base;
  let tentativa = 0;
  while (true) {
    const existente = await prisma.contaAnuncio.findUnique({
      where: { slugCompartilhavel: slug },
    });
    if (!existente) return slug;
    tentativa++;
    slug = `${base}-${tentativa}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { nomeCliente?: string };
    if (!body.nomeCliente?.trim()) {
      return NextResponse.json({ erro: "Nome do cliente é obrigatório" }, { status: 400 });
    }

    const nome = body.nomeCliente.trim();
    const slugBase = gerarSlug(nome) || `cliente-wpp-${Date.now()}`;
    const slug = await slugUnico(slugBase);

    const config = CONFIGURACOES_FUNIL.whatsapp;

    // Gera um account ID fictício para contas WPP-only (não integram com Meta API)
    const fakeAccountId = `act_${Date.now()}`;

    const conta = await prisma.contaAnuncio.create({
      data: {
        usuarioId: session.user.id,
        nomeCliente: nome,
        slugCompartilhavel: slug,
        accountIdMeta: fakeAccountId,
        tipoFunil: "whatsapp",
        metricaPrincipal: config.metricaPrincipal,
        labelMetricaPrincipal: config.labelMetricaPrincipal,
        labelCustoPorResultado: config.labelCustoPorResultado,
        rastreamentoAtivo: true,
        rastreamentoApenas: true,
      },
      select: { id: true, nomeCliente: true, rastreamentoAtivo: true },
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rastreamento/contas/nova]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
