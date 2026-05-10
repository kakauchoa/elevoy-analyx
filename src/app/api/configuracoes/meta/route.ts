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
      select: { appId: true, criadoEm: true, atualizadoEm: true },
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

    const body = (await req.json()) as { appId?: string; appSecret?: string };
    const { appId, appSecret } = body;

    if (!appId || !appSecret) {
      return NextResponse.json({ erro: "App ID e Chave Secreta são obrigatórios" }, { status: 400 });
    }

    const existente = await prisma.configuracaoMetaApp.findUnique({
      where: { usuarioId: session.user.id },
      select: { appSecret: true },
    });

    let appSecretCriptografado: string;

    if (existente && appSecret === "••••••••") {
      appSecretCriptografado = existente.appSecret;
    } else {
      appSecretCriptografado = criptografar(appSecret);
    }

    await prisma.configuracaoMetaApp.upsert({
      where: { usuarioId: session.user.id },
      create: {
        usuarioId: session.user.id,
        appId,
        appSecret: appSecretCriptografado,
      },
      update: {
        appId,
        appSecret: appSecretCriptografado,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
