import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assinarTokenCliente, COOKIE_NAME } from "@/lib/cliente-crm-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = (await req.json()) as { email: string; senha: string };

    if (!email || !senha) {
      return NextResponse.json({ erro: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const cliente = await prisma.clienteCrm.findUnique({
      where: { email: email.toLowerCase() },
      include: { conta: { select: { slugCompartilhavel: true } } },
    });

    if (!cliente) {
      return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
    }

    const senhaCorreta = await bcrypt.compare(senha, cliente.senhaHash);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: "Credenciais inválidas" }, { status: 401 });
    }

    if (cliente.status === "rejeitado") {
      return NextResponse.json({ erro: "Acesso negado pelo gestor" }, { status: 403 });
    }

    if (cliente.status === "pendente") {
      return NextResponse.json({ status: "pendente" }, { status: 202 });
    }

    const token = await assinarTokenCliente({
      id: cliente.id,
      email: cliente.email,
      nome: cliente.nome,
      contaSlug: cliente.conta?.slugCompartilhavel ?? null,
    });

    const res = NextResponse.json({
      ok: true,
      slug: cliente.conta?.slugCompartilhavel ?? null,
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[POST /api/cliente-crm/auth]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
