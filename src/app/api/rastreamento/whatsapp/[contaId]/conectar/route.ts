import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import {
  getEvolutionConfig,
  criarInstancia,
  buscarQr,
  nomeInstancia,
} from "@/lib/evolution-api";
import crypto from "crypto";

type Params = Promise<{ contaId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const cfg = await getEvolutionConfig();
    if (!cfg) {
      return NextResponse.json(
        { erro: "Evolution API não configurada. Acesse Configurações → Evolution API." },
        { status: 422 }
      );
    }

    // Garante que a conta tem webhookToken
    let conta = await prisma.contaAnuncio.findUnique({ where: { id: contaId } });
    if (!conta) return NextResponse.json({ erro: "Conta não encontrada" }, { status: 404 });

    if (!conta.webhookToken) {
      conta = await prisma.contaAnuncio.update({
        where: { id: contaId },
        data: { webhookToken: crypto.randomUUID() },
      });
    }

    const instName = nomeInstancia(contaId);
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/rastreamento/webhook/${conta.webhookToken}`;

    // Se ainda não tem instância criada, cria agora
    if (!conta.evolutionInstanceName) {
      const resultado = await criarInstancia(cfg, instName, webhookUrl);
      if (!resultado.ok) {
        return NextResponse.json({ erro: resultado.erro }, { status: 500 });
      }
      await prisma.contaAnuncio.update({
        where: { id: contaId },
        data: { evolutionInstanceName: instName, evolutionStatus: "connecting" },
      });
    }

    // Busca o QR code
    const qr = await buscarQr(cfg, instName);

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { evolutionStatus: qr.state },
    });

    return NextResponse.json({ base64: qr.base64, state: qr.state });
  } catch (err) {
    console.error("[POST /api/rastreamento/whatsapp/[contaId]/conectar]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
