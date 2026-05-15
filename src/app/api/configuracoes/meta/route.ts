import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criptografar } from "@/lib/cripto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const config = await prisma.configuracaoMetaApp.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        appId: true,
        tokenExpiraEm: true,
        tokenStatus: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return NextResponse.json({ config: config ?? null });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      appId?: string;
      appSecret?: string;
      tokenAcesso?: string;
    };
    const { appId, appSecret, tokenAcesso } = body;

    if (!appId || !appSecret) {
      return NextResponse.json({ erro: "App ID e Chave Secreta são obrigatórios" }, { status: 400 });
    }

    const existente = await prisma.configuracaoMetaApp.findUnique({
      where: { usuarioId: session.user.id },
      select: { appSecret: true, tokenAcesso: true },
    });

    const appSecretCriptografado =
      existente && appSecret === "••••••••"
        ? existente.appSecret
        : criptografar(appSecret);

    // Atualiza o token global somente se um novo valor foi informado
    let novoTokenAcesso: string | undefined;
    let novoTokenExpiraEm: Date | undefined;
    let novoTokenStatus: "ok" | undefined;

    if (tokenAcesso && tokenAcesso !== "••••••••") {
      novoTokenAcesso = criptografar(tokenAcesso);
      novoTokenExpiraEm = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias
      novoTokenStatus = "ok";
    }

    await prisma.configuracaoMetaApp.upsert({
      where: { usuarioId: session.user.id },
      create: {
        usuarioId: session.user.id,
        appId,
        appSecret: appSecretCriptografado,
        ...(novoTokenAcesso && {
          tokenAcesso: novoTokenAcesso,
          tokenExpiraEm: novoTokenExpiraEm,
          tokenStatus: novoTokenStatus,
        }),
      },
      update: {
        appId,
        appSecret: appSecretCriptografado,
        ...(novoTokenAcesso && {
          tokenAcesso: novoTokenAcesso,
          tokenExpiraEm: novoTokenExpiraEm,
          tokenStatus: novoTokenStatus,
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
