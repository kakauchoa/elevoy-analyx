import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = await req.json() as {
      senhaAtual?: string;
      novaSenha?: string;
      confirmarSenha?: string;
    };

    const { senhaAtual, novaSenha, confirmarSenha } = body;

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return NextResponse.json({ erro: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json({ erro: "A nova senha e a confirmação não coincidem" }, { status: 400 });
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ erro: "A nova senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { senhaHash: true },
    });
    if (!usuario) return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: "Senha atual incorreta" }, { status: 400 });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: { senhaHash: novaSenhaHash },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[PATCH /api/usuarios/senha]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
