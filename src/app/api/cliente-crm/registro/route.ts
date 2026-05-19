import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      nome: string;
      email: string;
      telefone?: string;
      senha: string;
    };

    const { nome, email, telefone, senha } = body;

    if (!nome?.trim() || !email?.trim() || !senha) {
      return NextResponse.json({ erro: "Nome, email e senha são obrigatórios" }, { status: 400 });
    }

    if (senha.length < 8) {
      return NextResponse.json({ erro: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }

    const existente = await prisma.clienteCrm.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existente) {
      return NextResponse.json({ erro: "Email já cadastrado" }, { status: 409 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await prisma.clienteCrm.create({
      data: {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        telefone: telefone?.trim() || null,
        senhaHash,
        status: "pendente",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/cliente-crm/registro]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
