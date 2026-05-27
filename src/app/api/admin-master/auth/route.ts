import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; senha?: string };
    const { email, senha } = body;

    const adminEmail = process.env.ADMIN_MASTER_EMAIL;
    const adminSenha = process.env.ADMIN_MASTER_PASSWORD;
    const adminToken = process.env.ADMIN_MASTER_TOKEN;

    if (!adminEmail || !adminSenha || !adminToken) {
      return NextResponse.json({ erro: "Admin master não configurado no servidor" }, { status: 503 });
    }

    if (email !== adminEmail || senha !== adminSenha) {
      return NextResponse.json({ erro: "E-mail ou senha incorretos" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin-session", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 horas
    });
    return res;
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-session", "", { maxAge: 0, path: "/" });
  return res;
}
