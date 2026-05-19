import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, senha } = (await req.json()) as { token: string; senha: string };

    if (!token || !senha) {
      return NextResponse.json({ erro: "Token e senha são obrigatórios" }, { status: 400 });
    }

    if (senha.length < 8) {
      return NextResponse.json({ erro: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }

    const solicitacao = await prisma.solicitacaoResetCrm.findUnique({
      where: { token },
    });

    if (!solicitacao) {
      return NextResponse.json({ erro: "Token inválido" }, { status: 400 });
    }

    if (solicitacao.status !== "aprovado") {
      return NextResponse.json({ erro: "Redefinição ainda não aprovada pelo gestor" }, { status: 403 });
    }

    if (solicitacao.expiresAt < new Date()) {
      return NextResponse.json({ erro: "Token expirado" }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await prisma.$transaction([
      prisma.clienteCrm.update({
        where: { id: solicitacao.clienteId },
        data: { senhaHash },
      }),
      prisma.solicitacaoResetCrm.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/cliente-crm/nova-senha]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
