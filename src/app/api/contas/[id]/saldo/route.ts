import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obterTokenGlobal } from "@/lib/token-global";
import { verificarAcessoConta } from "@/lib/acesso-contas";

const META_API_VERSION = process.env.META_API_VERSION ?? "v18.0";

function parsearDisplayString(str: string): number | null {
  // Ex: "BRL 14,076.00)" → 14076.00
  const semParentese = str.replace(/\)/g, "").trim();
  const partes = semParentese.split(/\s+/);
  const valorStr = partes[partes.length - 1];
  const valorLimpo = valorStr.replace(/,/g, "");
  const num = parseFloat(valorLimpo);
  return isNaN(num) ? null : num;
}

type Params = Promise<{ id: string }>;

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;

    const temAcesso = await verificarAcessoConta(session.user.id, id);
    if (!temAcesso) return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });

    const conta = await prisma.contaAnuncio.findFirst({
      where: { id, ativo: true },
      select: { id: true, accountIdMeta: true, tipoPagamento: true },
    });
    if (!conta) return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });

    let token: string;
    try {
      token = await obterTokenGlobal();
    } catch {
      return NextResponse.json({ erro: "Token Meta não configurado" }, { status: 503 });
    }

    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${conta.accountIdMeta}?fields=balance,account_status,funding_source_details,expired_funding_source_details&access_token=${token}`
    );
    const dados = (await res.json()) as {
      balance?: string;
      funding_source_details?: { display_string?: string };
      expired_funding_source_details?: { display_string?: string };
      error?: { message: string };
    };

    if (dados.error) {
      return NextResponse.json({ erro: dados.error.message }, { status: 400 });
    }

    let saldoNumerico: number | undefined;
    if (conta.tipoPagamento === "boleto") {
      // Boleto ativo tem saldo em funding_source_details; quando esgotado vai para expired
      const displayStr =
        dados.funding_source_details?.display_string ??
        dados.expired_funding_source_details?.display_string;
      saldoNumerico = displayStr ? parsearDisplayString(displayStr) ?? undefined : undefined;
    } else if (dados.balance !== undefined) {
      saldoNumerico = Number(dados.balance);
    }

    const agora = new Date();
    if (saldoNumerico !== undefined) {
      await prisma.contaAnuncio.update({
        where: { id: conta.id },
        data: { saldoAtual: saldoNumerico, saldoAtualizadoEm: agora },
      });
    }

    return NextResponse.json({
      saldoAtual: saldoNumerico?.toString() ?? null,
      saldoAtualizadoEm: agora.toISOString(),
      _debug: {
        tipoPagamento: conta.tipoPagamento,
        balance: dados.balance,
        funding_source_details: dados.funding_source_details,
        expired_funding_source_details: dados.expired_funding_source_details,
      },
    });
  } catch (err) {
    console.error("[POST /api/contas/[id]/saldo]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
