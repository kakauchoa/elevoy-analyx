import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/cripto";
import { sincronizarContaAnuncio } from "@/services/meta-insights.service";
import { verificarAcessoConta } from "@/lib/acesso-contas";

function ontem(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json() as {
      contaAnuncioId?: string;
      dataInicio?: string;
      dataFim?: string;
    };

    if (!body.contaAnuncioId) {
      return NextResponse.json({ erro: "contaAnuncioId é obrigatório" }, { status: 400 });
    }

    // Verifica acesso: criador ou gestor vinculado via gestor_contas
    const temAcesso = await verificarAcessoConta(session.user.id, body.contaAnuncioId);
    if (!temAcesso) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const conta = await prisma.contaAnuncio.findFirst({
      where: { id: body.contaAnuncioId, ativo: true },
      select: { id: true, accountIdMeta: true, tokenAcesso: true },
    });

    if (!conta) {
      return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });
    }

    const dataInicio = body.dataInicio ?? ontem();
    const dataFim = body.dataFim ?? ontem();

    // Descriptografa o token somente no momento da chamada à API
    const tokenAcesso = descriptografar(conta.tokenAcesso);

    const resultado = await sincronizarContaAnuncio({
      contaAnuncioId: conta.id,
      accountIdMeta: conta.accountIdMeta,
      tokenAcesso,
      dataInicio,
      dataFim,
    });

    return NextResponse.json({
      sincronizados: resultado.sincronizados,
      erros: resultado.erros,
      periodo: { inicio: dataInicio, fim: dataFim },
    });
  } catch (erro) {
    console.error("[POST /api/meta/sincronizar]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
