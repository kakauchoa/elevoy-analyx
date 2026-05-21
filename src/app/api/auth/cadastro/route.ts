import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { nome?: string; email?: string; senha?: string };
    const { nome, email, senha } = body;

    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ erro: "Todos os campos são obrigatórios." }, { status: 400 });
    }
    if (senha.length < 6) {
      return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ erro: "Email inválido." }, { status: 400 });
    }

    const existe = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existe) {
      return NextResponse.json({ erro: "Este email já está cadastrado." }, { status: 409 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senhaHash,
        tipo: "gestor",
        perfil: "gestor",
        plano: "free",
        contasMaximas: 3,
        ativo: true,
        assinaturaAtiva: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/cadastro]", err);
    return NextResponse.json({ erro: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
